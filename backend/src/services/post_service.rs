use crate::database::repositories::TagRepository;
use crate::database::{repositories::PostRepository, Database};
use crate::models::{
    AdjacentPosts, CreatePostRequest, Post, PostListQuery, PostWithDetails, UpdatePostRequest,
};
use crate::utils::error::{AppError, Result};
use crate::utils::text::markdown_image_urls;
use crate::utils::R2Storage;
use std::collections::HashSet;
use std::sync::Arc;

pub struct PostService {
    database: Database,
    r2_storage: Arc<R2Storage>,
}

impl PostService {
    pub fn new(database: Database, r2_storage: Arc<R2Storage>) -> Self {
        Self {
            database,
            r2_storage,
        }
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

    pub async fn list_posts_with_details(
        &self,
        query: PostListQuery,
    ) -> Result<(Vec<PostWithDetails>, i64)> {
        PostRepository::list_with_details(self.database.pool(), query).await
    }

    pub async fn update_post(
        &self,
        id: i64,
        mut request: UpdatePostRequest,
    ) -> Result<Option<Post>> {
        let Some(existing_post) = PostRepository::get_by_id(self.database.pool(), id).await? else {
            return Ok(None);
        };
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

        if let Some(updated_post) = &updated_post {
            self.delete_assets_removed_from_post(&existing_post, updated_post)
                .await;
        }
        Ok(updated_post)
    }

    pub async fn delete_post(&self, id: i64) -> Result<bool> {
        if let Some(post) = PostRepository::get_by_id(self.database.pool(), id).await? {
            let deleted = PostRepository::delete(self.database.pool(), id).await?;
            if deleted {
                self.delete_asset_urls(post_asset_urls(&post)).await;
            }
            Ok(deleted)
        } else {
            Ok(false)
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

    async fn delete_assets_removed_from_post(&self, before: &Post, after: &Post) {
        let before_urls = post_asset_urls(before);
        let after_urls = post_asset_urls(after);
        self.delete_asset_urls(before_urls.difference(&after_urls).cloned())
            .await;
    }

    async fn delete_asset_urls(&self, urls: impl IntoIterator<Item = String>) {
        for url in urls {
            if let Err(error) = self.r2_storage.delete_public_url(&url).await {
                tracing::warn!(
                    "Failed to delete unreferenced post asset '{}': {}",
                    url,
                    error
                );
            }
        }
    }
}

fn post_asset_urls(post: &Post) -> HashSet<String> {
    let mut urls: HashSet<String> = markdown_image_urls(&post.content).into_iter().collect();
    if let Some(cover_url) = &post.cover_url {
        urls.insert(cover_url.clone());
    }
    if let Some(stored_images) = &post.post_images {
        if let Ok(stored_images) = serde_json::from_str::<Vec<String>>(stored_images) {
            urls.extend(stored_images);
        }
    }
    urls
}
