use crate::database::repositories::TagRepository;
use crate::database::{repositories::PostRepository, Database};
use crate::models::{AdjacentPosts, CreatePostRequest, Post, PostListQuery, UpdatePostRequest};
use crate::utils::error::{AppError, Result};
use crate::utils::text::markdown_image_urls;
use crate::utils::R2Storage;
use std::sync::Arc;

pub struct PostService {
    database: Database,
}

impl PostService {
    pub fn new(database: Database, _r2_storage: Arc<R2Storage>) -> Self {
        Self { database }
    }

    pub async fn create_post(&self, mut request: CreatePostRequest) -> Result<Post> {
        request.post_images = Some(markdown_image_urls(&request.content));
        let tag_ids = request.tag_ids.clone();
        let mut tx = self.database.pool().begin().await?;
        let post = PostRepository::create_in_tx(&mut tx, request).await?;
        if let Some(tag_ids) = tag_ids {
            TagRepository::update_post_tags_in_tx(&mut tx, post.id, &tag_ids).await?;
        }
        tx.commit().await?;
        Ok(post)
    }

    pub async fn get_post_detail(&self, id: i64) -> Result<Option<Post>> {
        PostRepository::get_by_id_with_complete_info(self.database.pool(), id).await
    }

    pub async fn get_adjacent_posts(&self, id: i64) -> Result<Option<AdjacentPosts>> {
        PostRepository::get_adjacent_published(self.database.pool(), id).await
    }

    pub async fn list_posts(&self, query: PostListQuery) -> Result<(Vec<Post>, i64)> {
        PostRepository::list_with_complete_info(self.database.pool(), query).await
    }

    pub async fn update_post(
        &self,
        id: i64,
        mut request: UpdatePostRequest,
    ) -> Result<Option<Post>> {
        if let Some(content) = &request.content {
            request.post_images = crate::models::NullablePatch::Value(markdown_image_urls(content));
        }

        let tag_ids = request.tag_ids.clone();
        let updated_post = if let Some(tag_ids) = tag_ids {
            let mut tx = self.database.pool().begin().await?;
            let Some(post) = PostRepository::update_in_tx(&mut tx, id, request).await? else {
                tx.rollback().await?;
                return Ok(None);
            };
            TagRepository::update_post_tags_in_tx(&mut tx, id, &tag_ids).await?;
            tx.commit().await?;
            Some(post)
        } else {
            PostRepository::update(self.database.pool(), id, request).await?
        };

        // Saving Markdown only changes references. Images can still be used by
        // another post, an older revision, or an editor undo/local draft.
        // Never permanently delete media as a side effect of saving a post.
        Ok(updated_post)
    }

    pub async fn delete_post(&self, id: i64) -> Result<bool> {
        // Deleting an article is not permission to destroy potentially shared
        // media. Object deletion remains an explicit storage operation.
        PostRepository::delete(self.database.pool(), id).await
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
