use crate::database::DatabasePool;
use crate::models::{CreateDownloadRequest, Download, DownloadListQuery};
use crate::utils::error::Result;

pub struct DownloadRepository;

impl DownloadRepository {
    pub async fn create(pool: &DatabasePool, request: CreateDownloadRequest) -> Result<Download> {
        let row = sqlx::query!(
            r#"
            INSERT INTO downloads (file_name, file_url, file_type, file_size)
            VALUES (?, ?, ?, ?)
            RETURNING id, file_name, file_url, file_type, file_size, created_at, updated_at
            "#,
            request.file_name,
            request.file_url,
            request.file_type,
            request.file_size
        )
        .fetch_one(pool)
        .await?;

        Ok(Download {
            id: row.id,
            file_name: row.file_name,
            file_url: row.file_url,
            file_type: row.file_type,
            file_size: row.file_size,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        })
    }

    pub async fn get_by_id(pool: &DatabasePool, id: i64) -> Result<Option<Download>> {
        let row = sqlx::query!(
            "SELECT id, file_name, file_url, file_type, file_size, created_at, updated_at FROM downloads WHERE id = ?",
            id
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|row| Download {
            id: row.id,
            file_name: row.file_name,
            file_url: row.file_url,
            file_type: row.file_type,
            file_size: row.file_size,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn list(
        pool: &DatabasePool,
        query: DownloadListQuery,
    ) -> Result<(Vec<Download>, i64)> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(10);
        let offset = (page - 1) * page_size;

        // Get total count
        let total: i64 = sqlx::query!("SELECT COUNT(*) as count FROM downloads")
            .fetch_one(pool)
            .await?
            .count
            .into();

        // Get downloads
        let page_size_i64 = page_size as i64;
        let offset_i64 = offset as i64;

        let rows = sqlx::query!(
            "SELECT id, file_name, file_url, file_type, file_size, created_at, updated_at
             FROM downloads ORDER BY created_at DESC LIMIT ? OFFSET ?",
            page_size_i64,
            offset_i64
        )
        .fetch_all(pool)
        .await?;

        let downloads = rows
            .into_iter()
            .map(|row| Download {
                id: row.id,
                file_name: row.file_name,
                file_url: row.file_url,
                file_type: row.file_type,
                file_size: row.file_size,
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            })
            .collect();

        Ok((downloads, total))
    }

    pub async fn delete(pool: &DatabasePool, id: i64) -> Result<bool> {
        let result = sqlx::query!("DELETE FROM downloads WHERE id = ?", id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
