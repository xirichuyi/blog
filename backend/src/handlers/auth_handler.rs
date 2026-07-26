use crate::config::{Config, GoogleAuthConfig};
use crate::middleware::auth::{
    authorized_session, cookie_value, issue_session_token, secure_eq, AdminIdentity,
    ADMIN_SESSION_TTL_SECONDS, SESSION_COOKIE,
};
use crate::models::ApiResponse;
use crate::routes::AppState;
use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue},
    response::{IntoResponse, Redirect, Response},
    Json,
};
use serde::Deserialize;
use url::Url;

const GOOGLE_AUTHORIZE_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://openidconnect.googleapis.com/v1/userinfo";
const OAUTH_STATE_COOKIE: &str = "blog_google_oauth_state";
const OAUTH_STATE_TTL_SECONDS: u64 = 10 * 60;

#[derive(Debug, Deserialize)]
pub struct GoogleCallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct GoogleUserInfo {
    sub: String,
    email: String,
    email_verified: bool,
    name: Option<String>,
    picture: Option<String>,
}

#[derive(Debug)]
enum CallbackFailure {
    NotConfigured,
    Denied,
    InvalidState,
    TokenExchange,
    UserInfo,
    UnverifiedEmail,
    AccountNotAllowed,
    Session,
}

impl CallbackFailure {
    fn query_value(&self) -> &'static str {
        match self {
            Self::NotConfigured => "not_configured",
            Self::Denied => "access_denied",
            Self::InvalidState => "invalid_state",
            Self::TokenExchange => "token_exchange",
            Self::UserInfo => "user_info",
            Self::UnverifiedEmail => "unverified_email",
            Self::AccountNotAllowed => "account_not_allowed",
            Self::Session => "session_failed",
        }
    }
}

pub async fn google_start(State(state): State<AppState>) -> Response {
    let Some(config) = state.config.google_auth.as_ref() else {
        return login_error_redirect(CallbackFailure::NotConfigured);
    };

    let oauth_state = uuid::Uuid::new_v4().simple().to_string();
    let authorize_url = match build_authorize_url(config, &oauth_state) {
        Ok(url) => url,
        Err(error) => {
            tracing::error!("Failed to build Google authorization URL: {}", error);
            return login_error_redirect(CallbackFailure::NotConfigured);
        }
    };
    let mut response = Redirect::to(authorize_url.as_str()).into_response();
    append_cookie(
        &mut response,
        state_cookie(&oauth_state, &state.config, OAUTH_STATE_TTL_SECONDS),
    );
    prevent_caching(&mut response);
    response
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(query): Query<GoogleCallbackQuery>,
    headers: HeaderMap,
) -> Response {
    let result = complete_google_callback(&state, &headers, query).await;
    let mut response = match result {
        Ok(identity) => match issue_session_token(&identity, &state.config.jwt.secret) {
            Ok(token) => {
                let mut response = Redirect::to("/admin").into_response();
                append_cookie(
                    &mut response,
                    session_cookie(&token, &state.config, ADMIN_SESSION_TTL_SECONDS),
                );
                response
            }
            Err(error) => {
                tracing::error!("Failed to establish Google admin session: {}", error);
                login_error_redirect(CallbackFailure::Session)
            }
        },
        Err(failure) => login_error_redirect(failure),
    };
    append_cookie(&mut response, state_cookie("", &state.config, 0));
    prevent_caching(&mut response);
    response
}

pub async fn session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> crate::utils::error::Result<Response> {
    let identity = authorized_session(&headers, &state.config)?;
    let mut response = Json(ApiResponse::success(identity)).into_response();
    prevent_caching(&mut response);
    Ok(response)
}

pub async fn logout(State(state): State<AppState>) -> Response {
    let mut response = Json(ApiResponse::success_with_message((), "Signed out")).into_response();
    append_cookie(&mut response, session_cookie("", &state.config, 0));
    prevent_caching(&mut response);
    response
}

async fn complete_google_callback(
    state: &AppState,
    headers: &HeaderMap,
    query: GoogleCallbackQuery,
) -> std::result::Result<AdminIdentity, CallbackFailure> {
    if query.error.is_some() {
        return Err(CallbackFailure::Denied);
    }
    let config = state
        .config
        .google_auth
        .as_ref()
        .ok_or(CallbackFailure::NotConfigured)?;
    let returned_state = query.state.ok_or(CallbackFailure::InvalidState)?;
    let expected_state =
        cookie_value(headers, OAUTH_STATE_COOKIE).ok_or(CallbackFailure::InvalidState)?;
    if !secure_eq(&returned_state, expected_state) {
        return Err(CallbackFailure::InvalidState);
    }
    let code = query.code.ok_or(CallbackFailure::Denied)?;
    let access_token = exchange_code(config, &code).await?;
    let profile = fetch_user_info(&access_token).await?;

    if profile.sub.is_empty() || !profile.email_verified {
        return Err(CallbackFailure::UnverifiedEmail);
    }
    let email = profile.email.trim().to_lowercase();
    if !config.allows_email(&email) {
        tracing::warn!("Rejected Google sign-in for non-allowlisted account");
        return Err(CallbackFailure::AccountNotAllowed);
    }

    Ok(AdminIdentity {
        name: profile.name.unwrap_or_else(|| email.clone()),
        email,
        picture: profile.picture,
    })
}

