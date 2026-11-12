use crate::database::repositories::TagRepository;
use crate::database::{repositories::PostRepository, Database};
use crate::models::{
    AdjacentPosts, CreatePostRequest, NullablePatch, Post, PostListQuery, UpdatePostRequest,
};
use crate::utils::error::{AppError, Result};
use crate::utils::password::{hash_password, verify_password, MAX_PASSWORD_CHARS};
use crate::utils::text::markdown_image_urls;
use crate::utils::R2Storage;
use std::sync::Arc;

pub struct PostService {
    database: Database,
}

/// 解锁加密文章的结果。
pub enum UnlockOutcome {
    Unlocked(Box<Post>),
    WrongPassword,
    NotFound,
}

/// PBKDF2 是 CPU 密集操作，放到阻塞线程池，避免卡住异步运行时。
async fn hash_post_password(password: String) -> Result<String> {
    if password.chars().count() > MAX_PASSWORD_CHARS {
        return Err(AppError::Validation(format!(
            "访问密码不能超过 {MAX_PASSWORD_CHARS} 个字符"
        )));
    }
    tokio::task::spawn_blocking(move || hash_password(&password))
        .await
        .map_err(|error| AppError::Internal(format!("password hashing failed: {error}")))
}

impl PostService {
    pub fn new(database: Database, _r2_storage: Arc<R2Storage>) -> Self {
        Self { database }
    }

    pub async fn create_post(&self, mut request: CreatePostRequest) -> Result<Post> {
        request.post_images = Some(markdown_image_urls(&request.content));
        let tag_ids = request.tag_ids.clone();
        let password_hash = match request.password.take().filter(|value| !value.is_empty()) {
            Some(password) => Some(hash_post_password(password).await?),
            None => None,
        };
        let mut tx = self.database.pool().begin().await?;
        let post = PostRepository::create_in_tx(&mut tx, request, password_hash).await?;
        if let Some(tag_ids) = tag_ids {
            TagRepository::update_post_tags_in_tx(&mut tx, post.id, &tag_ids).await?;
        }
        tx.commit().await?;
        Ok(post)
    }

    pub async fn get_post_detail(&self, id: i64) -> Result<Option<Post>> {
        PostRepository::get_by_id_with_complete_info(self.database.pool(), id).await
    }

    /// 校验访问密码，正确时返回完整文章。未加密的已发布文章直接返回。
    pub async fn unlock_post(&self, id: i64, password: String) -> Result<UnlockOutcome> {
        let pool = self.database.pool();
        let Some(stored) = PostRepository::get_published_password_hash(pool, id).await? else {
            return Ok(UnlockOutcome::NotFound);
        };
        if let Some(stored) = stored {
            if password.chars().count() > MAX_PASSWORD_CHARS {
                return Ok(UnlockOutcome::WrongPassword);
            }
            let matches = tokio::task::spawn_blocking(move || verify_password(&password, &stored))
                .await
                .map_err(|error| AppError::Internal(format!("password check failed: {error}")))?;
            if !matches {
                return Ok(UnlockOutcome::WrongPassword);
            }
        }
        Ok(
            match PostRepository::get_by_id_with_complete_info(pool, id).await? {
                Some(post) => UnlockOutcome::Unlocked(Box::new(post)),
                None => UnlockOutcome::NotFound,
            },
        )
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

        let password_hash = match std::mem::take(&mut request.password) {
            NullablePatch::Missing => NullablePatch::Missing,
            NullablePatch::Value(password) if !password.is_empty() => {
                NullablePatch::Value(hash_post_password(password).await?)
            }
            NullablePatch::Null | NullablePatch::Value(_) => NullablePatch::Null,
        };

        let tag_ids = request.tag_ids.clone();
        let updated_post = if let Some(tag_ids) = tag_ids {
            let mut tx = self.database.pool().begin().await?;
            let Some(post) =
                PostRepository::update_in_tx(&mut tx, id, request, password_hash).await?
            else {
                tx.rollback().await?;
                return Ok(None);
            };
            TagRepository::update_post_tags_in_tx(&mut tx, id, &tag_ids).await?;
            tx.commit().await?;
            Some(post)
        } else {
            PostRepository::update(self.database.pool(), id, request, password_hash).await?
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
