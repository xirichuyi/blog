use crate::models::{ApiResponse, CreateBookFile, CreateBookRequest, UpdateBookRequest};
use crate::services::Services;
use crate::utils::error::AppError;
use crate::utils::{CompletedVideoPart, R2Storage, VideoMultipartSession};
use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct BeginBookUploadRequest {
    file_name: String,
    content_type: String,
    file_size: u64,
}

#[derive(Debug, Deserialize)]
pub struct CompleteBookUploadRequest {
    key: String,
    upload_id: String,
    parts: Vec<CompletedVideoPart>,
    file_name: String,
    content_type: String,
    file_size: i64,
}

#[derive(Debug, Deserialize)]
pub struct AbortBookUploadRequest {
    key: String,
    upload_id: String,
}

#[derive(Debug, Serialize)]
pub struct CompleteBookUploadResponse {
    file: crate::models::BookFile,
}

pub async fn list_public(
    State(services): State<Services>,
) -> crate::utils::error::Result<Json<ApiResponse<Vec<crate::models::Book>>>> {
    Ok(Json(ApiResponse::success(
        services.book.list_public().await?,
    )))
}

pub async fn list_admin(
    State(services): State<Services>,
) -> crate::utils::error::Result<Json<ApiResponse<Vec<crate::models::Book>>>> {
    Ok(Json(ApiResponse::success(
        services.book.list_admin().await?,
    )))
}

pub async fn read_file(
    State(services): State<Services>,
    Path((book_id, file_id)): Path<(i64, i64)>,
) -> crate::utils::error::Result<Response> {
    let file = services.book.get_public_file(book_id, file_id).await?;
    let upstream = reqwest::Client::new()
        .get(&file.file_url)
        .send()
        .await
        .map_err(|error| AppError::Internal(format!("Could not fetch book file: {error}")))?;

    if !upstream.status().is_success() {
        return Err(AppError::Internal(format!(
            "Book storage returned {}",
            upstream.status()
        )));
    }

    let content_length = upstream.content_length();
    let mut response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, file.mime_type)
        .header(header::CACHE_CONTROL, "public, max-age=3600")
        .header(header::CONTENT_DISPOSITION, "inline");
    if let Some(length) = content_length {
        response = response.header(header::CONTENT_LENGTH, length);
    }
    response
        .body(Body::from_stream(upstream.bytes_stream()))
        .map_err(|error| AppError::Internal(format!("Could not stream book file: {error}")))
}

pub async fn create(
    State(services): State<Services>,
    Json(request): Json<CreateBookRequest>,
) -> crate::utils::error::Result<Json<ApiResponse<crate::models::Book>>> {
    Ok(Json(ApiResponse::success(
        services.book.create(request).await?,
    )))
}

pub async fn update(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateBookRequest>,
) -> crate::utils::error::Result<Json<ApiResponse<crate::models::Book>>> {
    Ok(Json(ApiResponse::success(
        services.book.update(id, request).await?,
    )))
}

pub async fn delete_book(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> crate::utils::error::Result<Json<ApiResponse<()>>> {
    services.book.delete(id).await?;
    Ok(Json(ApiResponse::success(())))
}

pub async fn begin_file_upload(
    State(storage): State<Arc<R2Storage>>,
    State(services): State<Services>,
    Path(book_id): Path<i64>,
    Json(request): Json<BeginBookUploadRequest>,
) -> crate::utils::error::Result<Json<ApiResponse<VideoMultipartSession>>> {
    services.book.get(book_id, false).await?;
    let session = storage
        .begin_book_upload(
            book_id,
            &request.file_name,
            &request.content_type,
            request.file_size,
        )
        .await?;
    Ok(Json(ApiResponse::success(session)))
}

pub async fn complete_file_upload(
    State(storage): State<Arc<R2Storage>>,
    State(services): State<Services>,
    Path(book_id): Path<i64>,
    Json(request): Json<CompleteBookUploadRequest>,
) -> crate::utils::error::Result<Json<ApiResponse<CompleteBookUploadResponse>>> {
    if !request.key.starts_with(&format!("books/{book_id}/")) {
        return Err(AppError::BadRequest(
            "Book upload key does not belong to this book".to_string(),
        ));
    }
    let public_url = storage
        .complete_upload(&request.key, &request.upload_id, &request.parts)
        .await?;
    let format = request
        .file_name
        .rsplit('.')
        .next()
        .unwrap_or("file")
        .to_ascii_lowercase();
    let file = services
        .book
        .add_file(CreateBookFile {
            book_id,
            format,
            file_url: public_url,
            r2_key: request.key,
            file_name: request.file_name,
            file_size: request.file_size,
            mime_type: request.content_type,
        })
        .await?;
    Ok(Json(ApiResponse::success(CompleteBookUploadResponse {
        file,
    })))
}

pub async fn abort_file_upload(
    State(storage): State<Arc<R2Storage>>,
    Json(request): Json<AbortBookUploadRequest>,
) -> crate::utils::error::Result<Json<ApiResponse<()>>> {
    storage
        .abort_upload(&request.key, &request.upload_id)
        .await?;
    Ok(Json(ApiResponse::success(())))
}

pub async fn delete_file(
    State(services): State<Services>,
    Path(file_id): Path<i64>,
) -> crate::utils::error::Result<Json<ApiResponse<()>>> {
    services.book.delete_file(file_id).await?;
    Ok(Json(ApiResponse::success(())))
}
