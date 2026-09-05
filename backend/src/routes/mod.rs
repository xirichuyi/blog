use crate::config::Config;
use crate::database::Database;
use crate::handlers::{
    about_handler, analytics_handler, auth_handler, book_handler, category_handler,
    changelog_handler, health_handler, mail_handler, post_handler, quant_handler, seo_handler,
    tag_handler, tools_handler, upload_handler,
};
use crate::middleware::auth::admin_middleware;
use crate::models::ApiResponse;
use crate::services::Services;
use crate::utils::error::AppError;
use crate::utils::R2Storage;
use axum::{
    body::to_bytes,
    extract::{DefaultBodyLimit, FromRef},
    http::header,
    middleware,
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub database: Database,
    pub config: Arc<Config>,
    pub r2_storage: Arc<R2Storage>,
    pub services: Services,
}

impl FromRef<AppState> for Database {
    fn from_ref(app_state: &AppState) -> Database {
        app_state.database.clone()
    }
}

impl FromRef<AppState> for Arc<Config> {
    fn from_ref(app_state: &AppState) -> Arc<Config> {
        Arc::clone(&app_state.config)
    }
}

impl FromRef<AppState> for Arc<R2Storage> {
    fn from_ref(app_state: &AppState) -> Arc<R2Storage> {
        Arc::clone(&app_state.r2_storage)
    }
}

impl FromRef<AppState> for Services {
    fn from_ref(app_state: &AppState) -> Services {
        app_state.services.clone()
    }
}

async fn api_not_found() -> AppError {
    AppError::NotFound("API endpoint not found".to_string())
}

async fn normalize_api_error(response: Response) -> Response {
    if !response.status().is_client_error() && !response.status().is_server_error() {
        return response;
    }
    let is_json = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json"));
    if is_json {
        return response;
    }

    let status = response.status();
    let (_, body) = response.into_parts();
    let message = to_bytes(body, 64 * 1024)
        .await
        .ok()
        .and_then(|body| String::from_utf8(body.to_vec()).ok())
        .filter(|message| !message.trim().is_empty())
        .unwrap_or_else(|| {
            status
                .canonical_reason()
                .unwrap_or("Request failed")
                .to_string()
        });
    (
        status,
        Json(ApiResponse::<()>::error(status.as_u16(), message.trim())),
    )
        .into_response()
}

