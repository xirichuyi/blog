use crate::{
    config::Config,
    middleware::auth::authorized_session,
    models::{ApiResponse, BookFile},
    services::{epub_service::EpubService, Services},
    utils::error::{ApiResult, AppError, Result},
};
use axum::{
    extract::{Path, State},
    http::{header, HeaderMap},
    response::{IntoResponse, Response},
    Json,
};
use std::{path::Component, sync::Arc};

fn valid_resource_path(path: &str) -> bool {
    !path.is_empty()
        && !path.contains('\\')
        && !path.contains('\0')
        && !path
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        && std::path::Path::new(path)
            .components()
            .all(|part| matches!(part, Component::Normal(_)))
}

async fn edition(
    services: &Services,
    config: &Config,
    headers: &HeaderMap,
    book_id: i64,
    file_id: i64,
) -> Result<(BookFile, bool)> {
    let admin = authorized_session(headers, config).is_ok();
    let book = services.book.get(book_id, !admin).await?;
    let file = book
        .files
        .into_iter()
        .find(|file| file.id == file_id && file.format.eq_ignore_ascii_case("epub"))
        .ok_or_else(|| AppError::NotFound("EPUB edition not found".into()))?;
    Ok((file, book.record.is_public))
}

pub async fn manifest(
    State(services): State<Services>,
    State(config): State<Arc<Config>>,
    headers: HeaderMap,
    Path((book_id, file_id)): Path<(i64, i64)>,
) -> ApiResult<serde_json::Value> {
    let (file, public) = edition(&services, &config, &headers, book_id, file_id).await?;
    let manifest = services.epub.manifest(&file).await?;
    Ok(Json(ApiResponse::success(serde_json::json!({
        "version": EpubService::version(&file), "package": manifest.package,
        "sections": manifest.sections, "cacheable": public,
    }))))
}

pub async fn resource(
    State(services): State<Services>,
    State(config): State<Arc<Config>>,
    headers: HeaderMap,
    Path((book_id, file_id, version, path)): Path<(i64, i64, String, String)>,
) -> Result<Response> {
    let (file, public) = edition(&services, &config, &headers, book_id, file_id).await?;
    if version != EpubService::version(&file) || !valid_resource_path(&path) {
        return Err(AppError::NotFound("EPUB resource not found".into()));
    }
    let resource = services.epub.directory(&file).join("resources").join(&path);
    let data = tokio::fs::read(resource)
        .await
        .map_err(|_| AppError::NotFound("EPUB resource not found".into()))?;
    let extension = path.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    let mime = match extension.as_str() {
        "opf" | "ncx" | "xml" => "application/xml",
        "xhtml" | "xht" => "application/xhtml+xml",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        _ => "application/octet-stream",
    };
    Ok(([
        (header::CONTENT_TYPE, mime),
        (header::CACHE_CONTROL, if public { "private, max-age=86400" } else { "private, no-store" }),
        (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        (header::CONTENT_SECURITY_POLICY, "sandbox; default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"),
    ], data).into_response())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        config::{CorsConfig, DatabaseConfig, Environment, JwtConfig, S3Config, ServerConfig},
        database::Database,
        utils::R2Storage,
    };

    #[test]
    fn resources_cannot_escape_the_edition() {
        for path in [
            "",
            "/etc/passwd",
            "../manifest.json",
            "OEBPS/../../source.epub",
            "OEBPS//one.xhtml",
            "OEBPS\\one.xhtml",
            "OEBPS/./one.xhtml",
        ] {
            assert!(!valid_resource_path(path), "{path}");
        }
        assert!(valid_resource_path("OEBPS/正文/第一章.xhtml"));
    }

    #[tokio::test]
    async fn private_and_mismatched_editions_are_not_public_resources() {
        let database = Database::new("sqlite::memory:").await.unwrap();
        database.migrate().await.unwrap();
        sqlx::query("INSERT INTO books (id, title) VALUES (1, 'Public'), (2, 'Other')")
            .execute(database.pool())
            .await
            .unwrap();
        sqlx::query("INSERT INTO book_files (id, book_id, format, file_url, r2_key, file_name, file_size, mime_type) VALUES (1, 1, 'epub', 'https://example.org/book.epub', 'books/1/book.epub', 'book.epub', 10, 'application/epub+zip')").execute(database.pool()).await.unwrap();
        let config = Config {
            environment: Environment::Development,
            database: DatabaseConfig {
                url: "sqlite::memory:".into(),
            },
            jwt: JwtConfig {
                secret: "epub-test-only-secret".into(),
            },
            google_auth: None,
            server: ServerConfig {
                host: "127.0.0.1".into(),
                port: 0,
                use_tls: false,
            },
            cors: CorsConfig { origins: vec![] },
            s3: S3Config::default(),
            cloudflare_analytics: None,
        };
        let services = Services::new(database.clone(), Arc::new(R2Storage::new(&config.s3)), None);
        assert!(edition(&services, &config, &HeaderMap::new(), 1, 1)
            .await
            .is_ok());
        assert!(edition(&services, &config, &HeaderMap::new(), 2, 1)
            .await
            .is_err());
        sqlx::query("UPDATE books SET is_public = 0 WHERE id = 1")
            .execute(database.pool())
            .await
            .unwrap();
        assert!(edition(&services, &config, &HeaderMap::new(), 1, 1)
            .await
            .is_err());
    }
}
