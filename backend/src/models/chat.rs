use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub content: String,
    #[serde(rename = "isUser")]
    pub is_user: bool,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    #[serde(rename = "conversationHistory")]
    pub conversation_history: Option<Vec<Message>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub response: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAssistRequest {
    pub prompt: String,
    #[serde(rename = "type")]
    pub prompt_type: String,
    #[serde(rename = "deepseekApiKey")]
    pub deepseek_api_key: Option<String>,
    #[serde(rename = "deepseekModel")]
    pub deepseek_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAssistResponse {
    pub content: String,
}

// Database models for chat history (optional feature)
#[derive(Debug, Clone, FromRow)]
pub struct ChatSession {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub content: String,
    pub is_user: bool,
    pub timestamp: DateTime<Utc>,
}

impl ChatSession {
    pub fn new() -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            created_at: now,
            updated_at: now,
        }
    }
}

impl ChatMessage {
    pub fn new(session_id: String, content: String, is_user: bool) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            session_id,
            content,
            is_user,
            timestamp: Utc::now(),
        }
    }
}

impl From<ChatMessage> for Message {
    fn from(chat_message: ChatMessage) -> Self {
        Self {
            id: chat_message.id,
            content: chat_message.content,
            is_user: chat_message.is_user,
            timestamp: chat_message.timestamp,
        }
    }
}
