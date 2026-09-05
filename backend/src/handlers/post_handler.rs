use crate::models::{
    ApiResponse, CreatePostRequest, Page, PostListQuery, PostStatus, UpdatePostRequest,
    UpdatePostTagsRequest,
};
use crate::services::Services;
use crate::utils::error::{ApiResult, AppError};
use axum::extract::{Path, Query, State};
use axum::Json;

pub async fn create_post(
    State(services): State<Services>,
    Json(request): Json<CreatePostRequest>,
) -> ApiResult<crate::models::Post> {
    let post = services.post.create_post(request).await?;
    Ok(Json(ApiResponse::success(post)))
}

pub async fn get_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> ApiResult<crate::models::Post> {
    let post = services
        .post
        .get_post_detail(id)
        .await?
        .filter(|post| post.status == PostStatus::Published as i32)
        .ok_or_else(|| AppError::NotFound("Post not found".to_string()))?;
    Ok(Json(ApiResponse::success(post)))
}

pub async fn get_adjacent_posts(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> ApiResult<crate::models::AdjacentPosts> {
    let posts = services
        .post
        .get_adjacent_posts(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Post not found".to_string()))?;
    Ok(Json(ApiResponse::success(posts)))
}

pub async fn list_posts(
    State(services): State<Services>,
    Query(mut query): Query<PostListQuery>,
) -> ApiResult<Page<crate::models::Post>> {
    query.status = Some(PostStatus::Published);
    list_posts_inner(services, query).await
}

pub async fn admin_get_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> ApiResult<crate::models::Post> {
    let post = services
        .post
        .get_post_detail(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Post not found".to_string()))?;
    Ok(Json(ApiResponse::success(post)))
}

pub async fn admin_list_posts(
    State(services): State<Services>,
    Query(query): Query<PostListQuery>,
) -> ApiResult<Page<crate::models::Post>> {
    list_posts_inner(services, query).await
}

async fn list_posts_inner(
    services: Services,
    mut query: PostListQuery,
) -> ApiResult<Page<crate::models::Post>> {
    normalize_query(&mut query);
    let (page, page_size) = pagination(&query);
    let (posts, total) = services.post.list_posts(query).await?;
    Ok(Json(ApiResponse::success(Page::new(
        posts, total, page, page_size,
    ))))
}

fn normalize_query(query: &mut PostListQuery) {
    query.search = query.search.take().and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });
    let (page, page_size) = pagination(query);
    query.page = Some(page);
    query.page_size = Some(page_size);
}

fn pagination(query: &PostListQuery) -> (u32, u32) {
    (
        query.page.unwrap_or(1).max(1),
        query.page_size.unwrap_or(10).clamp(1, 500),
    )
}

pub async fn update_post(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdatePostRequest>,
) -> ApiResult<crate::models::Post> {
    let post = services
        .post
        .update_post(id, request)
        .await?
        .ok_or_else(|| AppError::NotFound("Post not found".to_string()))?;
    Ok(Json(ApiResponse::success(post)))
}

pub async fn delete_post(State(services): State<Services>, Path(id): Path<i64>) -> ApiResult<()> {
    if !services.post.delete_post(id).await? {
        return Err(AppError::NotFound("Post not found".to_string()));
    }
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Post deleted successfully",
    )))
}

pub async fn get_post_tags_public(
    State(services): State<Services>,
    Path(id): Path<i64>,
) -> ApiResult<Vec<crate::models::Tag>> {
    services
        .post
        .get_post_detail(id)
        .await?
        .filter(|post| post.status == PostStatus::Published as i32)
        .ok_or_else(|| AppError::NotFound("Post not found".to_string()))?;
    let tags = services.post.get_post_tags(id).await?;
    Ok(Json(ApiResponse::success(tags)))
}

pub async fn update_post_tags(
    State(services): State<Services>,
    Path(id): Path<i64>,
    Json(request): Json<UpdatePostTagsRequest>,
) -> ApiResult<Vec<crate::models::Tag>> {
    services.post.update_post_tags(id, request.tag_ids).await?;
    let tags = services.post.get_post_tags(id).await?;
    Ok(Json(ApiResponse::success(tags)))
}

#[cfg(test)]
mod tests {
    use super::{normalize_query, pagination};
    use crate::models::PostListQuery;

    #[test]
    fn query_normalization_is_lossless_and_bounded() {
        let mut query = PostListQuery {
            page: Some(0),
            page_size: Some(999),
            search: Some("  100%_Rust  ".to_string()),
            ..Default::default()
        };
        normalize_query(&mut query);

        assert_eq!(query.search.as_deref(), Some("100%_Rust"));
        assert_eq!(pagination(&query), (1, 500));
    }
}
