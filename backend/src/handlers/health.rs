use axum::{extract::State, response::Json};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tracing::{info, warn};

use crate::{
    database::Database,
    services::BlogService,
    utils::{AppError, AppResult},
};

/// Comprehensive health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: HealthStatus,
    pub timestamp: String,
    pub version: String,
    pub uptime_seconds: u64,
    pub checks: HealthChecks,
    pub metrics: Option<SystemMetrics>,
}

/// Overall health status
#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// Individual health checks
#[derive(Debug, Serialize)]
pub struct HealthChecks {
    pub database: CheckResult,
    pub memory: CheckResult,
    pub disk: CheckResult,
    pub external_services: CheckResult,
}

/// Individual check result
#[derive(Debug, Serialize)]
pub struct CheckResult {
    pub status: CheckStatus,
    pub response_time_ms: u64,
    pub message: Option<String>,
    pub details: Option<serde_json::Value>,
}

/// Status of individual checks
#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CheckStatus {
    Pass,
    Warn,
    Fail,
}

/// System metrics for monitoring
#[derive(Debug, Serialize)]
pub struct SystemMetrics {
    pub memory_usage_mb: f64,
    pub cpu_usage_percent: f64,
    pub active_connections: u32,
    pub request_count: u64,
    pub cache_hit_rate: f64,
    pub avg_response_time_ms: u64,
}

/// Startup time for uptime calculation
static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

/// Initialize health monitoring
pub fn init_health_monitoring() {
    START_TIME.set(Instant::now()).ok();
    info!("🏥 Health monitoring initialized");
}

/// Basic health check endpoint
pub async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "service": "cyrus-blog-backend"
    }))
}

