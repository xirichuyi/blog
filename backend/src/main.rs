mod config;
mod database;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;
mod utils;

use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use database::Database;

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

    // Build application routes
    let app = routes::create_app(database.clone(), &config)
        .await
        .nest_service("/uploads", ServeDir::new(&config.storage.upload_dir))
        .layer(CorsLayer::permissive());

    // Create server address
    let addr = SocketAddr::from(([127, 0, 0, 1], config.server.port));

    tracing::info!("🚀 Starting Cyrus Blog server on {}", addr);

    // Start server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
