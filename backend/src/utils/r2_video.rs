use crate::config::S3Config;
use crate::utils::error::{AppError, Result};
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use quick_xml::de::from_str;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;
use uuid::Uuid;

const MIN_PART_SIZE: u64 = 5 * 1024 * 1024;
const TARGET_PART_SIZE: u64 = 64 * 1024 * 1024;
const MAX_PARTS: u64 = 1_000;
const MAX_VIDEO_SIZE: u64 = 20 * 1024 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS: u32 = 24 * 60 * 60;

#[derive(Clone)]
struct R2Client {
    endpoint: String,
    host: String,
    bucket: String,
    access_key: String,
    secret_key: String,
    region: String,
    public_url: String,
    http: reqwest::Client,
}

#[derive(Clone)]
pub struct R2Storage {
    client: Option<R2Client>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VideoUploadPart {
    pub part_number: u32,
    pub upload_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct VideoMultipartSession {
    pub upload_id: String,
    pub key: String,
    pub public_url: String,
    pub part_size: u64,
    pub parts: Vec<VideoUploadPart>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CompletedVideoPart {
    pub part_number: u32,
    pub etag: String,
}

#[derive(Debug, Deserialize)]
struct InitiateMultipartUploadResult {
    #[serde(rename = "UploadId")]
    upload_id: String,
}

struct RequestSignature<'a> {
    method: &'a str,
    path: &'a str,
    query: &'a str,
    canonical_headers: String,
    signed_headers: &'a str,
    payload_hash: &'a str,
    now: DateTime<Utc>,
}

impl R2Storage {
    pub fn new(config: &S3Config) -> Self {
        let client = config.enabled.then(|| {
            let endpoint = config.endpoint.trim_end_matches('/').to_string();
            let host = endpoint
                .trim_start_matches("https://")
                .trim_start_matches("http://")
                .trim_end_matches('/')
                .to_string();
            R2Client {
                endpoint,
                host,
                bucket: config.bucket.clone(),
                access_key: config.access_key.clone(),
                secret_key: config.secret_key.clone(),
                region: config.region.clone(),
                public_url: config.public_url.trim_end_matches('/').to_string(),
                http: reqwest::Client::new(),
            }
        });
        Self { client }
    }

    pub async fn begin_video_upload(
        &self,
        file_name: &str,
        content_type: &str,
        file_size: u64,
    ) -> Result<VideoMultipartSession> {
        validate_video(file_name, content_type, file_size)?;
        let key = video_key(file_name)?;
        self.begin_upload(key, content_type, file_size).await
    }

    pub async fn begin_book_upload(
        &self,
        book_id: i64,
        file_name: &str,
        content_type: &str,
        file_size: u64,
    ) -> Result<VideoMultipartSession> {
        validate_book_file(file_name, content_type, file_size)?;
        let key = book_key(book_id, file_name)?;
        self.begin_upload(key, content_type, file_size).await
    }

    async fn begin_upload(
        &self,
        key: String,
        content_type: &str,
        file_size: u64,
    ) -> Result<VideoMultipartSession> {
        let client = self.client()?;
        let upload_id = initiate_multipart(client, &key, content_type).await?;
        let part_size = choose_part_size(file_size);
        let part_count = file_size.div_ceil(part_size);
        let parts = (1..=part_count)
            .map(|part_number| VideoUploadPart {
                part_number: part_number as u32,
                upload_url: presign_upload_part(
                    client,
                    &key,
                    &upload_id,
                    part_number as u32,
                    Utc::now(),
                ),
            })
            .collect();

        Ok(VideoMultipartSession {
            upload_id,
            public_url: format!("{}/{}", client.public_url, key),
            key,
            part_size,
            parts,
        })
    }

    pub async fn complete_upload(
        &self,
        key: &str,
        upload_id: &str,
        parts: &[CompletedVideoPart],
    ) -> Result<String> {
        validate_upload_reference(key, upload_id)?;
        validate_completed_parts(parts)?;
        let client = self.client()?;
        complete_multipart(client, key, upload_id, parts).await?;
        Ok(format!("{}/{}", client.public_url, key))
    }

    pub async fn abort_upload(&self, key: &str, upload_id: &str) -> Result<()> {
        validate_upload_reference(key, upload_id)?;
        abort_multipart(self.client()?, key, upload_id).await
    }

    fn client(&self) -> Result<&R2Client> {
        self.client
            .as_ref()
            .ok_or_else(|| AppError::Internal("R2 uploads are not configured".to_string()))
    }
}

fn validate_video(file_name: &str, content_type: &str, file_size: u64) -> Result<()> {
    if file_size == 0 || file_size > MAX_VIDEO_SIZE {
        return Err(AppError::BadRequest(
            "Video must be between 1 byte and 20 GiB".to_string(),
        ));
    }

    let extension = video_extension(file_name)?;
    let content_type_allowed = matches!(
        content_type,
        "video/mp4" | "video/webm" | "video/quicktime" | "video/x-m4v"
    );
    if !content_type_allowed {
        return Err(AppError::BadRequest(format!(
            "Unsupported video content type: {content_type}"
        )));
    }
    if extension == "webm" && content_type != "video/webm" {
        return Err(AppError::BadRequest(
            "The video extension and content type do not match".to_string(),
        ));
    }
    Ok(())
}

fn video_extension(file_name: &str) -> Result<String> {
    let extension = Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| AppError::BadRequest("Video file has no extension".to_string()))?;
    match extension.as_str() {
        "mp4" | "m4v" | "mov" | "webm" => Ok(match extension.as_str() {
            "m4v" => "mp4".to_string(),
            _ => extension,
        }),
        _ => Err(AppError::BadRequest(format!(
            "Unsupported video extension: {extension}"
        ))),
    }
}

fn video_key(file_name: &str) -> Result<String> {
    let extension = video_extension(file_name)?;
    Ok(format!(
        "videos/{}/{}.{}",
        Utc::now().format("%Y/%m"),
        Uuid::new_v4(),
        extension
    ))
}

fn validate_book_file(file_name: &str, content_type: &str, file_size: u64) -> Result<()> {
    const MAX_BOOK_SIZE: u64 = 2 * 1024 * 1024 * 1024;
    if file_size == 0 || file_size > MAX_BOOK_SIZE {
        return Err(AppError::BadRequest(
            "Book file must be between 1 byte and 2 GiB".to_string(),
        ));
    }
    let extension = book_extension(file_name)?;
    let expected_type = match extension.as_str() {
        "pdf" => "application/pdf",
        "epub" => "application/epub+zip",
        "mobi" | "azw3" => "application/octet-stream",
        _ => unreachable!(),
    };
    if content_type != expected_type && content_type != "application/octet-stream" {
        return Err(AppError::BadRequest(format!(
            "Unsupported book content type: {content_type}"
        )));
    }
    Ok(())
}

fn book_extension(file_name: &str) -> Result<String> {
    let extension = Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| AppError::BadRequest("Book file has no extension".to_string()))?;
    match extension.as_str() {
        "pdf" | "epub" | "mobi" | "azw3" => Ok(extension),
        _ => Err(AppError::BadRequest(format!(
            "Unsupported book extension: {extension}"
        ))),
    }
}

