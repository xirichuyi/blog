use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ChangelogEntry {
    pub id: i64,
    pub version: String,
    pub title: String,
    pub content: String,
    pub published_at: DateTime<Utc>,
    pub status: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChangelogRequest {
    #[serde(default)]
    pub version: String,
    pub title: String,
    pub content: String,
    pub published_at: Option<DateTime<Utc>>,
    #[serde(default = "published")]
    pub status: i64,
}

#[derive(Debug, Default, Deserialize)]
pub struct UpdateChangelogRequest {
    pub version: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub status: Option<i64>,
}

fn published() -> i64 {
    1
}
