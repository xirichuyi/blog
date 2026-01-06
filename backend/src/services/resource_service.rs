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

/// Duplicate resource group
#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub hash: String,
    pub files: Vec<StaticResource>,
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

    /// Get all static resources with usage information
    pub async fn list_resources(&self) -> Result<Vec<StaticResource>> {
        let mut resources = Vec::new();

        // Scan all upload directories
        let subdirs = ["images", "covers", "music", "music_covers", "pdfs", "downloads"];

        for subdir in subdirs {
            let dir_path = PathBuf::from(&self.upload_dir).join(subdir);
            if !dir_path.exists() {
                continue;
            }

            let mut entries = fs::read_dir(&dir_path).await?;
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }

                let metadata = entry.metadata().await?;
                let file_name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                let relative_path = format!("/uploads/{}/{}", subdir, file_name);
                let mime_type = mime_guess::from_path(&path)
                    .first_or_octet_stream()
                    .to_string();

                let created_at = metadata.created()
                    .map(|t| {
                        let duration = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
                        Utc.timestamp_opt(duration.as_secs() as i64, 0).unwrap()
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

        // Get usage information from database
        let usage_map = self.get_resource_usage().await?;

        // Update usage status for each resource
        for resource in &mut resources {
            if let Some(usage) = usage_map.get(&resource.path) {
                resource.usage = usage.clone();
            }
        }

        Ok(resources)
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

    /// Delete a resource by path
    pub async fn delete_resource(&self, path: &str) -> Result<bool> {
        // First check if resource is used
        let resources = self.list_resources().await?;
        let resource = resources.iter().find(|r| r.path == path);

        if let Some(res) = resource {
            if res.usage.is_used {
                return Err(AppError::BadRequest(
                    "Cannot delete resource that is in use".to_string()
                ));
            }
        }

        // Delete the file
        self.file_handler.delete_file(path).await?;
        Ok(true)
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
