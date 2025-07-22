use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

use crate::config::Settings;
use crate::database::Database;
use crate::handlers::health;
use crate::handlers::{admin, auth, blog, chat};
use crate::middleware::{auth::auth_middleware, cors::cors_layer};

/// Create the main application router with all routes and middleware
pub async fn create_app(database: Database, settings: &Settings) -> Router {
    Router::new()
        .merge(public_routes())
        .merge(admin_routes())
        .layer(create_middleware_stack(settings))
        .with_state(database)
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
fn admin_routes() -> Router<Database> {
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
        // Category management
        .route("/api/admin/categories", get(admin::get_categories))
        // AI assistance
        .route("/api/admin/ai-assist", post(admin::ai_assist))
        // Apply authentication middleware to all admin routes
        .layer(middleware::from_fn(auth_middleware))
}

/// Create the middleware stack with proper ordering
fn create_middleware_stack(
    settings: &Settings,
) -> ServiceBuilder<
    tower::layer::util::Stack<
        tower::layer::util::Stack<
            TraceLayer<
                tower_http::classify::SharedClassifier<
                    tower_http::classify::ServerErrorsAsFailures,
                >,
            >,
            tower_http::cors::CorsLayer,
        >,
        tower::layer::util::Identity,
    >,
> {
    ServiceBuilder::new()
        // Request tracing (outermost)
        .layer(TraceLayer::new_for_http())
        // CORS handling
        .layer(cors_layer(settings))
    // Add more middleware here as needed
    // - Rate limiting
    // - Request ID
    // - Compression
    // - Security headers
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Settings;
    use axum_test::TestServer;

    #[tokio::test]
    async fn test_health_check() {
        let settings = Settings::new().unwrap();
        let database = Database::new(":memory:").await.unwrap();
        let app = create_app(database, &settings).await;

        let server = TestServer::new(app).unwrap();
        let response = server.get("/api/health").await;

        assert_eq!(response.status_code(), 200);
        assert_eq!(response.text(), "OK");
    }
}
