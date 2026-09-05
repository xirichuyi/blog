//! CORS (Cross-Origin Resource Sharing) 配置模块
//!
//! 根据运行环境（开发/生产）提供不同的 CORS 策略：
//! - 开发模式：允许所有来源，方便本地开发调试
//! - 生产模式：只允许配置的特定来源

use axum::http::{header, HeaderValue, Method};
use tower_http::cors::CorsLayer;

use crate::config::{Config, Environment};

/// 创建 CORS 中间件层
///
/// # 参数
/// - `config`: 应用配置，包含环境和 CORS 来源设置
///
/// # 返回
/// - `Result<CorsLayer, String>`: 配置好的 CORS 层或错误信息
///
/// # 行为
/// - **开发模式**: 使用 `CorsLayer::permissive()` 允许所有来源
/// - **生产模式**:
///   - 如果配置了来源，只允许指定来源
///   - 如果未配置来源，使用宽松模式（不推荐）
pub fn create_cors_layer(config: &Config) -> Result<CorsLayer, String> {
    match config.environment {
        Environment::Development => {
            tracing::info!("🔓 CORS: 开发模式 - 允许所有来源");
            Ok(CorsLayer::permissive())
        }
        Environment::Production => create_production_cors(config),
    }
}

/// 创建生产环境的 CORS 配置
fn create_production_cors(config: &Config) -> Result<CorsLayer, String> {
    if config.cors.origins.is_empty() {
        return Err("CORS_ORIGINS is required in production".to_string());
    }

    // 解析配置的来源为 HeaderValue
    let origins: Result<Vec<HeaderValue>, _> = config
        .cors
        .origins
        .iter()
        .map(|origin| origin.parse())
        .collect();

    let origins = origins.map_err(|e| format!("CORS 来源配置无效: {}", e))?;

    tracing::info!("🔒 CORS: 生产模式 - 允许来源: {:?}", config.cors.origins);

    // 构建严格的 CORS 配置
    let mut cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(3600)); // 预检请求缓存 1 小时

    // 添加允许的来源
    for origin in origins {
        cors = cors.allow_origin(origin);
    }

    Ok(cors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{
        CorsConfig, DatabaseConfig, Environment, JwtConfig, S3Config, ServerConfig,
    };

    fn config(environment: Environment, origins: Vec<&str>) -> Config {
        Config {
            environment,
            database: DatabaseConfig {
                url: "sqlite::memory:".to_string(),
            },
            jwt: JwtConfig {
                secret: "test-secret".to_string(),
                admin_token: "test-token".to_string(),
            },
            google_auth: None,
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 3006,
                use_tls: false,
            },
            cors: CorsConfig {
                origins: origins.into_iter().map(str::to_string).collect(),
            },
            s3: S3Config::default(),
            cloudflare_analytics: None,
        }
    }

    #[test]
    fn production_without_origins_refuses_to_start() {
        let error = create_cors_layer(&config(Environment::Production, vec![]))
            .expect_err("empty production CORS must fail");
        assert!(error.contains("CORS_ORIGINS"));
    }

    #[test]
    fn production_with_origins_builds_a_strict_layer() {
        let _ = create_cors_layer(&config(
            Environment::Production,
            vec!["https://blog.chuyi.uk"],
        ))
        .expect("configured production CORS should build");
    }

    #[test]
    fn development_allows_empty_origins() {
        let _ = create_cors_layer(&config(Environment::Development, vec![]))
            .expect("development CORS may stay open");
    }
}
