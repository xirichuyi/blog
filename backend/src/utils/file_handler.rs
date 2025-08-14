use crate::utils::error::{AppError, Result};
use axum_extra::extract::multipart::Field;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

#[derive(Clone)]
pub struct FileHandler {
    upload_dir: String,
    max_file_size: u64,
}

impl FileHandler {
    pub fn new(upload_dir: String, max_file_size: u64) -> Self {
        Self {
            upload_dir,
            max_file_size,
        }
    }

    pub async fn save_file(
        &self,
        mut field: Field,
        subfolder: &str,
    ) -> Result<(String, String, u64)> {
        // Get file name and validate
        let file_name = field
            .file_name()
            .ok_or_else(|| AppError::BadRequest("No file name provided".to_string()))?
            .to_string();

        // Note: File size validation will be done during reading

        // Generate unique file name
        let file_extension = Path::new(&file_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");

        let unique_name = format!(
            "{}_{}.{}",
            Uuid::new_v4(),
            chrono::Utc::now().timestamp(),
            file_extension
        );

        // Create directory path
        let dir_path = PathBuf::from(&self.upload_dir).join(subfolder);
        fs::create_dir_all(&dir_path).await?;

        // Create file path
        let file_path = dir_path.join(&unique_name);

        // Save file
        let mut file = fs::File::create(&file_path).await?;
        let mut total_size = 0u64;

        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| AppError::BadRequest(format!("Failed to read file chunk: {}", e)))?
        {
            total_size += chunk.len() as u64;
            if total_size > self.max_file_size {
                // Clean up partial file
                let _ = fs::remove_file(&file_path).await;
                return Err(AppError::BadRequest(
                    "File size exceeds maximum allowed size".to_string(),
                ));
            }
            file.write_all(&chunk).await?;
        }

        file.flush().await?;

        // Generate URL
        let file_url = format!("/uploads/{}/{}", subfolder, unique_name);

        Ok((file_url, unique_name, total_size))
    }

    pub async fn delete_file(&self, file_url: &str) -> Result<()> {
        if file_url.starts_with("/uploads/") {
            let relative_path = &file_url[9..]; // Remove "/uploads/" prefix
            let file_path = PathBuf::from(&self.upload_dir).join(relative_path);

            if file_path.exists() {
                fs::remove_file(file_path).await?;
            }
        }
        Ok(())
    }

    pub fn validate_file_type(&self, file_name: &str, allowed_types: &[&str]) -> Result<()> {
        let extension = Path::new(file_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !allowed_types.contains(&extension.as_str()) {
            return Err(AppError::BadRequest(format!(
                "File type '{}' is not allowed. Allowed types: {}",
                extension,
                allowed_types.join(", ")
            )));
        }

        Ok(())
    }

    pub fn get_file_type(&self, file_name: &str) -> String {
        mime_guess::from_path(file_name)
            .first_or_octet_stream()
            .to_string()
    }
}

// File type constants
pub const IMAGE_TYPES: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];
pub const MUSIC_TYPES: &[&str] = &["mp3", "wav", "flac", "aac", "ogg"];
pub const DOCUMENT_TYPES: &[&str] = &["pdf", "doc", "docx", "txt", "zip", "rar"];
