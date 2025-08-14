use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Post {
    pub id: i64,
    pub title: String,
    pub cover_url: Option<String>,
    pub content: String,
    pub category_id: Option<i64>,
    pub status: i32,
    pub post_images: Option<String>, // JSON array of image URLs
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[repr(i32)]
pub enum PostStatus {
    Draft = 0,
    Published = 1,
    Deleted = 2,
    Private = 3,
}

impl From<i32> for PostStatus {
    fn from(value: i32) -> Self {
        match value {
            0 => PostStatus::Draft,
            1 => PostStatus::Published,
            2 => PostStatus::Deleted,
            3 => PostStatus::Private,
            _ => PostStatus::Draft,
        }
    }
}

impl From<PostStatus> for i32 {
    fn from(status: PostStatus) -> Self {
        status as i32
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub cover_url: Option<String>,
    pub content: String,
    pub category_id: Option<i64>,
    pub status: Option<PostStatus>,
    pub post_images: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub cover_url: Option<String>,
    pub content: Option<String>,
    pub category_id: Option<i64>,
    pub status: Option<PostStatus>,
    pub post_images: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct PostWithTags {
    #[serde(flatten)]
    pub post: Post,
    pub tags: Vec<super::tag::Tag>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub category_id: Option<i64>,
    pub status: Option<PostStatus>,
}

impl Default for PostListQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(10),
            category_id: None,
            status: None,
        }
    }
}
