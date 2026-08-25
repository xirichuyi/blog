use crate::config::Config;
use crate::database::Database;
use crate::handlers::{
    about_handler, auth_handler, book_handler, category_handler, changelog_handler, health_handler,
    mail_handler, post_handler, quant_handler, seo_handler, tag_handler, tools_handler,
    upload_handler,
};
use crate::middleware::auth::admin_middleware;
use crate::services::Services;
use crate::utils::R2Storage;
use axum::{
    extract::FromRef,
    middleware,
    routing::{delete, get, post, put},
    Router,
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

pub async fn create_app(database: Database, config: &Config) -> Router {
    let config = Arc::new(config.clone());
    let r2_storage = Arc::new(R2Storage::new(&config.s3));
    let services = Services::new(database.clone(), r2_storage.clone());
    let app_state = AppState {
        database,
        config,
        r2_storage,
        services,
    };
    // Public routes (no authentication required)
    let public_routes = Router::new()
        // Google OAuth and cookie session routes
        .route("/api/auth/google/start", get(auth_handler::google_start))
        .route(
            "/api/auth/google/callback",
            get(auth_handler::google_callback),
        )
        .route("/api/auth/session", get(auth_handler::session))
        .route("/api/auth/logout", post(auth_handler::logout))
        // Health check routes
        .route("/api/health", get(health_handler::health_check))
        .route(
            "/api/health/detailed",
            get(health_handler::detailed_health_check),
        )
        .route("/api/health/ready", get(health_handler::readiness_check))
        .route("/api/health/live", get(health_handler::liveness_check))
        // Post public routes
        .route("/api/post/list", get(post_handler::list_posts))
        .route(
            "/api/post/list_with_details",
            get(post_handler::list_posts_with_details),
        )
        .route("/api/post/get/:id", get(post_handler::get_post))
        .route(
            "/api/post/adjacent/:id",
            get(post_handler::get_adjacent_posts),
        )
        // Category public routes
        .route("/api/category/list", get(category_handler::list_categories))
        // Tag public routes
        .route("/api/tag/list", get(tag_handler::list_tags))
        // Post tags public routes
        .route(
            "/api/post/:id/tags",
            get(post_handler::get_post_tags_public),
        )
        // About public route
        .route("/api/about/get", get(about_handler::get_about))
        // Books and site changelog
        .route("/api/books", get(book_handler::list_public))
        .route("/api/changelog", get(changelog_handler::list_public))
        // Online tools
        .route("/api/tools/gitbook2epub", post(tools_handler::gitbook2epub))
        // 邮箱阅读（IMAP）：凭据由请求当场传入，服务端零存储、地址白名单。
        .route("/api/mail/list", post(mail_handler::list))
        .route("/api/mail/body", post(mail_handler::body))
        // 量化机器人收益快照（只读展示，数据由定时任务从 Vector 只读提取）。
        .route("/api/quant", get(quant_handler::get_quant));

    // Admin routes (authentication required)
    let admin_routes = Router::new()
        // Dashboard stats
        .route(
            "/api/admin/dashboard/stats",
            get(health_handler::get_dashboard_stats),
        )
        .route(
            "/api/admin/posts",
            get(post_handler::admin_list_posts_with_details),
        )
        .route("/api/admin/posts/:id", get(post_handler::admin_get_post))
        // Unified R2 direct-upload sessions. File bytes never pass through this API.
        .route("/api/admin/uploads", post(upload_handler::begin))
        .route(
            "/api/admin/uploads/complete",
            post(upload_handler::complete),
        )
        .route("/api/admin/uploads/abort", post(upload_handler::abort))
        // Book library and direct R2 file uploads
        .route(
            "/api/admin/books",
            get(book_handler::list_admin).post(book_handler::create),
        )
        .route(
            "/api/admin/books/:id",
            put(book_handler::update).delete(book_handler::delete_book),
        )
        .route(
            "/api/admin/books/files/:id",
            delete(book_handler::delete_file),
        )
        // Changelog management
        .route(
            "/api/admin/changelog",
            get(changelog_handler::list_admin).post(changelog_handler::create),
        )
        .route(
            "/api/admin/changelog/:id",
            put(changelog_handler::update).delete(changelog_handler::delete_entry),
        )
        // Post admin routes
        .route("/api/post/create", post(post_handler::create_post))
        .route("/api/post/update/:id", put(post_handler::update_post))
        .route("/api/post/delete/:id", delete(post_handler::delete_post))
        .route("/api/post/get_tags/:id", get(post_handler::get_post_tags))
        .route(
            "/api/post/update_tags/:id",
            put(post_handler::update_post_tags),
        )
        // About admin routes
        .route("/api/about/update", put(about_handler::update_about))
        // Category admin routes
        .route(
            "/api/category/create",
            post(category_handler::create_category),
        )
        .route(
            "/api/category/update/:id",
            put(category_handler::update_category),
        )
        .route(
            "/api/category/delete/:id",
            delete(category_handler::delete_category),
        )
        // Tag admin routes
        .route("/api/tag/create", post(tag_handler::create_tag))
        .route("/api/tag/update/:id", put(tag_handler::update_tag))
        .route("/api/tag/delete/:id", delete(tag_handler::delete_tag))
        // Apply admin authentication middleware
        .layer(middleware::from_fn_with_state(
            app_state.clone(),
            admin_middleware,
        ));

    // Combine all routes；fallback 负责动态 SEO(SPA 外壳注入 meta + sitemap/robots)。
    Router::new()
        .merge(public_routes)
        .merge(admin_routes)
        .fallback(seo_handler::spa_fallback)
        .with_state(app_state)
}
