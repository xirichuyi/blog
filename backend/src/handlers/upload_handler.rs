use crate::config::constants::{PRESIGN_EXPIRY_SECS, UPLOAD_SUBFOLDERS};
use crate::models::ApiResponse;
use crate::routes::AppState;
use axum::{extract::State, http::StatusCode, response::Json};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct PresignRequest {
    pub file_name: String,
    pub content_type: String,
    pub subfolder: String,
}

pub async fn presign_upload(
    State(app_state): State<AppState>,
    Json(body): Json<PresignRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    if !UPLOAD_SUBFOLDERS.contains(&body.subfolder.as_str()) {
        return Ok(Json(ApiResponse::bad_request("Invalid subfolder")));
    }

    match app_state.file_handler.generate_presigned_upload(
        &body.subfolder,
        &body.file_name,
        &body.content_type,
        PRESIGN_EXPIRY_SECS,
    ) {
        Ok((presigned_url, public_url, s3_key)) => {
            Ok(Json(ApiResponse::success(serde_json::json!({
                "presigned_url": presigned_url,
                "public_url": public_url,
                "s3_key": s3_key,
            }))))
        }
        Err(e) => {
            tracing::error!("Failed to generate presigned URL: {}", e);
            Ok(Json(ApiResponse::internal_error(&e.to_string())))
        }
    }
}
