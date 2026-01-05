use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PdfDocument {
    pub id: i64,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub post_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UploadPdfRequest {
    pub post_id: Option<i64>,
}
