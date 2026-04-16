use serde::{Deserialize, Serialize};
use std::env;

/// 应用常量定义
pub mod constants {
    /// URL前缀常量
    pub const UPLOADS_URL_PREFIX: &str = "/uploads/";

    /// 默认配置值
    pub const DEFAULT_DATABASE_URL: &str = "sqlite:data/blog.db";
    pub const DEFAULT_HOST: &str = "0.0.0.0";
    pub const DEFAULT_PORT: u16 = 3006;
    pub const DEFAULT_MAX_FILE_SIZE: u64 = 10_485_760; // 10MB
    pub const DEFAULT_UPLOAD_DIR: &str = "uploads";
    pub const DEFAULT_BLOG_DATA_DIR: &str = "data";
    pub const DEFAULT_DEEPSEEK_API_URL: &str = "https://api.deepseek.com";

    /// Bearer token前缀
    pub const BEARER_PREFIX: &str = "Bearer ";

    /// Presigned URL expiry in seconds
    pub const PRESIGN_EXPIRY_SECS: u64 = 300;

    /// Allowed upload subfolders
    pub const UPLOAD_SUBFOLDERS: &[&str] = &["images", "covers", "music", "music_covers", "pdfs", "downloads"];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Environment {
    Development,
    Production,
}

impl Environment {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "dev" | "development" | "debug" => Environment::Development,
            "prod" | "production" | "release" => Environment::Production,
            _ => {
                tracing::warn!("Unknown environment '{}', defaulting to development", s);
                Environment::Development
            }
        }
    }

    pub fn is_development(&self) -> bool {
        matches!(self, Environment::Development)
    }

    pub fn is_production(&self) -> bool {
        matches!(self, Environment::Production)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub environment: Environment,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub server: ServerConfig,
    pub ai: AiConfig,
    pub cors: CorsConfig,
    pub storage: StorageConfig,
    pub s3: S3Config,
    pub webauthn: WebauthnConfig,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebauthnConfig {
    pub rp_id: String,
    pub rp_origin: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Config {
    pub enabled: bool,
    pub endpoint: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub public_url: String,
}

impl Config {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();

        // 确定运行环境：优先使用环境变量，否则根据编译模式判断
        let environment = env::var("ENV")
            .or_else(|_| env::var("RUST_ENV"))
            .or_else(|_| env::var("APP_ENV"))
            .map(|s| Environment::from_str(&s))
            .unwrap_or_else(|_| {
                // 如果没有设置环境变量，根据编译模式判断
                if cfg!(debug_assertions) {
                    Environment::Development
                } else {
                    Environment::Production
                }
            });

        tracing::info!("Running in {:?} mode", environment);

        let database_url =
            env::var("DATABASE_URL").unwrap_or_else(|_| constants::DEFAULT_DATABASE_URL.to_string());

        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| {
            if environment.is_development() {
                "dev-jwt-secret-key-not-for-production".to_string()
            } else {
                panic!("JWT_SECRET environment variable is required in production")
            }
        });

        let admin_token = env::var("BLOG_ADMIN_TOKEN").unwrap_or_else(|_| {
            if environment.is_development() {
                "dev-admin-token-not-for-production".to_string()
            } else {
                panic!("BLOG_ADMIN_TOKEN environment variable is required in production")
            }
        });

        let host = env::var("HOST").unwrap_or_else(|_| constants::DEFAULT_HOST.to_string());

        let port = env::var("PORT")
            .unwrap_or_else(|_| constants::DEFAULT_PORT.to_string())
            .parse::<u16>()
            .unwrap_or(constants::DEFAULT_PORT);

        let use_tls = env::var("USE_TLS")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);

        let deepseek_api_key = env::var("DEEPSEEK_API_KEY").unwrap_or_else(|_| "".to_string());

        let deepseek_api_url =
            env::var("DEEPSEEK_API_URL").unwrap_or_else(|_| constants::DEFAULT_DEEPSEEK_API_URL.to_string());

        // CORS 配置：开发模式允许所有来源，生产模式需要明确配置
        let cors_origins: Vec<String> = if environment.is_development() {
            // 开发模式：如果设置了 CORS_ORIGINS 就使用，否则允许所有（通过空列表表示）
            env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| {
                    // 开发模式默认不限制，返回空列表表示允许所有
                    tracing::info!("Development mode: CORS will allow all origins");
                    "".to_string()
                })
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            // 生产模式：必须明确配置 CORS_ORIGINS
            let origins = env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| {
                    tracing::warn!("CORS_ORIGINS not set in production, using restrictive defaults");
                    "".to_string()
                });
            origins
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };

        let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| constants::DEFAULT_UPLOAD_DIR.to_string());

        let blog_data_dir = env::var("BLOG_DATA_DIR").unwrap_or_else(|_| constants::DEFAULT_BLOG_DATA_DIR.to_string());

        let max_file_size = env::var("MAX_FILE_SIZE")
            .unwrap_or_else(|_| constants::DEFAULT_MAX_FILE_SIZE.to_string())
            .parse::<u64>()
            .unwrap_or(constants::DEFAULT_MAX_FILE_SIZE);

        let s3_enabled = env::var("S3_ENABLED")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);

        let s3_config = S3Config {
            enabled: s3_enabled,
            endpoint: env::var("S3_ENDPOINT").unwrap_or_default(),
            bucket: env::var("S3_BUCKET").unwrap_or_else(|_| "blog-assets".to_string()),
            access_key: env::var("S3_ACCESS_KEY").unwrap_or_default(),
            secret_key: env::var("S3_SECRET_KEY").unwrap_or_default(),
            region: env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string()),
            public_url: env::var("S3_PUBLIC_URL").unwrap_or_default(),
        };

        if s3_config.enabled {
            tracing::info!("S3 storage enabled, bucket: {}", s3_config.bucket);
        }

        // WebAuthn config — derive RP origin from CORS_ORIGINS or explicit env vars
        let webauthn_rp_id = env::var("WEBAUTHN_RP_ID").unwrap_or_else(|_| {
            // Default: derive from first CORS origin or use localhost
            cors_origins.first()
                .and_then(|o| url::Url::parse(o).ok())
                .and_then(|u: url::Url| u.host_str().map(|h: &str| h.to_string()))
                .unwrap_or_else(|| "localhost".to_string())
        });
        let webauthn_rp_origin = env::var("WEBAUTHN_RP_ORIGIN").unwrap_or_else(|_| {
            cors_origins.first()
                .cloned()
                .unwrap_or_else(|| format!("http://localhost:{}", port))
        });

        let webauthn_config = WebauthnConfig {
            rp_id: webauthn_rp_id,
            rp_origin: webauthn_rp_origin,
        };

        Ok(Config {
            environment,
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
            s3: s3_config,
            webauthn: webauthn_config,
        })
    }
}
