use crate::models::{User, UserCreate};
use sqlx::{Pool, Sqlite};

pub struct UserRepository {
    pool: Pool<Sqlite>,
}

impl UserRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, username, email, password_hash, is_admin, created_at, updated_at 
             FROM users 
             WHERE username = ?"
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, username, email, password_hash, is_admin, created_at, updated_at 
             FROM users 
             WHERE email = ?"
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_id(&self, id: i64) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, username, email, password_hash, is_admin, created_at, updated_at 
             FROM users 
             WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn create_user(&self, user_data: UserCreate) -> Result<User, sqlx::Error> {
        // Hash the password
        let password_hash = bcrypt::hash(&user_data.password, bcrypt::DEFAULT_COST)
            .map_err(|e| sqlx::Error::Protocol(format!("Password hashing failed: {}", e)))?;

        let is_admin = user_data.is_admin.unwrap_or(false);

        let result = sqlx::query(
            "INSERT INTO users (username, email, password_hash, is_admin) 
             VALUES (?, ?, ?, ?)"
        )
        .bind(&user_data.username)
        .bind(&user_data.email)
        .bind(&password_hash)
        .bind(is_admin)
        .execute(&self.pool)
        .await?;

        let user_id = result.last_insert_rowid();

        // Fetch the created user
        let user = sqlx::query_as::<_, User>(
            "SELECT id, username, email, password_hash, is_admin, created_at, updated_at 
             FROM users 
             WHERE id = ?"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn verify_password(&self, username: &str, password: &str) -> Result<Option<User>, sqlx::Error> {
        if let Some(user) = self.find_by_username(username).await? {
            let is_valid = bcrypt::verify(password, &user.password_hash)
                .map_err(|e| sqlx::Error::Protocol(format!("Password verification failed: {}", e)))?;
            
            if is_valid {
                Ok(Some(user))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    pub async fn update_password(&self, user_id: i64, new_password: &str) -> Result<bool, sqlx::Error> {
        let password_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST)
            .map_err(|e| sqlx::Error::Protocol(format!("Password hashing failed: {}", e)))?;

        let result = sqlx::query(
            "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(&password_hash)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_all_users(&self) -> Result<Vec<User>, sqlx::Error> {
        let users = sqlx::query_as::<_, User>(
            "SELECT id, username, email, password_hash, is_admin, created_at, updated_at 
             FROM users 
             ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn delete_user(&self, user_id: i64) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
