use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use serde::Deserialize;

use crate::database::Database;
use crate::models::{BlogPost, BlogPostsResponse};
use crate::services::BlogService;
use crate::utils::{success_response, AppError, AppResult, Validator};

#[derive(Debug, Deserialize)]
pub struct PostsQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub q: Option<String>,
}

pub async fn get_posts(
    Query(params): Query<PostsQuery>,
    State(database): State<Database>,
) -> AppResult<Json<BlogPostsResponse>> {
    // Validate pagination parameters
    let (page, limit) = Validator::validate_pagination(params.page, params.limit)?;

    // Validate search query if provided
    if let Some(ref query) = params.q {
        Validator::validate_search_query(query)?;
    }

    let blog_service = BlogService::new(database);
    let response = blog_service
        .get_posts(Some(page), Some(limit), params.q)
        .await?;

    Ok(success_response(response))
}

pub async fn get_post_by_slug(
    Path(slug): Path<String>,
    State(database): State<Database>,
) -> AppResult<Json<BlogPost>> {
    // Validate slug format
    Validator::validate_slug(&slug)?;

    let blog_service = BlogService::new(database);

    match blog_service.get_post_by_slug(&slug).await? {
        Some(post) => Ok(success_response(post)),
        None => Err(AppError::not_found(format!(
            "Post with slug '{}' not found",
            slug
        ))),
    }
}

pub async fn get_categories(State(database): State<Database>) -> AppResult<Json<Vec<String>>> {
    let blog_service = BlogService::new(database);
    let categories = blog_service.get_categories().await?;

    Ok(success_response(categories))
}

pub async fn get_posts_by_category(
    Path(category): Path<String>,
    State(database): State<Database>,
) -> AppResult<Json<Vec<BlogPost>>> {
    // Validate category name
    Validator::validate_category_name(&category)?;

    let blog_service = BlogService::new(database);
    let posts = blog_service.get_posts_by_category(&category).await?;

    Ok(success_response(posts))
}
