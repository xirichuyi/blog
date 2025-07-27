mod config;
mod database;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Settings;
use database::Database;
use handlers::{admin, auth, blog, chat};
use middleware::cors::cors_layer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cyrus_blog_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let settings = Settings::new()?;

    // Initialize database
    let database = Database::new(&settings.database.url).await?;
    database.migrate().await?;

    // Build application routes
    let app = create_app(database).await;

    // Create server address
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .unwrap_or(3001);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    tracing::info!("🚀 Starting Cyrus Blog server on {}", addr);

    // Start server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn create_app(database: Database) -> Router {
    Router::new()
        // Public blog routes
        .route("/api/posts", get(blog::get_posts))
        .route("/api/posts/:slug", get(blog::get_post_by_slug))
        .route("/api/categories", get(blog::get_categories))
        .route(
            "/api/categories/:category",
            get(blog::get_posts_by_category),
        )
        .route("/api/chat", post(chat::chat_with_ai))
        // Admin routes (protected)
        .route("/api/admin/verify", get(auth::verify_token))
        .route("/api/admin/dashboard", get(admin::get_dashboard))
        .route("/api/admin/posts", get(admin::get_all_posts))
        .route("/api/admin/posts", post(admin::create_post))
        .route("/api/admin/posts/:slug", get(admin::get_post))
        .route("/api/admin/posts/:slug", put(admin::update_post))
        .route("/api/admin/posts/:slug", delete(admin::delete_post))
        .route("/api/admin/categories", get(admin::get_categories))
        .route("/api/admin/ai-assist", post(admin::ai_assist))
        .route("/api/admin/upload/image", post(admin::upload_image))
        // Static file serving for uploads
        .nest_service("/uploads", ServeDir::new("uploads"))
        // Health check endpoints
        .route("/api/health", get(health_check))
        // Middleware layers
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(cors_layer()),
        )
        .with_state(database)
}

/// Simple health check endpoint
async fn health_check() -> &'static str {
    "OK"
}
