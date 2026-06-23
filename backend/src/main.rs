//! Cyrus Blog 后端服务入口
//! 
//! 启动流程：
//! 1. 初始化日志系统
//! 2. 加载配置
//! 3. 初始化数据库连接
//! 4. 配置中间件（CORS、压缩）
//! 5. 构建路由
//! 6. 启动 HTTP 服务器

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
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use database::Database;
use handlers::health_handler;
use middleware::cors::create_cors_layer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. 初始化日志
    init_logging();

    // 2. 加载配置
    let config = Config::new()?;
    tracing::info!("环境: {:?}", config.environment);

    // 3. 初始化数据库
    let database = Database::new(&config.database.url).await?;
    database.migrate().await?;

    // 4. 初始化健康检查指标
    health_handler::init_server_metrics();

    // 5. 配置中间件
    let cors = create_cors_layer(&config)?;
    let compression = create_compression_layer();

    // 6. 构建应用路由
    let app = routes::create_app(database.clone(), &config)
        .await
        .nest_service("/uploads", ServeDir::new(&config.storage.upload_dir))
        // axum 默认请求体上限 2MB，会截断稍大的图片导致 multipart 解析失败；
        // 放宽到 20MB（仍高于 MAX_FILE_SIZE=10MB，留足余量）。
        .layer(axum::extract::DefaultBodyLimit::max(20 * 1024 * 1024))
        .layer(cors)
        .layer(compression);

    // 7. 启动服务器
    start_server(&config, app).await
}

/// 初始化日志系统
fn init_logging() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cyrus_blog_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

/// 创建 HTTP 响应压缩中间件
fn create_compression_layer() -> CompressionLayer {
    CompressionLayer::new()
        .gzip(true)
        .br(true)
        .quality(CompressionLevel::Default)
}

/// 启动 HTTP 服务器
async fn start_server(
    config: &Config,
    app: axum::Router,
) -> Result<(), Box<dyn std::error::Error>> {
    let host = std::env::var("HOST").unwrap_or_else(|_| config.server.host.clone());
    let addr: SocketAddr = format!("{}:{}", host, config.server.port).parse()?;

    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("🚀 Chuyi's Blog 服务启动: http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