fn book_key(book_id: i64, file_name: &str) -> Result<String> {
    if book_id <= 0 {
        return Err(AppError::BadRequest("Invalid book ID".to_string()));
    }
    Ok(format!(
        "books/{book_id}/{}.{}",
        Uuid::new_v4(),
        book_extension(file_name)?
    ))
}

fn choose_part_size(file_size: u64) -> u64 {
    let minimum_for_part_limit = file_size.div_ceil(MAX_PARTS);
    let rounded_minimum = minimum_for_part_limit.div_ceil(MIN_PART_SIZE) * MIN_PART_SIZE;
    TARGET_PART_SIZE.max(rounded_minimum)
}

fn validate_upload_reference(key: &str, upload_id: &str) -> Result<()> {
    let key_is_safe = (key.starts_with("videos/") || key.starts_with("books/"))
        && key.len() <= 256
        && !key
            .split('/')
            .any(|segment| segment.is_empty() || segment == "..")
        && key.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '/' | '-' | '_' | '.')
        });
    if !key_is_safe {
        return Err(AppError::BadRequest("Invalid video object key".to_string()));
    }

    let upload_id_is_safe = !upload_id.is_empty()
        && upload_id.len() <= 1_024
        && upload_id.chars().all(|character| {
            character.is_ascii_alphanumeric()
                || matches!(character, '-' | '_' | '.' | '~' | '+' | '/' | '=')
        });
    if !upload_id_is_safe {
        return Err(AppError::BadRequest(
            "Invalid multipart upload ID".to_string(),
        ));
    }
    Ok(())
}

