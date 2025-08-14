use crate::config::Config;
use crate::database::Database;
use crate::models::{ApiListResponse, ApiResponse, CreateDownloadRequest, DownloadListQuery};
use crate::services::DownloadService;
use crate::utils::{FileHandler, DOCUMENT_TYPES};
use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{
        header::{CONTENT_DISPOSITION, CONTENT_TYPE},
        StatusCode,
    },
    response::{Json, Response},
};
use axum_extra::extract::Multipart;
use std::path::PathBuf;
use tokio::fs::File;
use tokio_util::io::ReaderStream;

pub async fn upload_file(
    State(database): State<Database>,
    State(config): State<Config>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<crate::models::Download>>, StatusCode> {
    let file_handler = FileHandler::new(
        config.storage.upload_dir.clone(),
        config.storage.max_file_size,
    );
    let service = DownloadService::new(database, file_handler.clone());

    while let Some(field) = multipart.next_field().await.unwrap() {
        if let Some(file_name) = field.file_name() {
            // Validate file type
            if let Err(e) = file_handler.validate_file_type(file_name, DOCUMENT_TYPES) {
                return Ok(Json(ApiResponse::bad_request(&e.to_string())));
            }

            match file_handler.save_file(field, "downloads").await {
                Ok((file_url, original_name, file_size)) => {
                    let file_type = file_handler.get_file_type(&original_name);

                    let create_request = CreateDownloadRequest {
                        file_name: original_name,
                        file_url,
                        file_type,
                        file_size: file_size as i64,
                    };

                    match service.create_download(create_request).await {
                        Ok(download) => return Ok(Json(ApiResponse::success(download))),
                        Err(e) => {
                            tracing::error!("Failed to create download record: {}", e);
                            return Ok(Json(ApiResponse::internal_error(
                                "Failed to create download record",
                            )));
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to upload file: {}", e);
                    return Ok(Json(ApiResponse::internal_error("Failed to upload file")));
                }
            }
        }
    }

    Ok(Json(ApiResponse::bad_request("No file provided")))
}

pub async fn download_file(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
) -> Result<Response<Body>, StatusCode> {
    let file_handler = FileHandler::new(
        config.storage.upload_dir.clone(),
        config.storage.max_file_size,
    );
    let service = DownloadService::new(database, file_handler);

    match service.get_download(id).await {
        Ok(Some(download)) => {
            // Construct file path
            let file_path = if download.file_url.starts_with("/uploads/") {
                let relative_path = &download.file_url[9..]; // Remove "/uploads/" prefix
                PathBuf::from(&config.storage.upload_dir).join(relative_path)
            } else {
                return Err(StatusCode::NOT_FOUND);
            };

            // Check if file exists
            if !file_path.exists() {
                return Err(StatusCode::NOT_FOUND);
            }

            // Open file
            match File::open(&file_path).await {
                Ok(file) => {
                    let stream = ReaderStream::new(file);
                    let body = Body::from_stream(stream);

                    let response = Response::builder()
                        .status(StatusCode::OK)
                        .header(CONTENT_TYPE, download.file_type)
                        .header(
                            CONTENT_DISPOSITION,
                            format!("attachment; filename=\"{}\"", download.file_name),
                        )
                        .body(body)
                        .unwrap();

                    Ok(response)
                }
                Err(e) => {
                    tracing::error!("Failed to open file: {}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to get download: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_file_list(
    State(database): State<Database>,
    State(config): State<Config>,
    Query(query): Query<DownloadListQuery>,
) -> Result<Json<ApiListResponse<crate::models::Download>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = DownloadService::new(database, file_handler);

    match service.list_downloads(query.clone()).await {
        Ok((downloads, total)) => {
            let page = query.page.unwrap_or(1);
            let page_size = query.page_size.unwrap_or(10);
            Ok(Json(ApiListResponse::success(
                downloads, total, page, page_size,
            )))
        }
        Err(e) => {
            tracing::error!("Failed to list downloads: {}", e);
            Ok(Json(ApiListResponse::error(
                500,
                "Failed to list downloads",
            )))
        }
    }
}

pub async fn get_file(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::models::Download>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = DownloadService::new(database, file_handler);

    match service.get_download(id).await {
        Ok(Some(download)) => Ok(Json(ApiResponse::success(download))),
        Ok(None) => Ok(Json(ApiResponse::not_found("File not found"))),
        Err(e) => {
            tracing::error!("Failed to get download: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get download")))
        }
    }
}

pub async fn delete_file(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = DownloadService::new(database, file_handler);

    match service.delete_download(id).await {
        Ok(true) => Ok(Json(ApiResponse::success_with_message(
            (),
            "File deleted successfully",
        ))),
        Ok(false) => Ok(Json(ApiResponse::not_found("File not found"))),
        Err(e) => {
            tracing::error!("Failed to delete download: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to delete download",
            )))
        }
    }
}
