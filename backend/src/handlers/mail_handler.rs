//! 邮箱阅读（IMAP）中转端点。
//!
//! 浏览器无法直接说 IMAP（原始 TCP），所以由后端临时中转一次：
//! 用请求里**当场传入**的「邮箱 + 应用专用密码」连一次 IMAP，拉回邮件后立即返回。
//!
//! 安全要点：
//! - **零存储**：凭据只在本次请求内存里存在，不落库、不写文件、不打日志。
//! - **地址白名单**：只允许 `MAIL_ALLOWED_ADDRESSES`（.env）里列出的邮箱地址。
//!   否则这个公开端点会变成「凭据校验预言机」——任何人都能拿它去验证盗来的
//!   邮箱口令，还会让本机 IP 被各邮箱服务商标记为撞库来源。
//! - **并发与超时**：信号量限制并发 + TCP 读写超时 + 整体超时，保护小内存机器。

use axum::{
    extract::Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use mailparse::ParsedMail;
use native_tls::TlsConnector;
use serde::Deserialize;
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::LazyLock;
use std::time::Duration;
use tokio::sync::Semaphore;

/// 同时只允许少量 IMAP 连接，保护小内存机器、并限制滥用速率。
static MAIL_SEM: LazyLock<Semaphore> = LazyLock::new(|| Semaphore::new(3));

const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
const IO_TIMEOUT: Duration = Duration::from_secs(25);
/// tokio 兜底超时（略大于 IO 超时，避免阻塞线程长期占着信号量）。
const HARD_TIMEOUT: Duration = Duration::from_secs(40);

const DEFAULT_LIMIT: usize = 20;
const MAX_LIMIT: usize = 50;
/// 返回给前端的正文最大长度（防止超大邮件撑爆小内存机器/前端）。
const MAX_BODY_BYTES: usize = 200 * 1024;

#[derive(Deserialize)]
pub struct ListReq {
    email: String,
    token: String,
    #[serde(default)]
    limit: Option<usize>,
}

#[derive(Deserialize)]
pub struct BodyReq {
    email: String,
    token: String,
    uid: u32,
}

fn json_err(code: StatusCode, msg: &str) -> Response {
    (
        code,
        Json(serde_json::json!({ "code": code.as_u16(), "message": msg, "data": null })),
    )
        .into_response()
}

fn json_ok(data: serde_json::Value) -> Response {
    (
        StatusCode::OK,
        Json(serde_json::json!({ "code": 0, "message": "ok", "data": data })),
    )
        .into_response()
}

/// 根据邮箱域名推断 IMAP 服务器（只覆盖常见服务商；未知域名直接拒绝）。
fn imap_host(email: &str) -> Option<&'static str> {
    let domain = email.rsplit('@').next()?.to_lowercase();
    let host = match domain.as_str() {
        "yahoo.com" | "yahoo.com.cn" | "ymail.com" | "rocketmail.com" => "imap.mail.yahoo.com",
        "gmail.com" | "googlemail.com" => "imap.gmail.com",
        "outlook.com" | "hotmail.com" | "live.com" | "msn.com" => "outlook.office365.com",
        "icloud.com" | "me.com" | "mac.com" => "imap.mail.me.com",
        "qq.com" | "foxmail.com" => "imap.qq.com",
        "163.com" => "imap.163.com",
        "126.com" => "imap.126.com",
        _ => return None,
    };
    Some(host)
}

/// 邮箱是否在 .env 的 `MAIL_ALLOWED_ADDRESSES` 白名单内（逗号分隔，大小写不敏感）。
/// 未配置则一律拒绝（fail-closed）。
fn is_allowed(email: &str) -> bool {
    let target = email.trim().to_lowercase();
    if target.is_empty() {
        return false;
    }
    std::env::var("MAIL_ALLOWED_ADDRESSES")
        .ok()
        .map(|raw| {
            raw.split(',')
                .map(|s| s.trim().to_lowercase())
                .filter(|s| !s.is_empty())
                .any(|allowed| allowed == target)
        })
        .unwrap_or(false)
}

