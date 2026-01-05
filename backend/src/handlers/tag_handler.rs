use crate::models::{ApiResponse, CreateTagRequest, UpdateTagRequest};
use crate::services::Services;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};

pub async fn create_tag(
    State(services): State<Services>,
    Json(request): Json<CreateTagRequest>,
) -> Result<Json<ApiResponse<crate::models::Tag>>, StatusCode> {
    match services.tag.create_tag(request).await {
        Ok(tag) => Ok(Json(ApiResponse::success(tag))),
        Err(e) => {
            tracing::error!("Failed to create tag: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to create tag")))
        }
    }
}

pub async fn list_tags(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    match services.tag.list_tags().await {
        Ok(tags) => Ok(Json(ApiResponse::success(tags))),
        Err(e) => {
            tracing::error!("Failed to list tags: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to list tags")))
        }
    }
}

pub async fn update_tag(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateTagRequest>,
) -> Result<Json<ApiResponse<crate::models::Tag>>, StatusCode> {
    match services.tag.update_tag(id, request).await {
        Ok(Some(tag)) => Ok(Json(ApiResponse::success(tag))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Tag not found"))),
        Err(e) => {
            tracing::error!("Failed to update tag: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to update tag")))
        }
    }
}

pub async fn delete_tag(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    match services.tag.delete_tag(id).await {
        Ok(true) => Ok(Json(ApiResponse::success_with_message(
            (),
            "Tag deleted successfully",
        ))),
        Ok(false) => Ok(Json(ApiResponse::not_found("Tag not found"))),
        Err(e) => {
            tracing::error!("Failed to delete tag: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to delete tag")))
        }
    }
}