pub async fn create_app(database: Database, config: &Config) -> Router {
    let config = Arc::new(config.clone());
    let r2_storage = Arc::new(R2Storage::new(&config.s3));
    let services = Services::new(
        database.clone(),
        r2_storage.clone(),
        config.cloudflare_analytics.clone(),
    );
    let app_state = AppState {
        database,
        config,
        r2_storage,
        services,
    };
    // Public routes (no authentication required)
    let public_routes = Router::new()
        // Google OAuth and cookie session routes
        .route("/auth/google/start", get(auth_handler::google_start))
        .route("/auth/google/callback", get(auth_handler::google_callback))
        .route("/auth/session", get(auth_handler::session))
        .route("/auth/logout", post(auth_handler::logout))
        // Health check routes
        .route("/health", get(health_handler::health_check))
        .route("/health/ready", get(health_handler::readiness_check))
        .route("/health/live", get(health_handler::liveness_check))
        // Public content resources
        .route("/posts", get(post_handler::list_posts))
        .route("/posts/:id", get(post_handler::get_post))
        .route("/posts/:id/adjacent", get(post_handler::get_adjacent_posts))
        .route("/posts/:id/tags", get(post_handler::get_post_tags_public))
        .route("/categories", get(category_handler::list_categories))
        .route("/tags", get(tag_handler::list_tags))
        .route("/about", get(about_handler::get_about))
        // Books and site changelog
        .route("/books", get(book_handler::list_public))
        .route("/changelog", get(changelog_handler::list_public))
        // Online tools
        .route("/tools/gitbook2epub", post(tools_handler::gitbook2epub))
        // 邮箱阅读（IMAP）：凭据由请求当场传入，服务端零存储、地址白名单。
        .route("/mail/list", post(mail_handler::list))
        .route("/mail/body", post(mail_handler::body))
        // 量化机器人收益快照（只读展示，数据由定时任务从 Vector 只读提取）。
        .route("/quant", get(quant_handler::get_quant));

    // Admin routes (authentication required)
    let admin_routes = Router::new()
        // Dashboard stats
        .route(
            "/admin/dashboard/stats",
            get(health_handler::get_dashboard_stats),
        )
        .route(
            "/admin/health/detailed",
            get(health_handler::detailed_health_check),
        )
        .route("/admin/analytics", get(analytics_handler::dashboard))
        .route(
            "/admin/posts",
            get(post_handler::admin_list_posts).post(post_handler::create_post),
        )
        .route(
            "/admin/posts/:id",
            get(post_handler::admin_get_post)
                .put(post_handler::update_post)
                .delete(post_handler::delete_post),
        )
        .route("/admin/posts/:id/tags", put(post_handler::update_post_tags))
        // Unified R2 direct-upload sessions. File bytes never pass through this API.
        .route(
            "/admin/uploads",
            post(upload_handler::begin).delete(upload_handler::delete),
        )
        .route("/admin/uploads/resume", post(upload_handler::resume))
        .route("/admin/uploads/complete", post(upload_handler::complete))
        .route("/admin/uploads/abort", post(upload_handler::abort))
        // Book library and direct R2 file uploads
        .route(
            "/admin/books",
            get(book_handler::list_admin).post(book_handler::create),
        )
        .route(
            "/admin/books/:id",
            put(book_handler::update).delete(book_handler::delete_book),
        )
        .route("/admin/books/files/:id", delete(book_handler::delete_file))
        // Changelog management
        .route(
            "/admin/changelog",
            get(changelog_handler::list_admin).post(changelog_handler::create),
        )
        .route(
            "/admin/changelog/:id",
            put(changelog_handler::update).delete(changelog_handler::delete_entry),
        )
        .route("/admin/about", put(about_handler::update_about))
        .route("/admin/categories", post(category_handler::create_category))
        .route(
            "/admin/categories/:id",
            put(category_handler::update_category).delete(category_handler::delete_category),
        )
        .route("/admin/tags", post(tag_handler::create_tag))
        .route(
            "/admin/tags/:id",
            put(tag_handler::update_tag).delete(tag_handler::delete_tag),
        )
        // Apply admin authentication middleware
        .layer(middleware::from_fn_with_state(
            app_state.clone(),
            admin_middleware,
        ));

    let api_routes = public_routes
        .merge(admin_routes)
        .fallback(api_not_found)
        // Upload bytes go directly to R2. Keep accidental/hostile JSON bodies
        // from consuming unbounded backend memory.
        .layer(DefaultBodyLimit::max(4 * 1024 * 1024))
        .layer(middleware::map_response(normalize_api_error));

    // API 与 SPA 使用独立 fallback，未知 API 始终返回统一 JSON。
    Router::new()
        .nest("/api", api_routes)
        .fallback(seo_handler::spa_fallback)
        .with_state(app_state)
}

#[cfg(test)]
mod tests {
    use super::{api_not_found, normalize_api_error, to_bytes};
    use crate::models::ApiResponse;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    #[tokio::test]
    async fn framework_errors_use_the_api_envelope() {
        let response =
            normalize_api_error((StatusCode::BAD_REQUEST, "bad body").into_response()).await;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let envelope: ApiResponse<serde_json::Value> = serde_json::from_slice(&body).unwrap();
        assert_eq!(envelope.code, 400);
        assert_eq!(envelope.message, "bad body");
        assert!(envelope.data.is_none());
    }

    #[tokio::test]
    async fn unknown_api_routes_are_json_not_spa_html() {
        let response = api_not_found().await.into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let envelope: ApiResponse<serde_json::Value> = serde_json::from_slice(&body).unwrap();
        assert_eq!(envelope.code, 404);
        assert_eq!(envelope.message, "API endpoint not found");
    }
}