fn validate_completed_parts(parts: &[CompletedVideoPart]) -> Result<()> {
    if parts.is_empty() || parts.len() > MAX_PARTS as usize {
        return Err(AppError::BadRequest(
            "Multipart completion has an invalid part count".to_string(),
        ));
    }
    let mut previous = 0;
    for part in parts {
        let valid_etag = !part.etag.is_empty()
            && part.etag.len() <= 128
            && part
                .etag
                .chars()
                .all(|character| character.is_ascii_hexdigit() || matches!(character, '-' | '"'));
        if part.part_number <= previous || !valid_etag {
            return Err(AppError::BadRequest(
                "Multipart completion contains invalid parts".to_string(),
            ));
        }
        previous = part.part_number;
    }
    Ok(())
}

async fn initiate_multipart(client: &R2Client, key: &str, content_type: &str) -> Result<String> {
    let path = object_path(client, key);
    let payload_hash = sha256_hex(b"");
    let query = "uploads=";
    let (authorization, amz_date) = authorization_header(client, RequestSignature {
        method: "POST",
        path: &path,
        query,
        canonical_headers: format!(
            "content-type:{content_type}\nhost:{}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{{amz_date}}\n",
            client.host
        ),
        signed_headers: "content-type;host;x-amz-content-sha256;x-amz-date",
        payload_hash: &payload_hash,
        now: Utc::now(),
    });
    let response = client
        .http
        .post(format!("{}{}?uploads", client.endpoint, path))
        .header("Content-Type", content_type)
        .header("Host", &client.host)
        .header("x-amz-content-sha256", &payload_hash)
        .header("x-amz-date", amz_date)
        .header("Authorization", authorization)
        .send()
        .await
        .map_err(|error| AppError::Internal(format!("R2 multipart initiation failed: {error}")))?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(AppError::Internal(format!(
            "R2 multipart initiation failed with {status}: {body}"
        )));
    }
    from_str::<InitiateMultipartUploadResult>(&body)
        .map(|result| result.upload_id)
        .map_err(|error| AppError::Internal(format!("R2 returned invalid upload XML: {error}")))
}

async fn complete_multipart(
    client: &R2Client,
    key: &str,
    upload_id: &str,
    parts: &[CompletedVideoPart],
) -> Result<()> {
    let path = object_path(client, key);
    let query = canonical_query(vec![("uploadId".to_string(), upload_id.to_string())]);
    let body = completion_xml(parts);
    let payload_hash = sha256_hex(body.as_bytes());
    let content_type = "application/xml";
    let (authorization, amz_date) = authorization_header(client, RequestSignature {
        method: "POST",
        path: &path,
        query: &query,
        canonical_headers: format!(
            "content-type:{content_type}\nhost:{}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{{amz_date}}\n",
            client.host
        ),
        signed_headers: "content-type;host;x-amz-content-sha256;x-amz-date",
        payload_hash: &payload_hash,
        now: Utc::now(),
    });
    let response = client
        .http
        .post(format!("{}{}?{}", client.endpoint, path, query))
        .header("Content-Type", content_type)
        .header("Host", &client.host)
        .header("x-amz-content-sha256", &payload_hash)
        .header("x-amz-date", amz_date)
        .header("Authorization", authorization)
        .body(body)
        .send()
        .await
        .map_err(|error| AppError::Internal(format!("R2 multipart completion failed: {error}")))?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if status.is_success() && !body.contains("<Error") {
        Ok(())
    } else {
        Err(AppError::Internal(format!(
            "R2 multipart completion failed with {status}: {body}"
        )))
    }
}

