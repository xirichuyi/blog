use crate::models::{ApiResponse, CreateBookFile};
use crate::services::Services;
use crate::utils::error::{ApiResult, AppError};
use crate::utils::{CompletedUploadPart, R2Storage, UploadSession};
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UploadKind {
    Image,
    Video,
    Book,
}

#[derive(Debug, Deserialize)]
pub struct BeginUploadRequest {
    kind: UploadKind,
    book_id: Option<i64>,
    file_name: String,
    content_type: String,
    file_size: u64,
}

#[derive(Debug, Deserialize)]
pub struct CompleteUploadRequest {
    kind: UploadKind,
    book_id: Option<i64>,
    key: String,
    upload_id: String,
    parts: Vec<CompletedUploadPart>,
    file_name: String,
    content_type: String,
    file_size: i64,
}

#[derive(Debug, Deserialize)]
pub struct AbortUploadRequest {
    key: String,
    upload_id: String,
}

#[derive(Debug, Serialize)]
pub struct CompleteUploadResponse {
    pub public_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub book_file: Option<crate::models::BookFile>,
}

pub async fn begin(
    State(storage): State<Arc<R2Storage>>,
    State(services): State<Services>,
    Json(request): Json<BeginUploadRequest>,
) -> ApiResult<UploadSession> {
    let session = match request.kind {
        UploadKind::Image => {
            storage
                .begin_image_upload(&request.file_name, &request.content_type, request.file_size)
                .await?
        }
        UploadKind::Video => {
            storage
                .begin_video_upload(&request.file_name, &request.content_type, request.file_size)
                .await?
        }
        UploadKind::Book => {
            let book_id = request
                .book_id
                .ok_or_else(|| AppError::BadRequest("book_id is required".to_string()))?;
            services.book.get(book_id, false).await?;
            storage
                .begin_book_upload(
                    book_id,
                    &request.file_name,
                    &request.content_type,
                    request.file_size,
                )
                .await?
        }
    };
    Ok(Json(ApiResponse::success(session)))
}

pub async fn complete(
    State(storage): State<Arc<R2Storage>>,
    State(services): State<Services>,
    Json(request): Json<CompleteUploadRequest>,
) -> ApiResult<CompleteUploadResponse> {
    if matches!(request.kind, UploadKind::Image) {
        return Err(AppError::BadRequest(
            "Single-part image uploads do not require completion".to_string(),
        ));
    }
    match request.kind {
        UploadKind::Video if !request.key.starts_with("videos/") => {
            return Err(AppError::BadRequest(
                "Video upload key is invalid".to_string(),
            ));
        }
        UploadKind::Book => {
            let book_id = request
                .book_id
                .ok_or_else(|| AppError::BadRequest("book_id is required".to_string()))?;
            if !request.key.starts_with(&format!("books/{book_id}/")) {
                return Err(AppError::BadRequest(
                    "Book upload key does not belong to this book".to_string(),
                ));
            }
        }
        _ => {}
    }
    let public_url = storage
        .complete_upload(&request.key, &request.upload_id, &request.parts)
        .await?;
    let book_file = if matches!(request.kind, UploadKind::Book) {
        let book_id = request
            .book_id
            .ok_or_else(|| AppError::BadRequest("book_id is required".to_string()))?;
        let format = request
            .file_name
            .rsplit('.')
            .next()
            .unwrap_or("file")
            .to_ascii_lowercase();
        let create_file = CreateBookFile {
            book_id,
            format,
            file_url: public_url.clone(),
            r2_key: request.key.clone(),
            file_name: request.file_name,
            file_size: request.file_size,
            mime_type: request.content_type,
        };
        match services.book.add_file(create_file).await {
            Ok(file) => Some(file),
            Err(error) => {
                if let Err(cleanup_error) = storage.delete_object(&request.key).await {
                    tracing::warn!(
                        "Failed to clean up unregistered R2 book object '{}': {}",
                        request.key,
                        cleanup_error
                    );
                }
                return Err(error);
            }
        }
    } else {
        None
    };
    Ok(Json(ApiResponse::success(CompleteUploadResponse {
        public_url,
        book_file,
    })))
}

pub async fn abort(
    State(storage): State<Arc<R2Storage>>,
    Json(request): Json<AbortUploadRequest>,
) -> ApiResult<()> {
    storage
        .abort_upload(&request.key, &request.upload_id)
        .await?;
    Ok(Json(ApiResponse::success(())))
}
