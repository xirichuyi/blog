use crate::models::ApiResponse;
use crate::utils::error::Result;
use crate::utils::{CompletedVideoPart, R2Storage, VideoMultipartSession};
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct BeginVideoUploadRequest {
    file_name: String,
    content_type: String,
    file_size: u64,
}

#[derive(Debug, Deserialize)]
pub struct CompleteVideoUploadRequest {
    key: String,
    upload_id: String,
    parts: Vec<CompletedVideoPart>,
}

#[derive(Debug, Deserialize)]
pub struct AbortVideoUploadRequest {
    key: String,
    upload_id: String,
}

#[derive(Debug, Serialize)]
pub struct CompleteVideoUploadResponse {
    public_url: String,
}

pub async fn begin_video_upload(
    State(storage): State<Arc<R2Storage>>,
    Json(request): Json<BeginVideoUploadRequest>,
) -> Result<Json<ApiResponse<VideoMultipartSession>>> {
    let session = storage
        .begin_video_upload(&request.file_name, &request.content_type, request.file_size)
        .await?;
    Ok(Json(ApiResponse::success(session)))
}

pub async fn complete_video_upload(
    State(storage): State<Arc<R2Storage>>,
    Json(request): Json<CompleteVideoUploadRequest>,
) -> Result<Json<ApiResponse<CompleteVideoUploadResponse>>> {
    let public_url = storage
        .complete_upload(&request.key, &request.upload_id, &request.parts)
        .await?;
    Ok(Json(ApiResponse::success(CompleteVideoUploadResponse {
        public_url,
    })))
}

pub async fn abort_video_upload(
    State(storage): State<Arc<R2Storage>>,
    Json(request): Json<AbortVideoUploadRequest>,
) -> Result<Json<ApiResponse<()>>> {
    storage
        .abort_upload(&request.key, &request.upload_id)
        .await?;
    Ok(Json(ApiResponse::success(())))
}
