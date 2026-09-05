use crate::models::{ApiResponse, CreateTagRequest, UpdateTagRequest};
use crate::services::Services;
use crate::utils::error::{ApiResult, AppError};
use axum::extract::{Path, State};
use axum::Json;

pub async fn create_tag(
    State(services): State<Services>,
    Json(request): Json<CreateTagRequest>,
) -> ApiResult<crate::models::Tag> {
    let tag = services.tag.create_tag(request).await?;
    Ok(Json(ApiResponse::success(tag)))
}

pub async fn list_tags(State(services): State<Services>) -> ApiResult<Vec<crate::models::Tag>> {
    let tags = services.tag.list_tags().await?;
    Ok(Json(ApiResponse::success(tags)))
}

pub async fn update_tag(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateTagRequest>,
) -> ApiResult<crate::models::Tag> {
    let tag = services
        .tag
        .update_tag(id, request)
        .await?
        .ok_or_else(|| AppError::NotFound("Tag not found".to_string()))?;
    Ok(Json(ApiResponse::success(tag)))
}

pub async fn delete_tag(State(services): State<Services>, Path(id): Path<i64>) -> ApiResult<()> {
    if !services.tag.delete_tag(id).await? {
        return Err(AppError::NotFound("Tag not found".to_string()));
    }
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Tag deleted successfully",
    )))
}
