use crate::models::{PostListQuery, PostStatus};
use crate::services::Services;
use axum::{
    extract::State,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};

const SITE_URL: &str = "https://blog.chuyi.uk";
const SITE_TITLE: &str = "Chuyi's Blog";
const SITE_DESC: &str = "Welcome to Chuyi's blog. Sharing tech articles, tutorials and thoughts.";
const AUTHOR_EMAIL: &str = "admin@chuyi.uk";
const AUTHOR_NAME: &str = "Chuyi";

pub async fn rss_feed(
    State(services): State<Services>,
) -> Result<Response, StatusCode> {
    let query = PostListQuery {
        page: Some(1),
        page_size: Some(20),
        status: Some(PostStatus::Published),
        search: None,
        category_id: None,
        tag_id: None,
    };

    match services.post.list_posts(query).await {
        Ok((posts, _total)) => {
            let now = chrono::Utc::now().to_rfc2822();
            let year = chrono::Utc::now().format("%Y");

            let items: Vec<String> = posts
                .iter()
                .map(|post| {
                    let pub_date = post.created_at.to_rfc2822();
                    let description = truncate_utf8(&post.content, 300);
                    // Escape XML special characters
                    let title = escape_xml(&post.title);
                    let description = escape_xml(&description);

                    format!(
                        r#"    <item>
      <title><![CDATA[{title}]]></title>
      <link>{SITE_URL}/article/{id}</link>
      <guid isPermaLink="true">{SITE_URL}/article/{id}</guid>
      <description><![CDATA[{description}]]></description>
      <pubDate>{pub_date}</pubDate>
      <author>{AUTHOR_EMAIL} ({AUTHOR_NAME})</author>
    </item>"#,
                        id = post.id,
                    )
                })
                .collect();

            let xml = format!(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{SITE_TITLE}</title>
    <link>{SITE_URL}</link>
    <description>{SITE_DESC}</description>
    <language>zh-cn</language>
    <lastBuildDate>{now}</lastBuildDate>
    <atom:link href="{SITE_URL}/api/rss" rel="self" type="application/rss+xml"/>
    <generator>{SITE_TITLE}</generator>
    <managingEditor>{AUTHOR_EMAIL} ({AUTHOR_NAME})</managingEditor>
    <copyright>Copyright {year} {AUTHOR_NAME}. All rights reserved.</copyright>
{items}
  </channel>
</rss>"#,
                items = items.join("\n"),
            );

            Ok((
                [(header::CONTENT_TYPE, "application/rss+xml; charset=utf-8")],
                xml,
            )
                .into_response())
        }
        Err(e) => {
            tracing::error!("Failed to generate RSS feed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

fn truncate_utf8(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    // Find a valid char boundary at or before max_bytes
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}...", &s[..end])
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
