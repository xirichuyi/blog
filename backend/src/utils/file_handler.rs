use crate::config::constants::UPLOADS_URL_PREFIX;
use crate::config::S3Config;
use crate::utils::error::{AppError, Result};
use axum_extra::extract::multipart::Field;
use chrono::Utc;
use hmac::{Hmac, Mac};
use image::{imageops::FilterType, DynamicImage, GenericImageView};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use webp::Encoder as WebPEncoder;

/// Image optimization configuration
#[derive(Clone)]
pub struct ImageOptimizeOptions {
    pub max_width: u32,
    pub max_height: u32,
    pub quality: u8,
}

impl Default for ImageOptimizeOptions {
    fn default() -> Self {
        Self {
            max_width: 1024,
            max_height: 768,
            quality: 80,
        }
    }
}

#[derive(Clone)]
struct S3Info {
    endpoint: String,
    host: String,
    bucket: String,
    access_key: String,
    secret_key: String,
    region: String,
    public_url: String,
    http: reqwest::Client,
}

#[derive(Clone)]
pub struct FileHandler {
    upload_dir: String,
    max_file_size: u64,
    s3: Option<S3Info>,
}

impl FileHandler {
    pub fn new(upload_dir: String, max_file_size: u64, s3_config: Option<&S3Config>) -> Self {
        let s3 = s3_config.filter(|config| config.enabled).map(|config| {
            let endpoint = config.endpoint.trim_end_matches('/').to_string();
            let host = endpoint
                .trim_start_matches("https://")
                .trim_start_matches("http://")
                .trim_end_matches('/')
                .to_string();
            tracing::info!(
                "Cloudflare R2 enabled for bucket '{}' via '{}'",
                config.bucket,
                config.public_url
            );
            S3Info {
                endpoint,
                host,
                bucket: config.bucket.clone(),
                access_key: config.access_key.clone(),
                secret_key: config.secret_key.clone(),
                region: config.region.clone(),
                public_url: config.public_url.trim_end_matches('/').to_string(),
                http: reqwest::Client::new(),
            }
        });

        Self {
            upload_dir,
            max_file_size,
            s3,
        }
    }

    async fn upload_image_to_s3(&self, key: &str, data: &[u8]) -> Result<Option<String>> {
        let Some(s3) = &self.s3 else {
            return Ok(None);
        };

        let encoded_key = Self::encode_s3_key(key);
        let payload_hash = hex::encode(Sha256::digest(data));
        let path = format!("/{}/{}", s3.bucket, encoded_key);
        let canonical_request = format!(
            "PUT\n{path}\n\ncontent-type:image/webp\nhost:{}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{{amz_date}}\n\ncontent-type;host;x-amz-content-sha256;x-amz-date\n{payload_hash}",
            s3.host
        );
        let (authorization, amz_date) = Self::sign_s3_request(
            s3,
            &canonical_request,
            "content-type;host;x-amz-content-sha256;x-amz-date",
        );

        let response = s3
            .http
            .put(format!("{}{}", s3.endpoint, path))
            .header("Content-Type", "image/webp")
            .header("Host", &s3.host)
            .header("x-amz-content-sha256", &payload_hash)
            .header("x-amz-date", &amz_date)
            .header("Authorization", authorization)
            .body(data.to_vec())
            .send()
            .await
            .map_err(|error| AppError::Internal(format!("R2 upload failed: {error}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!(
                "R2 upload failed with {status}: {body}"
            )));
        }

