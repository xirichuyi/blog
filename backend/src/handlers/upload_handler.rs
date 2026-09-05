use crate::models::{ApiResponse, CreateBookFile};
use crate::services::Services;
use crate::utils::error::{ApiResult, AppError, Result};
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
pub struct MultipartUploadReference {
    kind: UploadKind,
    book_id: Option<i64>,
    key: String,
    upload_id: String,
    file_name: String,
    content_type: String,
    file_size: u64,
}

#[derive(Debug, Deserialize)]
pub struct CompleteUploadRequest {
    #[serde(flatten)]
    upload: MultipartUploadReference,
    parts: Vec<CompletedUploadPart>,
}

#[derive(Debug, Deserialize)]
pub struct ResumeUploadRequest {
    #[serde(flatten)]
    upload: MultipartUploadReference,
}

#[derive(Debug, Deserialize)]
pub struct AbortUploadRequest {
    key: String,
    upload_id: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteUploadRequest {
    key: String,
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
    validate_multipart_request(&storage, &services, &request.upload).await?;
    let public_url = storage
        .complete_upload(
            &request.upload.key,
            &request.upload.upload_id,
            &request.parts,
            request.upload.file_size,
        )
        .await?;
    let book_file = if matches!(request.upload.kind, UploadKind::Book) {
        let book_id = request
            .upload
            .book_id
            .ok_or_else(|| AppError::BadRequest("book_id is required".to_string()))?;
        let format = request
            .upload
            .file_name
            .rsplit('.')
            .next()
            .unwrap_or("file")
            .to_ascii_lowercase();
        let create_file = CreateBookFile {
            book_id,
            format,
            file_url: public_url.clone(),
            r2_key: request.upload.key.clone(),
            file_name: request.upload.file_name,
            file_size: request.upload.file_size as i64,
            mime_type: request.upload.content_type,
        };
        match services.book.add_file(create_file).await {
            Ok(file) => Some(file),
            Err(error) => {
                if let Err(cleanup_error) = storage.delete_object(&request.upload.key).await {
                    tracing::warn!(
                        "Failed to clean up unregistered R2 book object '{}': {}",
                        request.upload.key,
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

pub async fn resume(
    State(storage): State<Arc<R2Storage>>,
    State(services): State<Services>,
    Json(request): Json<ResumeUploadRequest>,
) -> ApiResult<UploadSession> {
    validate_multipart_request(&storage, &services, &request.upload).await?;

    let session = storage
        .resume_upload(
            &request.upload.key,
            &request.upload.upload_id,
            request.upload.file_size,
        )
        .await?;
    Ok(Json(ApiResponse::success(session)))
}

async fn validate_multipart_request(
    storage: &R2Storage,
    services: &Services,
    upload: &MultipartUploadReference,
) -> Result<()> {
    match upload.kind {
        UploadKind::Image => Err(AppError::BadRequest(
            "Single-part image uploads do not use multipart actions".to_string(),
        )),
        UploadKind::Video => {
            if !upload.key.starts_with("videos/") {
                return Err(AppError::BadRequest(
                    "Video upload key is invalid".to_string(),
                ));
            }
            storage.validate_video_upload(&upload.file_name, &upload.content_type, upload.file_size)
        }
        UploadKind::Book => {
            let book_id = upload
                .book_id
                .ok_or_else(|| AppError::BadRequest("book_id is required".to_string()))?;
            services.book.get(book_id, false).await?;
            if !upload.key.starts_with(&format!("books/{book_id}/")) {
                return Err(AppError::BadRequest(
                    "Book upload key does not belong to this book".to_string(),
                ));
            }
            storage.validate_book_upload(&upload.file_name, &upload.content_type, upload.file_size)
        }
    }
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

pub async fn delete(
    State(storage): State<Arc<R2Storage>>,
    Json(request): Json<DeleteUploadRequest>,
) -> ApiResult<()> {
    storage.delete_object(&request.key).await?;
    Ok(Json(ApiResponse::success(())))
}
