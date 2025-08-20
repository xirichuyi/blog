use crate::database::DatabasePool;
use crate::models::{CreateTagRequest, Tag, UpdateTagRequest};
use crate::utils::error::{AppError, Result};

pub struct TagRepository;

impl TagRepository {
    pub async fn create(pool: &DatabasePool, request: CreateTagRequest) -> Result<Tag> {
        // Check if tag name already exists
        let existing = sqlx::query!("SELECT id FROM tags WHERE name = ?", request.name)
            .fetch_optional(pool)
            .await?;

        if existing.is_some() {
            return Err(AppError::BadRequest("Tag name already exists".to_string()));
        }

        let row = sqlx::query!(
            r#"
            INSERT INTO tags (name)
            VALUES (?)
            RETURNING id, name, created_at, updated_at
            "#,
            request.name
        )
        .fetch_one(pool)
        .await?;

        Ok(Tag {
            id: row.id,
            name: row.name,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        })
    }

    pub async fn get_by_id(pool: &DatabasePool, id: i64) -> Result<Option<Tag>> {
        let row = sqlx::query!(
            "SELECT id, name, created_at, updated_at FROM tags WHERE id = ?",
            id
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|row| Tag {
            id: row.id,
            name: row.name,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn list(pool: &DatabasePool) -> Result<Vec<Tag>> {
        let rows =
            sqlx::query!("SELECT id, name, created_at, updated_at FROM tags ORDER BY name ASC")
                .fetch_all(pool)
                .await?;

        let tags = rows
            .into_iter()
            .map(|row| Tag {
                id: row.id.unwrap(),
                name: row.name,
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            })
            .collect();

        Ok(tags)
    }

    pub async fn update(
        pool: &DatabasePool,
        id: i64,
        request: UpdateTagRequest,
    ) -> Result<Option<Tag>> {
        // Check if tag exists
        let existing = Self::get_by_id(pool, id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let row = sqlx::query!(
            r#"
            UPDATE tags 
            SET name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING id, name, created_at, updated_at
            "#,
            request.name,
            id
        )
        .fetch_one(pool)
        .await?;

        Ok(Some(Tag {
            id: row.id.unwrap(),
            name: row.name,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn delete(pool: &DatabasePool, id: i64) -> Result<bool> {
        let mut tx = pool.begin().await?;

        let result = async {
            // Lock the tag record to prevent concurrent modifications
            let tag = sqlx::query!("SELECT id, name FROM tags WHERE id = ?", id)
                .fetch_optional(&mut *tx)
                .await?;

            if tag.is_none() {
                return Err(AppError::NotFound("Tag not found".to_string()));
            }

            // Check if tag is being used by any posts (in same transaction)
            let posts_using_tag = sqlx::query!(
                "SELECT COUNT(*) as count FROM post_tags WHERE tag_id = ?",
                id
            )
            .fetch_one(&mut *tx)
            .await?;

            if posts_using_tag.count > 0 {
                return Err(AppError::BadRequest(
                    "Cannot delete tag that is being used by posts".to_string(),
                ));
            }

            // Delete the tag
            let result = sqlx::query!("DELETE FROM tags WHERE id = ?", id)
                .execute(&mut *tx)
                .await?;

            Ok(result.rows_affected() > 0)
        }
        .await;

        match result {
            Ok(deleted) => {
                tx.commit().await?;
                Ok(deleted)
            }
            Err(e) => {
                tx.rollback().await?;
                Err(e)
            }
        }
    }

    // Post-Tag relationship methods
    pub async fn get_post_tags(pool: &DatabasePool, post_id: i64) -> Result<Vec<Tag>> {
        let rows = sqlx::query!(
            r#"
            SELECT t.id, t.name, t.created_at, t.updated_at
            FROM tags t
            INNER JOIN post_tags pt ON t.id = pt.tag_id
            WHERE pt.post_id = ?
            ORDER BY t.name ASC
            "#,
            post_id
        )
        .fetch_all(pool)
        .await?;

        let tags = rows
            .into_iter()
            .map(|row| Tag {
                id: row.id,
                name: row.name,
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            })
            .collect();

        Ok(tags)
    }

    pub async fn update_post_tags(
        pool: &DatabasePool,
        post_id: i64,
        tag_ids: Vec<i64>,
    ) -> Result<()> {
        let mut tx = pool.begin().await?;

        let result = async {
            // Verify post exists and is not deleted
            let post_exists = sqlx::query!(
                "SELECT id FROM posts WHERE id = ? AND status != 2",
                post_id
            )
            .fetch_optional(&mut *tx)
            .await?;

            if post_exists.is_none() {
                return Err(AppError::NotFound("Post not found or deleted".to_string()));
            }

            // Batch verify all tags exist (more efficient than individual checks)
            if !tag_ids.is_empty() {
                let tag_ids_json = serde_json::to_string(&tag_ids)?;
                let existing_tags = sqlx::query!(
                    "SELECT COUNT(*) as count FROM tags WHERE id IN (SELECT value FROM json_each(?))",
                    tag_ids_json
                )
                .fetch_one(&mut *tx)
                .await?;

                if existing_tags.count.unwrap_or(0) as usize != tag_ids.len() {
                    return Err(AppError::BadRequest(
                        "One or more tags do not exist".to_string(),
                    ));
                }
            }

            // Delete existing post-tag relationships
            sqlx::query!("DELETE FROM post_tags WHERE post_id = ?", post_id)
                .execute(&mut *tx)
                .await?;

            // Batch insert new post-tag relationships
            for tag_id in tag_ids {
                sqlx::query!(
                    "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)",
                    post_id,
                    tag_id
                )
                .execute(&mut *tx)
                .await?;
            }

            Ok(())
        }.await;

        match result {
            Ok(_) => {
                tx.commit().await?;
                Ok(())
            }
            Err(e) => {
                tx.rollback().await?;
                Err(e)
            }
        }
    }
}
