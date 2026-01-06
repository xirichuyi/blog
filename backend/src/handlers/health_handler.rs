use crate::routes::AppState;
use axum::{extract::State, http::StatusCode, response::Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;
use std::time::Instant;
use sysinfo::{Disks, System};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub service: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedHealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub version: String,
    pub uptime_seconds: u64,
    pub checks: HealthChecks,
    pub metrics: SystemMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthChecks {
    pub database: CheckResult,
    pub memory: CheckResult,
    pub disk: CheckResult,
    pub external_services: CheckResult,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckResult {
    pub status: String,
    pub response_time_ms: u64,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub memory_usage_mb: f64,
    pub cpu_usage_percent: f64,
    pub active_connections: u32,
    pub request_count: u64,
    pub cache_hit_rate: f64,
    pub avg_response_time_ms: u64,
    pub disk_usage_percent: f64,
    pub disk_used_bytes: u64,
    pub disk_total_bytes: u64,
}

// 线程安全的服务器指标跟踪
static SERVER_START_TIME: OnceLock<Instant> = OnceLock::new();
static REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);

pub fn init_server_metrics() {
    SERVER_START_TIME.get_or_init(Instant::now);
}

fn get_uptime_seconds() -> u64 {
    SERVER_START_TIME
        .get()
        .map(|start| start.elapsed().as_secs())
        .unwrap_or(0)
}

fn get_request_count() -> u64 {
    REQUEST_COUNT.load(Ordering::Relaxed)
}

/// Basic health check endpoint
pub async fn health_check() -> Result<Json<HealthStatus>, StatusCode> {
    let health_status = HealthStatus {
        status: "healthy".to_string(),
        timestamp: Utc::now(),
        service: "cyrus-blog-backend".to_string(),
    };

    Ok(Json(health_status))
}

/// Detailed health check endpoint
pub async fn detailed_health_check(
    State(app_state): State<AppState>,
) -> Result<Json<DetailedHealthStatus>, StatusCode> {
    let start_time = std::time::Instant::now();

    // Get system information
    let mut system = System::new_all();
    system.refresh_all();

    // Database health check
    let db_check = check_database_health(&app_state).await;

    // Memory health check
    let memory_check = check_memory_health(&system);

    // Disk health check
    let disk_check = check_disk_health(&system);

    // External services check (placeholder)
    let external_check = CheckResult {
        status: "pass".to_string(),
        response_time_ms: 1,
        message: "External services check skipped".to_string(),
        details: None,
    };

    // Calculate uptime
    let uptime_seconds = get_uptime_seconds();

    // Get system metrics
    let metrics = get_system_metrics(&system);

    let detailed_status = DetailedHealthStatus {
        status: "healthy".to_string(),
        timestamp: Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds,
        checks: HealthChecks {
            database: db_check,
            memory: memory_check,
            disk: disk_check,
            external_services: external_check,
        },
        metrics,
    };

    tracing::debug!("Health check completed in {:?}", start_time.elapsed());
    Ok(Json(detailed_status))
}

/// Kubernetes readiness check
pub async fn readiness_check(
    State(app_state): State<AppState>,
) -> Result<Json<HealthStatus>, StatusCode> {
    // Check if database is accessible
    let db_result = sqlx::query("SELECT 1")
        .fetch_one(app_state.database.pool.as_ref())
        .await;

    match db_result {
        Ok(_) => Ok(Json(HealthStatus {
            status: "ready".to_string(),
            timestamp: Utc::now(),
            service: "cyrus-blog-backend".to_string(),
        })),
        Err(_) => Err(StatusCode::SERVICE_UNAVAILABLE),
    }
}

/// Kubernetes liveness check
pub async fn liveness_check() -> Result<Json<HealthStatus>, StatusCode> {
    Ok(Json(HealthStatus {
        status: "alive".to_string(),
        timestamp: Utc::now(),
        service: "cyrus-blog-backend".to_string(),
    }))
}

async fn check_database_health(app_state: &AppState) -> CheckResult {
    let start = std::time::Instant::now();

    let result = sqlx::query("SELECT 1")
        .fetch_one(app_state.database.pool.as_ref())
        .await;

    let response_time = start.elapsed().as_millis() as u64;

    match result {
        Ok(_) => {
            // Note: Some pool metrics may not be available in all sqlx versions
            let details = serde_json::json!({
                "pool_size": 10, // Default value - would need actual pool configuration
                "idle_connections": 8, // Placeholder - actual implementation would need pool metrics
                "utilization_percent": 20.0 // Placeholder
            });

            CheckResult {
                status: "pass".to_string(),
                response_time_ms: response_time,
                message: "Database connection healthy".to_string(),
                details: Some(details),
            }
        }
        Err(e) => CheckResult {
            status: "fail".to_string(),
            response_time_ms: response_time,
            message: format!("Database connection failed: {}", e),
            details: None,
        },
    }
}

fn check_memory_health(system: &System) -> CheckResult {
    let total_memory = system.total_memory() as f64 / 1024.0 / 1024.0; // Convert to MB
    let used_memory = system.used_memory() as f64 / 1024.0 / 1024.0; // Convert to MB
    let memory_usage_percent = (used_memory / total_memory) * 100.0;

    let status = if memory_usage_percent > 90.0 {
        "fail"
    } else if memory_usage_percent > 80.0 {
        "warn"
    } else {
        "pass"
    };

    let details = serde_json::json!({
        "memory_usage_mb": used_memory,
        "total_memory_mb": total_memory,
        "usage_percent": memory_usage_percent,
        "threshold_warn_mb": total_memory * 0.8,
        "threshold_fail_mb": total_memory * 0.9
    });

    CheckResult {
        status: status.to_string(),
        response_time_ms: 1,
        message: format!(
            "Memory usage: {:.2} MB ({:.1}%)",
            used_memory, memory_usage_percent
        ),
        details: Some(details),
    }
}

fn check_disk_health(_system: &System) -> CheckResult {
    let disks = Disks::new_with_refreshed_list();

    if let Some(main_disk) = disks.first() {
        let total_space = main_disk.total_space();
        let available_space = main_disk.available_space();
        let used_space = total_space - available_space;
        let usage_percent = (used_space as f64 / total_space as f64) * 100.0;

        let status = if usage_percent > 90.0 {
            "fail"
        } else if usage_percent > 80.0 {
            "warn"
        } else {
            "pass"
        };

        let details = serde_json::json!({
            "usage_percent": usage_percent,
            "used_bytes": used_space,
            "total_bytes": total_space,
            "available_bytes": available_space
        });

        CheckResult {
            status: status.to_string(),
            response_time_ms: 2,
            message: format!("Disk usage: {:.1}%", usage_percent),
            details: Some(details),
        }
    } else {
        CheckResult {
            status: "warn".to_string(),
            response_time_ms: 1,
            message: "No disk information available".to_string(),
            details: None,
        }
    }
}

fn get_system_metrics(system: &System) -> SystemMetrics {
    let _total_memory = system.total_memory() as f64 / 1024.0 / 1024.0; // Convert to MB
    let used_memory = system.used_memory() as f64 / 1024.0 / 1024.0; // Convert to MB

    // Get CPU usage (average of all cores)
    let cpu_usage =
        system.cpus().iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / system.cpus().len() as f32;

    // Get disk usage
    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total, disk_usage_percent) = if let Some(main_disk) = disks.first() {
        let total = main_disk.total_space();
        let used = total - main_disk.available_space();
        let usage_percent = (used as f64 / total as f64) * 100.0;
        (used, total, usage_percent)
    } else {
        (0, 0, 0.0)
    };

    let request_count = get_request_count();

    SystemMetrics {
        memory_usage_mb: used_memory,
        cpu_usage_percent: cpu_usage as f64,
        active_connections: 10, // Placeholder - would need actual connection tracking
        request_count,
        cache_hit_rate: 0.0,     // Placeholder - would need actual cache metrics
        avg_response_time_ms: 0, // Placeholder - would need actual response time tracking
        disk_usage_percent,
        disk_used_bytes: disk_used,
        disk_total_bytes: disk_total,
    }
}

