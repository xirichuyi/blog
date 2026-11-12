use crate::models::{
    ApiResponse, CreatePostRequest, Page, PostListQuery, PostStatus, UnlockPostRequest,
    UpdatePostRequest, UpdatePostTagsRequest,
};
use crate::services::post_service::UnlockOutcome;
use crate::services::Services;
use crate::utils::client_ip::client_ip;
use crate::utils::error::{ApiResult, AppError};
use axum::extract::{ConnectInfo, Path, Query, State};
use axum::http::HeaderMap;
use axum::Json;
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

/// 每个 IP 在窗口内允许的密码错误次数。只统计失败，正常阅读不受影响。
const UNLOCK_FAILURE_LIMIT: u32 = 10;
const UNLOCK_WINDOW: Duration = Duration::from_secs(600);

static UNLOCK_FAILURES: LazyLock<Mutex<HashMap<IpAddr, (Instant, u32)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn unlock_failures() -> std::sync::MutexGuard<'static, HashMap<IpAddr, (Instant, u32)>> {
    UNLOCK_FAILURES
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn unlock_blocked(ip: IpAddr, now: Instant) -> bool {
    unlock_failures().get(&ip).is_some_and(|(start, count)| {
        now.duration_since(*start) < UNLOCK_WINDOW && *count >= UNLOCK_FAILURE_LIMIT
    })
}

fn record_unlock_failure(ip: IpAddr, now: Instant) {
    let mut failures = unlock_failures();
    if failures.len() > 4096 {
        failures.retain(|_, (start, _)| now.duration_since(*start) < UNLOCK_WINDOW);
    }
    let entry = failures.entry(ip).or_insert((now, 0));
    if now.duration_since(entry.0) >= UNLOCK_WINDOW {
        *entry = (now, 0);
    }
    entry.1 += 1;
}

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
    // 加密文章只返回标题等展示信息，正文需通过 /posts/:id/unlock 获取。
    Ok(Json(ApiResponse::success(post.redacted())))
}

/// POST /api/posts/:id/unlock —— 用访问密码换取加密文章的完整内容。
pub async fn unlock_post(
    State(services): State<Services>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(request): Json<UnlockPostRequest>,
) -> ApiResult<crate::models::Post> {
    let ip = client_ip(peer, &headers);
    if unlock_blocked(ip, Instant::now()) {
        return Err(AppError::TooManyRequests(
            "密码错误次数过多，请稍后再试".to_string(),
        ));
    }
    match services.post.unlock_post(id, request.password).await? {
        UnlockOutcome::Unlocked(post) => Ok(Json(ApiResponse::success(*post))),
        UnlockOutcome::WrongPassword => {
            record_unlock_failure(ip, Instant::now());
            Err(AppError::Unauthorized("密码不正确".to_string()))
        }
        UnlockOutcome::NotFound => Err(AppError::NotFound("Post not found".to_string())),
    }
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
    Query(mut query): Query<PostListQuery>,
) -> ApiResult<Page<crate::models::Post>> {
    query.reveal_locked = true;
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
    use super::{
        normalize_query, pagination, record_unlock_failure, unlock_blocked, UNLOCK_FAILURE_LIMIT,
        UNLOCK_WINDOW,
    };
    use crate::models::PostListQuery;
    use std::net::{IpAddr, Ipv4Addr};
    use std::time::Instant;

    #[test]
    fn unlock_attempts_are_blocked_after_repeated_failures_then_expire() {
        let ip = IpAddr::V4(Ipv4Addr::new(203, 0, 113, 77));
        let start = Instant::now();
        for _ in 0..UNLOCK_FAILURE_LIMIT {
            assert!(!unlock_blocked(ip, start));
            record_unlock_failure(ip, start);
        }
        assert!(unlock_blocked(ip, start));
        assert!(!unlock_blocked(ip, start + UNLOCK_WINDOW));
    }

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
