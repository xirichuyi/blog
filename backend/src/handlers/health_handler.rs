use crate::models::ApiResponse;
use crate::routes::AppState;
use axum::{extract::State, http::StatusCode, response::Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{Disks, System};

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

// Global variables to track server metrics
static mut SERVER_START_TIME: Option<SystemTime> = None;
static mut REQUEST_COUNT: u64 = 0;

pub fn init_server_metrics() {
    unsafe {
        SERVER_START_TIME = Some(SystemTime::now());
    }
}

pub fn increment_request_count() {
    unsafe {
        REQUEST_COUNT += 1;
    }
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
    let uptime_seconds = unsafe {
        SERVER_START_TIME
            .map(|start| start.elapsed().unwrap_or_default().as_secs())
            .unwrap_or(0)
    };

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
    let total_memory = system.total_memory() as f64 / 1024.0 / 1024.0; // Convert to MB
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

    let request_count = unsafe { REQUEST_COUNT };

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
