use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::json;

pub struct ApiError {
    pub message: String,
    pub status: StatusCode,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let body = Json(json!({
            "error": self.message,
            "status": self.status.as_u16()
        }));
        
        (self.status, body).into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        tracing::error!("Database error: {}", err);
        ApiError {
            message: "Internal server error".to_string(),
            status: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        tracing::error!("JSON error: {}", err);
        ApiError {
            message: "Invalid JSON format".to_string(),
            status: StatusCode::BAD_REQUEST,
        }
    }
}

pub fn success_response<T>(data: T) -> Json<serde_json::Value> 
where
    T: serde::Serialize,
{
    Json(json!({
        "success": true,
        "data": data
    }))
}

pub fn error_response(message: &str) -> Json<serde_json::Value> {
    Json(json!({
        "success": false,
        "error": message
    }))
}
