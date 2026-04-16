use crate::models::ApiResponse;
use crate::routes::AppState;
use crate::services::Services;
use axum::{extract::State, http::StatusCode, response::Json};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct FinishRegistrationRequest {
    pub credential: serde_json::Value,
    pub name: Option<String>,
}

#[derive(Deserialize)]
pub struct FinishAuthenticationRequest {
    pub credential: serde_json::Value,
}

#[derive(Deserialize)]
pub struct DeleteCredentialRequest {
    pub id: String,
}

/// GET /api/webauthn/has-credentials — public, check if passkeys exist
pub async fn has_credentials(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &services.webauthn else {
        return Ok(Json(ApiResponse::success(serde_json::json!({ "has_credentials": false }))));
    };

    match webauthn.has_credentials().await {
        Ok(has) => Ok(Json(ApiResponse::success(serde_json::json!({ "has_credentials": has })))),
        Err(e) => {
            tracing::error!("Failed to check credentials: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to check credentials")))
        }
    }
}

/// GET /api/webauthn/auth-start — public, start authentication ceremony
pub async fn auth_start(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &services.webauthn else {
        return Ok(Json(ApiResponse::bad_request("WebAuthn not configured")));
    };

    match webauthn.start_authentication().await {
        Ok(rcr) => {
            let value = serde_json::to_value(&rcr).unwrap_or_default();
            Ok(Json(ApiResponse::success(value)))
        }
        Err(e) => {
            tracing::error!("WebAuthn auth start error: {}", e);
            Ok(Json(ApiResponse::bad_request(&e.to_string())))
        }
    }
}

/// POST /api/webauthn/auth-finish — public, finish authentication ceremony
pub async fn auth_finish(
    State(app_state): State<AppState>,
    Json(body): Json<FinishAuthenticationRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &app_state.services.webauthn else {
        return Ok(Json(ApiResponse::bad_request("WebAuthn not configured")));
    };

    let auth: webauthn_rs::prelude::PublicKeyCredential = match serde_json::from_value(body.credential) {
        Ok(v) => v,
        Err(e) => {
            return Ok(Json(ApiResponse::bad_request(&format!("Invalid credential: {}", e))));
        }
    };

    match webauthn.finish_authentication(&auth, &app_state.config.jwt.admin_token).await {
        Ok(token) => {
            Ok(Json(ApiResponse::success(serde_json::json!({
                "success": true,
                "token": token,
                "user": {
                    "id": "1",
                    "username": "admin",
                    "role": "admin"
                }
            }))))
        }
        Err(e) => {
            tracing::warn!("WebAuthn auth failed: {}", e);
            Ok(Json(ApiResponse::unauthorized("Authentication failed")))
        }
    }
}

/// GET /api/admin/webauthn/register-start — admin only, start registration
pub async fn register_start(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &services.webauthn else {
        return Ok(Json(ApiResponse::bad_request("WebAuthn not configured")));
    };

    match webauthn.start_registration().await {
        Ok(ccr) => {
            let value = serde_json::to_value(&ccr).unwrap_or_default();
            Ok(Json(ApiResponse::success(value)))
        }
        Err(e) => {
            tracing::error!("WebAuthn register start error: {}", e);
            Ok(Json(ApiResponse::internal_error(&e.to_string())))
        }
    }
}

/// POST /api/admin/webauthn/register-finish — admin only, finish registration
pub async fn register_finish(
    State(services): State<Services>,
    Json(body): Json<FinishRegistrationRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &services.webauthn else {
        return Ok(Json(ApiResponse::bad_request("WebAuthn not configured")));
    };

    let reg: webauthn_rs::prelude::RegisterPublicKeyCredential = match serde_json::from_value(body.credential) {
        Ok(v) => v,
        Err(e) => {
            return Ok(Json(ApiResponse::bad_request(&format!("Invalid credential: {}", e))));
        }
    };

    let name = body.name.unwrap_or_else(|| "My Passkey".to_string());

    match webauthn.finish_registration(&reg, &name).await {
        Ok(()) => Ok(Json(ApiResponse::success(serde_json::json!({ "registered": true })))),
        Err(e) => {
            tracing::error!("WebAuthn register finish error: {}", e);
            Ok(Json(ApiResponse::bad_request(&e.to_string())))
        }
    }
}

/// GET /api/admin/webauthn/credentials — admin only, list credentials
pub async fn list_credentials(
    State(services): State<Services>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &services.webauthn else {
        return Ok(Json(ApiResponse::success(serde_json::json!([]))));
    };

    match webauthn.list_credentials().await {
        Ok(creds) => Ok(Json(ApiResponse::success(serde_json::json!(creds)))),
        Err(e) => {
            tracing::error!("Failed to list credentials: {}", e);
            Ok(Json(ApiResponse::internal_error("Failed to list credentials")))
        }
    }
}

/// DELETE /api/admin/webauthn/credentials — admin only, delete a credential
pub async fn delete_credential(
    State(services): State<Services>,
    Json(body): Json<DeleteCredentialRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let Some(webauthn) = &services.webauthn else {
        return Ok(Json(ApiResponse::bad_request("WebAuthn not configured")));
    };

    match webauthn.delete_credential(&body.id).await {
        Ok(()) => Ok(Json(ApiResponse::success(serde_json::json!({ "deleted": true })))),
        Err(e) => {
            tracing::error!("Failed to delete credential: {}", e);
            Ok(Json(ApiResponse::bad_request(&e.to_string())))
        }
    }
}
