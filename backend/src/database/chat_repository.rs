use crate::models::{ChatMessage, ChatSession};
use sqlx::{Pool, Sqlite};
use uuid::Uuid;

pub struct ChatRepository {
    pool: Pool<Sqlite>,
}

impl ChatRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn create_session(&self) -> Result<ChatSession, sqlx::Error> {
        let session = ChatSession::new();

        sqlx::query(
            "INSERT INTO chat_sessions (id, created_at, updated_at) 
             VALUES (?, ?, ?)"
        )
        .bind(&session.id)
        .bind(&session.created_at)
        .bind(&session.updated_at)
        .execute(&self.pool)
        .await?;

        Ok(session)
    }

    pub async fn get_session(&self, session_id: &str) -> Result<Option<ChatSession>, sqlx::Error> {
        let session = sqlx::query_as::<_, ChatSession>(
            "SELECT id, created_at, updated_at 
             FROM chat_sessions 
             WHERE id = ?"
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(session)
    }

    pub async fn add_message(&self, session_id: String, content: String, is_user: bool) -> Result<ChatMessage, sqlx::Error> {
        let message = ChatMessage::new(session_id, content, is_user);

        sqlx::query(
            "INSERT INTO chat_messages (id, session_id, content, is_user, timestamp) 
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&message.id)
        .bind(&message.session_id)
        .bind(&message.content)
        .bind(message.is_user)
        .bind(&message.timestamp)
        .execute(&self.pool)
        .await?;

        // Update session timestamp
        sqlx::query(
            "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(&message.session_id)
        .execute(&self.pool)
        .await?;

        Ok(message)
    }

    pub async fn get_session_messages(&self, session_id: &str, limit: Option<i64>) -> Result<Vec<ChatMessage>, sqlx::Error> {
        let query = if let Some(limit) = limit {
            sqlx::query_as::<_, ChatMessage>(
                "SELECT id, session_id, content, is_user, timestamp 
                 FROM chat_messages 
                 WHERE session_id = ? 
                 ORDER BY timestamp DESC 
                 LIMIT ?"
            )
            .bind(session_id)
            .bind(limit)
        } else {
            sqlx::query_as::<_, ChatMessage>(
                "SELECT id, session_id, content, is_user, timestamp 
                 FROM chat_messages 
                 WHERE session_id = ? 
                 ORDER BY timestamp DESC"
            )
            .bind(session_id)
        };

        let mut messages = query.fetch_all(&self.pool).await?;
        
        // Reverse to get chronological order
        messages.reverse();
        
        Ok(messages)
    }

    pub async fn get_recent_messages(&self, session_id: &str, count: i64) -> Result<Vec<ChatMessage>, sqlx::Error> {
        let messages = sqlx::query_as::<_, ChatMessage>(
            "SELECT id, session_id, content, is_user, timestamp 
             FROM chat_messages 
             WHERE session_id = ? 
             ORDER BY timestamp DESC 
             LIMIT ?"
        )
        .bind(session_id)
        .bind(count)
        .fetch_all(&self.pool)
        .await?;

        // Reverse to get chronological order (oldest first)
        let mut messages = messages;
        messages.reverse();
        
        Ok(messages)
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<bool, sqlx::Error> {
        // Delete messages first (due to foreign key constraint)
        sqlx::query("DELETE FROM chat_messages WHERE session_id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        // Delete session
        let result = sqlx::query("DELETE FROM chat_sessions WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn cleanup_old_sessions(&self, days_old: i64) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM chat_sessions 
             WHERE created_at < datetime('now', '-' || ? || ' days')"
        )
        .bind(days_old)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() as i64)
    }

    pub async fn get_session_count(&self) -> Result<i64, sqlx::Error> {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM chat_sessions")
            .fetch_one(&self.pool)
            .await?;

        Ok(count.0)
    }
}
