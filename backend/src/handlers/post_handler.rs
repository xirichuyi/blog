use crate::config::Config;
use crate::database::Database;
use crate::models::{
    ApiListResponse, ApiResponse, CreatePostRequest, FileUploadResponse, PostListQuery,
    UpdatePostRequest, UpdatePostTagsRequest,
};
use crate::routes::AppState;
use crate::services::PostService;
use crate::utils::{FileHandler, IMAGE_TYPES};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use axum_extra::extract::Multipart;

pub async fn create_post(
    State(app_state): State<AppState>,
    Json(request): Json<CreatePostRequest>,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.create_post(request).await {
        Ok(post) => Ok(Json(ApiResponse::success(post))),
        Err(e) => {
            tracing::error!("Failed to create post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to create post")))
        }
    }
}

pub async fn get_post(
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.get_post_detail(id).await {
        Ok(Some(post)) => Ok(Json(ApiResponse::success(post))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Post not found"))),
        Err(e) => {
            tracing::error!("Failed to get post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get post")))
        }
    }
}

pub async fn list_posts(
    State(app_state): State<AppState>,
    Query(query): Query<PostListQuery>,
) -> Result<Json<ApiListResponse<crate::models::Post>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.list_posts(query.clone()).await {
        Ok((posts, total)) => {
            let page = query.page.unwrap_or(1);
            let page_size = query.page_size.unwrap_or(10);
            Ok(Json(ApiListResponse::success(
                posts, total, page, page_size,
            )))
        }
        Err(e) => {
            tracing::error!("Failed to list posts: {}", e);
            Ok(Json(ApiListResponse::error(500, "Failed to list posts")))
        }
    }
}

pub async fn update_post(
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
    Json(request): Json<UpdatePostRequest>,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.update_post(id, request).await {
        Ok(Some(post)) => Ok(Json(ApiResponse::success(post))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Post not found"))),
        Err(e) => {
            tracing::error!("Failed to update post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to update post")))
        }
    }
}

pub async fn delete_post(
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.delete_post(id).await {
        Ok(true) => Ok(Json(ApiResponse::success_with_message(
            (),
            "Post deleted successfully",
        ))),
        Ok(false) => Ok(Json(ApiResponse::not_found("Post not found"))),
        Err(e) => {
            tracing::error!("Failed to delete post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to delete post")))
        }
    }
}

pub async fn upload_post_image(
    State(config): State<Config>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<FileUploadResponse>>, StatusCode> {
    let file_handler = FileHandler::new(config.storage.upload_dir, config.storage.max_file_size);

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        if let Some(file_name) = field.file_name() {
            // Validate file type
            if let Err(e) = file_handler.validate_file_type(file_name, IMAGE_TYPES) {
                return Ok(Json(ApiResponse::bad_request(&e.to_string())));
            }

            match file_handler.save_file(field, "images").await {
                Ok((file_url, file_name, file_size)) => {
                    let response = FileUploadResponse {
                        file_url,
                        file_name,
                        file_size,
                    };
                    return Ok(Json(ApiResponse::success(response)));
                }
                Err(e) => {
                    tracing::error!("Failed to upload image: {}", e);
                    return Ok(Json(ApiResponse::internal_error("Failed to upload image")));
                }
            }
        }
    }

    Ok(Json(ApiResponse::bad_request("No file provided")))
}

pub async fn update_post_cover(
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler.clone());

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        if let Some(file_name) = field.file_name() {
            // Validate file type
            if let Err(e) = file_handler.validate_file_type(file_name, IMAGE_TYPES) {
                return Ok(Json(ApiResponse::bad_request(&e.to_string())));
            }

            match file_handler.save_file(field, "covers").await {
                Ok((file_url, _, _)) => match service.update_post_cover(id, file_url).await {
                    Ok(Some(post)) => return Ok(Json(ApiResponse::success(post))),
                    Ok(None) => return Ok(Json(ApiResponse::not_found("Post not found"))),
                    Err(e) => {
                        tracing::error!("Failed to update post cover: {}", e);
                        return Ok(Json(ApiResponse::internal_error(
                            "Failed to update post cover",
                        )));
                    }
                },
                Err(e) => {
                    tracing::error!("Failed to upload cover: {}", e);
                    return Ok(Json(ApiResponse::internal_error("Failed to upload cover")));
                }
            }
        }
    }

    Ok(Json(ApiResponse::bad_request("No file provided")))
}

pub async fn get_post_tags(
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.get_post_tags(id).await {
        Ok(tags) => Ok(Json(ApiResponse::success(tags))),
        Err(e) => {
            tracing::error!("Failed to get post tags: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get post tags")))
        }
    }
}

pub async fn get_post_tags_public(
    State(database): State<Database>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    let file_handler = FileHandler::new(
        "uploads".to_string(),
        1024 * 1024 * 10, // 10MB
    );
    let service = PostService::new(database, file_handler);

    match service.get_post_tags(id).await {
        Ok(tags) => Ok(Json(ApiResponse::success(tags))),
        Err(e) => {
            tracing::error!("Failed to get post tags: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get post tags")))
        }
    }
}

pub async fn update_post_tags(
    State(app_state): State<AppState>,
    Path(id): Path<i64>,
    Json(request): Json<UpdatePostTagsRequest>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir,
        app_state.config.storage.max_file_size,
    );
    let service = PostService::new(app_state.database, file_handler);

    match service.update_post_tags(id, request.tag_ids).await {
        Ok(_) => {
            // Return updated tags
            match service.get_post_tags(id).await {
                Ok(tags) => Ok(Json(ApiResponse::success(tags))),
                Err(e) => {
                    tracing::error!("Failed to get updated post tags: {}", e);
                    Ok(Json(ApiResponse::internal_error(
                        "Failed to get updated post tags",
                    )))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to update post tags: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to update post tags",
            )))
        }
    }
}
