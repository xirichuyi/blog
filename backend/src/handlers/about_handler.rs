use crate::models::{ApiResponse, UpdateAboutRequest};
use crate::routes::AppState;
use crate::services::AboutService;
use crate::utils::FileHandler;
use axum::{extract::State, http::StatusCode, response::Json};

pub async fn get_about(State(app_state): State<AppState>) -> Result<Json<ApiResponse<crate::models::About>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = AboutService::new(app_state.database, file_handler);
    match service.get().await {
        Ok(about) => Ok(Json(ApiResponse::success(about))),
        Err(_) => Ok(Json(ApiResponse::internal_error("Failed to get about"))),
    }
}

pub async fn update_about(
    State(app_state): State<AppState>,
    Json(request): Json<UpdateAboutRequest>,
) -> Result<Json<ApiResponse<crate::models::About>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = AboutService::new(app_state.database, file_handler);
    match service.update(request).await {
        Ok(about) => Ok(Json(ApiResponse::success(about))),
        Err(_) => Ok(Json(ApiResponse::internal_error("Failed to update about"))),
    }
}