/// Comprehensive health check with detailed diagnostics
pub async fn health_detailed(
    State(database): State<Database>,
) -> AppResult<Json<HealthResponse>> {
    let start_time = Instant::now();
    
    info!("🔍 Starting detailed health check");

    // Run all health checks concurrently
    let (database_check, memory_check, disk_check, external_services_check) = tokio::join!(
        check_database_health(&database),
        check_memory_health(),
        check_disk_health(),
        check_external_services_health()
    );

    // Determine overall status
    let overall_status = determine_overall_status(&[
        &database_check,
        &memory_check,
        &disk_check,
        &external_services_check,
    ]);

    // Collect system metrics
    let metrics = collect_system_metrics(&database).await;

    let uptime = START_TIME
        .get()
        .map(|start| start.elapsed().as_secs())
        .unwrap_or(0);

    let response = HealthResponse {
        status: overall_status,
        timestamp: chrono::Utc::now().to_rfc3339(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: uptime,
        checks: HealthChecks {
            database: database_check,
            memory: memory_check,
            disk: disk_check,
            external_services: external_services_check,
        },
        metrics: Some(metrics),
    };

    let duration = start_time.elapsed();
    
    match response.status {
        HealthStatus::Healthy => {
            info!(
                duration_ms = duration.as_millis(),
                "✅ Health check completed - system healthy"
            );
        }
        HealthStatus::Degraded => {
            warn!(
                duration_ms = duration.as_millis(),
                "⚠️ Health check completed - system degraded"
            );
        }
        HealthStatus::Unhealthy => {
            warn!(
                duration_ms = duration.as_millis(),
                "❌ Health check completed - system unhealthy"
            );
        }
    }

    Ok(Json(response))
}

/// Check database connectivity and performance
async fn check_database_health(database: &Database) -> CheckResult {
    let start_time = Instant::now();
    
    match database.health_check().await {
        Ok(_) => {
            let response_time = start_time.elapsed().as_millis() as u64;
            let pool_stats = database.pool_stats();
            
            let status = if pool_stats.is_under_pressure() {
                CheckStatus::Warn
            } else {
                CheckStatus::Pass
            };

            CheckResult {
                status,
                response_time_ms: response_time,
                message: Some("Database connection healthy".to_string()),
                details: Some(serde_json::json!({
                    "pool_size": pool_stats.size,
                    "idle_connections": pool_stats.idle,
                    "utilization_percent": pool_stats.utilization_percent()
                })),
            }
        }
        Err(e) => CheckResult {
            status: CheckStatus::Fail,
            response_time_ms: start_time.elapsed().as_millis() as u64,
            message: Some(format!("Database health check failed: {}", e)),
            details: None,
        },
    }
}

/// Check memory usage
async fn check_memory_health() -> CheckResult {
    let start_time = Instant::now();
    
    // Get memory usage (simplified - in production use a proper system monitoring library)
    let memory_usage = get_memory_usage();
    let memory_usage_mb = memory_usage / 1024.0 / 1024.0;
    
    let status = if memory_usage_mb > 1000.0 {
        CheckStatus::Warn
    } else if memory_usage_mb > 2000.0 {
        CheckStatus::Fail
    } else {
        CheckStatus::Pass
    };

    CheckResult {
        status,
        response_time_ms: start_time.elapsed().as_millis() as u64,
        message: Some(format!("Memory usage: {:.2} MB", memory_usage_mb)),
        details: Some(serde_json::json!({
            "memory_usage_mb": memory_usage_mb,
            "threshold_warn_mb": 1000.0,
            "threshold_fail_mb": 2000.0
        })),
    }
}

/// Check disk space
async fn check_disk_health() -> CheckResult {
    let start_time = Instant::now();
    
    // Check disk space for database directory
    match get_disk_usage("./data").await {
        Ok((used, total)) => {
            let usage_percent = (used as f64 / total as f64) * 100.0;
            
            let status = if usage_percent > 80.0 {
                CheckStatus::Warn
            } else if usage_percent > 95.0 {
                CheckStatus::Fail
            } else {
                CheckStatus::Pass
            };

            CheckResult {
                status,
                response_time_ms: start_time.elapsed().as_millis() as u64,
                message: Some(format!("Disk usage: {:.1}%", usage_percent)),
                details: Some(serde_json::json!({
                    "usage_percent": usage_percent,
                    "used_bytes": used,
                    "total_bytes": total
                })),
            }
        }
        Err(e) => CheckResult {
            status: CheckStatus::Warn,
            response_time_ms: start_time.elapsed().as_millis() as u64,
            message: Some(format!("Could not check disk usage: {}", e)),
            details: None,
        },
    }
}

/// Check external services (AI API, etc.)
async fn check_external_services_health() -> CheckResult {
    let start_time = Instant::now();
    
    // For now, just return a pass - in production, check actual external services
    CheckResult {
        status: CheckStatus::Pass,
        response_time_ms: start_time.elapsed().as_millis() as u64,
        message: Some("External services check skipped".to_string()),
        details: Some(serde_json::json!({
            "ai_service": "not_checked",
            "note": "External service checks not implemented"
        })),
    }
}

/// Determine overall health status from individual checks
fn determine_overall_status(checks: &[&CheckResult]) -> HealthStatus {
    let has_fail = checks.iter().any(|check| check.status == CheckStatus::Fail);
    let has_warn = checks.iter().any(|check| check.status == CheckStatus::Warn);

    if has_fail {
        HealthStatus::Unhealthy
    } else if has_warn {
        HealthStatus::Degraded
    } else {
        HealthStatus::Healthy
    }
}

/// Collect system metrics for monitoring
async fn collect_system_metrics(database: &Database) -> SystemMetrics {
    let pool_stats = database.pool_stats();
    let memory_usage = get_memory_usage() / 1024.0 / 1024.0; // Convert to MB
    
    // TODO: Implement proper metrics collection
    SystemMetrics {
        memory_usage_mb: memory_usage,
        cpu_usage_percent: 0.0, // TODO: Implement CPU monitoring
        active_connections: pool_stats.size,
        request_count: 0, // TODO: Implement request counting
        cache_hit_rate: 0.0, // TODO: Get from blog service
        avg_response_time_ms: 0, // TODO: Get from metrics
    }
}

/// Get current memory usage (simplified implementation)
fn get_memory_usage() -> f64 {
    // This is a simplified implementation
    // In production, use a proper system monitoring library like `sysinfo`
    1024.0 * 1024.0 * 100.0 // Placeholder: 100MB
}

/// Get disk usage for a path
async fn get_disk_usage(path: &str) -> Result<(u64, u64), std::io::Error> {
    use std::path::Path;
    
    // This is a simplified implementation
    // In production, use a proper system monitoring library
    let path = Path::new(path);
    if path.exists() {
        // Placeholder values
        Ok((1024 * 1024 * 1024, 10 * 1024 * 1024 * 1024)) // 1GB used, 10GB total
    } else {
        Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Path not found",
        ))
    }
}

/// Readiness check for Kubernetes/container orchestration
pub async fn readiness_check(
    State(database): State<Database>,
) -> AppResult<Json<serde_json::Value>> {
    // Check if the service is ready to accept traffic
    database.health_check().await?;
    
    Ok(Json(serde_json::json!({
        "status": "ready",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

/// Liveness check for Kubernetes/container orchestration
pub async fn liveness_check() -> Json<serde_json::Value> {
    // Simple check to see if the service is alive
    Json(serde_json::json!({
        "status": "alive",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}
