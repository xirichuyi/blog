use crate::config::Config;
use crate::database::Database;
use crate::models::{
    ApiListResponse, ApiResponse, CreateMusicRequest, FileUploadResponse, MusicListQuery,
    UpdateMusicRequest,
};
use crate::services::MusicService;
use crate::utils::{FileHandler, IMAGE_TYPES, MUSIC_TYPES};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use axum_extra::extract::Multipart;

pub async fn create_music(
    State(database): State<Database>,
    State(config): State<Config>,
    Json(request): Json<CreateMusicRequest>,
) -> Result<Json<ApiResponse<crate::models::Music>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = MusicService::new(database, file_handler);

    match service.create_music(request).await {
        Ok(music) => Ok(Json(ApiResponse::success(music))),
        Err(e) => {
            tracing::error!("Failed to create music: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to create music")))
        }
    }
}

pub async fn get_music(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::models::Music>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = MusicService::new(database, file_handler);

    match service.get_music(id).await {
        Ok(Some(music)) => Ok(Json(ApiResponse::success(music))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Music not found"))),
        Err(e) => {
            tracing::error!("Failed to get music: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get music")))
        }
    }
}

pub async fn list_music(
    State(database): State<Database>,
    State(config): State<Config>,
    Query(query): Query<MusicListQuery>,
) -> Result<Json<ApiListResponse<crate::models::Music>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = MusicService::new(database, file_handler);

    match service.list_music(query.clone()).await {
        Ok((music_list, total)) => {
            let page = query.page.unwrap_or(1);
            let page_size = query.page_size.unwrap_or(10);
            Ok(Json(ApiListResponse::success(
                music_list, total, page, page_size,
            )))
        }
        Err(e) => {
            tracing::error!("Failed to list music: {}", e);
            Ok(Json(ApiListResponse::error(500, "Failed to list music")))
        }
    }
}

pub async fn update_music(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateMusicRequest>,
) -> Result<Json<ApiResponse<crate::models::Music>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = MusicService::new(database, file_handler);

    match service.update_music(id, request).await {
        Ok(Some(music)) => Ok(Json(ApiResponse::success(music))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Music not found"))),
        Err(e) => {
            tracing::error!("Failed to update music: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to update music")))
        }
    }
}

pub async fn delete_music(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = MusicService::new(database, file_handler);

    match service.delete_music(id).await {
        Ok(true) => Ok(Json(ApiResponse::success_with_message(
            (),
            "Music deleted successfully",
        ))),
        Ok(false) => Ok(Json(ApiResponse::not_found("Music not found"))),
        Err(e) => {
            tracing::error!("Failed to delete music: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to delete music")))
        }
    }
}

pub async fn upload_music(
    State(config): State<Config>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<FileUploadResponse>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);

    while let Some(field) = multipart.next_field().await.unwrap() {
        if let Some(file_name) = field.file_name() {
            // Validate file type
            if let Err(e) = file_handler.validate_file_type(file_name, MUSIC_TYPES) {
                return Ok(Json(ApiResponse::bad_request(&e.to_string())));
            }

            match file_handler.save_file(field, "music").await {
                Ok((file_url, file_name, file_size)) => {
                    let response = FileUploadResponse {
                        file_url,
                        file_name,
                        file_size,
                    };
                    return Ok(Json(ApiResponse::success(response)));
                }
                Err(e) => {
                    tracing::error!("Failed to upload music: {}", e);
                    return Ok(Json(ApiResponse::internal_error("Failed to upload music")));
                }
            }
        }
    }

    Ok(Json(ApiResponse::bad_request("No file provided")))
}

pub async fn upload_music_cover(
    State(database): State<Database>,
    State(config): State<Config>,
    Path(id): Path<i64>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<crate::models::Music>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);
    let service = MusicService::new(database, file_handler.clone());

    while let Some(field) = multipart.next_field().await.unwrap() {
        if let Some(file_name) = field.file_name() {
            // Validate file type
            if let Err(e) = file_handler.validate_file_type(file_name, IMAGE_TYPES) {
                return Ok(Json(ApiResponse::bad_request(&e.to_string())));
            }

            match file_handler.save_file(field, "music_covers").await {
                Ok((file_url, _, _)) => match service.update_music_cover(id, file_url).await {
                    Ok(Some(music)) => return Ok(Json(ApiResponse::success(music))),
                    Ok(None) => return Ok(Json(ApiResponse::not_found("Music not found"))),
                    Err(e) => {
                        tracing::error!("Failed to update music cover: {}", e);
                        return Ok(Json(ApiResponse::internal_error(
                            "Failed to update music cover",
                        )));
                    }
                },
                Err(e) => {
                    tracing::error!("Failed to upload music cover: {}", e);
                    return Ok(Json(ApiResponse::internal_error(
                        "Failed to upload music cover",
                    )));
                }
            }
        }
    }

    Ok(Json(ApiResponse::bad_request("No file provided")))
}