async fn abort_multipart(client: &R2Client, key: &str, upload_id: &str) -> Result<()> {
    let path = object_path(client, key);
    let query = canonical_query(vec![("uploadId".to_string(), upload_id.to_string())]);
    let payload_hash = sha256_hex(b"");
    let (authorization, amz_date) = authorization_header(
        client,
        RequestSignature {
            method: "DELETE",
            path: &path,
            query: &query,
            canonical_headers: format!(
                "host:{}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{{amz_date}}\n",
                client.host
            ),
            signed_headers: "host;x-amz-content-sha256;x-amz-date",
            payload_hash: &payload_hash,
            now: Utc::now(),
        },
    );
    let response = client
        .http
        .delete(format!("{}{}?{}", client.endpoint, path, query))
        .header("Host", &client.host)
        .header("x-amz-content-sha256", &payload_hash)
        .header("x-amz-date", amz_date)
        .header("Authorization", authorization)
        .send()
        .await
        .map_err(|error| AppError::Internal(format!("R2 multipart abort failed: {error}")))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(AppError::Internal(format!(
            "R2 multipart abort failed with {}",
            response.status()
        )))
    }
}

fn presign_upload_part(
    client: &R2Client,
    key: &str,
    upload_id: &str,
    part_number: u32,
    now: DateTime<Utc>,
) -> String {
    let date = now.format("%Y%m%d").to_string();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let scope = credential_scope(client, &date);
    let path = object_path(client, key);
    let query = canonical_query(vec![
        (
            "X-Amz-Algorithm".to_string(),
            "AWS4-HMAC-SHA256".to_string(),
        ),
        (
            "X-Amz-Credential".to_string(),
            format!("{}/{}", client.access_key, scope),
        ),
        ("X-Amz-Date".to_string(), amz_date.clone()),
        (
            "X-Amz-Expires".to_string(),
            UPLOAD_URL_TTL_SECONDS.to_string(),
        ),
        ("X-Amz-SignedHeaders".to_string(), "host".to_string()),
        ("partNumber".to_string(), part_number.to_string()),
        ("uploadId".to_string(), upload_id.to_string()),
    ]);
    let canonical_request = format!(
        "PUT\n{path}\n{query}\nhost:{}\n\nhost\nUNSIGNED-PAYLOAD",
        client.host
    );
    let string_to_sign = string_to_sign(&amz_date, &scope, &canonical_request);
    let signature = signature(client, &date, &string_to_sign);
    format!(
        "{}{}?{}&X-Amz-Signature={signature}",
        client.endpoint, path, query
    )
}

fn authorization_header(client: &R2Client, request: RequestSignature<'_>) -> (String, String) {
    let date = request.now.format("%Y%m%d").to_string();
    let amz_date = request.now.format("%Y%m%dT%H%M%SZ").to_string();
    let scope = credential_scope(client, &date);
    let canonical_headers = request.canonical_headers.replace("{amz_date}", &amz_date);
    let canonical_request = format!(
        "{}\n{}\n{}\n{canonical_headers}\n{}\n{}",
        request.method, request.path, request.query, request.signed_headers, request.payload_hash
    );
    let string_to_sign = string_to_sign(&amz_date, &scope, &canonical_request);
    let signature = signature(client, &date, &string_to_sign);
    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{scope},SignedHeaders={},Signature={signature}",
        client.access_key, request.signed_headers
    );
    (authorization, amz_date)
}

fn object_path(client: &R2Client, key: &str) -> String {
    format!("/{}/{}", client.bucket, encode_path(key))
}

fn encode_path(key: &str) -> String {
    key.split('/')
        .map(|segment| urlencoding::encode(segment).into_owned())
        .collect::<Vec<_>>()
        .join("/")
}

fn canonical_query(parameters: Vec<(String, String)>) -> String {
    let mut encoded = parameters
        .into_iter()
        .map(|(key, value)| {
            format!(
                "{}={}",
                urlencoding::encode(&key),
                urlencoding::encode(&value)
            )
        })
        .collect::<Vec<_>>();
    encoded.sort();
    encoded.join("&")
}

fn credential_scope(client: &R2Client, date: &str) -> String {
    format!("{}/{}/s3/aws4_request", date, client.region)
}

fn string_to_sign(amz_date: &str, scope: &str, canonical_request: &str) -> String {
    format!(
        "AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{}",
        sha256_hex(canonical_request.as_bytes())
    )
}

