use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Json,
};
use serde_json::json;

use crate::config::Settings;
use crate::database::Database;
use crate::services::AuthService;

pub async fn verify_token(
    headers: HeaderMap,
    State(database): State<Database>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    if let Some(token) = auth_header {
        // Load settings (in a real app, this should be injected)
        let settings = Settings::new().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let auth_service = AuthService::new(database, settings);
        
        if auth_service.verify_admin_token(token) {
            Ok(Json(json!({ "success": true })))
        } else {
            Err(StatusCode::UNAUTHORIZED)
        }
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}