/// 把 imap 的错误翻译成对用户友好、且不泄露内部细节的中文提示。
fn friendly_imap_err(err: &imap::Error) -> String {
    match err {
        imap::Error::No(_) | imap::Error::Bad(_) => {
            "邮箱或应用专用密码不正确，或该邮箱未开启 IMAP 访问。".to_string()
        }
        imap::Error::Io(_) | imap::Error::TlsHandshake(_) => {
            "无法连接到邮箱服务器，请稍后再试。".to_string()
        }
        _ => "读取邮箱失败，请稍后再试。".to_string(),
    }
}

/// 建立 IMAP 会话（带 TCP 超时）。返回已登录的 Session。
fn connect_session(
    email: &str,
    token: &str,
) -> Result<imap::Session<native_tls::TlsStream<TcpStream>>, String> {
    let host = imap_host(email).ok_or_else(|| "暂不支持该邮箱服务商。".to_string())?;

    let addr = (host, 993u16)
        .to_socket_addrs()
        .map_err(|_| "无法解析邮箱服务器地址。".to_string())?
        .next()
        .ok_or_else(|| "无法解析邮箱服务器地址。".to_string())?;

    let tcp = TcpStream::connect_timeout(&addr, CONNECT_TIMEOUT)
        .map_err(|_| "无法连接到邮箱服务器，请稍后再试。".to_string())?;
    tcp.set_read_timeout(Some(IO_TIMEOUT)).ok();
    tcp.set_write_timeout(Some(IO_TIMEOUT)).ok();

    let connector = TlsConnector::builder()
        .build()
        .map_err(|_| "TLS 初始化失败。".to_string())?;
    let tls = connector
        .connect(host, tcp)
        .map_err(|_| "无法与邮箱服务器建立安全连接。".to_string())?;

    let mut client = imap::Client::new(tls);
    client
        .read_greeting()
        .map_err(|e| friendly_imap_err(&e))?;

    client
        .login(email, token)
        .map_err(|(e, _)| friendly_imap_err(&e))
}

/// 从邮件头里取出（已解码的）From / Subject / Date。
fn header_field(headers: &[mailparse::MailHeader], key: &str) -> String {
    headers
        .iter()
        .find(|h| h.get_key_ref().eq_ignore_ascii_case(key))
        .map(|h| h.get_value())
        .unwrap_or_default()
}

/// 拉取最近 limit 封邮件的摘要（最新在前）。阻塞实现，放进 spawn_blocking。
fn list_blocking(email: String, token: String, limit: usize) -> Result<serde_json::Value, String> {
    let mut session = connect_session(&email, &token)?;
    let mailbox = session.select("INBOX").map_err(|e| friendly_imap_err(&e))?;
    let total = mailbox.exists;

    let mut items: Vec<serde_json::Value> = Vec::new();
    if total > 0 {
        let start = total.saturating_sub(limit as u32).saturating_add(1).max(1);
        let seq = format!("{start}:{total}");
        let fetches = session
            .fetch(seq, "(UID INTERNALDATE RFC822.HEADER)")
            .map_err(|e| friendly_imap_err(&e))?;

        let mut rows: Vec<&imap::types::Fetch> = fetches.iter().collect();
        // 服务器按序号升序返回；倒序得到「最新在前」。
        rows.sort_by_key(|f| f.message);
        for f in rows.into_iter().rev() {
            let (from, subject, date) = match f.header() {
                Some(raw) => match mailparse::parse_headers(raw) {
                    Ok((hs, _)) => (
                        header_field(&hs, "From"),
                        header_field(&hs, "Subject"),
                        header_field(&hs, "Date"),
                    ),
                    Err(_) => (String::new(), String::new(), String::new()),
                },
                None => (String::new(), String::new(), String::new()),
            };
            items.push(serde_json::json!({
                "uid": f.uid,
                "from": from,
                "subject": subject,
                "date": date,
                "internalDate": f.internal_date().map(|d| d.to_rfc3339()),
            }));
        }
    }

    let _ = session.logout();
    Ok(serde_json::json!({ "total": total, "messages": items }))
}

/// 在解析后的邮件树里，找到第一段 text/plain 和第一段 text/html。
fn collect_bodies(part: &ParsedMail, text: &mut Option<String>, html: &mut Option<String>) {
    let mime = part.ctype.mimetype.to_lowercase();
    if part.subparts.is_empty() {
        if mime == "text/plain" && text.is_none() {
            if let Ok(body) = part.get_body() {
                *text = Some(body);
            }
        } else if mime == "text/html" && html.is_none() {
            if let Ok(body) = part.get_body() {
                *html = Some(body);
            }
        }
    } else {
        for sub in &part.subparts {
            collect_bodies(sub, text, html);
        }
    }
}

