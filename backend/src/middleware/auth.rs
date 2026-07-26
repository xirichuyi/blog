use crate::config::{constants::BEARER_PREFIX, Config};
use crate::routes::AppState;
use crate::utils::error::{AppError, Result};
use axum::{
    extract::{Request, State},
    http::{header, HeaderMap},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

const SESSION_ISSUER: &str = "chuyi-blog";
const SESSION_AUDIENCE: &str = "blog-admin";
pub const SESSION_COOKIE: &str = "blog_admin_session";
pub const ADMIN_SESSION_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AdminIdentity {
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AdminSessionClaims {
    sub: String,
    email: String,
    name: String,
    picture: Option<String>,
    iss: String,
    aud: String,
    iat: usize,
    exp: usize,
}

pub async fn admin_middleware(
    State(app_state): State<AppState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response> {
    if has_emergency_token(&headers, &app_state.config.jwt.admin_token)
        || authorized_session(&headers, &app_state.config).is_ok()
    {
        return Ok(next.run(request).await);
    }

    Err(AppError::Unauthorized(
        "Google sign-in is required".to_string(),
    ))
}

pub fn issue_session_token(identity: &AdminIdentity, secret: &str) -> Result<String> {
    let issued_at = unix_timestamp()?;
    let claims = AdminSessionClaims {
        sub: identity.email.clone(),
        email: identity.email.clone(),
        name: identity.name.clone(),
        picture: identity.picture.clone(),
        iss: SESSION_ISSUER.to_string(),
        aud: SESSION_AUDIENCE.to_string(),
        iat: issued_at,
        exp: issued_at + ADMIN_SESSION_TTL_SECONDS as usize,
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|error| {
        tracing::error!("Failed to issue admin session: {}", error);
        AppError::Internal("Failed to create admin session".to_string())
    })
}

pub fn session_identity(headers: &HeaderMap, secret: &str) -> Result<AdminIdentity> {
    let token = cookie_value(headers, SESSION_COOKIE)
        .ok_or_else(|| AppError::Unauthorized("Admin session is missing".to_string()))?;
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[SESSION_ISSUER]);
    validation.set_audience(&[SESSION_AUDIENCE]);

    let claims = decode::<AdminSessionClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|_| AppError::Unauthorized("Admin session is invalid or expired".to_string()))?
    .claims;

    Ok(AdminIdentity {
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
    })
}

pub fn authorized_session(headers: &HeaderMap, config: &Config) -> Result<AdminIdentity> {
    let identity = session_identity(headers, &config.jwt.secret)?;
    let allowed = config
        .google_auth
        .as_ref()
        .is_some_and(|google| google.allows_email(&identity.email));
    if !allowed {
        return Err(AppError::Unauthorized(
            "This Google account is no longer allowed".to_string(),
        ));
    }
    Ok(identity)
}

pub(crate) fn cookie_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|cookies| cookies.split(';'))
        .filter_map(|cookie| cookie.trim().split_once('='))
        .find_map(|(cookie_name, value)| (cookie_name == name).then_some(value))
}

pub(crate) fn secure_eq(provided: &str, expected: &str) -> bool {
    if provided.len() != expected.len() {
        return false;
    }
    provided
        .bytes()
        .zip(expected.bytes())
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

fn has_emergency_token(headers: &HeaderMap, expected: &str) -> bool {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix(BEARER_PREFIX))
        .is_some_and(|provided| secure_eq(provided, expected))
}

fn unix_timestamp() -> Result<usize> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as usize)
        .map_err(|_| AppError::Internal("System clock is invalid".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn session_token_round_trips() {
        let identity = AdminIdentity {
            email: "owner@example.com".to_string(),
            name: "Owner".to_string(),
            picture: Some("https://example.com/avatar.png".to_string()),
        };
        let token = issue_session_token(&identity, "test-secret").expect("token should be issued");
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            HeaderValue::from_str(&format!("{SESSION_COOKIE}={token}"))
                .expect("cookie should be valid"),
        );

        assert_eq!(
            session_identity(&headers, "test-secret").expect("session should validate"),
            identity
        );
        assert!(session_identity(&headers, "wrong-secret").is_err());
    }

    #[test]
    fn secure_comparison_requires_an_exact_match() {
        assert!(secure_eq("admin-secret", "admin-secret"));
        assert!(!secure_eq("admin-secrex", "admin-secret"));
        assert!(!secure_eq("admin-secret-extra", "admin-secret"));
    }
}
