use crate::models::ApiResponse;
use crate::services::resource_service::{ResourceStats, StaticResource};
use crate::services::Services;
use crate::utils::OptimizeResult;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ResourceQuery {
    pub file_type: Option<String>,
    pub used: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteResourceQuery {
    pub path: String,
}

/// List all static resources
pub async fn list_resources(
    State(services): State<Services>,
    Query(query): Query<ResourceQuery>,
) -> Result<Json<ApiResponse<Vec<StaticResource>>>, StatusCode> {
    match services.resource.list_resources().await {
        Ok(mut resources) => {
            // Apply filters
            if let Some(file_type) = &query.file_type {
                resources.retain(|r| &r.file_type == file_type);
            }
            if let Some(used) = query.used {
                resources.retain(|r| r.usage.is_used == used);
            }

            Ok(Json(ApiResponse::success(resources)))
        }
        Err(e) => {
            tracing::error!("Failed to list resources: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to list resources")))
        }
    }
}

/// Get resource statistics
pub async fn get_resource_stats(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<ResourceStats>>, StatusCode> {
    match services.resource.get_stats().await {
        Ok(stats) => Ok(Json(ApiResponse::success(stats))),
        Err(e) => {
            tracing::error!("Failed to get resource stats: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get resource stats")))
        }
    }
}

/// Delete a resource
pub async fn delete_resource(
    State(services): State<Services>,
    Query(query): Query<DeleteResourceQuery>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    match services.resource.delete_resource(&query.path).await {
        Ok(true) => Ok(Json(ApiResponse::success_with_message(
            (),
            "Resource deleted successfully",
        ))),
        Ok(false) => Ok(Json(ApiResponse::not_found("Resource not found"))),
        Err(e) => {
            tracing::error!("Failed to delete resource: {}", e);
            Ok(Json(ApiResponse::bad_request(&e.to_string())))
        }
    }
}

/// Optimize all images (batch convert to WebP)
pub async fn optimize_all_images(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<OptimizeResult>>, StatusCode> {
    match services.resource.optimize_all_images().await {
        Ok(result) => {
            tracing::info!(
                "Image optimization complete: {} converted, {} skipped, {} failed",
                result.converted,
                result.skipped,
                result.failed
            );
            Ok(Json(ApiResponse::success(result)))
        }
        Err(e) => {
            tracing::error!("Failed to optimize images: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to optimize images")))
        }
    }
}
