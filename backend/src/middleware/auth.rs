use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};

use crate::config::Settings;
use crate::database::Database;
use crate::services::AuthService;

pub async fn auth_middleware(
    State(database): State<Database>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Skip auth for public routes
    let path = request.uri().path();
    if is_public_route(path) {
        return Ok(next.run(request).await);
    }

    // Check for admin token
    let headers = request.headers();
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    if let Some(token) = auth_header {
        let settings = Settings::new().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let auth_service = AuthService::new(database, settings);

        if auth_service.verify_admin_token(token) {
            Ok(next.run(request).await)
        } else {
            Err(StatusCode::UNAUTHORIZED)
        }
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

fn is_public_route(path: &str) -> bool {
    let public_routes = ["/api/posts", "/api/categories", "/api/chat"];

    // Check exact matches and path prefixes
    public_routes
        .iter()
        .any(|&route| path == route || path.starts_with(&format!("{}/", route)))
        || path.starts_with("/api/posts/")
        || path.starts_with("/api/categories/")
}
