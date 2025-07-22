use crate::database::{ChatRepository, Database};
use crate::models::{ChatMessage, ChatRequest, ChatResponse, ChatSession, Message};
use crate::services::AiService;
use crate::utils::{AppError, AppResult};

pub struct ChatService {
    database: Database,
    ai_service: AiService,
}

impl ChatService {
    pub fn new(database: Database, ai_service: AiService) -> Self {
        Self {
            database,
            ai_service,
        }
    }

    pub async fn chat_with_ai(&self, request: ChatRequest) -> AppResult<ChatResponse> {
        let repo = self.database.chat_repository();

        // Create or get session (for now, create a new session for each request)
        let session = repo.create_session().await?;

        // Add user message to database
        let user_message = repo
            .add_message(session.id.clone(), request.message.clone(), true)
            .await?;

        // Get conversation history
        let mut conversation_history = request.conversation_history.unwrap_or_default();

        // Add current user message to history
        conversation_history.push(Message::from(user_message));

        // Generate AI response
        let ai_response = self
            .ai_service
            .generate_response(&request.message, &conversation_history)
            .await?;

        // Add AI response to database
        let _ai_message = repo
            .add_message(session.id, ai_response.clone(), false)
            .await?;

        Ok(ChatResponse {
            response: ai_response,
        })
    }

    pub async fn get_session_history(
        &self,
        session_id: &str,
        limit: Option<i64>,
    ) -> AppResult<Vec<Message>> {
        let repo = self.database.chat_repository();
        let messages = repo.get_session_messages(session_id, limit).await?;

        Ok(messages.into_iter().map(Message::from).collect())
    }

    pub async fn create_session(&self) -> AppResult<ChatSession> {
        let repo = self.database.chat_repository();
        Ok(repo.create_session().await?)
    }

    pub async fn delete_session(&self, session_id: &str) -> AppResult<bool> {
        let repo = self.database.chat_repository();
        Ok(repo.delete_session(session_id).await?)
    }
}
