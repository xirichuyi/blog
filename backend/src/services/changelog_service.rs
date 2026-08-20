use crate::database::Database;
use crate::models::{ChangelogEntry, CreateChangelogRequest, UpdateChangelogRequest};
use crate::utils::error::{AppError, Result};
use chrono::Utc;

const CHANGELOG_COLUMNS: &str =
    "id, version, title, content, published_at, status, created_at, updated_at";

pub struct ChangelogService {
    database: Database,
}

impl ChangelogService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self, published_only: bool) -> Result<Vec<ChangelogEntry>> {
        let sql = if published_only {
            format!("SELECT {CHANGELOG_COLUMNS} FROM changelog_entries WHERE status = 1 ORDER BY published_at DESC, id DESC")
        } else {
            format!("SELECT {CHANGELOG_COLUMNS} FROM changelog_entries ORDER BY published_at DESC, id DESC")
        };
        sqlx::query_as::<_, ChangelogEntry>(&sql)
            .fetch_all(self.database.pool())
            .await
            .map_err(Into::into)
    }

    pub async fn get(&self, id: i64) -> Result<ChangelogEntry> {
        sqlx::query_as::<_, ChangelogEntry>(&format!(
            "SELECT {CHANGELOG_COLUMNS} FROM changelog_entries WHERE id = ?"
        ))
        .bind(id)
        .fetch_optional(self.database.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Changelog entry not found".to_string()))
    }

    pub async fn create(&self, request: CreateChangelogRequest) -> Result<ChangelogEntry> {
        validate_entry(&request.title, &request.content, request.status)?;
        let result = sqlx::query(
            "INSERT INTO changelog_entries (version, title, content, published_at, status) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(request.version.trim())
        .bind(request.title.trim())
        .bind(request.content)
        .bind(request.published_at.unwrap_or_else(Utc::now))
        .bind(request.status)
        .execute(self.database.pool())
        .await?;
        self.get(result.last_insert_rowid()).await
    }

    pub async fn update(&self, id: i64, request: UpdateChangelogRequest) -> Result<ChangelogEntry> {
        let current = self.get(id).await?;
        let title = request.title.unwrap_or(current.title);
        let content = request.content.unwrap_or(current.content);
        let status = request.status.unwrap_or(current.status);
        validate_entry(&title, &content, status)?;
        sqlx::query(
            "UPDATE changelog_entries SET version = ?, title = ?, content = ?, published_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(request.version.unwrap_or(current.version))
        .bind(title.trim())
        .bind(content)
        .bind(request.published_at.unwrap_or(current.published_at))
        .bind(status)
        .bind(id)
        .execute(self.database.pool())
        .await?;
        self.get(id).await
    }

    pub async fn delete(&self, id: i64) -> Result<()> {
        self.get(id).await?;
        sqlx::query("DELETE FROM changelog_entries WHERE id = ?")
            .bind(id)
            .execute(self.database.pool())
            .await?;
        Ok(())
    }
}

fn validate_entry(title: &str, content: &str, status: i64) -> Result<()> {
    if title.trim().is_empty() || content.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Title and content are required".to_string(),
        ));
    }
    if !matches!(status, 0 | 1) {
        return Err(AppError::BadRequest("Invalid changelog status".to_string()));
    }
    Ok(())
}
