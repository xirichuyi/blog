use axum::body::to_bytes;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chuyi_uk_back::config::S3Config;
use chuyi_uk_back::database::repositories::{PostRepository, TagRepository};
use chuyi_uk_back::database::Database;
use chuyi_uk_back::handlers::post_handler;
use chuyi_uk_back::models::{
    ApiResponse, CreatePostRequest, CreateTagRequest, NullablePatch, PostStatus, UpdatePostRequest,
};
use chuyi_uk_back::services::{PostService, Services};
use chuyi_uk_back::utils::R2Storage;
use sqlx::sqlite::SqlitePoolOptions;
use std::sync::Arc;

async fn setup_test_db() -> Database {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("create test database");
    let database = Database {
        pool: Arc::new(pool),
    };
    database.migrate().await.expect("run migrations");
    database
}

fn post_service(database: Database) -> PostService {
    let r2 = Arc::new(R2Storage::new(&S3Config::default()));
    PostService::new(database, r2)
}

fn create_request(title: &str, tag_ids: Option<Vec<i64>>) -> CreatePostRequest {
    CreatePostRequest {
        title: title.to_string(),
        cover_url: None,
        content: "content".to_string(),
        category_id: None,
        status: Some(PostStatus::Published),
        post_images: None,
        tag_ids,
    }
}

