use crate::config::constants::BEARER_PREFIX;
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

    let token = auth_header
        .strip_prefix(BEARER_PREFIX)
        .ok_or_else(|| AppError::Unauthorized("Invalid Authorization header format".to_string()))?;

    // Constant-time comparison to prevent timing attacks
    let expected = app_state.config.jwt.admin_token.as_bytes();
    let provided = token.as_bytes();
    if expected.len() != provided.len()
        || expected.iter().zip(provided.iter()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) != 0
    {
        return Err(AppError::Unauthorized("Invalid admin token".to_string()));
    }

    Ok(next.run(request).await)
}
