use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::Json,
};
use axum_extra::extract::Multipart;
use serde::Deserialize;
use std::path::Path as StdPath;
use tokio::fs;
use tokio::io::AsyncWriteExt;

use crate::config::Settings;
use crate::database::Database;
use crate::handlers::health::HealthStatus;
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

/// Upload image handler
pub async fn upload_image(
    headers: HeaderMap,
    State(database): State<Database>,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    let settings = Settings::new()?;
    let upload_dir = StdPath::new(&settings.storage.upload_dir).join("images");

    // 确保上传目录存在
    fs::create_dir_all(&upload_dir)
        .await
        .map_err(|e| AppError::internal(format!("Failed to create upload directory: {}", e)))?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::validation(format!("Failed to read multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or("");

        if name == "image" {
            let filename = field
                .file_name()
                .ok_or_else(|| AppError::validation("No filename provided".to_string()))?
                .to_string();

            // 验证文件扩展名
            let extension = StdPath::new(&filename)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !["jpg", "jpeg", "png", "webp", "gif"].contains(&extension.as_str()) {
                return Err(AppError::validation(
                    "Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.".to_string(),
                ));
            }

            // 读取文件数据
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::validation(format!("Failed to read file data: {}", e)))?;

            // 验证文件大小
            if data.len() > settings.storage.max_file_size {
                return Err(AppError::validation(format!(
                    "File too large. Maximum size is {} bytes.",
                    settings.storage.max_file_size
                )));
            }

            // 生成唯一文件名
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            let random: u32 = rand::random();
            let new_filename = format!("{}-{}.{}", timestamp, random, extension);

            // 保存文件
            let file_path = upload_dir.join(&new_filename);
            let mut file = fs::File::create(&file_path)
                .await
                .map_err(|e| AppError::internal(format!("Failed to create file: {}", e)))?;

            file.write_all(&data)
                .await
                .map_err(|e| AppError::internal(format!("Failed to write file: {}", e)))?;

            // 返回成功响应
            return Ok(Json(serde_json::json!({
                "success": true,
                "url": format!("/uploads/images/{}", new_filename),
                "filename": new_filename,
                "size": data.len()
            })));
        }
    }

    Err(AppError::validation(
        "No image file found in request".to_string(),
    ))
}

/// Get system status for admin dashboard
pub async fn get_system_status(
    headers: HeaderMap,
    State(database): State<Database>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    // Get detailed health information
    let health_response =
        crate::handlers::health::health_detailed(axum::extract::State(database.clone())).await?;
    let health_data = health_response.0;

    // Extract relevant information for admin dashboard
    let server_status = match health_data.status {
        HealthStatus::Healthy => "online",
        HealthStatus::Degraded => "maintenance",
        HealthStatus::Unhealthy => "offline",
    };

    let database_status = match health_data.checks.database.status {
        crate::handlers::health::CheckStatus::Pass => "connected",
        crate::handlers::health::CheckStatus::Warn => "disconnected",
        crate::handlers::health::CheckStatus::Fail => "error",
    };

    let storage_usage = health_data
        .checks
        .disk
        .details
        .as_ref()
        .and_then(|details| details.get("usage_percent"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let response = serde_json::json!({
        "success": true,
        "data": {
            "serverStatus": server_status,
            "databaseStatus": database_status,
            "storageUsage": storage_usage.round() as u32,
            "lastUpdated": chrono::Utc::now().to_rfc3339(),
            "uptime": health_data.uptime_seconds,
            "version": health_data.version,
            "metrics": health_data.metrics
        }
    });

    Ok(Json(response))
}

/// Get post markdown content for editing
pub async fn get_post_markdown(
    headers: HeaderMap,
    Path(slug): Path<String>,
    State(database): State<Database>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    // Validate slug format
    Validator::validate_slug(&slug)?;

    let blog_service = BlogService::new(database);

    match blog_service.get_post_by_slug(&slug).await? {
        Some(post) => {
            let response = serde_json::json!({
                "success": true,
                "content": post.content.unwrap_or_default()
            });
            Ok(Json(response))
        }
        None => Err(AppError::not_found(format!(
            "Post with slug '{}' not found",
            slug
        ))),
    }
}

/// Get statistics trends for admin dashboard
pub async fn get_stats_trends(
    headers: HeaderMap,
    State(database): State<Database>,
) -> AppResult<Json<serde_json::Value>> {
    check_admin_auth(&headers, &database).await?;

    let blog_service = BlogService::new(database);
    let trends = blog_service.get_stats_trends().await?;

    let response = serde_json::json!({
        "success": true,
        "data": trends
    });

    Ok(Json(response))
}
