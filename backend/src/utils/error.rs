use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Authentication error: {0}")]
    Authentication(String),

    #[error("Authorization error: {0}")]
    Authorization(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Configuration error: {0}")]
    Configuration(#[from] config::ConfigError),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("HTTP client error: {0}")]
    HttpClient(#[from] reqwest::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Internal server error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message, error_code) = match &self {
            AppError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database operation failed".to_string(),
                "DATABASE_ERROR",
            ),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone(), "VALIDATION_ERROR"),
            AppError::Authentication(msg) => (
                StatusCode::UNAUTHORIZED,
                msg.clone(),
                "AUTHENTICATION_ERROR",
            ),
            AppError::Authorization(msg) => {
                (StatusCode::FORBIDDEN, msg.clone(), "AUTHORIZATION_ERROR")
            }
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone(), "NOT_FOUND"),
            AppError::Configuration(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Configuration error".to_string(),
                "CONFIGURATION_ERROR",
            ),
            AppError::Jwt(_) => (
                StatusCode::UNAUTHORIZED,
                "Invalid token".to_string(),
                "JWT_ERROR",
            ),
            AppError::HttpClient(_) => (
                StatusCode::BAD_GATEWAY,
                "External service error".to_string(),
                "HTTP_CLIENT_ERROR",
            ),
            AppError::Json(_) => (
                StatusCode::BAD_REQUEST,
                "Invalid JSON format".to_string(),
                "JSON_ERROR",
            ),
            AppError::Io(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "File system error".to_string(),
                "IO_ERROR",
            ),
            AppError::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                msg.clone(),
                "INTERNAL_ERROR",
            ),
        };

        // Log the error for debugging (in production, you might want to use structured logging)
        tracing::error!("API Error: {} - {}", error_code, self);

        let body = Json(json!({
            "error": error_message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}

// Result type alias for convenience
pub type AppResult<T> = Result<T, AppError>;

// Helper functions for common errors
impl AppError {
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    pub fn authentication(msg: impl Into<String>) -> Self {
        Self::Authentication(msg.into())
    }

    pub fn authorization(msg: impl Into<String>) -> Self {
        Self::Authorization(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

// Success response helper - returns data directly for API compatibility
pub fn success_response<T: serde::Serialize>(data: T) -> Json<T> {
    Json(data)
}

// Success response with wrapper for admin APIs
pub fn admin_success_response<T: serde::Serialize>(data: T) -> Json<serde_json::Value> {
    Json(json!({
        "success": true,
        "data": data,
    }))
}

// Blog post response helper
pub fn blog_post_response<T: serde::Serialize>(
    post: Option<T>,
    message: Option<String>,
) -> Json<serde_json::Value> {
    Json(json!({
        "success": post.is_some(),
        "message": message,
        "post": post,
    }))
}

// Simple success response for operations
pub fn operation_success_response(message: Option<String>) -> Json<serde_json::Value> {
    Json(json!({
        "success": true,
        "message": message,
    }))
}
