use crate::database::{repositories::DownloadRepository, Database};
use crate::models::{CreateDownloadRequest, Download, DownloadListQuery};
use crate::utils::error::Result;
use crate::utils::FileHandler;
use std::sync::Arc;

pub struct DownloadService {
    database: Database,
    file_handler: Arc<FileHandler>,
}

impl DownloadService {
    pub fn new(database: Database, file_handler: Arc<FileHandler>) -> Self {
        Self {
            database,
            file_handler,
        }
    }

    pub async fn create_download(&self, request: CreateDownloadRequest) -> Result<Download> {
        DownloadRepository::create(self.database.pool(), request).await
    }

    pub async fn get_download(&self, id: i64) -> Result<Option<Download>> {
        DownloadRepository::get_by_id(self.database.pool(), id).await
    }

    pub async fn list_downloads(&self, query: DownloadListQuery) -> Result<(Vec<Download>, i64)> {
        DownloadRepository::list(self.database.pool(), query).await
    }

    pub async fn delete_download(&self, id: i64) -> Result<bool> {
        if let Some(download) = DownloadRepository::get_by_id(self.database.pool(), id).await? {
            let _ = self.file_handler.delete_file(&download.file_url).await;
            DownloadRepository::delete(self.database.pool(), id).await
        } else {
            Ok(false)
        }
    }
}
