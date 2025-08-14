use crate::database::Database;
use crate::models::{ApiResponse, CreateTagRequest, UpdateTagRequest};
use crate::services::TagService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};

pub async fn create_tag(
    State(database): State<Database>,
    Json(request): Json<CreateTagRequest>,
) -> Result<Json<ApiResponse<crate::models::Tag>>, StatusCode> {
    let service = TagService::new(database);

    match service.create_tag(request).await {
        Ok(tag) => Ok(Json(ApiResponse::success(tag))),
        Err(e) => {
            tracing::error!("Failed to create tag: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to create tag")))
        }
    }
}

pub async fn list_tags(
    State(database): State<Database>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    let service = TagService::new(database);

    match service.list_tags().await {
        Ok(tags) => Ok(Json(ApiResponse::success(tags))),
        Err(e) => {
            tracing::error!("Failed to list tags: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to list tags")))
        }
    }
}

pub async fn update_tag(
    State(database): State<Database>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateTagRequest>,
) -> Result<Json<ApiResponse<crate::models::Tag>>, StatusCode> {
    let service = TagService::new(database);

    match service.update_tag(id, request).await {
        Ok(Some(tag)) => Ok(Json(ApiResponse::success(tag))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Tag not found"))),
        Err(e) => {
            tracing::error!("Failed to update tag: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to update tag")))
        }
    }
}

pub async fn delete_tag(
    State(database): State<Database>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let service = TagService::new(database);

    match service.delete_tag(id).await {
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
