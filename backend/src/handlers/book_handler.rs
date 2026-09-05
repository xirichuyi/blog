use crate::models::{ApiResponse, CreateBookRequest, UpdateBookRequest};
use crate::services::Services;
use crate::utils::error::ApiResult;
use axum::{
    extract::{Path, State},
    Json,
};

pub async fn list_public(State(services): State<Services>) -> ApiResult<Vec<crate::models::Book>> {
    Ok(Json(ApiResponse::success(
        services.book.list_public().await?,
    )))
}

pub async fn list_admin(State(services): State<Services>) -> ApiResult<Vec<crate::models::Book>> {
    Ok(Json(ApiResponse::success(
        services.book.list_admin().await?,
    )))
}

pub async fn create(
    State(services): State<Services>,
    Json(request): Json<CreateBookRequest>,
) -> ApiResult<crate::models::Book> {
    Ok(Json(ApiResponse::success(
        services.book.create(request).await?,
    )))
}

pub async fn update(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateBookRequest>,
) -> ApiResult<crate::models::Book> {
    Ok(Json(ApiResponse::success(
        services.book.update(id, request).await?,
    )))
}

pub async fn delete_book(State(services): State<Services>, Path(id): Path<i64>) -> ApiResult<()> {
    services.book.delete(id).await?;
    Ok(Json(ApiResponse::success(())))
}

pub async fn delete_file(
    State(services): State<Services>,
    Path(file_id): Path<i64>,
) -> ApiResult<()> {
    services.book.delete_file(file_id).await?;
    Ok(Json(ApiResponse::success(())))
}
