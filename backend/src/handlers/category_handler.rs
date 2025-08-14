use crate::database::Database;
use crate::models::{ApiResponse, CreateCategoryRequest, UpdateCategoryRequest};
use crate::services::CategoryService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};

pub async fn create_category(
    State(database): State<Database>,
    Json(request): Json<CreateCategoryRequest>,
) -> Result<Json<ApiResponse<crate::models::Category>>, StatusCode> {
    let service = CategoryService::new(database);

    match service.create_category(request).await {
        Ok(category) => Ok(Json(ApiResponse::success(category))),
        Err(e) => {
            tracing::error!("Failed to create category: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to create category",
            )))
        }
    }
}

pub async fn list_categories(
    State(database): State<Database>,
) -> Result<Json<ApiResponse<Vec<crate::models::Category>>>, StatusCode> {
    let service = CategoryService::new(database);

    match service.list_categories().await {
        Ok(categories) => Ok(Json(ApiResponse::success(categories))),
        Err(e) => {
            tracing::error!("Failed to list categories: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to list categories",
            )))
        }
    }
}

pub async fn update_category(
    State(database): State<Database>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateCategoryRequest>,
) -> Result<Json<ApiResponse<crate::models::Category>>, StatusCode> {
    let service = CategoryService::new(database);

    match service.update_category(id, request).await {
        Ok(Some(category)) => Ok(Json(ApiResponse::success(category))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Category not found"))),
        Err(e) => {
            tracing::error!("Failed to update category: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to update category",
            )))
        }
    }
}

pub async fn delete_category(
    State(database): State<Database>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let service = CategoryService::new(database);

    match service.delete_category(id).await {
        Ok(true) => Ok(Json(ApiResponse::success_with_message(
            (),
            "Category deleted successfully",
        ))),
        Ok(false) => Ok(Json(ApiResponse::not_found("Category not found"))),
        Err(e) => {
            tracing::error!("Failed to delete category: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to delete category",
            )))
        }
    }
}
