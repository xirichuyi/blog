use crate::models::{ApiResponse, UpdateAboutRequest};
use crate::services::Services;
use crate::utils::error::ApiResult;
use axum::extract::State;
use axum::Json;

pub async fn get_about(State(services): State<Services>) -> ApiResult<crate::models::About> {
    let about = services.about.get().await?;
    Ok(Json(ApiResponse::success(about)))
}

pub async fn update_about(
    State(services): State<Services>,
    Json(request): Json<UpdateAboutRequest>,
) -> ApiResult<crate::models::About> {
    let about = services.about.update(request).await?;
    Ok(Json(ApiResponse::success(about)))
}
