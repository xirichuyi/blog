use crate::models::{ApiResponse, ChangelogEntry, CreateChangelogRequest, UpdateChangelogRequest};
use crate::services::Services;
use crate::utils::error::Result;
use axum::{
    extract::{Path, State},
    Json,
};

pub async fn list_public(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<Vec<ChangelogEntry>>>> {
    Ok(Json(ApiResponse::success(
        services.changelog.list(true).await?,
    )))
}

pub async fn list_admin(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<Vec<ChangelogEntry>>>> {
    Ok(Json(ApiResponse::success(
        services.changelog.list(false).await?,
    )))
}

pub async fn create(
    State(services): State<Services>,
    Json(request): Json<CreateChangelogRequest>,
) -> Result<Json<ApiResponse<ChangelogEntry>>> {
    Ok(Json(ApiResponse::success(
        services.changelog.create(request).await?,
    )))
}

pub async fn update(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateChangelogRequest>,
) -> Result<Json<ApiResponse<ChangelogEntry>>> {
    Ok(Json(ApiResponse::success(
        services.changelog.update(id, request).await?,
    )))
}

pub async fn delete_entry(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>> {
    services.changelog.delete(id).await?;
    Ok(Json(ApiResponse::success(())))
}
