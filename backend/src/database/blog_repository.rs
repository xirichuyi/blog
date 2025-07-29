use crate::models::{BlogPost, BlogPostCreate, BlogPostRow, BlogPostUpdate};
use serde_json;
use sqlx::{Pool, Sqlite};
use std::collections::HashSet;

pub struct BlogRepository {
    pool: Pool<Sqlite>,
}

impl BlogRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn get_all_posts(
        &self,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<BlogPost>, i64), sqlx::Error> {
        let offset = (page - 1) * limit;

        // Get total count
        let total_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM blog_posts")
            .fetch_one(&self.pool)
            .await?;

        // Get posts with pagination
        let rows: Vec<BlogPostRow> = sqlx::query_as(
            "SELECT id, title, excerpt, content, slug, date, categories, created_at, updated_at 
             FROM blog_posts 
             ORDER BY date DESC 
             LIMIT ? OFFSET ?",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let posts: Vec<BlogPost> = rows.into_iter().map(BlogPost::from).collect();

        Ok((posts, total_count.0))
    }

    pub async fn get_posts_without_content(
        &self,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<BlogPost>, i64), sqlx::Error> {
        let (posts, total) = self.get_all_posts(page, limit).await?;
        let posts_without_content = posts.into_iter().map(|p| p.without_content()).collect();
        Ok((posts_without_content, total))
    }

    pub async fn get_post_by_slug(&self, slug: &str) -> Result<Option<BlogPost>, sqlx::Error> {
        let row: Option<BlogPostRow> = sqlx::query_as(
            "SELECT id, title, excerpt, content, slug, date, categories, created_at, updated_at 
             FROM blog_posts 
             WHERE slug = ?",
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(BlogPost::from))
    }

    pub async fn search_posts(&self, query: &str) -> Result<Vec<BlogPost>, sqlx::Error> {
        let search_term = format!("%{}%", query);

        let rows: Vec<BlogPostRow> = sqlx::query_as(
            "SELECT id, title, excerpt, content, slug, date, categories, created_at, updated_at 
             FROM blog_posts 
             WHERE title LIKE ? OR excerpt LIKE ? OR content LIKE ?
             ORDER BY date DESC",
        )
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .fetch_all(&self.pool)
        .await?;

        let posts: Vec<BlogPost> = rows
            .into_iter()
            .map(|row| BlogPost::from(row).without_content())
            .collect();

        Ok(posts)
    }

    pub async fn get_posts_by_category(
        &self,
        category: &str,
    ) -> Result<Vec<BlogPost>, sqlx::Error> {
        let category_pattern = format!("%\"{}\"", category);

        let rows: Vec<BlogPostRow> = sqlx::query_as(
            "SELECT id, title, excerpt, content, slug, date, categories, created_at, updated_at
             FROM blog_posts
             WHERE categories LIKE ?
             ORDER BY date DESC",
        )
        .bind(category_pattern)
        .fetch_all(&self.pool)
        .await?;

        let posts: Vec<BlogPost> = rows
            .into_iter()
            .map(|row| BlogPost::from(row).without_content())
            .collect();

        Ok(posts)
    }

    pub async fn get_all_categories(&self) -> Result<Vec<String>, sqlx::Error> {
        let rows: Vec<(String,)> = sqlx::query_as("SELECT categories FROM blog_posts")
            .fetch_all(&self.pool)
            .await?;

        let mut categories = std::collections::HashSet::new();

        for (categories_json,) in rows {
            if let Ok(post_categories) = serde_json::from_str::<Vec<String>>(&categories_json) {
                for category in post_categories {
                    categories.insert(category);
                }
            }
        }

        let mut sorted_categories: Vec<String> = categories.into_iter().collect();
        sorted_categories.sort();

        Ok(sorted_categories)
    }

    pub async fn create_post(&self, post_data: BlogPostCreate) -> Result<BlogPost, sqlx::Error> {
        let slug = post_data
            .slug
            .unwrap_or_else(|| slug::slugify(&post_data.title));

        let date = post_data
            .date
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

        let categories_json =
            serde_json::to_string(&post_data.categories).unwrap_or_else(|_| "[]".to_string());

        let result = sqlx::query(
            "INSERT INTO blog_posts (title, excerpt, content, slug, date, categories) 
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&post_data.title)
        .bind(&post_data.excerpt)
        .bind(&post_data.content)
        .bind(&slug)
        .bind(&date)
        .bind(&categories_json)
        .execute(&self.pool)
        .await?;

        let post_id = result.last_insert_rowid();

        // Fetch the created post
        let row: BlogPostRow = sqlx::query_as(
            "SELECT id, title, excerpt, content, slug, date, categories, created_at, updated_at 
             FROM blog_posts 
             WHERE id = ?",
        )
        .bind(post_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(BlogPost::from(row))
    }

    pub async fn delete_post(&self, slug: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM blog_posts WHERE slug = ?")
            .bind(slug)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // 统计相关方法
    pub async fn get_posts_count_by_date_range(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<i64, sqlx::Error> {
        let count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM blog_posts WHERE created_at BETWEEN ? AND ?")
                .bind(start_date)
                .bind(end_date)
                .fetch_one(&self.pool)
                .await?;

        Ok(count.0)
    }

    pub async fn get_categories_count_by_date_range(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<i64, sqlx::Error> {
        // 获取在指定时间范围内创建的文章的所有分类
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT DISTINCT categories FROM blog_posts WHERE created_at BETWEEN ? AND ?",
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await?;

        // 解析JSON分类并计算唯一分类数
        let mut unique_categories = std::collections::HashSet::new();
        for (categories_json,) in rows {
            if let Ok(categories) = serde_json::from_str::<Vec<String>>(&categories_json) {
                for category in categories {
                    unique_categories.insert(category);
                }
            }
        }

        Ok(unique_categories.len() as i64)
    }

    pub async fn get_recent_posts_count(&self, days: i64) -> Result<i64, sqlx::Error> {
        let cutoff_date = chrono::Utc::now() - chrono::Duration::days(days);
        let cutoff_str = cutoff_date.to_rfc3339();

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM blog_posts WHERE created_at >= ?")
            .bind(cutoff_str)
            .fetch_one(&self.pool)
            .await?;

        Ok(count.0)
    }
}
