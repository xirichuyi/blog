mod config;
mod database;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;
mod utils;

use std::net::SocketAddr;
use tower_http::compression::{CompressionLayer, CompressionLevel};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use database::Database;
use handlers::health_handler;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cyrus_blog_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::new()?;

    // Initialize database
    let database = Database::new(&config.database.url).await?;
    database.migrate().await?;

    // Initialize health check metrics
    health_handler::init_server_metrics();

    // Configure CORS - Allow all origins in development
    let cors = if cfg!(debug_assertions) {
        // Development mode - allow all origins
        CorsLayer::permissive()
    } else {
        // Production mode - use specific origins
        let cors_origins: Result<Vec<_>, _> = config
            .cors
            .origins
            .iter()
            .map(|origin| origin.parse())
            .collect();

        let cors_origins =
            cors_origins.map_err(|e| format!("Invalid CORS origin configuration: {}", e))?;

        CorsLayer::new()
            .allow_origin(cors_origins)
            .allow_methods([
                axum::http::Method::GET,
                axum::http::Method::POST,
                axum::http::Method::PUT,
                axum::http::Method::DELETE,
                axum::http::Method::OPTIONS,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
            ])
    };

    // Add compression layer for HTTP responses
    let compression_layer = CompressionLayer::new()
        .gzip(true)
        .br(true)
        .quality(CompressionLevel::Default);

    // Build application routes
    let app = routes::create_app(database.clone(), &config)
        .await
        .nest_service("/uploads", ServeDir::new(&config.storage.upload_dir))
        .layer(cors)
        .layer(compression_layer);

    // Create server address - support both HOST env var and config
    let host = std::env::var("HOST").unwrap_or_else(|_| config.server.host.clone());
    let addr: SocketAddr = format!("{}:{}", host, config.server.port).parse()?;

    // Start server
    let listener = tokio::net::TcpListener::bind(addr).await?;

    if config.server.use_tls {
        // Log message about TLS not being available in this simplified version
        tracing::info!(
            "🚀 Starting Cyrus Blog server on {} (TLS not enabled in this version)",
            addr
        );
    } else {
        tracing::info!("🚀 Starting Cyrus Blog server on {}", addr);
    }

    // Start server with HTTP/2 support via HTTP Upgrade
    axum::serve(listener, app).await?;

    Ok(())
}
