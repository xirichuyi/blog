use crate::models::{ApiResponse, CreateCategoryRequest, UpdateCategoryRequest};
use crate::services::Services;
use crate::utils::error::{ApiResult, AppError};
use axum::extract::{Path, State};
use axum::Json;

pub async fn create_category(
    State(services): State<Services>,
    Json(request): Json<CreateCategoryRequest>,
) -> ApiResult<crate::models::Category> {
    let category = services.category.create_category(request).await?;
    Ok(Json(ApiResponse::success(category)))
}

pub async fn list_categories(
    State(services): State<Services>,
) -> ApiResult<Vec<crate::models::Category>> {
    let categories = services.category.list_categories().await?;
    Ok(Json(ApiResponse::success(categories)))
}

pub async fn update_category(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateCategoryRequest>,
) -> ApiResult<crate::models::Category> {
    let category = services
        .category
        .update_category(id, request)
        .await?
        .ok_or_else(|| AppError::NotFound("Category not found".to_string()))?;
    Ok(Json(ApiResponse::success(category)))
}

pub async fn delete_category(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> ApiResult<()> {
    if !services.category.delete_category(id).await? {
        return Err(AppError::NotFound("Category not found".to_string()));
    }
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Category deleted successfully",
    )))
}
