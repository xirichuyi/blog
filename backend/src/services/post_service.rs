use crate::database::repositories::TagRepository;
use crate::database::{repositories::PostRepository, Database};
use crate::models::{CreatePostRequest, Post, PostListQuery, PostWithDetails, UpdatePostRequest};
use crate::utils::error::{AppError, Result};
use crate::utils::FileHandler;
use std::sync::Arc;

pub struct PostService {
    database: Database,
    file_handler: Arc<FileHandler>,
}

impl PostService {
    pub fn new(database: Database, file_handler: Arc<FileHandler>) -> Self {
        Self {
            database,
            file_handler,
        }
    }

    pub async fn create_post(&self, request: CreatePostRequest) -> Result<Post> {
        PostRepository::create(self.database.pool(), request).await
    }

    pub async fn get_post_detail(&self, id: i64) -> Result<Option<Post>> {
        PostRepository::get_by_id_with_complete_info(self.database.pool(), id).await
    }

    pub async fn list_posts(&self, query: PostListQuery) -> Result<(Vec<Post>, i64)> {
        PostRepository::list_with_complete_info(self.database.pool(), query).await
    }

    pub async fn list_posts_with_details(
        &self,
        query: PostListQuery,
    ) -> Result<(Vec<PostWithDetails>, i64)> {
        PostRepository::list_with_details(self.database.pool(), query).await
    }

    pub async fn update_post(&self, id: i64, request: UpdatePostRequest) -> Result<Option<Post>> {
        PostRepository::update(self.database.pool(), id, request).await
    }

    pub async fn delete_post(&self, id: i64) -> Result<bool> {
        if let Some(post) = PostRepository::get_by_id(self.database.pool(), id).await? {
            if let Some(cover_url) = &post.cover_url {
                let _ = self.file_handler.delete_file(cover_url).await;
            }

            if let Some(post_images_json) = &post.post_images {
                if let Ok(image_urls) = serde_json::from_str::<Vec<String>>(post_images_json) {
                    for image_url in image_urls {
                        let _ = self.file_handler.delete_file(&image_url).await;
                    }
                }
            }

            PostRepository::delete(self.database.pool(), id).await
        } else {
            Ok(false)
        }
    }

    pub async fn update_post_cover(&self, id: i64, new_cover_url: String) -> Result<Option<Post>> {
        if let Some(existing_post) = PostRepository::get_by_id(self.database.pool(), id).await? {
            let mut tx = self.database.pool().begin().await?;

            let result = async {
                let update_request = UpdatePostRequest {
                    title: None,
                    cover_url: Some(new_cover_url),
                    content: None,
                    category_id: None,
                    status: None,
                    post_images: None,
                    pdf_url: None,
                };

                let updated_post =
                    PostRepository::update_in_tx(&mut tx, id, update_request).await?;

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
        let post = PostRepository::get_by_id(self.database.pool(), post_id).await?;
        if post.is_none() {
            return Err(AppError::NotFound("Post not found".to_string()));
        }

        TagRepository::update_post_tags(self.database.pool(), post_id, tag_ids).await
    }
}
