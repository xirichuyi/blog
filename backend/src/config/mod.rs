use serde::{Deserialize, Serialize};
use std::{env, fmt};

/// 应用常量定义
pub mod constants {
    /// 默认配置值
    pub const DEFAULT_DATABASE_URL: &str = "sqlite:data/blog.db";
    pub const DEFAULT_HOST: &str = "0.0.0.0";
    pub const DEFAULT_PORT: u16 = 3006;

    /// Bearer token前缀
    pub const BEARER_PREFIX: &str = "Bearer ";
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Environment {
    Development,
    Production,
}

impl Environment {
    pub fn parse_lossy(s: &str) -> Self {
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
    pub google_auth: Option<GoogleAuthConfig>,
    pub server: ServerConfig,
    pub cors: CorsConfig,
    pub s3: S3Config,
    pub cloudflare_analytics: Option<CloudflareAnalyticsConfig>,
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
pub struct GoogleAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub allowed_emails: Vec<String>,
}

impl GoogleAuthConfig {
    pub fn allows_email(&self, email: &str) -> bool {
        self.allowed_emails
            .iter()
            .any(|allowed| allowed.eq_ignore_ascii_case(email))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig {
    pub origins: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct S3Config {
    pub enabled: bool,
    pub endpoint: String,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub public_url: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct CloudflareAnalyticsConfig {
    pub api_token: String,
    pub account_id: String,
    pub site_tag: String,
    pub site_host: String,
}

impl fmt::Debug for CloudflareAnalyticsConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("CloudflareAnalyticsConfig")
            .field("api_token", &"[redacted]")
            .field("account_id", &self.account_id)
            .field("site_tag", &self.site_tag)
            .field("site_host", &self.site_host)
            .finish()
    }
}

impl Config {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Deployment keeps the Cloudflare read-only credential separate from
        // the application's long-lived .env file.
        dotenvy::from_filename(".analytics.env").ok();
        dotenvy::dotenv().ok();

        // 确定运行环境：优先使用环境变量，否则根据编译模式判断
        let environment = env::var("ENV")
            .or_else(|_| env::var("RUST_ENV"))
            .or_else(|_| env::var("APP_ENV"))
            .map(|s| Environment::parse_lossy(&s))
            .unwrap_or_else(|_| {
                // 如果没有设置环境变量，根据编译模式判断
                if cfg!(debug_assertions) {
                    Environment::Development
                } else {
                    Environment::Production
                }
            });

        tracing::info!("Running in {:?} mode", environment);

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| constants::DEFAULT_DATABASE_URL.to_string());

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
        let google_auth = load_google_auth_config();

        let host = env::var("HOST").unwrap_or_else(|_| constants::DEFAULT_HOST.to_string());

        let port = env::var("PORT")
            .unwrap_or_else(|_| constants::DEFAULT_PORT.to_string())
            .parse::<u16>()
            .unwrap_or(constants::DEFAULT_PORT);

        let use_tls = env::var("USE_TLS")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);

        // CORS 配置：开发模式允许所有来源，生产模式需要明确配置
        let cors_origins = if environment.is_development() {
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
            let origins = env::var("CORS_ORIGINS").unwrap_or_else(|_| {
                tracing::warn!("CORS_ORIGINS not set in production, using restrictive defaults");
                "".to_string()
            });
            origins
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };

        let s3 = S3Config {
            enabled: env::var("S3_ENABLED")
                .unwrap_or_else(|_| "false".to_string())
                .parse::<bool>()
                .unwrap_or(false),
            endpoint: env::var("S3_ENDPOINT").unwrap_or_default(),
            bucket: env::var("S3_BUCKET").unwrap_or_else(|_| "blog-assets".to_string()),
            access_key: env::var("S3_ACCESS_KEY").unwrap_or_default(),
            secret_key: env::var("S3_SECRET_KEY").unwrap_or_default(),
            region: env::var("S3_REGION").unwrap_or_else(|_| "auto".to_string()),
            public_url: env::var("S3_PUBLIC_URL").unwrap_or_default(),
        };
        if environment.is_production() && !s3.enabled {
            return Err(
                "S3_ENABLED=true is required in production; local file storage is not supported"
                    .into(),
            );
        }
        if s3.enabled
            && [
                &s3.endpoint,
                &s3.bucket,
                &s3.access_key,
                &s3.secret_key,
                &s3.public_url,
            ]
            .iter()
            .any(|value| value.trim().is_empty())
        {
            return Err("S3_ENABLED=true but one or more S3 settings are empty".into());
        }

        let cloudflare_analytics = load_cloudflare_analytics_config()?;

        Ok(Config {
            environment,
            database: DatabaseConfig { url: database_url },
            jwt: JwtConfig {
                secret: jwt_secret,
                admin_token,
            },
            google_auth,
            server: ServerConfig {
                host,
                port,
                use_tls,
            },
            cors: CorsConfig {
                origins: cors_origins,
            },
            s3,
            cloudflare_analytics,
        })
    }
}

fn load_cloudflare_analytics_config(
) -> Result<Option<CloudflareAnalyticsConfig>, Box<dyn std::error::Error>> {
    let api_token = match env::var("CF_ANALYTICS_API_TOKEN") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => return Ok(None),
    };
    let account_id = env::var("CF_ANALYTICS_ACCOUNT_ID").unwrap_or_default();
    let site_tag = env::var("CF_ANALYTICS_SITE_TAG").unwrap_or_default();
    let site_host =
        env::var("CF_ANALYTICS_SITE_HOST").unwrap_or_else(|_| "blog.chuyi.uk".to_string());

    if account_id.trim().is_empty() || site_tag.trim().is_empty() || site_host.trim().is_empty() {
        return Err(
            "CF_ANALYTICS_API_TOKEN is set but one or more Cloudflare Analytics settings are empty"
                .into(),
        );
    }

    Ok(Some(CloudflareAnalyticsConfig {
        api_token,
        account_id,
        site_tag,
        site_host,
    }))
}

fn load_google_auth_config() -> Option<GoogleAuthConfig> {
    let client_id = env::var("GOOGLE_CLIENT_ID").ok()?;
    let client_secret = env::var("GOOGLE_CLIENT_SECRET").ok()?;
    let redirect_uri = env::var("GOOGLE_REDIRECT_URI").ok()?;
    let allowed_emails = env::var("GOOGLE_ALLOWED_EMAILS")
        .unwrap_or_default()
        .split(',')
        .map(|email| email.trim().to_lowercase())
        .filter(|email| !email.is_empty())
        .collect();

    Some(GoogleAuthConfig {
        client_id,
        client_secret,
        redirect_uri,
        allowed_emails,
    })
}
