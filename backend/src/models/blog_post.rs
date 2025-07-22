use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BlogPost {
    pub id: i64,
    pub title: String,
    pub excerpt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub slug: String,
    pub date: String, // ISO 8601 format for API compatibility
    pub categories: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPostCreate {
    pub title: String,
    pub excerpt: String,
    pub content: String,
    pub slug: Option<String>, // Auto-generated if not provided
    pub date: Option<String>, // Current date if not provided
    pub categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPostUpdate {
    pub title: Option<String>,
    pub excerpt: Option<String>,
    pub content: Option<String>,
    pub slug: Option<String>,
    pub date: Option<String>,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPostsResponse {
    pub posts: Vec<BlogPost>,
    #[serde(rename = "totalPosts")]
    pub total_posts: i64,
    #[serde(rename = "totalPages")]
    pub total_pages: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPostResponse {
    pub success: bool,
    pub message: Option<String>,
    pub post: Option<BlogPost>,
}

// Database row structure for SQLite
#[derive(Debug, FromRow)]
pub struct BlogPostRow {
    pub id: i64,
    pub title: String,
    pub excerpt: String,
    pub content: String,
    pub slug: String,
    pub date: String,
    pub categories: String, // JSON string
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<BlogPostRow> for BlogPost {
    fn from(row: BlogPostRow) -> Self {
        let categories: Vec<String> =
            serde_json::from_str(&row.categories).unwrap_or_else(|_| vec![]);

        BlogPost {
            id: row.id,
            title: row.title,
            excerpt: row.excerpt,
            content: Some(row.content),
            slug: row.slug,
            date: row.date,
            categories,
            created_at: Some(row.created_at),
            updated_at: Some(row.updated_at),
        }
    }
}

impl BlogPost {
    pub fn without_content(mut self) -> Self {
        self.content = None;
        self
    }
}
