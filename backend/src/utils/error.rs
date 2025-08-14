use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("File error: {0}")]
    File(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Database(ref e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error")
            }
            AppError::Io(ref e) => {
                tracing::error!("IO error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "IO error")
            }
            AppError::Json(ref e) => {
                tracing::error!("JSON error: {}", e);
                (StatusCode::BAD_REQUEST, "Invalid JSON")
            }
            AppError::Validation(ref message) => {
                tracing::warn!("Validation error: {}", message);
                (StatusCode::BAD_REQUEST, message.as_str())
            }
            AppError::NotFound(ref message) => {
                tracing::warn!("Not found: {}", message);
                (StatusCode::NOT_FOUND, message.as_str())
            }
            AppError::Unauthorized(ref message) => {
                tracing::warn!("Unauthorized: {}", message);
                (StatusCode::UNAUTHORIZED, message.as_str())
            }
            AppError::BadRequest(ref message) => {
                tracing::warn!("Bad request: {}", message);
                (StatusCode::BAD_REQUEST, message.as_str())
            }
            AppError::Internal(ref message) => {
                tracing::error!("Internal error: {}", message);
                (StatusCode::INTERNAL_SERVER_ERROR, message.as_str())
            }
            AppError::File(ref message) => {
                tracing::error!("File error: {}", message);
                (StatusCode::INTERNAL_SERVER_ERROR, message.as_str())
            }
        };

        let body = Json(json!({
            "code": status.as_u16(),
            "message": error_message,
            "data": serde_json::Value::Null
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
