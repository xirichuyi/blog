//! 在线工具端点：调用 Python 脚本完成任务后返回结果。

use axum::{
    body::Body,
    extract::Json,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use serde::Deserialize;
use std::net::{IpAddr, ToSocketAddrs};
use std::process::Stdio;
use std::sync::LazyLock;
use std::time::Duration;
use tokio::process::Command;
use tokio::sync::Semaphore;

/// 同时只允许一个转换任务（保护小内存机器，防止 OOM 拖垮博客）。
static JOB_SEM: LazyLock<Semaphore> = LazyLock::new(|| Semaphore::new(1));

// GNU `timeout` 杀掉整个进程组（含 pandoc 孙进程），是真正的时限。
const SCRIPT_TIMEOUT_SECS: u64 = 85;
// tokio 兜底（万一 `timeout` 本身卡住），整体仍留在 Cloudflare 100s 以内。
const HARD_TIMEOUT_SECS: u64 = 95;

#[derive(Deserialize)]
pub struct Gitbook2EpubRequest {
    url: String,
}

fn json_err(code: StatusCode, msg: &str) -> Response {
    (
        code,
        Json(serde_json::json!({ "code": code.as_u16(), "message": msg, "data": null })),
    )
        .into_response()
}

/// SSRF 防护：只允许指向公网的 http/https 链接。
fn is_public_http_url(raw: &str) -> bool {
    let lower = raw.to_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return false;
    }
    let after = match raw.find("://") {
        Some(i) => &raw[i + 3..],
        None => return false,
    };
    let authority = after.split(['/', '?', '#']).next().unwrap_or("");
    // 去掉 userinfo
    let host_port = authority.rsplit('@').next().unwrap_or(authority);
    // 去掉端口（兼容 IPv6 [::1]:443）
    let host = if let Some(rest) = host_port.strip_prefix('[') {
        rest.split(']').next().unwrap_or("")
    } else {
        host_port.split(':').next().unwrap_or("")
    };
    if host.is_empty() {
        return false;
    }
    let addrs = match (host, 443u16).to_socket_addrs() {
        Ok(a) => a,
        Err(_) => return false,
    };
    let mut any = false;
    for a in addrs {
        any = true;
        if !ip_is_public(a.ip()) {
            return false;
        }
    }
    any
}

fn ip_is_public(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            !(v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local() // 含 169.254.169.254 云元数据
                || v4.is_broadcast()
                || v4.is_unspecified()
                || v4.is_documentation()
                || v4.octets()[0] == 0)
        }
        IpAddr::V6(v6) => {
            if v6.is_loopback() || v6.is_unspecified() {
                return false;
            }
            if let Some(v4) = v6.to_ipv4() {
                return ip_is_public(IpAddr::V4(v4));
            }
            let seg0 = v6.segments()[0];
            // ULA fc00::/7、link-local fe80::/10
            !((seg0 & 0xfe00) == 0xfc00 || (seg0 & 0xffc0) == 0xfe80)
        }
    }
}

/// POST /api/tools/gitbook2epub  body: { "url": "..." }
/// 成功返回 epub 二进制（下载）；失败返回 JSON。
pub async fn gitbook2epub(Json(req): Json<Gitbook2EpubRequest>) -> Response {
    let url = req.url.trim().to_string();
    if url.len() > 2048 || !is_public_http_url(&url) {
        return json_err(
            StatusCode::BAD_REQUEST,
            "无效或不被允许的链接（必须是公网 http/https 在线书地址）",
        );
    }

    // 单任务串行：占不到就直接拒绝
    let _permit = match JOB_SEM.try_acquire() {
        Ok(p) => p,
        Err(_) => {
            return json_err(
                StatusCode::TOO_MANY_REQUESTS,
                "服务器正在转换其它任务，请稍后再试",
            )
        }
    };

    let script = std::env::var("GITBOOK2EPUB_SCRIPT")
        .unwrap_or_else(|_| "/var/www/blog/backend/tools/gitbook2epub/gitbook2epub.py".to_string());
    let workdir = std::env::temp_dir();
    let job_id = uuid::Uuid::new_v4();
    let out = workdir.join(format!("gb2epub-{job_id}.epub"));
    // 默认缓存目录在脚本旁边（生产环境只读），必须显式指向可写的临时目录。
    let cache = workdir.join(format!("gb2epub-cache-{job_id}"));

    // 通过 GNU `timeout` 启动：到点用 SIGKILL 杀掉整个进程组，连带 pandoc 孙进程，
    // 避免超时后残留进程在小内存机器上继续吃内存。
    let mut cmd = Command::new("timeout");
    cmd.arg("-s")
        .arg("KILL")
        .arg("-k")
        .arg("5")
        .arg(SCRIPT_TIMEOUT_SECS.to_string())
        .arg("python3")
        .arg(&script)
        .arg(&url)
        .arg("-o")
        .arg(&out)
        .arg("--no-auto-install") // 服务器上绝不自动 pip 安装/下载浏览器
        .arg("--cache")
        .arg(&cache)
        .current_dir(&workdir)
        .kill_on_drop(true)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());

    let result = tokio::time::timeout(Duration::from_secs(HARD_TIMEOUT_SECS), cmd.output()).await;

    let cleanup = || async {
        let _ = tokio::fs::remove_file(&out).await;
        let _ = tokio::fs::remove_dir_all(&cache).await;
    };

    match result {
        Err(_) => {
            cleanup().await;
            json_err(
                StatusCode::GATEWAY_TIMEOUT,
                "转换超时（书太大或站点太慢），请换更小的书或稍后再试",
            )
        }
        Ok(Err(e)) => {
            tracing::error!("gitbook2epub 启动失败: {}", e);
            cleanup().await;
            json_err(StatusCode::INTERNAL_SERVER_ERROR, "服务器无法启动转换")
        }
        Ok(Ok(output)) => {
            // GNU timeout 在超时杀掉命令时自身以 124 退出。
            if output.status.code() == Some(124) {
                cleanup().await;
                return json_err(
                    StatusCode::GATEWAY_TIMEOUT,
                    "转换超时（书太大或站点太慢），请换更小的书或稍后再试",
                );
            }
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                tracing::warn!("gitbook2epub 失败: {}", stderr.trim());
                let hint = if stderr.contains("pandoc") {
                    "服务器缺少 pandoc"
                } else if stderr.contains("SSRFError") || stderr.contains("blocked") {
                    "该链接指向了不被允许的地址"
                } else {
                    "转换失败，请确认链接是可访问的 gitbook / bookdown 在线书"
                };
                cleanup().await;
                return json_err(StatusCode::BAD_GATEWAY, hint);
            }
            match tokio::fs::read(&out).await {
                Ok(bytes) => {
                    cleanup().await;
                    Response::builder()
                        .status(StatusCode::OK)
                        .header(header::CONTENT_TYPE, "application/epub+zip")
                        .header(header::CONTENT_DISPOSITION, "attachment; filename=\"book.epub\"")
                        .body(Body::from(bytes))
                        .unwrap()
                }
                Err(_) => {
                    cleanup().await;
                    json_err(StatusCode::INTERNAL_SERVER_ERROR, "转换完成但读取文件失败")
                }
            }
        }
    }
}