        Ok(Some(format!("{}/{}", s3.public_url, key)))
    }

    async fn delete_from_s3(&self, key: &str) -> Result<()> {
        let Some(s3) = &self.s3 else {
            return Ok(());
        };

        let encoded_key = Self::encode_s3_key(key);
        let empty_hash = hex::encode(Sha256::digest(b""));
        let path = format!("/{}/{}", s3.bucket, encoded_key);
        let canonical_request = format!(
            "DELETE\n{path}\n\nhost:{}\nx-amz-content-sha256:{empty_hash}\nx-amz-date:{{amz_date}}\n\nhost;x-amz-content-sha256;x-amz-date\n{empty_hash}",
            s3.host
        );
        let (authorization, amz_date) = Self::sign_s3_request(
            s3,
            &canonical_request,
            "host;x-amz-content-sha256;x-amz-date",
        );

        let response = s3
            .http
            .delete(format!("{}{}", s3.endpoint, path))
            .header("Host", &s3.host)
            .header("x-amz-content-sha256", &empty_hash)
            .header("x-amz-date", &amz_date)
            .header("Authorization", authorization)
            .send()
            .await
            .map_err(|error| AppError::Internal(format!("R2 delete failed: {error}")))?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(AppError::Internal(format!(
                "R2 delete failed with {}",
                response.status()
            )))
        }
    }

    fn sign_s3_request(
        s3: &S3Info,
        canonical_request: &str,
        signed_headers: &str,
    ) -> (String, String) {
        let now = Utc::now();
        let date = now.format("%Y%m%d").to_string();
        let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
        let scope = format!("{}/{}/s3/aws4_request", date, s3.region);
        let canonical_request = canonical_request.replace("{amz_date}", &amz_date);
        let string_to_sign = format!(
            "AWS4-HMAC-SHA256\n{}\n{}\n{}",
            amz_date,
            scope,
            hex::encode(Sha256::digest(canonical_request.as_bytes()))
        );

        let date_key =
            Self::hmac_sha256(format!("AWS4{}", s3.secret_key).as_bytes(), date.as_bytes());
        let region_key = Self::hmac_sha256(&date_key, s3.region.as_bytes());
        let service_key = Self::hmac_sha256(&region_key, b"s3");
        let signing_key = Self::hmac_sha256(&service_key, b"aws4_request");
        let signature = hex::encode(Self::hmac_sha256(&signing_key, string_to_sign.as_bytes()));
        let authorization = format!(
            "AWS4-HMAC-SHA256 Credential={}/{},SignedHeaders={},Signature={}",
            s3.access_key, scope, signed_headers, signature
        );

        (authorization, amz_date)
    }

    fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
        let mut mac = Hmac::<Sha256>::new_from_slice(key)
            .unwrap_or_else(|_| unreachable!("HMAC-SHA256 accepts any key length"));
        mac.update(data);
        mac.finalize().into_bytes().to_vec()
    }

    fn encode_s3_key(key: &str) -> String {
        key.split('/')
            .map(|segment| urlencoding::encode(segment).into_owned())
            .collect::<Vec<_>>()
            .join("/")
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
        if let Some(s3) = &self.s3 {
            let public_prefix = format!("{}/", s3.public_url);
            if let Some(key) = file_url.strip_prefix(&public_prefix) {
                return self.delete_from_s3(key).await;
            }
        }

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
            self.delete_from_s3(relative_path).await?;
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

    /// Save and optimize image (resize + convert to WebP)
    pub async fn save_optimized_image(
        &self,
        mut field: Field,
        subfolder: &str,
        options: Option<ImageOptimizeOptions>,
    ) -> Result<(String, String, u64)> {
        let options = options.unwrap_or_default();

        // Get file name and validate
        let file_name = field
            .file_name()
            .ok_or_else(|| AppError::BadRequest("No file name provided".to_string()))?
            .to_string();

        // Read entire file into memory for processing
        let mut data = Vec::new();
        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| AppError::BadRequest(format!("Failed to read file chunk: {}", e)))?
        {
            if data.len() + chunk.len() > self.max_file_size as usize {
                return Err(AppError::BadRequest(
                    "File size exceeds maximum allowed size".to_string(),
                ));
            }
            data.extend_from_slice(&chunk);
        }

        // Process image
        let source_size = data.len();
        let optimized_data =
            tokio::task::spawn_blocking(move || Self::optimize_image_data(&data, &options))
                .await
                .map_err(|error| AppError::Internal(format!("Image task failed: {error}")))??;

        // Generate unique WebP file name
        let unique_name = format!("{}_{}.webp", Uuid::new_v4(), chrono::Utc::now().timestamp());
        let file_size = optimized_data.len() as u64;
        let s3_key = format!("{}/{}", subfolder, unique_name);

        if let Some(file_url) = self.upload_image_to_s3(&s3_key, &optimized_data).await? {
            tracing::info!(
                "Image optimized and uploaded to R2: {} -> {} ({}KB -> {}KB)",
                file_name,
                s3_key,
                source_size / 1024,
                file_size / 1024
            );
            return Ok((file_url, unique_name, file_size));
        }

        // Create directory path
        let dir_path = PathBuf::from(&self.upload_dir).join(subfolder);
        fs::create_dir_all(&dir_path).await?;

        // Create file path
        let file_path = dir_path.join(&unique_name);

        // Save optimized file
        fs::write(&file_path, &optimized_data).await?;

        // Generate URL
        let file_url = format!("{}{}/{}", UPLOADS_URL_PREFIX, subfolder, unique_name);

        tracing::info!(
            "Image optimized: {} -> {} ({}KB -> {}KB)",
            file_name,
            unique_name,
            source_size / 1024,
            file_size / 1024
        );

        Ok((file_url, unique_name, file_size))
    }

    /// Optimize image data: resize if needed and convert to WebP with quality setting
    fn optimize_image_data(data: &[u8], options: &ImageOptimizeOptions) -> Result<Vec<u8>> {
        // Load image
        let img = image::load_from_memory(data)
            .map_err(|e| AppError::BadRequest(format!("Failed to load image: {}", e)))?;

        // Resize if needed (maintain aspect ratio)
        let img = Self::resize_image_if_needed(img, options.max_width, options.max_height);

        // Convert to RGBA for WebP encoder
        let rgba = img.to_rgba8();
        let (width, height) = img.dimensions();

        // Encode to WebP with quality setting
        let encoder = WebPEncoder::from_rgba(&rgba, width, height);
        let webp_data = encoder.encode(options.quality as f32);

        Ok(webp_data.to_vec())
    }

    /// Resize image if it exceeds max dimensions (maintain aspect ratio)
    fn resize_image_if_needed(img: DynamicImage, max_width: u32, max_height: u32) -> DynamicImage {
        let (width, height) = (img.width(), img.height());

        if width <= max_width && height <= max_height {
            return img;
        }

        // Calculate new dimensions maintaining aspect ratio
        let ratio_w = max_width as f64 / width as f64;
        let ratio_h = max_height as f64 / height as f64;
        let ratio = ratio_w.min(ratio_h);

        let new_width = (width as f64 * ratio) as u32;
        let new_height = (height as f64 * ratio) as u32;

        img.resize(new_width, new_height, FilterType::Lanczos3)
    }

    /// Batch convert existing images to WebP format
    pub async fn optimize_existing_images(&self, subfolder: &str) -> Result<OptimizeResult> {
        let dir_path = PathBuf::from(&self.upload_dir).join(subfolder);
        if !dir_path.exists() {
            return Ok(OptimizeResult::default());
        }

        let options = ImageOptimizeOptions::default();
        let mut result = OptimizeResult::default();

        let mut entries = fs::read_dir(&dir_path).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let extension = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            // Skip if already WebP or not an image
            if extension == "webp" || !["jpg", "jpeg", "png", "gif"].contains(&extension.as_str()) {
                result.skipped += 1;
                continue;
            }

            // Read and optimize
            match fs::read(&path).await {
                Ok(data) => {
                    let original_size = data.len() as u64;
                    let image_options = options.clone();
                    match tokio::task::spawn_blocking(move || {
                        Self::optimize_image_data(&data, &image_options)
                    })
                    .await
                    {
                        Ok(Ok(optimized)) => {
                            // Generate new WebP path
                            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
                            let new_name = format!("{}.webp", stem);
                            let new_path = dir_path.join(&new_name);

                            // Save optimized file
                            if let Err(e) = fs::write(&new_path, &optimized).await {
                                tracing::error!("Failed to save optimized image: {}", e);
                                result.failed += 1;
                                continue;
                            }

                            // Delete original if WebP saved successfully
                            let _ = fs::remove_file(&path).await;

                            result.converted += 1;
                            result.original_size += original_size;
                            result.optimized_size += optimized.len() as u64;
                        }
                        Ok(Err(e)) => {
                            tracing::error!("Failed to optimize {}: {}", path.display(), e);
                            result.failed += 1;
                        }
                        Err(e) => {
                            tracing::error!("Image task failed for {}: {}", path.display(), e);
                            result.failed += 1;
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to read {}: {}", path.display(), e);
                    result.failed += 1;
                }
            }
        }

        Ok(result)
    }
}

