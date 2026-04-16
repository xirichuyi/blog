use crate::database::Database;
use crate::utils::error::{AppError, Result};
use crate::utils::{FileHandler, OptimizeResult};
use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;

/// Static resource information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StaticResource {
    pub path: String,
    pub full_url: String,
    pub file_name: String,
    pub file_type: String,
    pub file_size: u64,
    pub mime_type: String,
    pub created_at: DateTime<Utc>,
    pub usage: ResourceUsage,
}

/// Resource usage information
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ResourceUsage {
    pub is_used: bool,
    pub used_by: Vec<UsageRef>,
}

/// Reference to where resource is used
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageRef {
    pub ref_type: String,
    pub ref_id: i64,
    pub ref_title: String,
}

/// Resource statistics
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ResourceStats {
    pub total_count: u64,
    pub total_size: u64,
    pub by_type: HashMap<String, TypeStats>,
    pub unused_count: u64,
    pub duplicate_count: u64,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct TypeStats {
    pub count: u64,
    pub size: u64,
}

pub struct ResourceService {
    database: Database,
    file_handler: Arc<FileHandler>,
    upload_dir: String,
}

/// Convert folder names to singular file type names
fn normalize_file_type(subdir: &str) -> String {
    match subdir {
        "images" => "image",
        "covers" => "cover",
        "music_covers" => "music_cover",
        "pdfs" => "pdf",
        "downloads" => "download",
        "music" => "music",
        _ => subdir,
    }
    .to_string()
}

impl ResourceService {
    pub fn new(database: Database, file_handler: Arc<FileHandler>, upload_dir: String) -> Self {
        Self {
            database,
            file_handler,
            upload_dir,
        }
    }

    /// Get all static resources with usage information.
    /// Primary source: R2 bucket listing. Fallback: local uploads/ directory.
    pub async fn list_resources(&self) -> Result<Vec<StaticResource>> {
        let mut resources = Vec::new();

        // List objects directly from R2 bucket
        let s3_objects = self.file_handler.list_s3_objects().await?;
        let public_url = self.file_handler.s3_public_url().unwrap_or("");

        if !s3_objects.is_empty() {
            for (key, size, last_modified) in &s3_objects {
                let file_name = key.rsplit('/').next().unwrap_or(key).to_string();
                let full_url = if public_url.is_empty() {
                    format!("/uploads/{}", key)
                } else {
                    format!("{}/{}", public_url, key)
                };
                let file_type = Self::guess_file_type_from_url(key);
                let mime_type = mime_guess::from_path(&file_name)
                    .first_or_octet_stream()
                    .to_string();
                let created_at = chrono::DateTime::parse_from_rfc3339(last_modified)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                resources.push(StaticResource {
                    path: full_url.clone(),
                    full_url,
                    file_name,
                    file_type,
                    file_size: *size,
                    mime_type,
                    created_at,
                    usage: ResourceUsage::default(),
                });
            }
        } else {
            // Fallback: scan local upload directories
            let subdirs = crate::config::constants::UPLOAD_SUBFOLDERS;
            for subdir in subdirs {
                let dir_path = PathBuf::from(&self.upload_dir).join(subdir);
                if !dir_path.exists() { continue; }

                let mut entries = fs::read_dir(&dir_path).await?;
                while let Some(entry) = entries.next_entry().await? {
                    let path = entry.path();
                    if !path.is_file() { continue; }

                    let metadata = entry.metadata().await?;
                    let file_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("").to_string();
                    let relative_path = format!("/uploads/{}/{}", subdir, file_name);
                    let mime_type = mime_guess::from_path(&path)
                        .first_or_octet_stream().to_string();
                    let created_at = metadata.created()
                        .map(|t| {
                            let d = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
                            Utc.timestamp_opt(d.as_secs() as i64, 0).unwrap()
                        })
                        .unwrap_or_else(|_| Utc::now());

                    resources.push(StaticResource {
                        path: relative_path.clone(),
                        full_url: relative_path,
                        file_name,
                        file_type: normalize_file_type(subdir),
                        file_size: metadata.len(),
                        mime_type,
                        created_at,
                        usage: ResourceUsage::default(),
                    });
                }
            }
        }

        // Get usage information from database and update.
        // Match by normalized tail path (subfolder/filename) since full paths may differ
        // e.g. R2 key: "uploads/covers/xxx.jpg", DB URL: "https://asset.blog.chuyi.uk/covers/xxx.jpg"
        let usage_map = self.get_resource_usage().await?;

        for resource in &mut resources {
            // Direct match first
            if let Some(usage) = usage_map.get(&resource.path) {
                resource.usage = usage.clone();
                continue;
            }
            // Extract subfolder/filename from resource path
            let resource_tail = Self::extract_tail_path(&resource.path);
            if resource_tail.is_empty() { continue; }

            for (url, usage) in &usage_map {
                let url_tail = Self::extract_tail_path(url);
                if !url_tail.is_empty() && resource_tail == url_tail {
                    resource.usage = usage.clone();
                    break;
                }
            }
        }

        Ok(resources)
    }

    /// Extract the tail "subfolder/filename" from a URL or path.
    /// e.g. "https://asset.blog.chuyi.uk/covers/xxx.jpg" -> "covers/xxx.jpg"
    ///      "uploads/covers/xxx.jpg" -> "covers/xxx.jpg"
    ///      "/uploads/images/xxx.png" -> "images/xxx.png"
    fn extract_tail_path(url: &str) -> String {
        for dir in crate::config::constants::UPLOAD_SUBFOLDERS {
            if let Some(pos) = url.find(&format!("{}/", dir)) {
                return url[pos..].to_string();
            }
        }
        // Fallback: last two segments
        let parts: Vec<&str> = url.rsplitn(3, '/').collect();
        if parts.len() >= 2 {
            format!("{}/{}", parts[1], parts[0])
        } else {
            String::new()
        }
    }

    /// Guess file type from URL path
    fn guess_file_type_from_url(url: &str) -> String {
        if url.contains("/covers/") { return "cover".to_string(); }
        if url.contains("/music_covers/") { return "music_cover".to_string(); }
        if url.contains("/music/") { return "music".to_string(); }
        if url.contains("/pdfs/") { return "pdf".to_string(); }
        if url.contains("/downloads/") { return "download".to_string(); }
        "image".to_string()
    }

    /// Get resource usage map from database
    async fn get_resource_usage(&self) -> Result<HashMap<String, ResourceUsage>> {
        let mut usage_map: HashMap<String, ResourceUsage> = HashMap::new();

        // Get post cover URLs
        let covers: Vec<(i64, String, Option<String>)> = sqlx::query_as(
            "SELECT id, title, cover_url FROM posts WHERE cover_url IS NOT NULL AND status != 2"
        )
            .fetch_all(self.database.pool.as_ref())
            .await?;

        for (id, title, cover_url) in covers {
            if let Some(url) = cover_url {
                let entry = usage_map.entry(url).or_default();
                entry.is_used = true;
                entry.used_by.push(UsageRef {
                    ref_type: "post_cover".to_string(),
                    ref_id: id,
                    ref_title: title,
                });
            }
        }

        // Get post content images (stored as JSON array in post_images)
        let post_images: Vec<(i64, String, Option<String>)> = sqlx::query_as(
            "SELECT id, title, post_images FROM posts WHERE post_images IS NOT NULL AND status != 2"
        )
            .fetch_all(self.database.pool.as_ref())
            .await?;

        for (id, title, images_json) in post_images {
            if let Some(json) = images_json {
                if let Ok(images) = serde_json::from_str::<Vec<String>>(&json) {
                    for url in images {
                        let entry = usage_map.entry(url).or_default();
                        entry.is_used = true;
                        entry.used_by.push(UsageRef {
                            ref_type: "post_content".to_string(),
                            ref_id: id,
                            ref_title: title.clone(),
                        });
                    }
                }
            }
        }

        // Get music cover URLs
        let music_covers: Vec<(i64, String, Option<String>)> = sqlx::query_as(
            "SELECT id, music_name, music_cover_url FROM music WHERE music_cover_url IS NOT NULL AND status != 2"
        )
            .fetch_all(self.database.pool.as_ref())
            .await?;

        for (id, name, cover_url) in music_covers {
            if let Some(url) = cover_url {
                let entry = usage_map.entry(url).or_default();
                entry.is_used = true;
                entry.used_by.push(UsageRef {
                    ref_type: "music_cover".to_string(),
                    ref_id: id,
                    ref_title: name,
                });
            }
        }

        // Get music file URLs
        let music_files: Vec<(i64, String, String)> = sqlx::query_as(
            "SELECT id, music_name, music_url FROM music WHERE status != 2"
        )
            .fetch_all(self.database.pool.as_ref())
            .await?;

        for (id, name, url) in music_files {
            let entry = usage_map.entry(url).or_default();
            entry.is_used = true;
            entry.used_by.push(UsageRef {
                ref_type: "music_file".to_string(),
                ref_id: id,
                ref_title: name,
            });
        }

        // Get about photo URL
        let about: Option<(Option<String>,)> = sqlx::query_as(
            "SELECT photo_url FROM about WHERE id = 1"
        )
            .fetch_optional(self.database.pool.as_ref())
            .await?;

        if let Some((Some(photo_url),)) = about {
            let entry = usage_map.entry(photo_url).or_default();
            entry.is_used = true;
            entry.used_by.push(UsageRef {
                ref_type: "about_photo".to_string(),
                ref_id: 1,
                ref_title: "About Page".to_string(),
            });
        }

        // Get download file URLs
        let downloads: Vec<(i64, String, String)> = sqlx::query_as(
            "SELECT id, file_name, file_url FROM downloads"
        )
            .fetch_all(self.database.pool.as_ref())
            .await?;

        for (id, name, url) in downloads {
            let entry = usage_map.entry(url).or_default();
            entry.is_used = true;
            entry.used_by.push(UsageRef {
                ref_type: "download".to_string(),
                ref_id: id,
                ref_title: name,
            });
        }

        // Get PDF file URLs
        let pdfs: Vec<(i64, String, String)> = sqlx::query_as(
            "SELECT id, file_name, file_path FROM pdf_documents"
        )
            .fetch_all(self.database.pool.as_ref())
            .await?;

        for (id, name, path) in pdfs {
            // Convert file_path to URL format
            let url = if path.starts_with("/uploads/") {
                path
            } else {
                format!("/uploads/pdfs/{}", path)
            };
            let entry = usage_map.entry(url).or_default();
            entry.is_used = true;
            entry.used_by.push(UsageRef {
                ref_type: "pdf".to_string(),
                ref_id: id,
                ref_title: name,
            });
        }

        Ok(usage_map)
    }

    /// Get resource statistics
    pub async fn get_stats(&self) -> Result<ResourceStats> {
        let resources = self.list_resources().await?;

        let mut stats = ResourceStats::default();
        stats.total_count = resources.len() as u64;

        for resource in &resources {
            stats.total_size += resource.file_size;

            let type_stats = stats.by_type
                .entry(resource.file_type.clone())
                .or_default();
            type_stats.count += 1;
            type_stats.size += resource.file_size;

            if !resource.usage.is_used {
                stats.unused_count += 1;
            }
        }

        Ok(stats)
    }

    /// Check if a specific resource path is used in any DB record (without listing all resources)
    async fn is_resource_used(&self, path: &str) -> Result<bool> {
        let pool = self.database.pool.as_ref();
        let tail = Self::extract_tail_path(path);
        let like_pattern = format!("%{}", tail);

        // Helper: check a single table/column for exact or tail match
        async fn check_col(pool: &crate::database::DatabasePool, table_where: &str, col: &str, path: &str, like: &str) -> bool {
            let q = format!("SELECT 1 FROM {} WHERE {} = ? OR {} LIKE ? LIMIT 1", table_where, col, col);
            sqlx::query_scalar::<_, i64>(&q)
                .bind(path).bind(like)
                .fetch_optional(pool).await.ok().flatten().is_some()
        }

        if check_col(pool, "posts WHERE status != 2", "cover_url", path, &like_pattern).await { return Ok(true); }
        if check_col(pool, "music WHERE status != 2", "music_url", path, &like_pattern).await { return Ok(true); }
        if check_col(pool, "music WHERE status != 2", "music_cover_url", path, &like_pattern).await { return Ok(true); }
        if check_col(pool, "downloads", "file_url", path, &like_pattern).await { return Ok(true); }
        if check_col(pool, "pdf_documents", "file_path", path, &like_pattern).await { return Ok(true); }
        if check_col(pool, "about", "photo_url", path, &like_pattern).await { return Ok(true); }

        // Check post content for embedded image URLs
        if !tail.is_empty() {
            let found: Option<i64> = sqlx::query_scalar(
                "SELECT 1 FROM posts WHERE content LIKE ? AND status != 2 LIMIT 1"
            ).bind(format!("%{}%", tail)).fetch_optional(pool).await.ok().flatten();
            if found.is_some() { return Ok(true); }
        }

        Ok(false)
    }

    /// Delete a resource by path — removes the file (local/R2) and any orphan DB records
    pub async fn delete_resource(&self, path: &str) -> Result<bool> {
        if self.is_resource_used(path).await? {
            return Err(AppError::BadRequest("Cannot delete resource that is in use".to_string()));
        }

        self.file_handler.delete_file(path).await?;
        self.delete_db_references(path).await?;
        Ok(true)
    }

    /// Remove database records that reference a given resource path
    async fn delete_db_references(&self, path: &str) -> Result<()> {
        let pool = self.database.pool.as_ref();

        // pdf_documents
        sqlx::query("DELETE FROM pdf_documents WHERE file_path = ?")
            .bind(path)
            .execute(pool).await.ok();

        // downloads
        sqlx::query("DELETE FROM downloads WHERE file_url = ?")
            .bind(path)
            .execute(pool).await.ok();

        // Clear post cover_url if it matches (set to empty)
        sqlx::query("UPDATE posts SET cover_url = '' WHERE cover_url = ?")
            .bind(path)
            .execute(pool).await.ok();

        // Clear about photo_url if it matches
        sqlx::query("UPDATE about SET photo_url = '' WHERE photo_url = ?")
            .bind(path)
            .execute(pool).await.ok();

        // Clear music URLs
        sqlx::query("UPDATE music SET music_cover_url = NULL WHERE music_cover_url = ?")
            .bind(path)
            .execute(pool).await.ok();
        sqlx::query("DELETE FROM music WHERE music_url = ? AND status = 2")
            .bind(path)
            .execute(pool).await.ok();

        Ok(())
    }

    /// Delete all unused resources in one pass (avoids N+1 listing)
    pub async fn delete_all_unused(&self) -> Result<(u32, u32, u32)> {
        let resources = self.list_resources().await?;
        let unused: Vec<_> = resources.iter().filter(|r| !r.usage.is_used).collect();
        let total = unused.len() as u32;
        let mut deleted = 0u32;
        let mut failed = 0u32;

        for resource in &unused {
            match self.file_handler.delete_file(&resource.path).await {
                Ok(()) => {
                    self.delete_db_references(&resource.path).await.ok();
                    deleted += 1;
                }
                Err(_) => failed += 1,
            }
        }

        tracing::info!("Bulk cleanup: {} deleted, {} failed out of {} unused", deleted, failed, total);
        Ok((total, deleted, failed))
    }

    /// Batch optimize images in a directory
    pub async fn optimize_images(&self, subdir: &str) -> Result<OptimizeResult> {
        self.file_handler.optimize_existing_images(subdir).await
    }

    /// Optimize all image directories
    pub async fn optimize_all_images(&self) -> Result<OptimizeResult> {
        let mut total = OptimizeResult::default();

        for subdir in ["images", "covers", "music_covers"] {
            let result = self.file_handler.optimize_existing_images(subdir).await?;
            total.converted += result.converted;
            total.skipped += result.skipped;
            total.failed += result.failed;
            total.original_size += result.original_size;
            total.optimized_size += result.optimized_size;
        }

        Ok(total)
    }
}
