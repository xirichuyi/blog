use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct About {
    pub id: i64,
    pub title: String,
    pub subtitle: String,
    pub content: String,
    pub photo_url: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAboutRequest {
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub content: Option<String>,
    pub photo_url: Option<String>,
}