/// Result of batch image optimization
#[derive(Default, Debug, serde::Serialize)]
pub struct OptimizeResult {
    pub converted: u32,
    pub skipped: u32,
    pub failed: u32,
    pub original_size: u64,
    pub optimized_size: u64,
}

// File type constants
pub const IMAGE_TYPES: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];
pub const MUSIC_TYPES: &[&str] = &["mp3", "wav", "flac", "aac", "ogg"];
pub const DOCUMENT_TYPES: &[&str] = &["pdf", "doc", "docx", "txt", "zip", "rar"];
pub const PDF_TYPES: &[&str] = &["pdf"];

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    #[tokio::test]
    async fn r2_upload_is_signed_and_returns_the_public_url() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind mock R2");
        let address = listener.local_addr().expect("mock R2 address");
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.expect("accept request");
            let mut request = vec![0_u8; 8192];
            let read = socket.read(&mut request).await.expect("read request");
            let request = String::from_utf8_lossy(&request[..read]).to_lowercase();
            assert!(request.starts_with("put /blog-assets/images/test.webp http/1.1"));
            assert!(request.contains("authorization: aws4-hmac-sha256"));
            assert!(request.contains("content-type: image/webp"));
            socket
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n")
                .await
                .expect("write response");
        });

        let config = S3Config {
            enabled: true,
            endpoint: format!("http://{address}"),
            bucket: "blog-assets".to_string(),
            access_key: "test-access-key".to_string(),
            secret_key: "test-secret-key".to_string(),
            region: "auto".to_string(),
            public_url: "https://assets.example.com".to_string(),
        };
        let handler = FileHandler::new("/tmp/blog-tests".to_string(), 1024, Some(&config));
        let url = handler
            .upload_image_to_s3("images/test.webp", b"webp")
            .await
            .expect("upload succeeds");

        assert_eq!(
            url.as_deref(),
            Some("https://assets.example.com/images/test.webp")
        );
        server.await.expect("mock server completes");
    }
}