#[test]
fn nullable_fields_distinguish_missing_null_and_value() {
    let missing: UpdatePostRequest = serde_json::from_str("{}").expect("deserialize missing");
    assert!(matches!(missing.cover_url, NullablePatch::Missing));

    let null: UpdatePostRequest =
        serde_json::from_str(r#"{"cover_url":null}"#).expect("deserialize null");
    assert!(matches!(null.cover_url, NullablePatch::Null));

    let value: UpdatePostRequest =
        serde_json::from_str(r#"{"cover_url":"/cover.webp"}"#).expect("deserialize value");
    assert!(matches!(
        value.cover_url,
        NullablePatch::Value(ref url) if url == "/cover.webp"
    ));
}

#[tokio::test]
async fn invalid_tags_roll_back_new_post() {
    let database = setup_test_db().await;
    let service = post_service(database.clone());

    let result = service
        .create_post(create_request("must roll back", Some(vec![99_999])))
        .await;
    assert!(result.is_err());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM posts")
        .fetch_one(database.pool())
        .await
        .expect("count posts");
    assert_eq!(count, 0);
}

#[tokio::test]
async fn create_post_failure_uses_http_error_and_the_shared_envelope() {
    let database = setup_test_db().await;
    let storage = Arc::new(R2Storage::new(&S3Config::default()));
    let services = Services::new(database.clone(), storage, None);
    database.pool().close().await;

    let error = post_handler::create_post(State(services), Json(create_request("must fail", None)))
        .await
        .expect_err("unavailable database must fail the request");
    let response = error.into_response();
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let envelope: ApiResponse<serde_json::Value> = serde_json::from_slice(&body).unwrap();
    assert_eq!(envelope.code, 500);
    assert_eq!(envelope.message, "Database error");
    assert!(envelope.data.is_none());
}

#[tokio::test]
async fn update_can_clear_nullable_fields_and_save_tags_atomically() {
    let database = setup_test_db().await;
    let service = post_service(database.clone());
    let tag = TagRepository::create(
        database.pool(),
        CreateTagRequest {
            name: "rust".to_string(),
        },
    )
    .await
    .expect("create tag");

    let mut request = create_request("clear fields", None);
    request.cover_url = Some("https://assets.example.com/covers/cover.webp".to_string());
    let post = service.create_post(request).await.expect("create post");

    service
        .update_post(
            post.id,
            UpdatePostRequest {
                title: None,
                cover_url: NullablePatch::Null,
                content: None,
                category_id: NullablePatch::Null,
                status: None,
                post_images: NullablePatch::Null,
                tag_ids: Some(vec![tag.id]),
            },
        )
        .await
        .expect("update post")
        .expect("post exists");

    let updated = PostRepository::get_by_id_with_complete_info(database.pool(), post.id)
        .await
        .expect("load post")
        .expect("post exists");
    assert_eq!(updated.cover_url, None);
    assert_eq!(updated.tags.len(), 1);
    assert_eq!(updated.tags[0].id, tag.id);
}

#[tokio::test]
async fn adjacent_posts_use_stable_timestamp_and_id_ordering() {
    let database = setup_test_db().await;
    let service = post_service(database);
    let first = service
        .create_post(create_request("first", None))
        .await
        .expect("first");
    let middle = service
        .create_post(create_request("middle", None))
        .await
        .expect("middle");
    let last = service
        .create_post(create_request("last", None))
        .await
        .expect("last");

    let adjacent = service
        .get_adjacent_posts(middle.id)
        .await
        .expect("load adjacent")
        .expect("published post");
    assert_eq!(adjacent.newer.expect("newer").id, last.id);
    assert_eq!(adjacent.older.expect("older").id, first.id);
}

#[tokio::test]
async fn updating_content_tracks_removed_images() {
    let database = setup_test_db().await;
    let service = post_service(database.clone());
    let image_url = "https://assets.example.com/images/old.webp";

    let mut request = create_request("image lifecycle", None);
    request.content = format!("Before\n\n![old]({image_url})");
    let post = service.create_post(request).await.expect("create post");
    assert_eq!(
        serde_json::from_str::<Vec<String>>(post.post_images.as_deref().expect("tracked images"))
            .expect("valid image list"),
        vec![image_url]
    );

    service
        .update_post(
            post.id,
            UpdatePostRequest {
                title: None,
                cover_url: NullablePatch::Missing,
                content: Some("No images remain.".to_string()),
                category_id: NullablePatch::Missing,
                status: None,
                post_images: NullablePatch::Missing,
                tag_ids: None,
            },
        )
        .await
        .expect("update post")
        .expect("post exists");

    let updated = PostRepository::get_by_id(database.pool(), post.id)
        .await
        .expect("load post")
        .expect("post exists");
    assert_eq!(updated.post_images.as_deref(), Some("[]"));
}

#[tokio::test]
async fn saving_undoing_and_deleting_posts_never_delete_shared_media() {
    use axum::{routing::any, Router};
    use std::sync::atomic::{AtomicUsize, Ordering};

    let deletes = Arc::new(AtomicUsize::new(0));
    let observed = deletes.clone();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let endpoint = format!("http://{}", listener.local_addr().unwrap());
    let app = Router::new().fallback(any(move |method: axum::http::Method| {
        let observed = observed.clone();
        async move {
            if method == axum::http::Method::DELETE {
                observed.fetch_add(1, Ordering::SeqCst);
            }
            StatusCode::NO_CONTENT
        }
    }));
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let storage = Arc::new(R2Storage::new(&S3Config {
        enabled: true,
        endpoint,
        bucket: "test-media".into(),
        access_key: "test".into(),
        secret_key: "test".into(),
        region: "auto".into(),
        public_url: "https://assets.example.com".into(),
    }));
    let service = PostService::new(setup_test_db().await, storage);
    let url = "https://assets.example.com/images/shared.webp";
    let content = format!(
        ":::gallery\n![5](<{url}>)\n![6](<https://assets.example.com/images/other.jpg>)\n:::"
    );
    let mut request = create_request("first", None);
    request.cover_url = Some(url.into());
    request.content = content.clone();
    let first = service.create_post(request).await.unwrap();
    let mut request = create_request("also uses the same image", None);
    request.cover_url = Some(url.into());
    request.content = content.clone();
    let second = service.create_post(request).await.unwrap();

    let patch = serde_json::from_value(
        serde_json::json!({"content": "temporarily removed", "cover_url": null}),
    )
    .unwrap();
    let saved = service.update_post(first.id, patch).await.unwrap().unwrap();
    assert_eq!(saved.post_images.as_deref(), Some("[]"));
    assert_eq!(
        deletes.load(Ordering::SeqCst),
        0,
        "saving must not destroy an image needed by undo or another post"
    );

    let patch = serde_json::from_value(serde_json::json!({"content": content})).unwrap();
    let restored = service.update_post(first.id, patch).await.unwrap().unwrap();
    assert!(restored.post_images.unwrap().contains(url));
    assert!(service.delete_post(second.id).await.unwrap());
    assert_eq!(
        deletes.load(Ordering::SeqCst),
        0,
        "deleting an article must not delete shared media"
    );
    assert!(service.get_post_detail(first.id).await.unwrap().is_some());
    server.abort();
}
