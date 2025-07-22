use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub auth: AuthSettings,
    pub ai: AiSettings,
    pub cors: CorsSettings,
    pub storage: StorageSettings,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseSettings {
    pub url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct AuthSettings {
    pub jwt_secret: String,
    pub admin_token: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct AiSettings {
    pub deepseek_api_key: Option<String>,
    pub deepseek_api_url: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CorsSettings {
    pub origins: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct StorageSettings {
    pub upload_dir: String,
    pub blog_data_dir: String,
}

impl Settings {
    pub fn new() -> Result<Self, ConfigError> {
        // Load .env file if it exists
        dotenvy::dotenv().ok();

        let config = Config::builder()
            // Start with default values
            .set_default("server.host", "127.0.0.1")?
            .set_default("server.port", 3001)?
            .set_default("database.url", "sqlite:./data/blog.db")?
            .set_default("auth.jwt_secret", "your-super-secret-jwt-key")?
            .set_default("auth.admin_token", "your-secret-admin-token")?
            .set_default(
                "ai.deepseek_api_url",
                "https://api.deepseek.com/v1/chat/completions",
            )?
            .set_default("ai.deepseek_api_key", None::<String>)?
            .set_default(
                "cors.origins",
                vec!["http://localhost:5173", "http://localhost:3000"],
            )?
            .set_default("storage.upload_dir", "./uploads")?
            .set_default("storage.blog_data_dir", "./data/blog")?
            // Try to load from config file (optional)
            .add_source(File::with_name("config").required(false))
            // Override with environment variables
            .add_source(Environment::with_prefix("CYRUS_BLOG").separator("_"))
            // Override with direct environment variables
            .add_source(Environment::default().try_parsing(true))
            .build()?;

        let mut settings: Settings = config.try_deserialize()?;

        // Handle special environment variables that don't follow the pattern
        if let Ok(database_url) = env::var("DATABASE_URL") {
            settings.database.url = database_url;
        }

        if let Ok(jwt_secret) = env::var("JWT_SECRET") {
            settings.auth.jwt_secret = jwt_secret;
        }

        if let Ok(admin_token) = env::var("BLOG_ADMIN_TOKEN") {
            settings.auth.admin_token = admin_token;
        }

        if let Ok(deepseek_key) = env::var("DEEPSEEK_API_KEY") {
            settings.ai.deepseek_api_key = Some(deepseek_key);
        }

        if let Ok(deepseek_url) = env::var("DEEPSEEK_API_URL") {
            settings.ai.deepseek_api_url = deepseek_url;
        }

        if let Ok(cors_origins) = env::var("CORS_ORIGINS") {
            settings.cors.origins = cors_origins
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();
        }

        Ok(settings)
    }
}
