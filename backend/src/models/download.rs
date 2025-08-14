use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Download {
    pub id: i64,
    pub file_name: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDownloadRequest {
    pub file_name: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DownloadListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

impl Default for DownloadListQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(10),
        }
    }
}