fn truncate(mut s: String) -> String {
    if s.len() > MAX_BODY_BYTES {
        s.truncate(MAX_BODY_BYTES);
        s.push_str("\n…（内容过长，已截断）");
    }
    s
}

/// 按 UID 拉取单封邮件正文。阻塞实现。
fn body_blocking(email: String, token: String, uid: u32) -> Result<serde_json::Value, String> {
    let mut session = connect_session(&email, &token)?;
    session.select("INBOX").map_err(|e| friendly_imap_err(&e))?;

    let fetches = session
        .uid_fetch(uid.to_string(), "BODY[]")
        .map_err(|e| friendly_imap_err(&e))?;
    let msg = fetches.iter().next().ok_or_else(|| "邮件不存在。".to_string())?;
    let raw = msg.body().ok_or_else(|| "邮件没有正文。".to_string())?;

    let parsed = mailparse::parse_mail(raw).map_err(|_| "邮件解析失败。".to_string())?;
    let (mut text, mut html) = (None, None);
    collect_bodies(&parsed, &mut text, &mut html);

    let subject = header_field_from_parsed(&parsed, "Subject");
    let from = header_field_from_parsed(&parsed, "From");
    let date = header_field_from_parsed(&parsed, "Date");

    let _ = session.logout();
    Ok(serde_json::json!({
        "subject": subject,
        "from": from,
        "date": date,
        "text": text.map(truncate),
        "html": html.map(truncate),
    }))
}

/// 从已解析的邮件里取顶层头部（已解码）。
fn header_field_from_parsed(part: &ParsedMail, key: &str) -> String {
    part.headers
        .iter()
        .find(|h| h.get_key_ref().eq_ignore_ascii_case(key))
        .map(|h| h.get_value())
        .unwrap_or_default()
}

/// 公共校验 + 并发/超时包装，跑给定的阻塞闭包。
async fn run_guarded<F>(email: String, token: String, job: F) -> Response
where
    F: FnOnce(String, String) -> Result<serde_json::Value, String> + Send + 'static,
{
    if email.trim().is_empty() || token.trim().is_empty() {
        return json_err(StatusCode::BAD_REQUEST, "请填写邮箱和应用专用密码。");
    }
    if !email.contains('@') {
        return json_err(StatusCode::BAD_REQUEST, "邮箱地址格式不正确。");
    }
    if !is_allowed(&email) {
        // 故意笼统：不暴露白名单内容，也不区分「地址不在白名单」与「口令错误」。
        return json_err(StatusCode::FORBIDDEN, "该邮箱不在允许列表内。");
    }

    let _permit = match MAIL_SEM.try_acquire() {
        Ok(p) => p,
        Err(_) => {
            return json_err(StatusCode::TOO_MANY_REQUESTS, "服务器正忙，请稍后再试。")
        }
    };

    let task = tokio::task::spawn_blocking(move || job(email, token));
    match tokio::time::timeout(HARD_TIMEOUT, task).await {
        Ok(Ok(Ok(data))) => json_ok(data),
        Ok(Ok(Err(msg))) => json_err(StatusCode::BAD_GATEWAY, &msg),
        Ok(Err(_)) => json_err(StatusCode::INTERNAL_SERVER_ERROR, "读取邮箱失败，请稍后再试。"),
        Err(_) => json_err(StatusCode::GATEWAY_TIMEOUT, "读取邮箱超时，请稍后再试。"),
    }
}

/// POST /api/mail/list —— 拉取最近邮件列表。
pub async fn list(Json(req): Json<ListReq>) -> Response {
    let limit = req.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    run_guarded(req.email, req.token, move |email, token| {
        list_blocking(email, token, limit)
    })
    .await
}

/// POST /api/mail/body —— 按 UID 拉取单封正文。
pub async fn body(Json(req): Json<BodyReq>) -> Response {
    let uid = req.uid;
    run_guarded(req.email, req.token, move |email, token| {
        body_blocking(email, token, uid)
    })
    .await
}
