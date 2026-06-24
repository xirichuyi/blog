use crate::config::Config;
use crate::database::Database;
use crate::handlers::{
    about_handler, category_handler, download_handler, health_handler, mail_handler,
    music_handler, pdf_handler, post_handler, quant_handler, resource_handler, seo_handler,
    tag_handler, tools_handler,
};
use crate::middleware::auth::admin_middleware;
use crate::services::Services;
use crate::utils::FileHandler;
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
    pub file_handler: Arc<FileHandler>,
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

impl FromRef<AppState> for Arc<FileHandler> {
    fn from_ref(app_state: &AppState) -> Arc<FileHandler> {
        Arc::clone(&app_state.file_handler)
    }
}

impl FromRef<AppState> for Services {
    fn from_ref(app_state: &AppState) -> Services {
        app_state.services.clone()
    }
}

pub async fn create_app(database: Database, config: &Config) -> Router {
    let config = Arc::new(config.clone());
    let file_handler = Arc::new(FileHandler::new(
        config.storage.upload_dir.clone(),
        config.storage.max_file_size,
    ));
    let services = Services::new(
        database.clone(),
        file_handler.clone(),
        config.storage.upload_dir.clone(),
    );
    let app_state = AppState {
        database,
        config,
        file_handler,
        services,
    };
    // Public routes (no authentication required)
    let public_routes = Router::new()
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
        // Music public routes
        .route("/api/music/list", get(music_handler::list_music))
        .route("/api/music/get/:id", get(music_handler::get_music))
        // Download public routes
        .route(
            "/api/download/download_file/:id",
            get(download_handler::download_file),
        )
        .route(
            "/api/download/get_file_list",
            get(download_handler::get_file_list),
        )
        .route(
            "/api/download/get_file/:id",
            get(download_handler::get_file),
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
        // Online tools
        .route(
            "/api/tools/gitbook2epub",
            post(tools_handler::gitbook2epub),
        )
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
        // Post admin routes
        .route("/api/post/create", post(post_handler::create_post))
        .route("/api/post/update/:id", put(post_handler::update_post))
        .route("/api/post/delete/:id", delete(post_handler::delete_post))
        .route(
            "/api/post/upload_post_image",
            post(post_handler::upload_post_image),
        )
        .route(
            "/api/post/update_cover/:id",
            put(post_handler::update_post_cover),
        )
        .route("/api/post/get_tags/:id", get(post_handler::get_post_tags))
        .route(
            "/api/post/update_tags/:id",
            put(post_handler::update_post_tags),
        )
        // PDF admin routes
        .route("/api/pdf/upload", post(pdf_handler::upload_pdf))
        // About admin routes
        .route("/api/about/update", put(about_handler::update_about))
        // Music admin routes
        .route("/api/music/create", post(music_handler::create_music))
        .route("/api/music/update/:id", put(music_handler::update_music))
        .route("/api/music/delete/:id", delete(music_handler::delete_music))
        .route("/api/music/upload_music", post(music_handler::upload_music))
        .route(
            "/api/music/upload_cover",
            post(music_handler::upload_cover_image),
        )
        .route(
            "/api/music/upload_music_cover/:id",
            post(music_handler::upload_music_cover),
        )
        // Download admin routes
        .route(
            "/api/download/upload_file",
            post(download_handler::upload_file),
        )
        .route(
            "/api/download/delete_file/:id",
            delete(download_handler::delete_file),
        )
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
        // Resource management routes
        .route(
            "/api/admin/resources",
            get(resource_handler::list_resources),
        )
        .route(
            "/api/admin/resources/stats",
            get(resource_handler::get_resource_stats),
        )
        .route(
            "/api/admin/resources/delete",
            delete(resource_handler::delete_resource),
        )
        .route(
            "/api/admin/resources/optimize",
            post(resource_handler::optimize_all_images),
        )
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
