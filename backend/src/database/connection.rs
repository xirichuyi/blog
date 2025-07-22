use super::{BlogRepository, ChatRepository, UserRepository};
use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::path::Path;
use tokio::fs;

#[derive(Clone)]
pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        // Ensure the database directory exists
        if let Some(parent) = Path::new(database_url.trim_start_matches("sqlite:")).parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                sqlx::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to create database directory: {}", e),
                ))
            })?;
        }

        // Create connection pool
        let pool = SqlitePool::connect(database_url).await?;

        Ok(Database { pool })
    }

    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        // Read and execute migration files
        let migration_sql = include_str!("../../migrations/001_initial.sql");

        // Split by semicolon and execute each statement
        for statement in migration_sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() {
                sqlx::query(statement).execute(&self.pool).await?;
            }
        }

        tracing::info!("Database migrations completed successfully");
        Ok(())
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    // Repository factory methods
    pub fn blog_repository(&self) -> BlogRepository {
        BlogRepository::new(self.pool.clone())
    }

    pub fn user_repository(&self) -> UserRepository {
        UserRepository::new(self.pool.clone())
    }

    pub fn chat_repository(&self) -> ChatRepository {
        ChatRepository::new(self.pool.clone())
    }

    /// Perform database health check
    pub async fn health_check(&self) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT 1").fetch_one(&self.pool).await?;
        Ok(())
    }

    /// Get connection pool statistics for monitoring
    pub fn pool_stats(&self) -> PoolStats {
        PoolStats {
            size: self.pool.size(),
            idle: self.pool.num_idle() as u32,
            max_connections: 10, // This should come from config
        }
    }
}

/// Database pool statistics for monitoring
#[derive(Debug, Clone)]
pub struct PoolStats {
    pub size: u32,
    pub idle: u32,
    pub max_connections: u32,
}

impl PoolStats {
    /// Check if the pool is under pressure
    pub fn is_under_pressure(&self) -> bool {
        self.idle == 0 && self.size > (self.max_connections / 2)
    }

    /// Get pool utilization percentage
    pub fn utilization_percent(&self) -> f32 {
        if self.max_connections == 0 {
            0.0
        } else {
            (self.size as f32 / self.max_connections as f32) * 100.0
        }
    }
}