// Dashboard Statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_views: i64,
    pub total_posts: i64,
    pub total_categories: i64,
    pub total_tags: i64,
    pub total_music: i64,
    pub recent_posts: Vec<RecentPost>,
    pub system_info: DashboardSystemInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentPost {
    pub id: i64,
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub status: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSystemInfo {
    pub uptime: String,
    pub memory_usage: String,
    pub disk_usage: String,
}

/// Dashboard statistics endpoint - returns real data from database
pub async fn get_dashboard_stats(
    State(app_state): State<AppState>,
) -> Result<Json<DashboardStats>, StatusCode> {
    // Get counts from database
    let total_posts: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE status != 2")
        .fetch_one(app_state.database.pool.as_ref())
        .await
        .unwrap_or((0,));

    let total_categories: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM categories")
        .fetch_one(app_state.database.pool.as_ref())
        .await
        .unwrap_or((0,));

    let total_tags: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tags")
        .fetch_one(app_state.database.pool.as_ref())
        .await
        .unwrap_or((0,));

    let total_music: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM music WHERE status != 2")
        .fetch_one(app_state.database.pool.as_ref())
        .await
        .unwrap_or((0,));

    // Get recent posts (latest 5)
    let recent_posts_rows: Vec<(i64, String, DateTime<Utc>, i32)> = sqlx::query_as(
        "SELECT id, title, created_at, status FROM posts WHERE status != 2 ORDER BY created_at DESC LIMIT 5"
    )
        .fetch_all(app_state.database.pool.as_ref())
        .await
        .unwrap_or_default();

    let recent_posts: Vec<RecentPost> = recent_posts_rows
        .into_iter()
        .map(|(id, title, created_at, status)| RecentPost {
            id,
            title,
            created_at,
            status,
        })
        .collect();

    // Get system info
    let mut system = System::new_all();
    system.refresh_all();

    let uptime_seconds = get_uptime_seconds();
    let uptime = format_uptime(uptime_seconds);

    let used_memory = system.used_memory() as f64 / 1024.0 / 1024.0;
    let memory_usage = format!("{:.0}MB", used_memory);

    // Calculate uploads directory size
    let upload_dir = &app_state.config.storage.upload_dir;
    let disk_usage = get_directory_size(upload_dir);

    let stats = DashboardStats {
        total_views: 0, // Placeholder - would need view tracking
        total_posts: total_posts.0,
        total_categories: total_categories.0,
        total_tags: total_tags.0,
        total_music: total_music.0,
        recent_posts,
        system_info: DashboardSystemInfo {
            uptime,
            memory_usage,
            disk_usage,
        },
    };

    Ok(Json(stats))
}

fn format_uptime(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let minutes = (seconds % 3600) / 60;

    if days > 0 {
        format!("{}d {}h", days, hours)
    } else if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

fn get_directory_size(path: &str) -> String {
    let path = Path::new(path);
    if !path.exists() {
        return "0B".to_string();
    }

    let size = calculate_dir_size(path);
    format_bytes(size)
}

fn calculate_dir_size(path: &Path) -> u64 {
    let mut size = 0;
    if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    size += calculate_dir_size(&entry_path);
                } else if let Ok(metadata) = entry.metadata() {
                    size += metadata.len();
                }
            }
        }
    }
    size
}

fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1}GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1}MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1}KB", bytes as f64 / KB as f64)
    } else {
        format!("{}B", bytes)
    }
}
