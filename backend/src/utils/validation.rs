use crate::utils::AppError;
use regex::Regex;

pub struct Validator;

impl Validator {
    /// Validate blog post title
    pub fn validate_title(title: &str) -> Result<(), AppError> {
        if title.trim().is_empty() {
            return Err(AppError::validation("Title cannot be empty"));
        }
        
        if title.len() > 200 {
            return Err(AppError::validation("Title cannot exceed 200 characters"));
        }
        
        Ok(())
    }

    /// Validate blog post excerpt
    pub fn validate_excerpt(excerpt: &str) -> Result<(), AppError> {
        if excerpt.trim().is_empty() {
            return Err(AppError::validation("Excerpt cannot be empty"));
        }
        
        if excerpt.len() > 500 {
            return Err(AppError::validation("Excerpt cannot exceed 500 characters"));
        }
        
        Ok(())
    }

    /// Validate blog post content
    pub fn validate_content(content: &str) -> Result<(), AppError> {
        if content.trim().is_empty() {
            return Err(AppError::validation("Content cannot be empty"));
        }
        
        if content.len() > 100_000 {
            return Err(AppError::validation("Content cannot exceed 100,000 characters"));
        }
        
        Ok(())
    }

    /// Validate slug format
    pub fn validate_slug(slug: &str) -> Result<(), AppError> {
        if slug.trim().is_empty() {
            return Err(AppError::validation("Slug cannot be empty"));
        }
        
        let slug_regex = Regex::new(r"^[a-z0-9]+(?:-[a-z0-9]+)*$").unwrap();
        if !slug_regex.is_match(slug) {
            return Err(AppError::validation(
                "Slug must contain only lowercase letters, numbers, and hyphens"
            ));
        }
        
        if slug.len() > 100 {
            return Err(AppError::validation("Slug cannot exceed 100 characters"));
        }
        
        Ok(())
    }

    /// Validate categories
    pub fn validate_categories(categories: &[String]) -> Result<(), AppError> {
        if categories.is_empty() {
            return Err(AppError::validation("At least one category is required"));
        }
        
        if categories.len() > 10 {
            return Err(AppError::validation("Cannot have more than 10 categories"));
        }
        
        for category in categories {
            if category.trim().is_empty() {
                return Err(AppError::validation("Category name cannot be empty"));
            }
            
            if category.len() > 50 {
                return Err(AppError::validation("Category name cannot exceed 50 characters"));
            }
        }
        
        Ok(())
    }

    /// Validate date format (ISO 8601)
    pub fn validate_date(date: &str) -> Result<(), AppError> {
        if chrono::DateTime::parse_from_rfc3339(date).is_err() {
            return Err(AppError::validation("Date must be in ISO 8601 format"));
        }
        
        Ok(())
    }

    /// Validate pagination parameters
    pub fn validate_pagination(page: Option<i64>, limit: Option<i64>) -> Result<(i64, i64), AppError> {
        let page = page.unwrap_or(1);
        let limit = limit.unwrap_or(6);
        
        if page < 1 {
            return Err(AppError::validation("Page must be greater than 0"));
        }
        
        if limit < 1 || limit > 100 {
            return Err(AppError::validation("Limit must be between 1 and 100"));
        }
        
        Ok((page, limit))
    }

    /// Validate search query
    pub fn validate_search_query(query: &str) -> Result<(), AppError> {
        if query.trim().is_empty() {
            return Err(AppError::validation("Search query cannot be empty"));
        }
        
        if query.len() > 200 {
            return Err(AppError::validation("Search query cannot exceed 200 characters"));
        }
        
        Ok(())
    }

    /// Validate category name
    pub fn validate_category_name(category: &str) -> Result<(), AppError> {
        if category.trim().is_empty() {
            return Err(AppError::validation("Category name cannot be empty"));
        }
        
        if category.len() > 50 {
            return Err(AppError::validation("Category name cannot exceed 50 characters"));
        }
        
        // Check for valid characters (letters, numbers, spaces, hyphens)
        let category_regex = Regex::new(r"^[a-zA-Z0-9\s\-]+$").unwrap();
        if !category_regex.is_match(category) {
            return Err(AppError::validation(
                "Category name can only contain letters, numbers, spaces, and hyphens"
            ));
        }
        
        Ok(())
    }

    /// Validate AI prompt
    pub fn validate_ai_prompt(prompt: &str) -> Result<(), AppError> {
        if prompt.trim().is_empty() {
            return Err(AppError::validation("AI prompt cannot be empty"));
        }
        
        if prompt.len() > 5000 {
            return Err(AppError::validation("AI prompt cannot exceed 5000 characters"));
        }
        
        Ok(())
    }

    /// Validate chat message
    pub fn validate_chat_message(message: &str) -> Result<(), AppError> {
        if message.trim().is_empty() {
            return Err(AppError::validation("Chat message cannot be empty"));
        }
        
        if message.len() > 2000 {
            return Err(AppError::validation("Chat message cannot exceed 2000 characters"));
        }
        
        Ok(())
    }
}
