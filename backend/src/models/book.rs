use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BookRecord {
    pub id: i64,
    pub title: String,
    pub author: String,
    pub description: String,
    pub cover_url: Option<String>,
    pub reading_status: String,
    pub progress: i64,
    pub rating: Option<i64>,
    pub notes: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub is_public: bool,
    pub download_enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Book {
    #[serde(flatten)]
    pub record: BookRecord,
    pub files: Vec<BookFile>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BookFile {
    pub id: i64,
    pub book_id: i64,
    pub format: String,
    pub file_url: String,
    pub r2_key: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBookRequest {
    pub title: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub description: String,
    pub cover_url: Option<String>,
    #[serde(default = "default_reading_status")]
    pub reading_status: String,
    #[serde(default)]
    pub progress: i64,
    pub rating: Option<i64>,
    #[serde(default)]
    pub notes: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    #[serde(default = "default_true")]
    pub is_public: bool,
    #[serde(default)]
    pub download_enabled: bool,
}

#[derive(Debug, Default, Deserialize)]
pub struct UpdateBookRequest {
    pub title: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<Option<String>>,
    pub reading_status: Option<String>,
    pub progress: Option<i64>,
    pub rating: Option<Option<i64>>,
    pub notes: Option<String>,
    pub started_at: Option<Option<String>>,
    pub finished_at: Option<Option<String>>,
    pub is_public: Option<bool>,
    pub download_enabled: Option<bool>,
}

#[derive(Debug)]
pub struct CreateBookFile {
    pub book_id: i64,
    pub format: String,
    pub file_url: String,
    pub r2_key: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
}

fn default_reading_status() -> String {
    "want_to_read".to_string()
}

fn default_true() -> bool {
    true
}
