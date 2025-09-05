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

#[derive(Debug, Clone, Copy, Serialize)]
#[repr(i32)]
pub enum PostStatus {
    Draft = 0,
    Published = 1,
    Deleted = 2,
    Private = 3,
}

impl<'de> serde::Deserialize<'de> for PostStatus {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::Error;

        struct PostStatusVisitor;

        impl<'de> serde::de::Visitor<'de> for PostStatusVisitor {
            type Value = PostStatus;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a string or integer representing PostStatus")
            }

            fn visit_str<E>(self, value: &str) -> Result<PostStatus, E>
            where
                E: Error,
            {
                match value {
                    "Draft" => Ok(PostStatus::Draft),
                    "Published" => Ok(PostStatus::Published),
                    "Deleted" => Ok(PostStatus::Deleted),
                    "Private" => Ok(PostStatus::Private),
                    "0" => Ok(PostStatus::Draft),
                    "1" => Ok(PostStatus::Published),
                    "2" => Ok(PostStatus::Deleted),
                    "3" => Ok(PostStatus::Private),
                    _ => Err(Error::unknown_variant(
                        value,
                        &[
                            "Draft",
                            "Published",
                            "Deleted",
                            "Private",
                            "0",
                            "1",
                            "2",
                            "3",
                        ],
                    )),
                }
            }

            fn visit_i64<E>(self, value: i64) -> Result<PostStatus, E>
            where
                E: Error,
            {
                match value {
                    0 => Ok(PostStatus::Draft),
                    1 => Ok(PostStatus::Published),
                    2 => Ok(PostStatus::Deleted),
                    3 => Ok(PostStatus::Private),
                    _ => Err(Error::invalid_value(
                        serde::de::Unexpected::Signed(value),
                        &"0, 1, 2, or 3",
                    )),
                }
            }

            fn visit_u64<E>(self, value: u64) -> Result<PostStatus, E>
            where
                E: Error,
            {
                self.visit_i64(value as i64)
            }
        }

        deserializer.deserialize_any(PostStatusVisitor)
    }
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

#[derive(Debug, Serialize)]
pub struct PostWithDetails {
    pub post: Post,
    pub tags: Vec<super::tag::Tag>,
    pub category_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub category_id: Option<i64>,
    pub status: Option<PostStatus>,
    pub search: Option<String>,
    pub tag_id: Option<i64>,
}

impl Default for PostListQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(10),
            category_id: None,
            status: None,
            search: None,
            tag_id: None,
        }
    }
}
