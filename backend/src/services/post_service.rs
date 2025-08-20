use crate::database::repositories::TagRepository;
use crate::database::{repositories::PostRepository, Database};
use crate::models::{CreatePostRequest, Post, PostListQuery, PostWithTags, UpdatePostRequest};
use crate::utils::error::{AppError, Result};
use crate::utils::FileHandler;

pub struct PostService {
    database: Database,
    file_handler: FileHandler,
}

impl PostService {
    pub fn new(database: Database, file_handler: FileHandler) -> Self {
        Self {
            database,
            file_handler,
        }
    }

    pub async fn create_post(&self, request: CreatePostRequest) -> Result<Post> {
        PostRepository::create(self.database.pool(), request).await
    }

    #[allow(dead_code)]
    pub async fn get_post(&self, id: i64) -> Result<Option<Post>> {
        PostRepository::get_by_id(self.database.pool(), id).await
    }

    pub async fn get_post_detail(&self, id: i64) -> Result<Option<Post>> {
        PostRepository::get_by_id(self.database.pool(), id).await
    }

    // 为了保持向后兼容性，保留这个方法但标记为已弃用
    #[deprecated(note = "Use get_post_detail instead")]
    #[allow(dead_code)]
    pub async fn get_post_with_tags(&self, id: i64) -> Result<Option<PostWithTags>> {
        let post = PostRepository::get_by_id(self.database.pool(), id).await?;

        if let Some(post) = post {
            let tags = TagRepository::get_post_tags(self.database.pool(), id).await?;
            Ok(Some(PostWithTags { post, tags }))
        } else {
            Ok(None)
        }
    }

    pub async fn list_posts(&self, query: PostListQuery) -> Result<(Vec<Post>, i64)> {
        PostRepository::list(self.database.pool(), query).await
    }

    pub async fn update_post(&self, id: i64, request: UpdatePostRequest) -> Result<Option<Post>> {
        PostRepository::update(self.database.pool(), id, request).await
    }

    pub async fn delete_post(&self, id: i64) -> Result<bool> {
        // Get post to check for files to delete
        if let Some(post) = PostRepository::get_by_id(self.database.pool(), id).await? {
            // Delete cover image if exists
            if let Some(cover_url) = &post.cover_url {
                let _ = self.file_handler.delete_file(cover_url).await;
            }

            // Delete post images if exists
            if let Some(post_images_json) = &post.post_images {
                if let Ok(image_urls) = serde_json::from_str::<Vec<String>>(post_images_json) {
                    for image_url in image_urls {
                        let _ = self.file_handler.delete_file(&image_url).await;
                    }
                }
            }

            // Soft delete the post
            PostRepository::delete(self.database.pool(), id).await
        } else {
            Ok(false)
        }
    }

    pub async fn update_post_cover(&self, id: i64, new_cover_url: String) -> Result<Option<Post>> {
        // Get existing post to delete old cover
        if let Some(existing_post) = PostRepository::get_by_id(self.database.pool(), id).await? {
            // Start transaction for atomic operation
            let mut tx = self.database.pool().begin().await?;

            let result = async {
                // Update database first
                let update_request = UpdatePostRequest {
                    title: None,
                    cover_url: Some(new_cover_url),
                    content: None,
                    category_id: None,
                    status: None,
                    post_images: None,
                };

                let updated_post =
                    PostRepository::update_in_tx(&mut tx, id, update_request).await?;

                // Only delete old file after successful database update
                if let Some(old_cover_url) = &existing_post.cover_url {
                    let _ = self.file_handler.delete_file(old_cover_url).await;
                }

                Ok(updated_post)
            }
            .await;

            match result {
                Ok(post) => {
                    tx.commit().await?;
                    Ok(post)
                }
                Err(e) => {
                    tx.rollback().await?;
                    Err(e)
                }
            }
        } else {
            Ok(None)
        }
    }

    pub async fn get_post_tags(&self, post_id: i64) -> Result<Vec<crate::models::Tag>> {
        TagRepository::get_post_tags(self.database.pool(), post_id).await
    }

    pub async fn update_post_tags(&self, post_id: i64, tag_ids: Vec<i64>) -> Result<()> {
        // Verify post exists
        let post = PostRepository::get_by_id(self.database.pool(), post_id).await?;
        if post.is_none() {
            return Err(AppError::NotFound("Post not found".to_string()));
        }

        TagRepository::update_post_tags(self.database.pool(), post_id, tag_ids).await
    }
}
