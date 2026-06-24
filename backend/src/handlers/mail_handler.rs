//! 邮箱阅读（IMAP）中转端点。
//!
//! 浏览器无法直接说 IMAP（原始 TCP），所以由后端临时中转一次：
//! 用请求里**当场传入**的「邮箱 + 应用专用密码」连一次 IMAP，拉回邮件后立即返回。
//!
//! 这是一个**公开工具**：任何访客填自己的「邮箱 + 应用专用密码/授权码」即可读信。
//!
//! 安全要点：
//! - **零存储**：凭据只在本次请求内存里存在，不落库、不写文件、不打日志。
//! - **服务商白名单**：只会连已知服务商的 IMAP 服务器（见 `imap_host`），不会按
//!   攻击者给的域名去连任意主机——防 SSRF / 把本机当任意外连跳板。
//! - **每 IP 限流 + 全局并发上限**：每个 IP 在固定窗口内的登录尝试次数有上限，
//!   再叠加全局信号量，压制「拿公开端点批量试盗号」的滥用、也保护小内存机器。
//! - **超时**：TCP 读写超时 + 整体超时，避免卡死线程。

use axum::{
    extract::Json,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use mailparse::ParsedMail;
use native_tls::TlsConnector;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};
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

/// 每 IP 限流：固定窗口内最多 RATE_LIMIT 次登录尝试（list/body 都算一次登录）。
/// 正常读信：1 次 list + 逐封 body，30 次/10 分钟足够；批量试盗号会被卡住。
const RATE_WINDOW: Duration = Duration::from_secs(600);
const RATE_LIMIT: u32 = 30;

/// 每 IP 的（窗口起点, 已用次数）。内存态，重启即清零；超量时整体修剪过期项。
static RATE: LazyLock<Mutex<HashMap<String, (Instant, u32)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

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

/// 错误响应。**故意一律用 HTTP 200**：站点在 Cloudflare 后面,源站返回 5xx 会被
/// CF 拦截换成它自己的「error code: 502」页面,前端就拿不到我们友好的中文提示
/// (登录失败/超时都属常见情况)。所以把语义状态码放进 envelope 的 `code` 字段,
/// 前端按 `code !== 0` 判断错误并展示 `message`。
fn json_err(code: StatusCode, msg: &str) -> Response {
    (
        StatusCode::OK,
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

/// 根据邮箱域名推断 IMAP 服务器（只覆盖常见服务商；未知域名直接拒绝，防 SSRF）。
/// 同一服务商的各国后缀通常共用一个 IMAP 端点，所以大族用 starts_with 前缀匹配。
fn imap_host(email: &str) -> Option<&'static str> {
    let domain = email.rsplit('@').next()?.to_lowercase();
    let d = domain.as_str();
    let host = match d {
        // —— 国际主流 ——
        // 微软消费版(所有 outlook./hotmail./live.* 国家后缀都走 office365 端点)
        _ if d.starts_with("outlook.")
            || d.starts_with("hotmail.")
            || d.starts_with("live.")
            || d == "msn.com"
            || d == "passport.com"
            || d == "windowslive.com" =>
        {
            "outlook.office365.com"
        }
        // 雅虎(所有国家后缀 yahoo.*)
        _ if d.starts_with("yahoo.") || d == "ymail.com" || d == "rocketmail.com" => {
            "imap.mail.yahoo.com"
        }
        "gmail.com" | "googlemail.com" => "imap.gmail.com",
        "icloud.com" | "me.com" | "mac.com" => "imap.mail.me.com",
        "aol.com" => "imap.aol.com",
        // 注:Proton / Tutanota 不提供原生 IMAP(需本地 Bridge),故不在此列,
        // 会落到 None → 友好提示「暂不支持该邮箱服务商」。
        _ if d.starts_with("gmx.") => "imap.gmx.com",
        "mail.com" => "imap.mail.com",
        _ if d.starts_with("yandex.") => "imap.yandex.com",
        "zoho.com" | "zohomail.com" => "imap.zoho.com",
        "fastmail.com" | "fastmail.fm" => "imap.fastmail.com",
        "web.de" => "imap.web.de",
        "t-online.de" => "secureimap.t-online.de",
        "mail.ru" | "bk.ru" | "list.ru" | "inbox.ru" | "internet.ru" => "imap.mail.ru",
        "naver.com" => "imap.naver.com",
        "daum.net" | "hanmail.net" => "imap.daum.net",
        "seznam.cz" => "imap.seznam.cz",
        "libero.it" => "imap.libero.it",
        "comcast.net" => "imap.comcast.net",
        "att.net" | "sbcglobal.net" | "bellsouth.net" | "ameritech.net" | "pacbell.net" => {
            "imap.mail.att.net"
        }
        "verizon.net" => "imap.aol.com",
        "btinternet.com" => "mail.btinternet.com",
        // —— 国内主流 ——
        "qq.com" | "foxmail.com" | "vip.qq.com" => "imap.qq.com",
        "163.com" => "imap.163.com",
        "126.com" => "imap.126.com",
        "yeah.net" => "imap.yeah.net",
        "vip.163.com" => "imap.vip.163.com",
        "139.com" => "imap.139.com",
        "189.cn" => "imap.189.cn",
        "sina.com" | "sina.cn" | "vip.sina.com" => "imap.sina.com",
        "sohu.com" | "vip.sohu.com" => "imap.sohu.com",
        "aliyun.com" => "imap.aliyun.com",
        "tom.com" => "imap.tom.com",
        "21cn.com" => "imap.21cn.com",
        "263.net" => "imap.263.net",
        _ => return None,
    };
    Some(host)
}

/// 取真实访客 IP：站点在 Cloudflare + nginx 后面，套接字对端是本机，
/// 所以优先信 Cloudflare 注入的 `CF-Connecting-IP`，退而取 `X-Forwarded-For` 首段。
fn client_ip(headers: &HeaderMap) -> String {
    if let Some(ip) = headers.get("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
        let t = ip.trim();
        if !t.is_empty() {
            return t.to_string();
        }
    }
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            let t = first.trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
    }
    "unknown".to_string()
}

