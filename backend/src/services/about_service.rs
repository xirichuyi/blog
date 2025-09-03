use crate::database::Database;
use crate::models::{About, UpdateAboutRequest};
use crate::utils::FileHandler;
use anyhow::Result;

#[derive(Clone)]
pub struct AboutService {
    database: Database,
    _file_handler: FileHandler,
}

impl AboutService {
    pub fn new(database: Database, file_handler: FileHandler) -> Self {
        Self {
            database,
            _file_handler: file_handler,
        }
    }

    pub async fn get(&self) -> Result<About> {
        let about = sqlx::query_as::<_, About>(
            "SELECT id, title, subtitle, content, photo_url, updated_at FROM about WHERE id = 1",
        )
        .fetch_optional(self.database.pool())
        .await?
        .ok_or_else(|| anyhow::anyhow!("About page not found"))?;
        Ok(about)
    }

    pub async fn update(&self, req: UpdateAboutRequest) -> Result<About> {
        let current = self.get().await?;
        let title = req.title.unwrap_or(current.title);
        let subtitle = req.subtitle.unwrap_or(current.subtitle);
        let content = req.content.unwrap_or(current.content);
        let photo_url = req.photo_url.or(current.photo_url);

        sqlx::query("UPDATE about SET title = ?, subtitle = ?, content = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
            .bind(&title)
            .bind(&subtitle)
            .bind(&content)
            .bind(&photo_url)
            .execute(self.database.pool())
            .await?;

        self.get().await
    }
}
