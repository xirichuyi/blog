//! Private reader data is scoped to the authenticated account and exact edition.
use crate::{
    config::Config,
    database::Database,
    middleware::auth::authorized_session,
    models::ApiResponse,
    utils::error::{ApiResult, AppError, Result},
};
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, sync::Arc};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Position {
    Epub { cfi: String, percent: f64 },
    Pdf { page: i64, pages: i64 },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct NoteRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Entry {
    pub id: String,
    pub position: Position,
    pub quote: String,
    pub note: String,
    pub highlight: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rects: Option<Vec<NoteRect>>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct ReaderState {
    pub revision: i64,
    pub progress: Option<Position>,
    pub entries: Vec<Entry>,
    pub review: String,
    pub rating: Option<i64>,
}

fn validate_position(position: &Position, format: &str) -> bool {
    match position {
        Position::Epub { cfi, percent } => {
            format.eq_ignore_ascii_case("epub")
                && cfi.starts_with("epubcfi(")
                && cfi.ends_with(')')
                && cfi.len() <= 4096
                && percent.is_finite()
                && (0.0..=100.0).contains(percent)
        }
        Position::Pdf { page, pages } => {
            format.eq_ignore_ascii_case("pdf") && *page >= 1 && page <= pages && *pages <= 1_000_000
        }
    }
}

fn validate(state: &ReaderState, format: &str) -> Result<()> {
    let mut ids = HashSet::new();
    if state.revision < 0
        || state.revision == i64::MAX
        || state.entries.len() > 500
        || state.review.len() > 20_000
        || state
            .rating
            .is_some_and(|rating| !(1..=5).contains(&rating))
        || state
            .progress
            .as_ref()
            .is_some_and(|position| !validate_position(position, format))
        || state.entries.iter().any(|entry| {
            entry.id.is_empty()
                || entry.id.len() > 100
                || !ids.insert(&entry.id)
                || entry.quote.len() > 10_000
                || entry.note.len() > 20_000
                || !validate_position(&entry.position, format)
                || entry.rects.as_ref().is_some_and(|rects| {
                    rects.is_empty()
                        || rects.len() > 100
                        || rects.iter().any(|rect| {
                            ![rect.x, rect.y, rect.width, rect.height]
                                .iter()
                                .all(|v| v.is_finite())
                                || rect.x < 0.0
                                || rect.y < 0.0
                                || rect.width <= 0.0
                                || rect.height <= 0.0
                                || rect.x + rect.width > 1.001
                                || rect.y + rect.height > 1.001
                        })
                })
                || (entry.highlight
                    && matches!(&entry.position, Position::Pdf { .. })
                    && entry.rects.is_none())
        })
    {
        return Err(AppError::BadRequest(
            "Invalid reader data or reader data limit exceeded".into(),
        ));
    }
    Ok(())
}

async fn file_format(database: &Database, book_id: i64, file_id: i64) -> Result<String> {
    sqlx::query_scalar::<_, String>("SELECT format FROM book_files WHERE id = ? AND book_id = ?")
        .bind(file_id)
        .bind(book_id)
        .fetch_optional(database.pool())
        .await?
        .ok_or_else(|| AppError::NotFound("Book edition not found".into()))
}

fn account(headers: &HeaderMap, config: &Config) -> Result<String> {
    let owner = authorized_session(headers, config)?.email;
    if headers
        .get("x-reader-account")
        .and_then(|value| value.to_str().ok())
        != Some(owner.as_str())
    {
        return Err(AppError::Unauthorized(
            "Reader account changed; reopen the book after signing in".into(),
        ));
    }
    Ok(owner)
}

pub async fn get(
    State(database): State<Database>,
    State(config): State<Arc<Config>>,
    headers: HeaderMap,
    Path((book_id, file_id)): Path<(i64, i64)>,
) -> ApiResult<ReaderState> {
    let owner = account(&headers, &config)?;
    file_format(&database, book_id, file_id).await?;
    let row: Option<(i64, String)> =
        sqlx::query_as("SELECT revision, data FROM reader_states WHERE owner = ? AND file_id = ?")
            .bind(owner)
            .bind(file_id)
            .fetch_optional(database.pool())
            .await?;
    let mut state = match row.as_ref() {
        Some((_, data)) => serde_json::from_str::<ReaderState>(data)?,
        None => ReaderState::default(),
    };
    if let Some((revision, _)) = row {
        state.revision = revision;
    }
    Ok(Json(ApiResponse::success(state)))
}

// Compare-and-swap prevents an old tab/device from silently overwriting new notes or progress.
async fn save(
    database: &Database,
    owner: &str,
    file_id: i64,
    mut state: ReaderState,
) -> Result<ReaderState> {
    let expected = state.revision;
    state.revision += 1;
    let data = serde_json::to_string(&state)?;
    let changed = if expected == 0 {
        sqlx::query("INSERT INTO reader_states (owner, file_id, revision, data) VALUES (?, ?, 1, ?) ON CONFLICT(owner, file_id) DO NOTHING")
            .bind(owner).bind(file_id).bind(data).execute(database.pool()).await?.rows_affected()
    } else {
        sqlx::query("UPDATE reader_states SET revision = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE owner = ? AND file_id = ? AND revision = ?")
            .bind(state.revision).bind(data).bind(owner).bind(file_id).bind(expected)
            .execute(database.pool()).await?.rows_affected()
    };
    if changed == 0 {
        return Err(AppError::Conflict(
            "Reading data changed on another page or device; reload cloud data before saving"
                .into(),
        ));
    }
    Ok(state)
}

pub async fn put(
    State(database): State<Database>,
    State(config): State<Arc<Config>>,
    headers: HeaderMap,
    Path((book_id, file_id)): Path<(i64, i64)>,
    Json(state): Json<ReaderState>,
) -> ApiResult<ReaderState> {
    let owner = account(&headers, &config)?;
    let format = file_format(&database, book_id, file_id).await?;
    validate(&state, &format)?;
    Ok(Json(ApiResponse::success(
        save(&database, &owner, file_id, state).await?,
    )))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requires_authenticated_account_and_rejects_changed_accounts() {
        use crate::config::{
            CorsConfig, DatabaseConfig, Environment, GoogleAuthConfig, JwtConfig, S3Config,
            ServerConfig,
        };
        use crate::middleware::auth::{issue_session_token, AdminIdentity, SESSION_COOKIE};
        let config = Config {
            environment: Environment::Development,
            database: DatabaseConfig {
                url: "sqlite::memory:".into(),
            },
            jwt: JwtConfig {
                secret: "reader-test-secret".into(),
                admin_token: "emergency".into(),
            },
            google_auth: Some(GoogleAuthConfig {
                client_id: "test".into(),
                client_secret: "test".into(),
                redirect_uri: "http://localhost/callback".into(),
                allowed_emails: vec!["alice@example.com".into()],
            }),
            server: ServerConfig {
                host: "127.0.0.1".into(),
                port: 3006,
                use_tls: false,
            },
            cors: CorsConfig { origins: vec![] },
            s3: S3Config::default(),
            cloudflare_analytics: None,
        };
        let mut headers = HeaderMap::new();
        assert!(matches!(
            account(&headers, &config),
            Err(AppError::Unauthorized(_))
        ));
        let token = issue_session_token(
            &AdminIdentity {
                email: "alice@example.com".into(),
                name: "Alice".into(),
                picture: None,
            },
            &config.jwt.secret,
        )
        .unwrap();
        headers.insert(
            "cookie",
            format!("{SESSION_COOKIE}={token}").parse().unwrap(),
        );
        headers.insert("x-reader-account", "bob@example.com".parse().unwrap());
        assert!(matches!(
            account(&headers, &config),
            Err(AppError::Unauthorized(_))
        ));
        headers.insert("x-reader-account", "alice@example.com".parse().unwrap());
        assert_eq!(account(&headers, &config).unwrap(), "alice@example.com");
        let mut revoked = config;
        revoked.google_auth.as_mut().unwrap().allowed_emails.clear();
        assert!(matches!(
            account(&headers, &revoked),
            Err(AppError::Unauthorized(_))
        ));
    }

    #[test]
    fn rejects_malformed_positions_and_duplicate_entries() {
        let mut state = ReaderState {
            progress: Some(Position::Pdf { page: 0, pages: 10 }),
            ..Default::default()
        };
        assert!(validate(&state, "pdf").is_err());
        state.progress = Some(Position::Pdf { page: 3, pages: 10 });
        assert!(validate(&state, "pdf").is_ok());
        assert!(validate(&state, "epub").is_err());
        let entry = Entry {
            id: "one".into(),
            position: state.progress.clone().unwrap(),
            quote: "".into(),
            note: "note".into(),
            highlight: false,
            rects: None,
        };
        state.entries = vec![entry.clone(), entry];
        assert!(validate(&state, "pdf").is_err());
    }

    #[test]
    fn pdf_notes_require_bounded_text_rectangles() {
        let mut state = ReaderState {
            entries: vec![Entry {
                id: "pdf-note".into(),
                position: Position::Pdf { page: 1, pages: 3 },
                quote: "Selected text".into(),
                note: "A thought".into(),
                highlight: true,
                rects: Some(vec![NoteRect {
                    x: 0.1,
                    y: 0.2,
                    width: 0.6,
                    height: 0.03,
                }]),
            }],
            ..Default::default()
        };
        assert!(validate(&state, "pdf").is_ok());
        let encoded = serde_json::to_string(&state).unwrap();
        let decoded: ReaderState = serde_json::from_str(&encoded).unwrap();
        assert_eq!(decoded.entries[0].rects.as_ref().unwrap()[0].width, 0.6);
        state.entries[0].rects.as_mut().unwrap()[0].width = 1.0;
        assert!(validate(&state, "pdf").is_err());
        state.entries[0].rects = Some(vec![]);
        assert!(validate(&state, "pdf").is_err());
        state.entries[0].rects = None;
        assert!(validate(&state, "pdf").is_err());
    }

    #[tokio::test]
    async fn isolates_accounts_and_editions_and_rejects_stale_writes() {
        let database = Database::new("sqlite::memory:").await.unwrap();
        database.migrate().await.unwrap();
        sqlx::query("INSERT INTO books (id, title) VALUES (1, 'Test')")
            .execute(database.pool())
            .await
            .unwrap();
        for id in [1, 2] {
            sqlx::query("INSERT INTO book_files (id, book_id, format, file_url, r2_key, file_name, file_size, mime_type) VALUES (?, 1, 'pdf', ?, ?, 'test.pdf', 1, 'application/pdf')")
                .bind(id).bind(id.to_string()).bind(id.to_string()).execute(database.pool()).await.unwrap();
        }
        let state = ReaderState {
            progress: Some(Position::Pdf { page: 8, pages: 12 }),
            ..Default::default()
        };
        let saved = save(&database, "alice", 1, state.clone()).await.unwrap();
        assert_eq!(saved.revision, 1);
        assert!(matches!(
            save(&database, "alice", 1, state.clone()).await,
            Err(AppError::Conflict(_))
        ));
        save(&database, "bob", 1, state.clone()).await.unwrap();
        save(&database, "alice", 2, state).await.unwrap();
        assert_eq!(
            save(&database, "alice", 1, saved).await.unwrap().revision,
            2
        );
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM reader_states")
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert_eq!(count, 3);
        assert!(file_format(&database, 99, 1).await.is_err());
        sqlx::query("DELETE FROM book_files WHERE id = 1")
            .execute(database.pool())
            .await
            .unwrap();
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM reader_states")
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert_eq!(count, 1);
    }
}
