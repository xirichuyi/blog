use crate::models::{
    ApiListResponse, ApiResponse, CreatePostRequest, PostListQuery, PostStatus, UpdatePostRequest,
    UpdatePostTagsRequest,
};
use crate::services::Services;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};

pub async fn create_post(
    State(services): State<Services>,
    Json(request): Json<CreatePostRequest>,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    match services.post.create_post(request).await {
        Ok(post) => Ok(Json(ApiResponse::success(post))),
        Err(e) => {
            tracing::error!("Failed to create post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to create post")))
        }
    }
}

pub async fn get_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> (StatusCode, Json<ApiResponse<crate::models::Post>>) {
    match services.post.get_post_detail(id).await {
        Ok(Some(post)) if post.status == PostStatus::Published as i32 => {
            (StatusCode::OK, Json(ApiResponse::success(post)))
        }
        Ok(None) | Ok(Some(_)) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::not_found("Post not found")),
        ),
        Err(e) => {
            tracing::error!("Failed to get post: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::internal_error("Failed to get post")),
            )
        }
    }
}

pub async fn get_adjacent_posts(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> (StatusCode, Json<ApiResponse<crate::models::AdjacentPosts>>) {
    match services.post.get_adjacent_posts(id).await {
        Ok(Some(posts)) => (StatusCode::OK, Json(ApiResponse::success(posts))),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::not_found("Post not found")),
        ),
        Err(e) => {
            tracing::error!("Failed to get adjacent posts: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::internal_error("Failed to get adjacent posts")),
            )
        }
    }
}

pub async fn list_posts(
    State(services): State<Services>,
    Query(mut query): Query<PostListQuery>,
) -> Result<Json<ApiListResponse<crate::models::Post>>, StatusCode> {
    query.status = Some(PostStatus::Published);
    let (page, page_size) = normalize_pagination(&mut query);

    match services.post.list_posts(query).await {
        Ok((posts, total)) => Ok(Json(ApiListResponse::success(
            posts, total, page, page_size,
        ))),
        Err(e) => {
            tracing::error!("Failed to list posts: {}", e);
            Ok(Json(ApiListResponse::error(500, "Failed to list posts")))
        }
    }
}

pub async fn list_posts_with_details(
    State(services): State<Services>,
    Query(mut query): Query<PostListQuery>,
) -> Result<Json<ApiListResponse<crate::models::PostWithDetails>>, StatusCode> {
    query.status = Some(PostStatus::Published);
    list_posts_with_details_inner(services, query).await
}

pub async fn admin_get_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    match services.post.get_post_detail(id).await {
        Ok(Some(post)) => Ok(Json(ApiResponse::success(post))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Post not found"))),
        Err(e) => {
            tracing::error!("Failed to get admin post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get post")))
        }
    }
}

pub async fn admin_list_posts_with_details(
    State(services): State<Services>,
    Query(query): Query<PostListQuery>,
) -> Result<Json<ApiListResponse<crate::models::PostWithDetails>>, StatusCode> {
    list_posts_with_details_inner(services, query).await
}

async fn list_posts_with_details_inner(
    services: Services,
    mut query: PostListQuery,
) -> Result<Json<ApiListResponse<crate::models::PostWithDetails>>, StatusCode> {
    let (page, page_size) = normalize_pagination(&mut query);

    match services.post.list_posts_with_details(query).await {
        Ok((posts, total)) => Ok(Json(ApiListResponse::success(
            posts, total, page, page_size,
        ))),
        Err(e) => {
            tracing::error!("Failed to list posts with details: {}", e);
            Ok(Json(ApiListResponse::error(
                500,
                "Failed to list posts with details",
            )))
        }
    }
}

fn normalize_pagination(query: &mut PostListQuery) -> (u32, u32) {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 500);
    query.page = Some(page);
    query.page_size = Some(page_size);
    (page, page_size)
}

pub async fn update_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdatePostRequest>,
) -> Result<Json<ApiResponse<crate::models::Post>>, StatusCode> {
    match services.post.update_post(id, request).await {
        Ok(Some(post)) => Ok(Json(ApiResponse::success(post))),
        Ok(None) => Ok(Json(ApiResponse::not_found("Post not found"))),
        Err(e) => {
            tracing::error!("Failed to update post: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to update post")))
        }
    }
}

pub async fn delete_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    match services.post.delete_post(id).await {
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

pub async fn get_post_tags(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    match services.post.get_post_tags(id).await {
        Ok(tags) => Ok(Json(ApiResponse::success(tags))),
        Err(e) => {
            tracing::error!("Failed to get post tags: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to get post tags")))
        }
    }
}

pub async fn get_post_tags_public(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> (StatusCode, Json<ApiResponse<Vec<crate::models::Tag>>>) {
    match services.post.get_post_detail(id).await {
        Ok(Some(post)) if post.status == PostStatus::Published as i32 => {}
        Ok(None) | Ok(Some(_)) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::not_found("Post not found")),
            )
        }
        Err(e) => {
            tracing::error!("Failed to verify public post before loading tags: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::internal_error("Failed to get post tags")),
            );
        }
    }

    match services.post.get_post_tags(id).await {
        Ok(tags) => (StatusCode::OK, Json(ApiResponse::success(tags))),
        Err(e) => {
            tracing::error!("Failed to get post tags: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::internal_error("Failed to get post tags")),
            )
        }
    }
}

pub async fn update_post_tags(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdatePostTagsRequest>,
) -> Result<Json<ApiResponse<Vec<crate::models::Tag>>>, StatusCode> {
    match services.post.update_post_tags(id, request.tag_ids).await {
        Ok(_) => match services.post.get_post_tags(id).await {
            Ok(tags) => Ok(Json(ApiResponse::success(tags))),
            Err(e) => {
                tracing::error!("Failed to get updated post tags: {}", e);
                Ok(Json(ApiResponse::internal_error(
                    "Failed to get updated post tags",
                )))
            }
        },
        Err(e) => {
            tracing::error!("Failed to update post tags: {}", e);
            Ok(Json(ApiResponse::internal_error(
                "Failed to update post tags",
            )))
        }
    }
}
