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
    pub port: u16,
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

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:data/blog.db".to_string());

        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "your-secret-key".to_string());

        let admin_token = env::var("BLOG_ADMIN_TOKEN")
            .unwrap_or_else(|_| "admin-token".to_string());

        let port = env::var("PORT")
            .unwrap_or_else(|_| "3001".to_string())
            .parse::<u16>()
            .unwrap_or(3001);

        let deepseek_api_key = env::var("DEEPSEEK_API_KEY")
            .unwrap_or_else(|_| "".to_string());

        let deepseek_api_url = env::var("DEEPSEEK_API_URL")
            .unwrap_or_else(|_| "https://api.deepseek.com".to_string());

        let cors_origins = env::var("CORS_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        let upload_dir = env::var("UPLOAD_DIR")
            .unwrap_or_else(|_| "uploads".to_string());

        let blog_data_dir = env::var("BLOG_DATA_DIR")
            .unwrap_or_else(|_| "data".to_string());

        let max_file_size = env::var("MAX_FILE_SIZE")
            .unwrap_or_else(|_| "10485760".to_string()) // 10MB default
            .parse::<u64>()
            .unwrap_or(10485760);

        Ok(Config {
            database: DatabaseConfig {
                url: database_url,
            },
            jwt: JwtConfig {
                secret: jwt_secret,
                admin_token,
            },
            server: ServerConfig {
                port,
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
