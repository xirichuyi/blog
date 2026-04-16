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
        let s3 = s3_config
            .filter(|c| c.enabled)
            .map(|config| {
                tracing::info!("S3 client initialized for bucket '{}'", config.bucket);
                let endpoint = config.endpoint.trim_end_matches('/').to_string();
                let host = endpoint.replace("https://", "").replace("http://", "");
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

    /// Generate a presigned PUT URL for direct browser-to-R2 upload.
    /// Returns (presigned_url, public_url, s3_key) or error if S3 not configured.
    pub fn generate_presigned_upload(
        &self,
        subfolder: &str,
        file_name: &str,
        content_type: &str,
        expires_secs: u64,
    ) -> Result<(String, String, String)> {
        let s3 = self.s3.as_ref().ok_or_else(|| {
            AppError::Internal("S3 storage not configured".to_string())
        })?;

        // Generate unique key
        let extension = Path::new(file_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");
        let unique_name = format!(
            "{}_{}.{}",
            Uuid::new_v4(),
            chrono::Utc::now().timestamp(),
            extension
        );
        let s3_key = format!("{}/{}", subfolder, unique_name);

        let now = Utc::now();
        let date_stamp = now.format("%Y%m%d").to_string();
        let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
        let host = &s3.host;
        let scope = format!("{}/{}/s3/aws4_request", date_stamp, s3.region);

        // Query parameters for presigned URL
        let query_params = format!(
            "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential={}/{}&X-Amz-Date={}&X-Amz-Expires={}&X-Amz-SignedHeaders=content-type;host",
            s3.access_key,
            urlencoding::encode(&scope),
            amz_date,
            expires_secs,
        );

        let canonical_request = format!(
            "PUT\n/{}/{}\n{}\ncontent-type:{}\nhost:{}\n\ncontent-type;host\nUNSIGNED-PAYLOAD",
            s3.bucket, s3_key, query_params, content_type, host,
        );

        let string_to_sign = format!(
            "AWS4-HMAC-SHA256\n{}\n{}\n{}",
            amz_date, scope,
            hex::encode(Sha256::digest(canonical_request.as_bytes())),
        );

        let k = Self::hmac_sha256(format!("AWS4{}", s3.secret_key).as_bytes(), date_stamp.as_bytes());
        let k = Self::hmac_sha256(&k, s3.region.as_bytes());
        let k = Self::hmac_sha256(&k, b"s3");
        let k = Self::hmac_sha256(&k, b"aws4_request");
        let signature = hex::encode(Self::hmac_sha256(&k, string_to_sign.as_bytes()));

        let presigned_url = format!(
            "{}/{}/{}?{}&X-Amz-Signature={}",
            s3.endpoint, s3.bucket, s3_key, query_params, signature,
        );

        let public_url = format!("{}/{}", s3.public_url, s3_key);

        Ok((presigned_url, public_url, s3_key))
    }

    /// Upload bytes to S3. Returns the public URL on success.
    async fn upload_to_s3(&self, key: &str, data: &[u8], content_type: Option<&str>) -> Option<String> {
        let Some(s3) = &self.s3 else { return None };

        let ct = content_type.unwrap_or("application/octet-stream");
        let encoded_key = Self::encode_s3_key(key);
        let ph = hex::encode(Sha256::digest(data));
        let path = format!("/{}/{}", s3.bucket, encoded_key);

        let canonical = format!(
            "PUT\n{path}\n\ncontent-type:{ct}\nhost:{}\nx-amz-content-sha256:{ph}\nx-amz-date:{{amz_date}}\n\ncontent-type;host;x-amz-content-sha256;x-amz-date\n{ph}",
            s3.host,
        );
        let (auth, amz_date) = Self::s3_sign(s3, &canonical, "content-type;host;x-amz-content-sha256;x-amz-date");

        let result = s3.http.put(&format!("{}{}", s3.endpoint, path))
            .header("Content-Type", ct)
            .header("Host", s3.host.as_str())
            .header("x-amz-content-sha256", &ph)
            .header("x-amz-date", &amz_date)
            .header("Authorization", &auth)
            .body(data.to_vec())
            .send().await;

        match result {
            Ok(resp) if resp.status().is_success() => {
                tracing::info!("S3 upload OK: {} ({} bytes)", key, data.len());
                Some(format!("{}/{}", s3.public_url, key))
            }
            Ok(resp) => { tracing::warn!("S3 upload failed for {}: {}", key, resp.status()); None }
            Err(e) => { tracing::warn!("S3 upload failed for {}: {}", key, e); None }
        }
    }

    fn encode_s3_key(key: &str) -> String {
        key.split('/')
            .map(|seg| urlencoding::encode(seg).into_owned())
            .collect::<Vec<_>>()
            .join("/")
    }

    /// Delete an object from S3 by key.
    async fn delete_from_s3(&self, key: &str) {
        let Some(s3) = &self.s3 else { return };

        let ek = Self::encode_s3_key(key);
        let eh = hex::encode(Sha256::digest(b""));
        let path = format!("/{}/{}", s3.bucket, ek);

        let canonical = format!(
            "DELETE\n{path}\n\nhost:{}\nx-amz-content-sha256:{eh}\nx-amz-date:{{amz_date}}\n\nhost;x-amz-content-sha256;x-amz-date\n{eh}",
            s3.host,
        );
        let (auth, amz) = Self::s3_sign(s3, &canonical, "host;x-amz-content-sha256;x-amz-date");

        match s3.http.delete(&format!("{}{}", s3.endpoint, path))
            .header("Host", s3.host.as_str())
            .header("x-amz-content-sha256", &eh)
            .header("x-amz-date", &amz)
            .header("Authorization", &auth)
            .send().await
        {
            Ok(resp) if resp.status().is_success() => tracing::info!("S3 delete OK: {}", key),
            Ok(resp) => tracing::warn!("S3 delete failed for {}: {}", key, resp.status()),
            Err(e) => tracing::warn!("S3 delete failed for {}: {}", key, e),
        }
    }

    /// Generate S3 signing components: (auth_header, amz_date).
    /// `canonical_request` must be fully formed (caller fills in amz_date before calling).
    fn s3_sign(s3: &S3Info, canonical_request: &str, signed_headers: &str) -> (String, String) {
        let now = Utc::now();
        let ds = now.format("%Y%m%d").to_string();
        let amz = now.format("%Y%m%dT%H%M%SZ").to_string();
        let scope = format!("{}/{}/s3/aws4_request", ds, s3.region);

        // Replace {amz_date} placeholder in canonical request
        let canonical = canonical_request.replace("{amz_date}", &amz);
        let sts = format!(
            "AWS4-HMAC-SHA256\n{}\n{}\n{}",
            amz, scope,
            hex::encode(Sha256::digest(canonical.as_bytes())),
        );

        let k = Self::hmac_sha256(format!("AWS4{}", s3.secret_key).as_bytes(), ds.as_bytes());
        let k = Self::hmac_sha256(&k, s3.region.as_bytes());
        let k = Self::hmac_sha256(&k, b"s3");
        let k = Self::hmac_sha256(&k, b"aws4_request");
        let sig = hex::encode(Self::hmac_sha256(&k, sts.as_bytes()));

        let auth = format!(
            "AWS4-HMAC-SHA256 Credential={}/{},SignedHeaders={},Signature={}",
            s3.access_key, scope, signed_headers, sig,
        );
        (auth, amz)
    }

    fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
        let mut mac = Hmac::<Sha256>::new_from_slice(key)
            .unwrap_or_else(|_| unreachable!("HMAC-SHA256 accepts any key length"));
        mac.update(data);
        mac.finalize().into_bytes().to_vec()
    }

    /// List all objects in the S3 bucket. Returns Vec<(key, size, last_modified)>.
    pub async fn list_s3_objects(&self) -> Result<Vec<(String, u64, String)>> {
        let Some(s3) = &self.s3 else {
            return Ok(Vec::new());
        };

        let mut all_objects = Vec::new();
        let mut continuation_token: Option<String> = None;

        let eh = hex::encode(Sha256::digest(b""));

        loop {
            let mut query = "list-type=2&max-keys=1000".to_string();
            if let Some(token) = &continuation_token {
                query.push_str(&format!("&continuation-token={}", urlencoding::encode(token)));
            }

            let canonical = format!(
                "GET\n/{}\n{}\nhost:{}\nx-amz-content-sha256:{eh}\nx-amz-date:{{amz_date}}\n\nhost;x-amz-content-sha256;x-amz-date\n{eh}",
                s3.bucket, query, s3.host,
            );
            let (auth, amz) = Self::s3_sign(s3, &canonical, "host;x-amz-content-sha256;x-amz-date");

            let resp = s3.http.get(&format!("{}/{}?{}", s3.endpoint, s3.bucket, query))
                .header("Host", s3.host.as_str())
                .header("x-amz-content-sha256", &eh)
                .header("x-amz-date", &amz)
                .header("Authorization", &auth)
                .send().await
                .map_err(|e| AppError::Internal(format!("S3 list error: {}", e)))?;

            let body = resp.text().await
                .map_err(|e| AppError::Internal(format!("S3 list read error: {}", e)))?;

            // Parse XML response
            let mut next_token = None;
            let mut is_truncated = false;

            // Simple XML parsing for Contents
            for content_block in body.split("<Contents>").skip(1) {
                let key = content_block
                    .split("<Key>").nth(1)
                    .and_then(|s| s.split("</Key>").next())
                    .unwrap_or("").to_string();
                let size: u64 = content_block
                    .split("<Size>").nth(1)
                    .and_then(|s| s.split("</Size>").next())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0);
                let last_modified = content_block
                    .split("<LastModified>").nth(1)
                    .and_then(|s| s.split("</LastModified>").next())
                    .unwrap_or("").to_string();

                if !key.is_empty() {
                    all_objects.push((key, size, last_modified));
                }
            }

            if body.contains("<IsTruncated>true</IsTruncated>") {
                is_truncated = true;
                next_token = body
                    .split("<NextContinuationToken>").nth(1)
                    .and_then(|s| s.split("</NextContinuationToken>").next())
                    .map(|s| s.to_string());
            }

            if !is_truncated || next_token.is_none() {
                break;
            }
            continuation_token = next_token;
        }

        Ok(all_objects)
    }

    /// Get the S3 public URL prefix (e.g. "https://asset.blog.chuyi.uk")
    pub fn s3_public_url(&self) -> Option<&str> {
        self.s3.as_ref().map(|s| s.public_url.as_str()).filter(|u| !u.is_empty())
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

        // Read all chunks into memory (needed for S3 upload too)
        let mut data = Vec::new();
        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| AppError::BadRequest(format!("Failed to read file chunk: {}", e)))?
        {
            data.extend_from_slice(&chunk);
            if data.len() as u64 > self.max_file_size {
                return Err(AppError::BadRequest(
                    "File size exceeds maximum allowed size".to_string(),
                ));
            }
        }

        let total_size = data.len() as u64;

        // Save file locally
        let mut file = fs::File::create(&file_path).await?;
        file.write_all(&data).await?;
        file.flush().await?;

        // Upload to S3, use public URL if successful, fallback to local
        let s3_key = format!("{}/{}", subfolder, unique_name);
        let content_type = mime_guess::from_path(&unique_name)
            .first()
            .map(|m| m.to_string());
        let file_url = match self.upload_to_s3(&s3_key, &data, content_type.as_deref()).await {
            Some(url) => url,
            None => format!("{}{}/{}", UPLOADS_URL_PREFIX, subfolder, unique_name),
        };

        Ok((file_url, unique_name, total_size))
    }

    /// 从URL中提取相对路径，移除/uploads/前缀
    pub fn strip_url_prefix(file_url: &str) -> Option<&str> {
        file_url.strip_prefix(UPLOADS_URL_PREFIX)
    }

    pub async fn delete_file(&self, file_url: &str) -> Result<()> {
        // Handle R2 URLs (https://asset.blog.chuyi.uk/images/xxx.png)
        if let Some(s3) = &self.s3 {
            if !s3.public_url.is_empty() && file_url.starts_with(&s3.public_url) {
                let s3_key = file_url.strip_prefix(&format!("{}/", s3.public_url))
                    .unwrap_or(file_url);
                self.delete_from_s3(s3_key).await;
                return Ok(());
            }
        }

        // Handle local /uploads/ paths — reuse get_file_path for validation
        if let Ok(file_path) = self.get_file_path(file_url) {
            if file_path.exists() {
                fs::remove_file(&file_path).await?;
            }
            if let Some(relative_path) = Self::strip_url_prefix(file_url) {
                self.delete_from_s3(relative_path).await;
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

        // Read all data into memory (needed for S3 upload)
        let mut data = Vec::new();
        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| AppError::BadRequest(format!("Failed to read file chunk: {}", e)))?
        {
            data.extend_from_slice(&chunk);
            if data.len() as u64 > self.max_file_size {
                return Err(AppError::BadRequest(
                    "File size exceeds maximum allowed size".to_string(),
                ));
            }
        }

        let total_size = data.len() as u64;

        // Save locally
        let mut file = fs::File::create(&file_path).await?;
        file.write_all(&data).await?;
        file.flush().await?;

        // Upload to S3, use public URL if successful
        let s3_key = format!("{}/{}", subfolder, file_name);
        let file_url = match self.upload_to_s3(&s3_key, &data, Some("application/pdf")).await {
            Some(url) => url,
            None => format!("{}{}/{}", UPLOADS_URL_PREFIX, subfolder, file_name),
        };

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
        let optimized_data = Self::optimize_image_data(&data, &options)?;

        // Generate unique WebP file name
        let unique_name = format!(
            "{}_{}.webp",
            Uuid::new_v4(),
            chrono::Utc::now().timestamp()
        );

        // Create directory path
        let dir_path = PathBuf::from(&self.upload_dir).join(subfolder);
        fs::create_dir_all(&dir_path).await?;

        // Create file path
        let file_path = dir_path.join(&unique_name);

        // Save optimized file
        fs::write(&file_path, &optimized_data).await?;

        let file_size = optimized_data.len() as u64;

        // Upload to S3, use public URL if successful
        let s3_key = format!("{}/{}", subfolder, unique_name);
        let file_url = match self.upload_to_s3(&s3_key, &optimized_data, Some("image/webp")).await {
            Some(url) => url,
            None => format!("{}{}/{}", UPLOADS_URL_PREFIX, subfolder, unique_name),
        };

        tracing::info!(
            "Image optimized: {} -> {} ({}KB -> {}KB)",
            file_name,
            unique_name,
            data.len() / 1024,
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
                    match Self::optimize_image_data(&data, &options) {
                        Ok(optimized) => {
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
                        Err(e) => {
                            tracing::error!("Failed to optimize {}: {}", path.display(), e);
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
