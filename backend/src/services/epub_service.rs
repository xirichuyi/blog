use crate::{
    models::BookFile,
    utils::{
        error::{AppError, Result},
        R2Storage,
    },
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{path::PathBuf, sync::Arc, time::Duration};
use tokio::{process::Command, sync::Mutex};

#[derive(Clone, Deserialize, Serialize)]
pub struct EpubSection {
    pub path: String,
    pub size: u64,
    pub linear: bool,
}

#[derive(Deserialize, Serialize)]
pub struct EpubManifest {
    pub package: String,
    pub sections: Vec<EpubSection>,
}

pub struct EpubService {
    storage: Arc<R2Storage>,
    preparing: Mutex<()>,
    root: PathBuf,
}

impl EpubService {
    pub fn new(storage: Arc<R2Storage>) -> Self {
        Self {
            storage,
            preparing: Mutex::new(()),
            root: PathBuf::from("data/epub-v1"),
        }
    }

    pub fn version(file: &BookFile) -> String {
        hex::encode(Sha256::digest(format!(
            "{}:{}:{}",
            file.id, file.r2_key, file.file_size
        )))[..24]
            .to_owned()
    }

    pub fn directory(&self, file: &BookFile) -> PathBuf {
        self.root.join(Self::version(file))
    }

    pub async fn manifest(&self, file: &BookFile) -> Result<EpubManifest> {
        let directory = self.directory(file);
        if !directory.join("manifest.json").is_file() {
            let _guard = self.preparing.lock().await;
            if !directory.join("manifest.json").is_file() {
                tokio::fs::create_dir_all(&self.root).await?;
                let staging = self.root.join(format!(".prepare-{}", uuid::Uuid::new_v4()));
                tokio::fs::create_dir(&staging).await?;
                let result = self.prepare(file, &staging, &directory).await;
                let _ = tokio::fs::remove_dir_all(&staging).await;
                result?;
            }
        }
        Ok(serde_json::from_slice(
            &tokio::fs::read(directory.join("manifest.json")).await?,
        )?)
    }

    async fn prepare(
        &self,
        file: &BookFile,
        staging: &std::path::Path,
        directory: &std::path::Path,
    ) -> Result<()> {
        let archive = staging.join("source.epub");
        self.storage
            .download_to(&file.r2_key, &archive, 256 * 1024 * 1024)
            .await?;
        let output = staging.join("prepared");
        let result = tokio::time::timeout(
            Duration::from_secs(120),
            Command::new("python3")
                .arg("-c")
                .arg(include_str!("../../scripts/prepare_epub.py"))
                .arg(&archive)
                .arg(&output)
                .kill_on_drop(true)
                .output(),
        )
        .await
        .map_err(|_| {
            AppError::GatewayTimeout("EPUB preparation timed out; retry opening the book".into())
        })??;
        if !result.status.success() {
            tracing::warn!(file_id = file.id, error = %String::from_utf8_lossy(&result.stderr), "EPUB preparation failed");
            return Err(AppError::BadRequest(
                "This EPUB could not be prepared for chapter reading".into(),
            ));
        }
        tokio::fs::rename(output, directory).await?;
        Ok(())
    }
}
