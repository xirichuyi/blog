use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Music {
    pub id: i64,
    pub music_name: String,
    pub music_author: String,
    pub music_url: String,
    pub music_cover_url: Option<String>,
    pub status: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[repr(i32)]
pub enum MusicStatus {
    Published = 1,
    Deleted = 2,
}

impl From<i32> for MusicStatus {
    fn from(value: i32) -> Self {
        match value {
            1 => MusicStatus::Published,
            2 => MusicStatus::Deleted,
            _ => MusicStatus::Published,
        }
    }
}

impl From<MusicStatus> for i32 {
    fn from(status: MusicStatus) -> Self {
        status as i32
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateMusicRequest {
    pub music_name: String,
    pub music_author: String,
    pub music_url: String,
    pub music_cover_url: Option<String>,
    pub status: Option<MusicStatus>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMusicRequest {
    pub music_name: Option<String>,
    pub music_author: Option<String>,
    pub music_url: Option<String>,
    pub music_cover_url: Option<String>,
    pub status: Option<MusicStatus>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MusicListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub status: Option<MusicStatus>,
}

impl Default for MusicListQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(10),
            status: None,
        }
    }
}
