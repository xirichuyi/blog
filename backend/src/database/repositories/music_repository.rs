use crate::database::DatabasePool;
use crate::models::{CreateMusicRequest, Music, MusicListQuery, MusicStatus, UpdateMusicRequest};
use crate::utils::error::Result;
use sqlx::Row;

pub struct MusicRepository;

impl MusicRepository {
    pub async fn create(pool: &DatabasePool, request: CreateMusicRequest) -> Result<Music> {
        let status = request.status.unwrap_or(MusicStatus::Published);

        let status_i32 = status as i32;

        let row = sqlx::query!(
            r#"
            INSERT INTO music (music_name, music_author, music_url, music_cover_url, status)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, music_name, music_author, music_url, music_cover_url, status, created_at, updated_at
            "#,
            request.music_name,
            request.music_author,
            request.music_url,
            request.music_cover_url,
            status_i32
        )
        .fetch_one(pool)
        .await?;

        Ok(Music {
            id: row.id,
            music_name: row.music_name,
            music_author: row.music_author,
            music_url: row.music_url,
            music_cover_url: row.music_cover_url,
            status: row.status as i32,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        })
    }

    pub async fn get_by_id(pool: &DatabasePool, id: i64) -> Result<Option<Music>> {
        let row = sqlx::query!(
            r#"
            SELECT id, music_name, music_author, music_url, music_cover_url, status, created_at, updated_at
            FROM music
            WHERE id = ? AND status != ?
            "#,
            id,
            MusicStatus::Deleted as i32
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|row| Music {
            id: row.id,
            music_name: row.music_name,
            music_author: row.music_author,
            music_url: row.music_url,
            music_cover_url: row.music_cover_url,
            status: row.status as i32,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn list(pool: &DatabasePool, query: MusicListQuery) -> Result<(Vec<Music>, i64)> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(10);
        let offset = (page - 1) * page_size;

        let mut where_conditions = vec!["status != ?".to_string()];
        let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send + Sync>> =
            vec![Box::new(MusicStatus::Deleted as i32)];

        if let Some(status) = query.status {
            where_conditions.push("status = ?".to_string());
            params.push(Box::new(status as i32));
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!("SELECT COUNT(*) as count FROM music WHERE {}", where_clause);
        let total: i64 = sqlx::query(&count_query)
            .bind(MusicStatus::Deleted as i32)
            .fetch_one(pool)
            .await?
            .get("count");

        // Get music
        let music_query = format!(
            "SELECT id, music_name, music_author, music_url, music_cover_url, status, created_at, updated_at 
             FROM music WHERE {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            where_clause
        );

        let rows = sqlx::query(&music_query)
            .bind(MusicStatus::Deleted as i32)
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?;

        let music_list: Vec<Music> = rows
            .into_iter()
            .map(|row| Music {
                id: row.get("id"),
                music_name: row.get("music_name"),
                music_author: row.get("music_author"),
                music_url: row.get("music_url"),
                music_cover_url: row.get("music_cover_url"),
                status: row.get::<i32, _>("status"),
                created_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("created_at")
                    .unwrap()
                    .and_utc(),
                updated_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("updated_at")
                    .unwrap()
                    .and_utc(),
            })
            .collect();

        Ok((music_list, total))
    }

    pub async fn update(
        pool: &DatabasePool,
        id: i64,
        request: UpdateMusicRequest,
    ) -> Result<Option<Music>> {
        let existing = Self::get_by_id(pool, id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let status_i32 = request.status.map(|s| s as i32);

        let row = sqlx::query!(
            r#"
            UPDATE music
            SET music_name = COALESCE(?, music_name),
                music_author = COALESCE(?, music_author),
                music_url = COALESCE(?, music_url),
                music_cover_url = COALESCE(?, music_cover_url),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING id, music_name, music_author, music_url, music_cover_url, status, created_at, updated_at
            "#,
            request.music_name,
            request.music_author,
            request.music_url,
            request.music_cover_url,
            status_i32,
            id
        )
        .fetch_one(pool)
        .await?;

        Ok(Some(Music {
            id: row.id.unwrap(),
            music_name: row.music_name,
            music_author: row.music_author,
            music_url: row.music_url,
            music_cover_url: row.music_cover_url,
            status: row.status as i32,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn delete(pool: &DatabasePool, id: i64) -> Result<bool> {
        let result = sqlx::query!(
            "UPDATE music SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            MusicStatus::Deleted as i32,
            id
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}