/// 固定窗口限流。返回 true 表示放行；false 表示该 IP 本窗口内已超限。
fn rate_ok(ip: &str) -> bool {
    let now = Instant::now();
    let mut map = match RATE.lock() {
        Ok(m) => m,
        Err(p) => p.into_inner(), // 锁中毒也继续（限流非关键路径）
    };
    // 修剪过期项，避免 map 无限增长。
    if map.len() > 4096 {
        map.retain(|_, (start, _)| now.duration_since(*start) < RATE_WINDOW);
    }
    let entry = map.entry(ip.to_string()).or_insert((now, 0));
    if now.duration_since(entry.0) >= RATE_WINDOW {
        *entry = (now, 0);
    }
    entry.1 += 1;
    entry.1 <= RATE_LIMIT
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

    // 解析全部地址,**IPv4 优先**:本机 IPv6 出网不通,而 Gmail/Outlook 等会优先
    // 返回 AAAA(IPv6),若直接连第一个地址会卡到超时。逐个尝试直到连上。
    let mut addrs: Vec<SocketAddr> = (host, 993u16)
        .to_socket_addrs()
        .map_err(|_| "无法解析邮箱服务器地址。".to_string())?
        .collect();
    addrs.sort_by_key(|a| a.is_ipv6()); // false(IPv4) 排在前
    if addrs.is_empty() {
        return Err("无法解析邮箱服务器地址。".to_string());
    }
    // 单地址给足超时;多地址时缩短每个的尝试时间,避免坏地址拖满整体超时。
    let per_try = if addrs.len() > 1 {
        Duration::from_secs(8)
    } else {
        CONNECT_TIMEOUT
    };
    let tcp = addrs
        .iter()
        .find_map(|a| TcpStream::connect_timeout(a, per_try).ok())
        .ok_or_else(|| "无法连接到邮箱服务器，请稍后再试。".to_string())?;
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

/// 公共校验 + 限流 + 并发/超时包装，跑给定的阻塞闭包。
async fn run_guarded<F>(ip: String, email: String, token: String, job: F) -> Response
where
    F: FnOnce(String, String) -> Result<serde_json::Value, String> + Send + 'static,
{
    if email.trim().is_empty() || token.trim().is_empty() {
        return json_err(StatusCode::BAD_REQUEST, "请填写邮箱和应用专用密码。");
    }
    if !email.contains('@') {
        return json_err(StatusCode::BAD_REQUEST, "邮箱地址格式不正确。");
    }
    if imap_host(&email).is_none() {
        return json_err(StatusCode::BAD_REQUEST, "暂不支持该邮箱服务商。");
    }
    if !rate_ok(&ip) {
        return json_err(
            StatusCode::TOO_MANY_REQUESTS,
            "尝试过于频繁，请稍后再试。",
        );
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
pub async fn list(headers: HeaderMap, Json(req): Json<ListReq>) -> Response {
    let ip = client_ip(&headers);
    let limit = req.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
    run_guarded(ip, req.email, req.token, move |email, token| {
        list_blocking(email, token, limit)
    })
    .await
}

/// POST /api/mail/body —— 按 UID 拉取单封正文。
pub async fn body(headers: HeaderMap, Json(req): Json<BodyReq>) -> Response {
    let ip = client_ip(&headers);
    let uid = req.uid;
    run_guarded(ip, req.email, req.token, move |email, token| {
        body_blocking(email, token, uid)
    })
    .await
}
