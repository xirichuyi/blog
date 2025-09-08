use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub server: ServerConfig,
    pub ai: AiConfig,
    pub cors: CorsConfig,
    pub storage: StorageConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtConfig {
    pub secret: String,
    pub admin_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub deepseek_api_key: String,
    pub deepseek_api_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig {
    pub origins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub upload_dir: String,
    pub blog_data_dir: String,
    pub max_file_size: u64,
}

impl Config {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();

        let database_url =
            env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:data/blog.db".to_string());

        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| {
            if cfg!(debug_assertions) {
                "dev-jwt-secret-key-not-for-production".to_string()
            } else {
                panic!("JWT_SECRET environment variable is required in production")
            }
        });

        let admin_token = env::var("BLOG_ADMIN_TOKEN").unwrap_or_else(|_| {
            if cfg!(debug_assertions) {
                "dev-admin-token-not-for-production".to_string()
            } else {
                panic!("BLOG_ADMIN_TOKEN environment variable is required in production")
            }
        });

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        let port = env::var("PORT")
            .unwrap_or_else(|_| "3006".to_string())
            .parse::<u16>()
            .unwrap_or(3006);

        let use_tls = env::var("USE_TLS")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);

        let deepseek_api_key = env::var("DEEPSEEK_API_KEY").unwrap_or_else(|_| "".to_string());

        let deepseek_api_url =
            env::var("DEEPSEEK_API_URL").unwrap_or_else(|_| "https://api.deepseek.com".to_string());

        let cors_origins = env::var("CORS_ORIGINS")
            .unwrap_or_else(|_| {
                if cfg!(debug_assertions) {
                    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000".to_string()
                } else {
                    // Production should explicitly set CORS_ORIGINS
                    tracing::warn!("CORS_ORIGINS not set in production, using restrictive defaults");
                    "".to_string()
                }
            })
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());

        let blog_data_dir = env::var("BLOG_DATA_DIR").unwrap_or_else(|_| "data".to_string());

        let max_file_size = env::var("MAX_FILE_SIZE")
            .unwrap_or_else(|_| "10485760".to_string()) // 10MB default
            .parse::<u64>()
            .unwrap_or(10485760);

        Ok(Config {
            database: DatabaseConfig { url: database_url },
            jwt: JwtConfig {
                secret: jwt_secret,
                admin_token,
            },
            server: ServerConfig {
                host,
                port,
                use_tls,
            },
            ai: AiConfig {
                deepseek_api_key,
                deepseek_api_url,
            },
            cors: CorsConfig {
                origins: cors_origins,
            },
            storage: StorageConfig {
                upload_dir,
                blog_data_dir,
                max_file_size,
            },
        })
    }
}
