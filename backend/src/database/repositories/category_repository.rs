use crate::database::DatabasePool;
use crate::models::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use crate::utils::error::{AppError, Result};

pub struct CategoryRepository;

impl CategoryRepository {
    pub async fn create(pool: &DatabasePool, request: CreateCategoryRequest) -> Result<Category> {
        // Check if category name already exists
        let existing = sqlx::query!("SELECT id FROM categories WHERE name = ?", request.name)
            .fetch_optional(pool)
            .await?;

        if existing.is_some() {
            return Err(AppError::BadRequest(
                "Category name already exists".to_string(),
            ));
        }

        let row = sqlx::query!(
            r#"
            INSERT INTO categories (name)
            VALUES (?)
            RETURNING id, name, created_at, updated_at
            "#,
            request.name
        )
        .fetch_one(pool)
        .await?;

        Ok(Category {
            id: row.id,
            name: row.name,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        })
    }

    pub async fn get_by_id(pool: &DatabasePool, id: i64) -> Result<Option<Category>> {
        let row = sqlx::query!(
            "SELECT id, name, created_at, updated_at FROM categories WHERE id = ?",
            id
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|row| Category {
            id: row.id,
            name: row.name,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn list(pool: &DatabasePool) -> Result<Vec<Category>> {
        let rows = sqlx::query!(
            "SELECT id, name, created_at, updated_at FROM categories ORDER BY name ASC"
        )
        .fetch_all(pool)
        .await?;

        let categories = rows
            .into_iter()
            .map(|row| Category {
                id: row.id.unwrap(),
                name: row.name,
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            })
            .collect();

        Ok(categories)
    }

    pub async fn update(
        pool: &DatabasePool,
        id: i64,
        request: UpdateCategoryRequest,
    ) -> Result<Option<Category>> {
        // Check if category exists
        let existing = Self::get_by_id(pool, id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        // Check if new name conflicts with existing category
        let name_conflict = sqlx::query!(
            "SELECT id FROM categories WHERE name = ? AND id != ?",
            request.name,
            id
        )
        .fetch_optional(pool)
        .await?;

        if name_conflict.is_some() {
            return Err(AppError::BadRequest(
                "Category name already exists".to_string(),
            ));
        }

        let row = sqlx::query!(
            r#"
            UPDATE categories 
            SET name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING id, name, created_at, updated_at
            "#,
            request.name,
            id
        )
        .fetch_one(pool)
        .await?;

        Ok(Some(Category {
            id: row.id.unwrap(),
            name: row.name,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn delete(pool: &DatabasePool, id: i64) -> Result<bool> {
        let mut tx = pool.begin().await?;

        let result = async {
            // Lock the category record to prevent concurrent modifications
            let category = sqlx::query!("SELECT id, name FROM categories WHERE id = ?", id)
                .fetch_optional(&mut *tx)
                .await?;

            if category.is_none() {
                return Err(AppError::NotFound("Category not found".to_string()));
            }

            // Check if category is being used by any posts (in same transaction)
            let posts_using_category = sqlx::query!(
                "SELECT COUNT(*) as count FROM posts WHERE category_id = ? AND status != 2",
                id
            )
            .fetch_one(&mut *tx)
            .await?;

            if posts_using_category.count > 0 {
                return Err(AppError::BadRequest(
                    "Cannot delete category that is being used by posts".to_string(),
                ));
            }

            // Delete the category
            let result = sqlx::query!("DELETE FROM categories WHERE id = ?", id)
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
}