async fn exchange_code(
    config: &GoogleAuthConfig,
    code: &str,
) -> std::result::Result<String, CallbackFailure> {
    let response = reqwest::Client::new()
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("code", code),
            ("client_id", config.client_id.as_str()),
            ("client_secret", config.client_secret.as_str()),
            ("redirect_uri", config.redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|error| {
            tracing::error!("Google token request failed: {}", error);
            CallbackFailure::TokenExchange
        })?;
    if !response.status().is_success() {
        tracing::warn!("Google token exchange returned {}", response.status());
        return Err(CallbackFailure::TokenExchange);
    }
    response
        .json::<GoogleTokenResponse>()
        .await
        .map(|token| token.access_token)
        .map_err(|error| {
            tracing::error!("Invalid Google token response: {}", error);
            CallbackFailure::TokenExchange
        })
}

async fn fetch_user_info(
    access_token: &str,
) -> std::result::Result<GoogleUserInfo, CallbackFailure> {
    let response = reqwest::Client::new()
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|error| {
            tracing::error!("Google user-info request failed: {}", error);
            CallbackFailure::UserInfo
        })?;
    if !response.status().is_success() {
        tracing::warn!("Google user-info endpoint returned {}", response.status());
        return Err(CallbackFailure::UserInfo);
    }
    response.json().await.map_err(|error| {
        tracing::error!("Invalid Google user-info response: {}", error);
        CallbackFailure::UserInfo
    })
}

fn build_authorize_url(
    config: &GoogleAuthConfig,
    state: &str,
) -> std::result::Result<Url, url::ParseError> {
    let mut url = Url::parse(GOOGLE_AUTHORIZE_URL)?;
    url.query_pairs_mut()
        .append_pair("client_id", &config.client_id)
        .append_pair("redirect_uri", &config.redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email profile")
        .append_pair("state", state)
        .append_pair("prompt", "select_account")
        .append_pair("include_granted_scopes", "true");
    Ok(url)
}

fn login_error_redirect(failure: CallbackFailure) -> Response {
    let mut response =
        Redirect::to(&format!("/admin/login?error={}", failure.query_value())).into_response();
    prevent_caching(&mut response);
    response
}

fn state_cookie(value: &str, config: &Config, max_age: u64) -> String {
    build_cookie(
        OAUTH_STATE_COOKIE,
        value,
        "/api/auth/google/callback",
        max_age,
        config.environment.is_production(),
    )
}

fn session_cookie(value: &str, config: &Config, max_age: u64) -> String {
    build_cookie(
        SESSION_COOKIE,
        value,
        "/",
        max_age,
        config.environment.is_production(),
    )
}

fn build_cookie(name: &str, value: &str, path: &str, max_age: u64, secure: bool) -> String {
    format!(
        "{name}={value}; Path={path}; HttpOnly; SameSite=Lax; Max-Age={max_age}{}",
        if secure { "; Secure" } else { "" }
    )
}

fn append_cookie(response: &mut Response, cookie: String) {
    match HeaderValue::from_str(&cookie) {
        Ok(value) => {
            response.headers_mut().append(header::SET_COOKIE, value);
        }
        Err(error) => tracing::error!("Failed to create authentication cookie: {}", error),
    }
}

fn prevent_caching(response: &mut Response) {
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response.headers_mut().insert(
        header::HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("no-referrer"),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn google_config() -> GoogleAuthConfig {
        GoogleAuthConfig {
            client_id: "client-id".to_string(),
            client_secret: "client-secret".to_string(),
            redirect_uri: "https://blog.example/api/auth/google/callback".to_string(),
            allowed_emails: vec!["owner@example.com".to_string()],
        }
    }

    #[test]
    fn authorization_url_contains_the_required_security_parameters() {
        let url = build_authorize_url(&google_config(), "random-state")
            .expect("authorization URL should be valid");
        let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();

        assert_eq!(
            params.get("response_type").map(String::as_str),
            Some("code")
        );
        assert_eq!(
            params.get("state").map(String::as_str),
            Some("random-state")
        );
        assert_eq!(
            params.get("scope").map(String::as_str),
            Some("openid email profile")
        );
        assert_eq!(
            params.get("redirect_uri").map(String::as_str),
            Some("https://blog.example/api/auth/google/callback")
        );
    }

    #[test]
    fn production_cookies_are_http_only_secure_and_same_site() {
        let cookie = build_cookie("session", "token", "/", 60, true);

        assert!(cookie.contains("HttpOnly"));
        assert!(cookie.contains("SameSite=Lax"));
        assert!(cookie.contains("Secure"));
        assert!(cookie.contains("Max-Age=60"));
    }

    #[test]
    fn administrator_email_allowlist_is_case_insensitive() {
        let config = google_config();

        assert!(config.allows_email("OWNER@example.com"));
        assert!(!config.allows_email("visitor@example.com"));
    }
}
