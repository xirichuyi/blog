use axum::{
    routing::{delete, get, post, put},
    Router,
};

use tower_http::trace::TraceLayer;

use crate::config::Settings;
use crate::database::Database;
use crate::handlers::health;
use crate::handlers::{admin, auth, blog, chat};
use crate::middleware::{auth::auth_middleware, cors::cors_layer};

/// Create the main application router with all routes and middleware
pub async fn create_app(database: Database, _settings: &Settings) -> Router<Database> {
    Router::new()
        .merge(public_routes())
        .merge(admin_routes(database))
        // Apply middleware layers
        .layer(TraceLayer::new_for_http())
        .layer(cors_layer())
}

/// Public routes that don't require authentication
fn public_routes() -> Router<Database> {
    Router::new()
        // Blog API routes
        .route("/api/posts", get(blog::get_posts))
        .route("/api/posts/:slug", get(blog::get_post_by_slug))
        .route("/api/categories", get(blog::get_categories))
        .route(
            "/api/categories/:category",
            get(blog::get_posts_by_category),
        )
        // AI Chat route
        .route("/api/chat", post(chat::chat_with_ai))
        // Health check endpoints
        .route("/api/health", get(health::health_check))
        .route("/api/health/detailed", get(health::health_detailed))
        .route("/api/health/ready", get(health::readiness_check))
        .route("/api/health/live", get(health::liveness_check))
}

/// Admin routes that require authentication
fn admin_routes(database: Database) -> Router<Database> {
    Router::new()
        // Authentication
        .route("/api/admin/verify", get(auth::verify_token))
        // Dashboard
        .route("/api/admin/dashboard", get(admin::get_dashboard))
        // Post management
        .route("/api/admin/posts", get(admin::get_all_posts))
        .route("/api/admin/posts", post(admin::create_post))
        .route("/api/admin/posts/:slug", get(admin::get_post))
        .route("/api/admin/posts/:slug", put(admin::update_post))
        .route("/api/admin/posts/:slug", delete(admin::delete_post))
        .route(
            "/api/admin/posts/:slug/markdown",
            get(admin::get_post_markdown),
        )
        // Category management
        .route("/api/admin/categories", get(admin::get_categories))
        // AI assistance
        .route("/api/admin/ai-assist", post(admin::ai_assist))
        // System status
        .route("/api/admin/system-status", get(admin::get_system_status))
        // Statistics trends
        .route("/api/admin/stats-trends", get(admin::get_stats_trends))
        // File upload
        .route("/api/admin/upload/image", post(admin::upload_image))
        // Apply authentication middleware to all admin routes
        .layer(axum::middleware::from_fn_with_state(
            database,
            auth_middleware,
        ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Settings;

    #[tokio::test]
    async fn test_routes_creation() {
        let settings = Settings::new().unwrap();
        let database = Database::new(":memory:").await.unwrap();
        let _app = create_app(database, &settings).await;
        // Test passes if app creation succeeds
    }
}
