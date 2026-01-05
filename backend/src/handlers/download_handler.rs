use crate::models::{ApiListResponse, ApiResponse, CreateDownloadRequest, DownloadListQuery};
use crate::routes::AppState;
use crate::services::Services;
use crate::utils::DOCUMENT_TYPES;
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
use tokio::fs::File;
use tokio_util::io::ReaderStream;

pub async fn upload_file(
    State(app_state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<crate::models::Download>>, StatusCode> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        if let Some(file_name) = field.file_name() {
            if let Err(e) = app_state.file_handler.validate_file_type(file_name, DOCUMENT_TYPES) {
                return Ok(Json(ApiResponse::bad_request(&e.to_string())));
            }

            match app_state.file_handler.save_file(field, "downloads").await {
                Ok((file_url, original_name, file_size)) => {
                    let file_type = app_state.file_handler.get_file_type(&original_name);

                    let create_request = CreateDownloadRequest {
                        file_name: original_name,
                        file_url,
                        file_type,
                        file_size: file_size as i64,
                    };

                    match app_state.services.download.create_download(create_request).await {
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
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Response<Body>, StatusCode> {
    match app_state.services.download.get_download(id).await {
        Ok(Some(download)) => {
            let file_path = match app_state.file_handler.get_file_path(&download.file_url) {
                Ok(path) => path,
                Err(_) => return Err(StatusCode::NOT_FOUND),
            };

            if !file_path.exists() {
                return Err(StatusCode::NOT_FOUND);
            }

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
                        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

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
    State(services): State<Services>,
    Query(query): Query<DownloadListQuery>,
) -> Result<Json<ApiListResponse<crate::models::Download>>, StatusCode> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);

    match services.download.list_downloads(query).await {
        Ok((downloads, total)) => Ok(Json(ApiListResponse::success(
            downloads, total, page, page_size,
        ))),
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
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::models::Download>>, StatusCode> {
    match services.download.get_download(id).await {
        Ok(Some(download)) => Ok(Json(ApiResponse::success(download))),
        Ok(None) => Ok(Json(ApiResponse::not_found("File not found"))),
        Err(e) => {
            tracing::error!("Failed to get download: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get download")))
        }
    }
}

pub async fn delete_file(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    match services.download.delete_download(id).await {
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
