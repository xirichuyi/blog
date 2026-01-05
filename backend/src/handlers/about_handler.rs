use crate::models::{ApiResponse, UpdateAboutRequest};
use crate::services::Services;
use axum::{extract::State, http::StatusCode, response::Json};

pub async fn get_about(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<crate::models::About>>, StatusCode> {
    match services.about.get().await {
        Ok(about) => Ok(Json(ApiResponse::success(about))),
        Err(e) => {
            tracing::error!("Failed to get about: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get about")))
        }
    }
}

pub async fn update_about(
    State(services): State<Services>,
    Json(request): Json<UpdateAboutRequest>,
) -> Result<Json<ApiResponse<crate::models::About>>, StatusCode> {
    match services.about.update(request).await {
        Ok(about) => Ok(Json(ApiResponse::success(about))),
        Err(e) => {
            tracing::error!("Failed to update about: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to update about")))
        }
    }
}
