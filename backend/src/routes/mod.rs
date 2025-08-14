use crate::config::Config;
use crate::database::Database;
use crate::handlers::{
    category_handler, download_handler, music_handler, post_handler, tag_handler,
};
use crate::middleware::auth::admin_middleware;
use axum::{
    extract::FromRef,
    middleware,
    routing::{delete, get, post, put},
    Router,
};

#[derive(Clone)]
pub struct AppState {
    pub database: Database,
    pub config: Config,
}

impl FromRef<AppState> for Database {
    fn from_ref(app_state: &AppState) -> Database {
        app_state.database.clone()
    }
}

impl FromRef<AppState> for Config {
    fn from_ref(app_state: &AppState) -> Config {
        app_state.config.clone()
    }
}

pub async fn create_app(database: Database, config: &Config) -> Router {
    let app_state = AppState {
        database: database.clone(),
        config: config.clone(),
    };
    // Public routes (no authentication required)
    let public_routes = Router::new()
        // Post public routes
        .route("/api/post/list", get(post_handler::list_posts))
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
        .route("/api/tag/list", get(tag_handler::list_tags));

    // Admin routes (authentication required)
    let admin_routes = Router::new()
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
        // Music admin routes
        .route("/api/music/create", post(music_handler::create_music))
        .route("/api/music/update/:id", put(music_handler::update_music))
        .route("/api/music/delete/:id", delete(music_handler::delete_music))
        .route("/api/music/upload_music", post(music_handler::upload_music))
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
        // Apply admin authentication middleware
        .layer(middleware::from_fn_with_state(
            app_state.clone(),
            admin_middleware,
        ));

    // Combine all routes
    Router::new()
        .merge(public_routes)
        .merge(admin_routes)
        .with_state(app_state)
}
