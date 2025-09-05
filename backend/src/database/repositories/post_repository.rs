use crate::database::DatabasePool;
use crate::models::{
    CreatePostRequest, Post, PostListQuery, PostStatus, PostWithDetails, UpdatePostRequest,
};
use crate::utils::error::Result;
use sqlx::Row;

pub struct PostRepository;

impl PostRepository {
    pub async fn create(pool: &DatabasePool, request: CreatePostRequest) -> Result<Post> {
        let post_images_json = request
            .post_images
            .map(|images| serde_json::to_string(&images))
            .transpose()?;

        let status = request.status.unwrap_or(PostStatus::Draft);
        let status_i32 = status as i32;

        let row = sqlx::query!(
            r#"
            INSERT INTO posts (title, cover_url, content, category_id, status, post_images)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, title, cover_url, content, category_id, status, post_images, created_at, updated_at
            "#,
            request.title,
            request.cover_url,
            request.content,
            request.category_id,
            status_i32,
            post_images_json
        )
        .fetch_one(pool)
        .await?;

        Ok(Post {
            id: row.id,
            title: row.title,
            cover_url: row.cover_url,
            content: row.content,
            category_id: row.category_id,
            status: row.status as i32,
            post_images: row.post_images,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        })
    }

    pub async fn get_by_id(pool: &DatabasePool, id: i64) -> Result<Option<Post>> {
        let row = sqlx::query!(
            r#"
            SELECT id, title, cover_url, content, category_id, status, post_images, created_at, updated_at
            FROM posts
            WHERE id = ? AND status != ?
            "#,
            id,
            PostStatus::Deleted as i32
        )
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|row| Post {
            id: row.id,
            title: row.title,
            cover_url: row.cover_url,
            content: row.content,
            category_id: row.category_id,
            status: row.status as i32,
            post_images: row.post_images,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn list(pool: &DatabasePool, query: PostListQuery) -> Result<(Vec<Post>, i64)> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(10);
        let offset = (page - 1) * page_size;

        // Build WHERE conditions
        let mut where_conditions = vec!["status != ?".to_string()];

        if query.category_id.is_some() {
            where_conditions.push("category_id = ?".to_string());
        }

        if query.status.is_some() {
            where_conditions.push("status = ?".to_string());
        }

        if query.search.is_some() {
            where_conditions.push("(title LIKE ? OR content LIKE ?)".to_string());
        }

        if query.tag_id.is_some() {
            where_conditions.push(
                "EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = id AND pt.tag_id = ?)"
                    .to_string(),
            );
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!("SELECT COUNT(*) as count FROM posts WHERE {}", where_clause);
        let mut count_query_builder = sqlx::query(&count_query);

        // Bind parameters for count query
        count_query_builder = count_query_builder.bind(PostStatus::Deleted as i32);

        if let Some(category_id) = query.category_id {
            count_query_builder = count_query_builder.bind(category_id as i32);
        }

        if let Some(status) = query.status {
            count_query_builder = count_query_builder.bind(status as i32);
        }

        if let Some(search) = &query.search {
            let search_pattern = format!("%{}%", search);
            count_query_builder = count_query_builder.bind(search_pattern.clone());
            count_query_builder = count_query_builder.bind(search_pattern);
        }

        if let Some(tag_id) = query.tag_id {
            count_query_builder = count_query_builder.bind(tag_id as i32);
        }

        let total: i64 = count_query_builder.fetch_one(pool).await?.get("count");

        // Get posts
        let posts_query = format!(
            "SELECT id, title, cover_url, content, category_id, status, post_images, created_at, updated_at
             FROM posts WHERE {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            where_clause
        );

        let mut posts_query_builder = sqlx::query(&posts_query);

        // Bind parameters for posts query (same as count query)
        posts_query_builder = posts_query_builder.bind(PostStatus::Deleted as i32);

        if let Some(category_id) = query.category_id {
            posts_query_builder = posts_query_builder.bind(category_id as i32);
        }

        if let Some(status) = query.status {
            posts_query_builder = posts_query_builder.bind(status as i32);
        }

        if let Some(search) = &query.search {
            let search_pattern = format!("%{}%", search);
            posts_query_builder = posts_query_builder.bind(search_pattern.clone());
            posts_query_builder = posts_query_builder.bind(search_pattern);
        }

        if let Some(tag_id) = query.tag_id {
            posts_query_builder = posts_query_builder.bind(tag_id as i32);
        }
        let rows = posts_query_builder
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?;

        let posts: Vec<Post> = rows
            .into_iter()
            .map(|row| Post {
                id: row.get("id"),
                title: row.get("title"),
                cover_url: row.get("cover_url"),
                content: row.get("content"),
                category_id: row.get("category_id"),
                status: row.get::<i32, _>("status"),
                post_images: row.get("post_images"),
                created_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("created_at")
                    .unwrap()
                    .and_utc(),
                updated_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("updated_at")
                    .unwrap()
                    .and_utc(),
            })
            .collect();

        Ok((posts, total))
    }

    pub async fn list_with_details(
        pool: &DatabasePool,
        query: PostListQuery,
    ) -> Result<(Vec<PostWithDetails>, i64)> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(10);
        let offset = (page - 1) * page_size;

        // Build WHERE conditions
        let mut where_conditions = vec!["p.status != ?".to_string()];

        if query.category_id.is_some() {
            where_conditions.push("p.category_id = ?".to_string());
        }

        if query.status.is_some() {
            where_conditions.push("p.status = ?".to_string());
        }

        if query.search.is_some() {
            where_conditions.push("(p.title LIKE ? OR p.content LIKE ?)".to_string());
        }

        if query.tag_id.is_some() {
            where_conditions.push(
                "EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = ?)"
                    .to_string(),
            );
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!(
            "SELECT COUNT(*) as count FROM posts p WHERE {}",
            where_clause
        );
        let mut count_query_builder = sqlx::query(&count_query);

        // Bind parameters for count query
        count_query_builder = count_query_builder.bind(PostStatus::Deleted as i32);

        if let Some(category_id) = query.category_id {
            count_query_builder = count_query_builder.bind(category_id as i32);
        }

        if let Some(status) = query.status {
            count_query_builder = count_query_builder.bind(status as i32);
        }

        if let Some(search) = &query.search {
            let search_pattern = format!("%{}%", search);
            count_query_builder = count_query_builder.bind(search_pattern.clone());
            count_query_builder = count_query_builder.bind(search_pattern);
        }

        if let Some(tag_id) = query.tag_id {
            count_query_builder = count_query_builder.bind(tag_id as i32);
        }

        let total: i64 = count_query_builder.fetch_one(pool).await?.get("count");

        // Get posts with category names
        let posts_query = format!(
            "SELECT p.id, p.title, p.cover_url, p.content, p.category_id, p.status, p.post_images,
                    p.created_at, p.updated_at, c.name as category_name
             FROM posts p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE {} ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
            where_clause
        );

        let mut posts_query_builder = sqlx::query(&posts_query);

        // Bind parameters for posts query (same as count query)
        posts_query_builder = posts_query_builder.bind(PostStatus::Deleted as i32);

        if let Some(category_id) = query.category_id {
            posts_query_builder = posts_query_builder.bind(category_id as i32);
        }

        if let Some(status) = query.status {
            posts_query_builder = posts_query_builder.bind(status as i32);
        }

        if let Some(search) = &query.search {
            let search_pattern = format!("%{}%", search);
            posts_query_builder = posts_query_builder.bind(search_pattern.clone());
            posts_query_builder = posts_query_builder.bind(search_pattern);
        }

        if let Some(tag_id) = query.tag_id {
            posts_query_builder = posts_query_builder.bind(tag_id as i32);
        }

        let rows = posts_query_builder
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?;

        let mut posts_with_details = Vec::new();

        for row in rows {
            let post_id: i64 = row.get("id");

            // Get tags for this post
            let tags_query = "SELECT t.id, t.name, t.created_at, t.updated_at FROM tags t
                             INNER JOIN post_tags pt ON t.id = pt.tag_id
                             WHERE pt.post_id = ?";
            let tag_rows = sqlx::query(tags_query)
                .bind(post_id)
                .fetch_all(pool)
                .await?;

            let tags: Vec<crate::models::Tag> = tag_rows
                .into_iter()
                .map(|tag_row| crate::models::Tag {
                    id: tag_row.get("id"),
                    name: tag_row.get("name"),
                    created_at: tag_row
                        .get::<Option<chrono::NaiveDateTime>, _>("created_at")
                        .unwrap()
                        .and_utc(),
                    updated_at: tag_row
                        .get::<Option<chrono::NaiveDateTime>, _>("updated_at")
                        .unwrap()
                        .and_utc(),
                })
                .collect();

            let post = Post {
                id: post_id,
                title: row.get("title"),
                cover_url: row.get("cover_url"),
                content: row.get("content"),
                category_id: row.get("category_id"),
                status: row.get::<i32, _>("status"),
                post_images: row.get("post_images"),
                created_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("created_at")
                    .unwrap()
                    .and_utc(),
                updated_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("updated_at")
                    .unwrap()
                    .and_utc(),
            };

            posts_with_details.push(PostWithDetails {
                post,
                tags,
                category_name: row.get("category_name"),
            });
        }

        Ok((posts_with_details, total))
    }

    pub async fn update(
        pool: &DatabasePool,
        id: i64,
        request: UpdatePostRequest,
    ) -> Result<Option<Post>> {
        let existing = Self::get_by_id(pool, id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let post_images_json = request
            .post_images
            .map(|images| serde_json::to_string(&images))
            .transpose()?;

        let status_i32 = request.status.map(|s| s as i32);

        let row = sqlx::query!(
            r#"
            UPDATE posts
            SET title = COALESCE(?, title),
                cover_url = COALESCE(?, cover_url),
                content = COALESCE(?, content),
                category_id = COALESCE(?, category_id),
                status = COALESCE(?, status),
                post_images = COALESCE(?, post_images),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING id, title, cover_url, content, category_id, status, post_images, created_at, updated_at
            "#,
            request.title,
            request.cover_url,
            request.content,
            request.category_id,
            status_i32,
            post_images_json,
            id
        )
        .fetch_one(pool)
        .await?;

        Ok(Some(Post {
            id: row.id.unwrap(),
            title: row.title,
            cover_url: row.cover_url,
            content: row.content,
            category_id: row.category_id,
            status: row.status as i32,
            post_images: row.post_images,
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn delete(pool: &DatabasePool, id: i64) -> Result<bool> {
        let result = sqlx::query!(
            "UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            PostStatus::Deleted as i32,
            id
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn update_in_tx(
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        id: i64,
        request: UpdatePostRequest,
    ) -> Result<Option<Post>> {
        // Get current post data
        let current = sqlx::query!(
            "SELECT title, cover_url, content, category_id, status, post_images FROM posts WHERE id = ?",
            id
        )
        .fetch_optional(&mut **tx)
        .await?;

        if let Some(_current) = current {
            let post_images_json = request
                .post_images
                .map(|images| serde_json::to_string(&images))
                .transpose()?;

            let status_i32 = request.status.map(|s| s as i32);

            let row = sqlx::query!(
                r#"
                UPDATE posts
                SET title = COALESCE(?, title),
                    cover_url = COALESCE(?, cover_url),
                    content = COALESCE(?, content),
                    category_id = COALESCE(?, category_id),
                    status = COALESCE(?, status),
                    post_images = COALESCE(?, post_images),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING id, title, cover_url, content, category_id, status, post_images, created_at, updated_at
                "#,
                request.title,
                request.cover_url,
                request.content,
                request.category_id,
                status_i32,
                post_images_json,
                id
            )
            .fetch_one(&mut **tx)
            .await?;

            Ok(Some(Post {
                id: row.id.unwrap(),
                title: row.title,
                cover_url: row.cover_url,
                content: row.content,
                category_id: row.category_id,
                status: row.status as i32,
                post_images: row.post_images,
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            }))
        } else {
            Ok(None)
        }
    }
}
