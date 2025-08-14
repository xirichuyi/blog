use crate::routes::AppState;
use crate::utils::error::{AppError, Result};
use axum::{
    extract::{Request, State},
    http::HeaderMap,
    middleware::Next,
    response::Response,
};

pub async fn admin_middleware(
    State(app_state): State<AppState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|header| header.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized(
            "Invalid Authorization header format".to_string(),
        ));
    }

    let token = &auth_header[7..]; // Remove "Bearer " prefix

    if token != app_state.config.jwt.admin_token {
        return Err(AppError::Unauthorized("Invalid admin token".to_string()));
    }

    Ok(next.run(request).await)
}
