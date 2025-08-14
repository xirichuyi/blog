use crate::utils::error::{AppError, Result};
use axum::{
    extract::{Request, State},
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use crate::config::Config;

pub async fn admin_auth_middleware(
    State(config): State<Config>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|header| header.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized("Invalid Authorization header format".to_string()));
    }

    let token = &auth_header[7..]; // Remove "Bearer " prefix

    if token != config.jwt.admin_token {
        return Err(AppError::Unauthorized("Invalid admin token".to_string()));
    }

    Ok(next.run(request).await)
}

pub fn verify_admin_token(token: &str, config: &Config) -> Result<()> {
    if token != config.jwt.admin_token {
        return Err(AppError::Unauthorized("Invalid admin token".to_string()));
    }
    Ok(())
}
