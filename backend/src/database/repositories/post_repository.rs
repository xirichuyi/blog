use crate::database::DatabasePool;
use crate::models::{
    AdjacentPost, AdjacentPosts, CreatePostRequest, Post, PostListQuery, PostStatus,
    PostWithDetails, UpdatePostRequest,
};
use crate::utils::{error::Result, text::truncate_safely};
use sqlx::Row;
use std::collections::HashMap;

pub struct PostRepository;

impl PostRepository {
    pub async fn create_in_tx(
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        request: CreatePostRequest,
    ) -> Result<Post> {
        let post_images_json = request
            .post_images
            .map(|images| serde_json::to_string(&images))
            .transpose()?;

        let status = request.status.unwrap_or(PostStatus::Draft);
        let status_i32 = status as i32;

        let row = sqlx::query!(
            r#"
            INSERT INTO posts (title, cover_url, content, category_id, status, post_images, pdf_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id, title, cover_url, content, category_id, status, post_images, pdf_url, created_at, updated_at
            "#,
            request.title,
            request.cover_url,
            request.content,
            request.category_id,
            status_i32,
            post_images_json,
            request.pdf_url
        )
        .fetch_one(&mut **tx)
        .await?;

        Ok(Post {
            id: row.id,
            title: row.title,
            cover_url: row.cover_url,
            content: row.content,
            category_name: None, // 单独创建时不获取分类名
            category_id: row.category_id,
            status: row.status as i32,
            post_images: row.post_images,
            pdf_url: row.pdf_url,
            tags: Vec::new(), // 单独创建时不获取标签
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        })
    }

    pub async fn get_by_id(pool: &DatabasePool, id: i64) -> Result<Option<Post>> {
        let row = sqlx::query!(
            r#"
            SELECT id, title, cover_url, content, category_id, status, post_images, pdf_url, created_at, updated_at
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
            category_name: None, // 单独查询时不获取分类名
            category_id: row.category_id,
            status: row.status as i32,
            post_images: row.post_images,
            pdf_url: row.pdf_url,
            tags: Vec::new(), // 单独查询时不获取标签
            created_at: row.created_at.unwrap().and_utc(),
            updated_at: row.updated_at.unwrap().and_utc(),
        }))
    }

    pub async fn get_by_id_with_complete_info(
        pool: &DatabasePool,
        id: i64,
    ) -> Result<Option<Post>> {
        let row = sqlx::query!(
            r#"
            SELECT p.id, p.title, p.cover_url, p.content, p.category_id, p.status, p.post_images, p.pdf_url,
                   p.created_at, p.updated_at, c.name as category_name
            FROM posts p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.status != ?
            "#,
            id,
            PostStatus::Deleted as i32
        )
        .fetch_optional(pool)
        .await?;

        if let Some(row) = row {
            // Get tags for this post
            let tags_query = "SELECT t.id, t.name, t.created_at, t.updated_at FROM tags t
                             INNER JOIN post_tags pt ON t.id = pt.tag_id
                             WHERE pt.post_id = ?";
            let tag_rows = sqlx::query(tags_query).bind(id).fetch_all(pool).await?;

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

            Ok(Some(Post {
                id: row.id,
                title: row.title,
                cover_url: row.cover_url,
                content: row.content,
                category_name: row.category_name,
                category_id: row.category_id,
                status: row.status as i32,
                post_images: row.post_images,
                pdf_url: row.pdf_url,
                tags, // 包含完整的标签列表
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_adjacent_published(
        pool: &DatabasePool,
        id: i64,
    ) -> Result<Option<AdjacentPosts>> {
        let current = sqlx::query("SELECT created_at FROM posts WHERE id = ? AND status = ?")
            .bind(id)
            .bind(PostStatus::Published as i32)
            .fetch_optional(pool)
            .await?;

        let Some(current) = current else {
            return Ok(None);
        };
        let created_at: chrono::NaiveDateTime = current.get("created_at");

        let newer = sqlx::query_as::<_, AdjacentPost>(
            r#"
            SELECT id, title
            FROM posts
            WHERE status = ?
              AND (created_at > ? OR (created_at = ? AND id > ?))
            ORDER BY created_at ASC, id ASC
            LIMIT 1
            "#,
        )
        .bind(PostStatus::Published as i32)
        .bind(created_at)
        .bind(created_at)
        .bind(id)
        .fetch_optional(pool)
        .await?;

        let older = sqlx::query_as::<_, AdjacentPost>(
            r#"
            SELECT id, title
            FROM posts
            WHERE status = ?
              AND (created_at < ? OR (created_at = ? AND id < ?))
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            "#,
        )
        .bind(PostStatus::Published as i32)
        .bind(created_at)
        .bind(created_at)
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(Some(AdjacentPosts { newer, older }))
    }

    pub async fn list_with_complete_info(
        pool: &DatabasePool,
        query: PostListQuery,
    ) -> Result<(Vec<Post>, i64)> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(10).clamp(1, 500);
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
            "SELECT p.id, p.title, p.cover_url, substr(p.content, 1, 400) AS content,
                    p.category_id, p.status, p.post_images, p.pdf_url,
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

        let post_ids = rows.iter().map(|row| row.get("id")).collect::<Vec<i64>>();
        let mut tags_by_post = Self::load_tags_for_posts(pool, &post_ids).await?;
        let mut posts_with_complete_info = Vec::with_capacity(rows.len());

        for row in rows {
            let post_id: i64 = row.get("id");
            let tags = tags_by_post.remove(&post_id).unwrap_or_default();

            // 获取完整内容并生成摘要（列表接口只返回摘要）
            let full_content: String = row.get("content");
            let content_summary = truncate_safely(&full_content, 200);

            let post = Post {
                id: post_id,
                title: row.get("title"),
                cover_url: row.get("cover_url"),
                content: content_summary,                // 列表接口返回摘要
                category_name: row.get("category_name"), // 从JOIN查询中获取分类名
                category_id: row.get("category_id"),
                status: row.get::<i32, _>("status"),
                post_images: row.get("post_images"),
                pdf_url: row.get("pdf_url"),
                tags, // 使用上面查询的标签列表
                created_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("created_at")
                    .unwrap()
                    .and_utc(),
                updated_at: row
                    .get::<Option<chrono::NaiveDateTime>, _>("updated_at")
                    .unwrap()
                    .and_utc(),
            };

            posts_with_complete_info.push(post);
        }

        Ok((posts_with_complete_info, total))
    }

    async fn load_tags_for_posts(
        pool: &DatabasePool,
        post_ids: &[i64],
    ) -> Result<HashMap<i64, Vec<crate::models::Tag>>> {
        if post_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let post_ids_json = serde_json::to_string(post_ids)?;
        let rows = sqlx::query(
            r#"
            SELECT pt.post_id, t.id, t.name, t.created_at, t.updated_at
            FROM post_tags pt
            INNER JOIN tags t ON t.id = pt.tag_id
            WHERE pt.post_id IN (SELECT value FROM json_each(?))
            ORDER BY t.name ASC
            "#,
        )
        .bind(post_ids_json)
        .fetch_all(pool)
        .await?;

        let mut tags_by_post = HashMap::<i64, Vec<crate::models::Tag>>::new();
        for row in rows {
            tags_by_post
                .entry(row.get("post_id"))
                .or_default()
                .push(crate::models::Tag {
                    id: row.get("id"),
                    name: row.get("name"),
                    created_at: row
                        .get::<Option<chrono::NaiveDateTime>, _>("created_at")
                        .expect("tags.created_at is populated by the database")
                        .and_utc(),
                    updated_at: row
                        .get::<Option<chrono::NaiveDateTime>, _>("updated_at")
                        .expect("tags.updated_at is populated by the database")
                        .and_utc(),
                });
        }
        Ok(tags_by_post)
    }

    pub async fn list_with_details(
        pool: &DatabasePool,
        query: PostListQuery,
    ) -> Result<(Vec<PostWithDetails>, i64)> {
        let (posts, total) = Self::list_with_complete_info(pool, query).await?;
        let posts = posts
            .into_iter()
            .map(|post| PostWithDetails {
                tags: post.tags.clone(),
                category_name: post.category_name.clone(),
                post,
            })
            .collect();
        Ok((posts, total))
    }

    pub async fn update(
        pool: &DatabasePool,
        id: i64,
        request: UpdatePostRequest,
    ) -> Result<Option<Post>> {
        let mut tx = pool.begin().await?;
        let post = Self::update_in_tx(&mut tx, id, request).await?;
        tx.commit().await?;
        Ok(post)
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
            "SELECT title, cover_url, content, category_id, status, post_images, pdf_url FROM posts WHERE id = ?",
            id
        )
        .fetch_optional(&mut **tx)
        .await?;

        if let Some(current) = current {
            let title = request.title.unwrap_or(current.title);
            let cover_url = request.cover_url.resolve(current.cover_url);
            let content = request.content.unwrap_or(current.content);
            let category_id = request.category_id.resolve(current.category_id);
            let status = request
                .status
                .map(|value| value as i64)
                .unwrap_or(current.status);
            let post_images = match request.post_images {
                crate::models::NullablePatch::Missing => current.post_images,
                crate::models::NullablePatch::Null => None,
                crate::models::NullablePatch::Value(images) => {
                    Some(serde_json::to_string(&images)?)
                }
            };
            let pdf_url = request.pdf_url.resolve(current.pdf_url);

            let row = sqlx::query!(
                r#"
                UPDATE posts
                SET title = ?,
                    cover_url = ?,
                    content = ?,
                    category_id = ?,
                    status = ?,
                    post_images = ?,
                    pdf_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING id, title, cover_url, content, category_id, status, post_images, pdf_url, created_at, updated_at
                "#,
                title,
                cover_url,
                content,
                category_id,
                status,
                post_images,
                pdf_url,
                id
            )
            .fetch_one(&mut **tx)
            .await?;

            Ok(Some(Post {
                id: row.id.unwrap(),
                title: row.title,
                cover_url: row.cover_url,
                content: row.content,
                category_name: None, // 事务中更新时不重新获取分类名
                category_id: row.category_id,
                status: row.status as i32,
                post_images: row.post_images,
                pdf_url: row.pdf_url,
                tags: Vec::new(), // 事务中更新时不重新获取标签
                created_at: row.created_at.unwrap().and_utc(),
                updated_at: row.updated_at.unwrap().and_utc(),
            }))
        } else {
            Ok(None)
        }
    }
}
