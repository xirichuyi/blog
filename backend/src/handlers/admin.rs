use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::Json,
};
use serde::Deserialize;

use crate::config::Settings;
use crate::database::Database;
use crate::models::{
    AiAssistRequest, AiAssistResponse, BlogPost, BlogPostCreate, BlogPostResponse, BlogPostUpdate,
    BlogPostsResponse,
};
use crate::services::{AiService, AuthService, BlogService};
use crate::utils::{
    admin_success_response, blog_post_response, operation_success_response, AppError, AppResult,
    Validator,
};

#[derive(Debug, Deserialize)]
pub struct AdminPostsQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

// Middleware function to check admin authentication
async fn check_admin_auth(headers: &HeaderMap, database: &Database) -> AppResult<()> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    if let Some(token) = auth_header {
        let settings = Settings::new()?;
        let auth_service = AuthService::new(database.clone(), settings);

        if auth_service.verify_admin_token(token) {
            Ok(())
        } else {
            Err(AppError::authorization("Invalid admin token"))
        }
    } else {
        Err(AppError::authentication("Authorization header missing"))
    }
}

pub async fn get_dashboard(
    headers: HeaderMap,
    State(database): State<Database>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    let blog_service = BlogService::new(database);
    let data = blog_service.get_dashboard_data().await?;

    Ok(Json(data))
}

pub async fn get_all_posts(
    headers: HeaderMap,
    Query(params): Query<AdminPostsQuery>,
    State(database): State<Database>,
) -> AppResult<Json<BlogPostsResponse>> {
    check_admin_auth(&headers, &database).await?;

    // Validate pagination parameters
    let (page, limit) = Validator::validate_pagination(params.page, params.limit)?;

    let blog_service = BlogService::new(database);
    let response = blog_service
        .get_all_posts_admin(Some(page), Some(limit))
        .await?;

    Ok(Json(response))
}

pub async fn get_post(
    headers: HeaderMap,
    Path(slug): Path<String>,
    State(database): State<Database>,
) -> AppResult<Json<BlogPost>> {
    check_admin_auth(&headers, &database).await?;

    // Validate slug format
    Validator::validate_slug(&slug)?;

    let blog_service = BlogService::new(database);

    match blog_service.get_post_by_slug(&slug).await? {
        Some(post) => Ok(Json(post)),
        None => Err(AppError::not_found(format!(
            "Post with slug '{}' not found",
            slug
        ))),
    }
}

pub async fn create_post(
    headers: HeaderMap,
    State(database): State<Database>,
    Json(post_data): Json<BlogPostCreate>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    // Validate post data
    Validator::validate_title(&post_data.title)?;
    Validator::validate_excerpt(&post_data.excerpt)?;
    Validator::validate_content(&post_data.content)?;
    Validator::validate_categories(&post_data.categories)?;

    if let Some(ref slug) = post_data.slug {
        Validator::validate_slug(slug)?;
    }

    if let Some(ref date) = post_data.date {
        Validator::validate_date(date)?;
    }

    let blog_service = BlogService::new(database);
    let post = blog_service.create_post(post_data).await?;

    Ok(blog_post_response(Some(post), None))
}

pub async fn update_post(
    headers: HeaderMap,
    Path(slug): Path<String>,
    State(database): State<Database>,
    Json(post_data): Json<BlogPostUpdate>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    // Validate slug format
    Validator::validate_slug(&slug)?;

    // Validate post data if provided
    if let Some(ref title) = post_data.title {
        Validator::validate_title(title)?;
    }
    if let Some(ref excerpt) = post_data.excerpt {
        Validator::validate_excerpt(excerpt)?;
    }
    if let Some(ref content) = post_data.content {
        Validator::validate_content(content)?;
    }
    if let Some(ref categories) = post_data.categories {
        Validator::validate_categories(categories)?;
    }
    if let Some(ref date) = post_data.date {
        Validator::validate_date(date)?;
    }

    let blog_service = BlogService::new(database);

    match blog_service.update_post(&slug, post_data).await? {
        Some(post) => Ok(blog_post_response(Some(post), None)),
        None => Ok(blog_post_response(
            None::<BlogPost>,
            Some("Post not found".to_string()),
        )),
    }
}

pub async fn delete_post(
    headers: HeaderMap,
    Path(slug): Path<String>,
    State(database): State<Database>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    // Validate slug format
    Validator::validate_slug(&slug)?;

    let blog_service = BlogService::new(database);

    match blog_service.delete_post(&slug).await? {
        true => Ok(operation_success_response(None)),
        false => Ok(operation_success_response(Some(
            "Post not found".to_string(),
        ))),
    }
}

pub async fn get_categories(
    headers: HeaderMap,
    State(database): State<Database>,
) -> AppResult<Json<Vec<String>>> {
    check_admin_auth(&headers, &database).await?;

    let blog_service = BlogService::new(database);
    let categories = blog_service.get_categories().await?;

    Ok(Json(categories))
}

pub async fn ai_assist(
    headers: HeaderMap,
    State(database): State<Database>,
    Json(request): Json<AiAssistRequest>,
) -> AppResult<Json<AiAssistResponse>> {
    check_admin_auth(&headers, &database).await?;

    // Validate AI prompt
    Validator::validate_ai_prompt(&request.prompt)?;

    let settings = Settings::new()?;
    let ai_service = AiService::new(settings);

    let response = ai_service.ai_assist(request).await?;
    Ok(Json(response))
}
