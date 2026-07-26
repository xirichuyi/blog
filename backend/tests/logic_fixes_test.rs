use chuyi_uk_back::database::repositories::{PostRepository, TagRepository};
use chuyi_uk_back::database::Database;
use chuyi_uk_back::models::{
    CreatePostRequest, CreateTagRequest, NullablePatch, PostStatus, UpdatePostRequest,
};
use chuyi_uk_back::services::PostService;
use chuyi_uk_back::utils::FileHandler;
use sqlx::sqlite::SqlitePoolOptions;
use std::path::PathBuf;
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
    post_service_with_upload_dir(database, "/tmp/chuyi-blog-tests".to_string())
}

fn post_service_with_upload_dir(database: Database, upload_dir: String) -> PostService {
    PostService::new(
        database,
        Arc::new(FileHandler::new(upload_dir, 1_000_000, None)),
    )
}

fn create_request(title: &str, tag_ids: Option<Vec<i64>>) -> CreatePostRequest {
    CreatePostRequest {
        title: title.to_string(),
        cover_url: None,
        content: "content".to_string(),
        category_id: None,
        status: Some(PostStatus::Published),
        post_images: None,
        pdf_url: None,
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
    request.cover_url = Some("/uploads/cover.webp".to_string());
    request.pdf_url = Some("/uploads/post.pdf".to_string());
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
                pdf_url: NullablePatch::Null,
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
    assert_eq!(updated.pdf_url, None);
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
async fn updating_content_tracks_images_and_removes_unreferenced_assets() {
    let database = setup_test_db().await;
    let upload_dir = format!("/tmp/chuyi-blog-tests-{}", uuid::Uuid::new_v4());
    let service = post_service_with_upload_dir(database.clone(), upload_dir.clone());
    let relative_url = "/uploads/images/old.webp";
    let file_path = PathBuf::from(&upload_dir).join("images/old.webp");
    tokio::fs::create_dir_all(file_path.parent().expect("image parent"))
        .await
        .expect("create image directory");
    tokio::fs::write(&file_path, b"old image")
        .await
        .expect("write old image");

    let mut request = create_request("image lifecycle", None);
    request.content = format!("Before\n\n![old]({relative_url})");
    let post = service.create_post(request).await.expect("create post");
    assert_eq!(
        serde_json::from_str::<Vec<String>>(post.post_images.as_deref().expect("tracked images"))
            .expect("valid image list"),
        vec![relative_url]
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
                pdf_url: NullablePatch::Missing,
                tag_ids: None,
            },
        )
        .await
        .expect("update post")
        .expect("post exists");

    assert!(!file_path.exists());
    let updated = PostRepository::get_by_id(database.pool(), post.id)
        .await
        .expect("load post")
        .expect("post exists");
    assert_eq!(updated.post_images.as_deref(), Some("[]"));
}