fn signature(client: &R2Client, date: &str, string_to_sign: &str) -> String {
    let date_key = hmac_sha256(
        format!("AWS4{}", client.secret_key).as_bytes(),
        date.as_bytes(),
    );
    let region_key = hmac_sha256(&date_key, client.region.as_bytes());
    let service_key = hmac_sha256(&region_key, b"s3");
    let signing_key = hmac_sha256(&service_key, b"aws4_request");
    hex::encode(hmac_sha256(&signing_key, string_to_sign.as_bytes()))
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = Hmac::<Sha256>::new_from_slice(key)
        .unwrap_or_else(|_| unreachable!("HMAC-SHA256 accepts any key length"));
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

fn sha256_hex(data: &[u8]) -> String {
    hex::encode(Sha256::digest(data))
}

fn completion_xml(parts: &[CompletedVideoPart]) -> String {
    let body = parts
        .iter()
        .map(|part| {
            format!(
                "<Part><PartNumber>{}</PartNumber><ETag>{}</ETag></Part>",
                part.part_number, part.etag
            )
        })
        .collect::<String>();
    format!("<CompleteMultipartUpload>{body}</CompleteMultipartUpload>")
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    fn test_config(endpoint: String) -> S3Config {
        S3Config {
            enabled: true,
            endpoint,
            bucket: "blog-assets".to_string(),
            access_key: "test-access-key".to_string(),
            secret_key: "test-secret-key".to_string(),
            region: "auto".to_string(),
            public_url: "https://assets.example.com".to_string(),
        }
    }

    #[tokio::test]
    async fn begins_multipart_upload_and_presigns_every_part() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind mock R2");
        let address = listener.local_addr().expect("mock R2 address");
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.expect("accept request");
            let mut request = vec![0_u8; 8192];
            let read = socket.read(&mut request).await.expect("read request");
            let request = String::from_utf8_lossy(&request[..read]).to_lowercase();
            assert!(request.starts_with("post /blog-assets/videos/"));
            assert!(request.contains("?uploads http/1.1"));
            assert!(request.contains("content-type: video/mp4"));
            let body = "<InitiateMultipartUploadResult><UploadId>upload-123</UploadId></InitiateMultipartUploadResult>";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{}",
                body.len(),
                body
            );
            socket
                .write_all(response.as_bytes())
                .await
                .expect("write response");
        });

        let storage = R2Storage::new(&test_config(format!("http://{address}")));
        let session = storage
            .begin_video_upload("original-4k.mp4", "video/mp4", 130 * 1024 * 1024)
            .await
            .expect("multipart upload starts");

        assert_eq!(session.upload_id, "upload-123");
        assert_eq!(session.part_size, TARGET_PART_SIZE);
        assert_eq!(session.parts.len(), 3);
        assert!(session.key.starts_with("videos/"));
        assert!(session.public_url.ends_with(".mp4"));
        assert!(session.parts[0].upload_url.contains("partNumber=1"));
        assert!(session.parts[0].upload_url.contains("X-Amz-Signature="));
        server.await.expect("mock server completes");
    }

    #[test]
    fn presigned_part_uses_stable_sigv4_parameters() {
        let client = R2Storage::new(&test_config(
            "https://account.r2.cloudflarestorage.com".to_string(),
        ))
        .client
        .expect("R2 client");
        let now = Utc
            .with_ymd_and_hms(2026, 8, 17, 12, 0, 0)
            .single()
            .expect("valid date");
        let url = presign_upload_part(&client, "videos/test.mp4", "upload/id+", 7, now);

        assert!(url.contains("X-Amz-Date=20260817T120000Z"));
        assert!(url.contains("X-Amz-Expires=86400"));
        assert!(url.contains("partNumber=7"));
        assert!(url.contains("uploadId=upload%2Fid%2B"));
    }

    #[test]
    fn rejects_unsupported_files_and_unsafe_completion_data() {
        assert!(validate_video("archive.zip", "application/zip", 10).is_err());
        assert!(validate_book_file("archive.zip", "application/zip", 10).is_err());
        assert!(validate_book_file("book.pdf", "application/pdf", 10).is_ok());
        assert!(validate_book_file("book.epub", "application/epub+zip", 10).is_ok());
        assert!(validate_upload_reference("../secret", "upload-1").is_err());
        assert!(validate_completed_parts(&[
            CompletedVideoPart {
                part_number: 2,
                etag: "abc".to_string(),
            },
            CompletedVideoPart {
                part_number: 1,
                etag: "def".to_string(),
            },
        ])
        .is_err());
    }
}
