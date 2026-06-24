//! 动态 SEO:为爬虫/社交分享在服务端把每个页面的 <head> meta 注入进 SPA 外壳,
//! 并提供动态 sitemap.xml。面向 Google/Bing 为主——它们能跑 JS,所以这里**只注入
//! meta**(标题/描述/OG/Twitter/canonical/JSON-LD),不渲染正文。
//!
//! nginx 把「文件不存在」的文档请求(SPA 路由)和 /sitemap.xml 反代到这里:
//!   location / { try_files $uri @ssr; }
//!   location @ssr { proxy_pass 127.0.0.1:3006; ... error_page 500 502 503 504 =200 /index.html; }
//! 后端任何异常都由 nginx 兜底回静态 index.html,可用性不受影响。

use axum::{
    extract::State,
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use std::sync::LazyLock;

use crate::models::post::{Post, PostListQuery, PostStatus};
use crate::routes::AppState;

const SITE: &str = "https://blog.chuyi.uk";
const SITE_NAME: &str = "chuyi's blog";
const DEFAULT_DESC: &str = "chuyi's blog —— 全栈开发、技术笔记与思考。";

/// 构建好的 dist/index.html 路径(prod);可用环境变量覆盖。每次请求读取,
/// **不缓存**:每次部署都会换带哈希的新 bundle,缓存旧外壳会指向已删除的 js。
fn dist_index_path() -> String {
    std::env::var("SEO_DIST_INDEX")
        .unwrap_or_else(|_| "/var/www/blog/frontend/dist/index.html".to_string())
}

static TITLE_RE: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(r"(?is)<title>.*?</title>").unwrap());
static DESC_RE: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(r#"(?is)<meta\s+name=["']description["'][^>]*>"#).unwrap());

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Markdown/HTML → 纯文本摘要(给 description 用)。
fn excerpt(content: &str, max: usize) -> String {
    let mut t = content.to_string();
    // 代码块、图片、链接(保留链接文字)、行内代码、标题/强调标记、HTML 标签
    for (re, rep) in [
        (r"(?s)```.*?```", ""),
        (r"!\[[^\]]*\]\([^)]*\)", ""),
        (r"\[([^\]]+)\]\([^)]*\)", "$1"),
        (r"`([^`]+)`", "$1"),
        (r"(?m)^#{1,6}\s+", ""),
        (r"[*_>#~]", ""),
        (r"<[^>]+>", ""),
        (r"https?://\S+", ""),
        (r"\s+", " "),
    ] {
        t = regex::Regex::new(re).unwrap().replace_all(&t, rep).into_owned();
    }
    let t = t.trim();
    let chars: Vec<char> = t.chars().collect();
    if chars.len() > max {
        format!("{}…", chars[..max].iter().collect::<String>().trim_end())
    } else {
        t.to_string()
    }
}

/// 封面/图片转绝对 URL(R2 已是 http;/uploads 等相对路径补上站点前缀)。
fn abs_url(u: &str) -> String {
    if u.starts_with("http://") || u.starts_with("https://") {
        u.to_string()
    } else if u.starts_with('/') {
        format!("{SITE}{u}")
    } else {
        format!("{SITE}/{u}")
    }
}

struct Meta {
    title: String,
    description: String,
    url: String,
    image: Option<String>,
    og_type: &'static str,
    jsonld: String,
}

fn website_jsonld() -> String {
    serde_json::json!({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": SITE,
    })
    .to_string()
}

fn article_jsonld(p: &Post, url: &str, image: &Option<String>) -> String {
    let mut v = serde_json::json!({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": p.title,
        "datePublished": p.created_at.to_rfc3339(),
        "dateModified": p.updated_at.to_rfc3339(),
        "author": { "@type": "Person", "name": "chuyi" },
        "publisher": { "@type": "Organization", "name": SITE_NAME },
        "mainEntityOfPage": url,
    });
    if let Some(img) = image {
        v["image"] = serde_json::Value::String(img.clone());
    }
    v.to_string()
}

/// 静态路由的标题/描述。
fn static_meta(path: &str) -> Meta {
    let (title, desc) = match path {
        "/" => (SITE_NAME.to_string(), DEFAULT_DESC.to_string()),
        "/articles" => (format!("文章归档 · {SITE_NAME}"), "全部技术文章与笔记归档。".to_string()),
        "/projects" => (
            format!("Projects · {SITE_NAME}"),
            "开源项目与自建在线工具。".to_string(),
        ),
        "/about" => (format!("About · {SITE_NAME}"), "关于 chuyi。".to_string()),
        "/contact" => (format!("Contact · {SITE_NAME}"), "联系方式。".to_string()),
        _ => (SITE_NAME.to_string(), DEFAULT_DESC.to_string()),
    };
    Meta {
        title,
        description: desc,
        url: format!("{SITE}{path}"),
        image: None,
        og_type: "website",
        jsonld: website_jsonld(),
    }
}

async fn build_meta(state: &AppState, path: &str) -> Meta {
    // 文章详情页 /article/:id
    if let Some(rest) = path.strip_prefix("/article/") {
        if let Ok(id) = rest.trim_end_matches('/').parse::<i64>() {
            if let Ok(Some(post)) = state.services.post.get_post_detail(id).await {
                let url = format!("{SITE}/article/{id}");
                let image = post.cover_url.as_deref().map(abs_url);
                let desc = {
                    let e = excerpt(&post.content, 150);
                    if e.is_empty() { DEFAULT_DESC.to_string() } else { e }
                };
                let jsonld = article_jsonld(&post, &url, &image);
                return Meta {
                    title: format!("{} · {SITE_NAME}", post.title),
                    description: desc,
                    url,
                    image,
                    og_type: "article",
                    jsonld,
                };
            }
        }
    }
    static_meta(path)
}

fn inject(html: &str, m: &Meta) -> String {
    let html = TITLE_RE.replace(html, format!("<title>{}</title>", esc(&m.title)).as_str());
    let html = DESC_RE.replace(&html, "");
    let card = if m.image.is_some() { "summary_large_image" } else { "summary" };
    let mut h = String::new();
    h.push_str(&format!("<meta name=\"description\" content=\"{}\">", esc(&m.description)));
    h.push_str(&format!("<link rel=\"canonical\" href=\"{}\">", esc(&m.url)));
    h.push_str(&format!("<meta property=\"og:type\" content=\"{}\">", m.og_type));
    h.push_str(&format!("<meta property=\"og:site_name\" content=\"{}\">", esc(SITE_NAME)));
    h.push_str(&format!("<meta property=\"og:title\" content=\"{}\">", esc(&m.title)));
    h.push_str(&format!("<meta property=\"og:description\" content=\"{}\">", esc(&m.description)));
    h.push_str(&format!("<meta property=\"og:url\" content=\"{}\">", esc(&m.url)));
    h.push_str(&format!("<meta name=\"twitter:card\" content=\"{card}\">"));
    h.push_str(&format!("<meta name=\"twitter:title\" content=\"{}\">", esc(&m.title)));
    h.push_str(&format!("<meta name=\"twitter:description\" content=\"{}\">", esc(&m.description)));
    if let Some(img) = &m.image {
        h.push_str(&format!("<meta property=\"og:image\" content=\"{}\">", esc(img)));
        h.push_str(&format!("<meta name=\"twitter:image\" content=\"{}\">", esc(img)));
    }
    // JSON-LD:防 </script> 提前闭合
    h.push_str(&format!(
        "<script type=\"application/ld+json\">{}</script>",
        m.jsonld.replace("</", "<\\/")
    ));
    html.replacen("</head>", &format!("{h}</head>"), 1)
}

async fn sitemap(state: &AppState) -> Response {
    let query = PostListQuery {
        page: Some(1),
        page_size: Some(2000),
        category_id: None,
        status: Some(PostStatus::Published),
        search: None,
        tag_id: None,
    };
    let posts = state
        .services
        .post
        .list_posts(query)
        .await
        .map(|(p, _)| p)
        .unwrap_or_default();

    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    );
    for (loc, freq) in [
        ("/", "daily"),
        ("/articles", "daily"),
        ("/projects", "weekly"),
        ("/about", "monthly"),
        ("/contact", "monthly"),
    ] {
        xml.push_str(&format!(
            "<url><loc>{SITE}{loc}</loc><changefreq>{freq}</changefreq></url>"
        ));
    }
    for p in posts {
        xml.push_str(&format!(
            "<url><loc>{SITE}/article/{}</loc><lastmod>{}</lastmod><changefreq>weekly</changefreq></url>",
            p.id,
            p.updated_at.format("%Y-%m-%d")
        ));
    }
    xml.push_str("</urlset>");
    (
        [(header::CONTENT_TYPE, "application/xml; charset=utf-8")],
        xml,
    )
        .into_response()
}

fn robots() -> Response {
    let body = format!("User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: {SITE}/sitemap.xml\n");
    ([(header::CONTENT_TYPE, "text/plain; charset=utf-8")], body).into_response()
}

/// SPA 兜底:sitemap/robots 直接给,其余路径返回注入了 meta 的 index.html 外壳。
pub async fn spa_fallback(State(state): State<AppState>, uri: Uri) -> Response {
    let path = uri.path().to_string();
    if path == "/sitemap.xml" {
        return sitemap(&state).await;
    }
    if path == "/robots.txt" {
        return robots();
    }
    let html = match tokio::fs::read_to_string(dist_index_path()).await {
        Ok(h) => h,
        // 读不到外壳:交给 nginx error_page 兜底回静态 index.html
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let meta = build_meta(&state, &path).await;
    (
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        inject(&html, &meta),
    )
        .into_response()
}
