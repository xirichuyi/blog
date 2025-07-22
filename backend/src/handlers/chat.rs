use axum::{extract::State, response::Json};

use crate::config::Settings;
use crate::database::Database;
use crate::models::{ChatRequest, ChatResponse};
use crate::services::{AiService, BlogService, ChatService};
use crate::utils::{success_response, AppError, AppResult, Validator};

pub async fn chat_with_ai(
    State(database): State<Database>,
    Json(request): Json<ChatRequest>,
) -> AppResult<Json<ChatResponse>> {
    // Validate chat message
    Validator::validate_chat_message(&request.message)?;

    // Load settings
    let settings = Settings::new()?;

    // Create services
    let blog_service = BlogService::new(database.clone());
    let ai_service = AiService::new(settings).with_blog_service(blog_service);
    let chat_service = ChatService::new(database, ai_service);

    let response = chat_service.chat_with_ai(request).await.unwrap_or_else(|e| {
        tracing::error!("Error in chat: {}", e);
        ChatResponse {
            response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.".to_string(),
        }
    });

    Ok(success_response(response))
}
