mod config;
mod database;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;
mod utils;

use std::net::SocketAddr;
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Settings;
use database::Database;
use handlers::health;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    //tracing 的作用是什么？
    //tracing 是用于记录和分析应用程序的日志和事件的库。它提供了一个统一的接口来记录和查看日志，并且可以与各种后端集成，如文件、控制台、网络等。
    //解释语法
    //tracing_subscriber::registry() 是用于创建一个 tracing 的注册表。
    //with(tracing_subscriber::EnvFilter::try_from_default_env() 是用于创建一个环境过滤器。
    //unwrap_or_else(|_| "cyrus_blog_backend=debug,tower_http=debug".into()) 是用于创建一个默认的过滤器。
    //with(tracing_subscriber::fmt::layer()) 是用于创建一个格式化层。
    //init() 是用于初始化 tracing。

    //这是全部官方的函数嘛

    //这是全部官方的函数嘛
    //是的，这是全部官方的函数。
    //tracing_subscriber::registry() 是用于创建一个 tracing 的注册表。
    //with(tracing_subscriber::EnvFilter::try_from_default_env() 是用于创建一个环境过滤器。
    //unwrap_or_else(|_| "cyrus_blog_backend=debug,tower_http=debug".into()) 是用于创建一个默认的过滤器。
    //with(tracing_subscriber::fmt::layer()) 是用于创建一个格式化层。
    //init() 是用于初始化 tracing。
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

    // Build application routes using routes module
    let app = routes::create_app(database.clone(), &settings)
        .await
        .nest_service("/uploads", ServeDir::new("uploads"))
        .with_state(database);

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
