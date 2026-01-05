use crate::config::constants::UPLOADS_URL_PREFIX;
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
        let file_url = format!("{}{}/{}", UPLOADS_URL_PREFIX, subfolder, unique_name);

        Ok((file_url, unique_name, total_size))
    }

    /// 从URL中提取相对路径，移除/uploads/前缀
    pub fn strip_url_prefix(file_url: &str) -> Option<&str> {
        file_url.strip_prefix(UPLOADS_URL_PREFIX)
    }

    pub async fn delete_file(&self, file_url: &str) -> Result<()> {
        if let Some(relative_path) = Self::strip_url_prefix(file_url) {

            // Prevent path traversal attacks
            if relative_path.contains("..") || relative_path.contains("//") {
                return Err(AppError::BadRequest("Invalid file path".to_string()));
            }

            let upload_dir = PathBuf::from(&self.upload_dir);
            let file_path = upload_dir.join(relative_path);

            // Ensure the file path is within the upload directory
            if !file_path.starts_with(&upload_dir) {
                return Err(AppError::BadRequest("Invalid file path".to_string()));
            }

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

    /// Save PDF file with original filename (handle conflicts by appending number)
    pub async fn save_pdf_with_original_name(
        &self,
        mut field: Field,
        subfolder: &str,
    ) -> Result<(String, String, u64)> {
        // Get original file name
        let original_name = field
            .file_name()
            .ok_or_else(|| AppError::BadRequest("No file name provided".to_string()))?
            .to_string();

        // Sanitize filename (remove path components)
        let sanitized_name = Path::new(&original_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&original_name)
            .to_string();

        // Create directory path
        let dir_path = PathBuf::from(&self.upload_dir).join(subfolder);
        fs::create_dir_all(&dir_path).await?;

        // Handle filename conflicts
        let mut file_name = sanitized_name.clone();
        let mut file_path = dir_path.join(&file_name);
        let mut counter = 1;

        while file_path.exists() {
            let stem = Path::new(&sanitized_name)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file");
            let extension = Path::new(&sanitized_name)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("pdf");

            file_name = format!("{}_{}.{}", stem, counter, extension);
            file_path = dir_path.join(&file_name);
            counter += 1;
        }

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
        let file_url = format!("{}{}/{}", UPLOADS_URL_PREFIX, subfolder, file_name);

        Ok((file_url, file_name, total_size))
    }

    /// Get file path from URL
    pub fn get_file_path(&self, file_url: &str) -> Result<PathBuf> {
        if let Some(relative_path) = Self::strip_url_prefix(file_url) {
            // Prevent path traversal attacks
            if relative_path.contains("..") || relative_path.contains("//") {
                return Err(AppError::BadRequest("Invalid file path".to_string()));
            }

            let upload_dir = PathBuf::from(&self.upload_dir);
            let file_path = upload_dir.join(relative_path);

            // Ensure the file path is within the upload directory
            if !file_path.starts_with(&upload_dir) {
                return Err(AppError::BadRequest("Invalid file path".to_string()));
            }

            Ok(file_path)
        } else {
            Err(AppError::BadRequest("Invalid file URL".to_string()))
        }
    }
}

// File type constants
pub const IMAGE_TYPES: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];
pub const MUSIC_TYPES: &[&str] = &["mp3", "wav", "flac", "aac", "ogg"];
pub const DOCUMENT_TYPES: &[&str] = &["pdf", "doc", "docx", "txt", "zip", "rar"];
pub const PDF_TYPES: &[&str] = &["pdf"];
