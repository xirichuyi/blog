use crate::routes::AppState;
use axum::{extract::State, http::StatusCode, response::Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sysinfo::{Disks, System};

const BLOG_FOUNDED_AT: &str = "2025-05-02T00:00:00+08:00";
const BLOG_FOUNDED_AT_UNIX: i64 = 1_746_115_200;

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub service: String,
    pub uptime_seconds: u64,
    pub founded_at: &'static str,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedHealthStatus {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub version: String,
    pub uptime_seconds: u64,
    pub founded_at: &'static str,
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
    pub disk_usage_percent: f64,
    pub disk_used_bytes: u64,
    pub disk_total_bytes: u64,
}

fn get_uptime_seconds() -> u64 {
    Utc::now().timestamp().saturating_sub(BLOG_FOUNDED_AT_UNIX) as u64
}

/// Basic health check endpoint
pub async fn health_check() -> Result<Json<HealthStatus>, StatusCode> {
    let health_status = HealthStatus {
        status: "healthy".to_string(),
        timestamp: Utc::now(),
        service: "cyrus-blog-backend".to_string(),
        uptime_seconds: get_uptime_seconds(),
        founded_at: BLOG_FOUNDED_AT,
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
        status: "skip".to_string(),
        response_time_ms: 0,
        message: "No external service probe is configured".to_string(),
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
        founded_at: BLOG_FOUNDED_AT,
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
            uptime_seconds: get_uptime_seconds(),
            founded_at: BLOG_FOUNDED_AT,
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
        uptime_seconds: get_uptime_seconds(),
        founded_at: BLOG_FOUNDED_AT,
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
            let pool = app_state.database.pool();
            let pool_size = pool.size();
            let idle_connections = pool.num_idle();
            let utilization_percent = if pool_size == 0 {
                0.0
            } else {
                ((pool_size as usize).saturating_sub(idle_connections) as f64
                    / f64::from(pool_size))
                    * 100.0
            };
            let details = serde_json::json!({
                "pool_size": pool_size,
                "idle_connections": idle_connections,
                "utilization_percent": utilization_percent
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

    SystemMetrics {
        memory_usage_mb: used_memory,
        cpu_usage_percent: cpu_usage as f64,
        disk_usage_percent,
        disk_used_bytes: disk_used,
        disk_total_bytes: disk_total,
    }
}

// Dashboard Statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_posts: i64,
    pub total_categories: i64,
    pub total_tags: i64,
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

    let stats = DashboardStats {
        total_posts: total_posts.0,
        total_categories: total_categories.0,
        total_tags: total_tags.0,
        recent_posts,
        system_info: DashboardSystemInfo {
            uptime,
            memory_usage,
        },
    };

    Ok(Json(stats))
}

fn format_uptime(seconds: u64) -> String {
    let days = seconds / 86400;
    format!("{days} 天")
}

#[cfg(test)]
mod tests {
    use super::{format_uptime, BLOG_FOUNDED_AT, BLOG_FOUNDED_AT_UNIX};

    #[test]
    fn founding_date_and_timestamp_stay_in_sync() {
        let founded_at = chrono::DateTime::parse_from_rfc3339(BLOG_FOUNDED_AT)
            .expect("the fixed blog founding date is valid");
        assert_eq!(founded_at.timestamp(), BLOG_FOUNDED_AT_UNIX);
    }

    #[test]
    fn dashboard_formats_site_age_in_whole_days() {
        assert_eq!(format_uptime(481 * 86_400 + 3_600), "481 天");
    }
}
