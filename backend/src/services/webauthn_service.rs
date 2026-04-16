use crate::database::Database;
use crate::utils::error::{AppError, Result};
use sqlx::Row;
use url::Url;
use uuid::Uuid;
use webauthn_rs::prelude::*;
use webauthn_rs::Webauthn;

#[derive(Clone)]
pub struct WebauthnService {
    db: Database,
    webauthn: std::sync::Arc<Webauthn>,
}

impl WebauthnService {
    pub fn new(db: Database, rp_id: &str, rp_origin: &str) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        let rp_origin = Url::parse(rp_origin)?;
        let builder = WebauthnBuilder::new(rp_id, &rp_origin)?
            .rp_name("Chuyi Blog Admin");
        let webauthn = std::sync::Arc::new(builder.build()?);

        Ok(Self { db, webauthn })
    }

    /// Check if any credentials are registered
    pub async fn has_credentials(&self) -> Result<bool> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM webauthn_credentials")
            .fetch_one(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;
        Ok(count > 0)
    }

    /// List all registered credential names
    pub async fn list_credentials(&self) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query("SELECT id, name, created_at, last_used_at FROM webauthn_credentials ORDER BY created_at DESC")
            .fetch_all(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;

        let creds: Vec<serde_json::Value> = rows
            .iter()
            .map(|row| {
                serde_json::json!({
                    "id": row.get::<String, _>("id"),
                    "name": row.get::<String, _>("name"),
                    "created_at": row.get::<String, _>("created_at"),
                    "last_used_at": row.get::<Option<String>, _>("last_used_at"),
                })
            })
            .collect();

        Ok(creds)
    }

    /// Start registration ceremony
    pub async fn start_registration(&self) -> Result<CreationChallengeResponse> {
        let user_unique_id = Uuid::new_v4();

        // Load existing credentials to exclude
        let existing = self.load_all_passkeys().await?;
        let exclude: Vec<CredentialID> = existing.iter().map(|p| p.cred_id().clone()).collect();

        let (ccr, reg_state) = self
            .webauthn
            .start_passkey_registration(user_unique_id, "admin", "Admin", Some(exclude))
            .map_err(|e| AppError::Internal(format!("WebAuthn registration start error: {}", e)))?;

        // Store challenge state
        let state_json = serde_json::to_string(&reg_state)
            .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;
        let challenge_id = Uuid::new_v4().to_string();

        // Clean old challenges first
        sqlx::query("DELETE FROM webauthn_challenges WHERE created_at < datetime('now', '-5 minutes')")
            .execute(&*self.db.pool)
            .await
            .ok();

        sqlx::query("INSERT INTO webauthn_challenges (id, challenge_type, state_json) VALUES (?, 'registration', ?)")
            .bind(&challenge_id)
            .bind(&state_json)
            .execute(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;

        Ok(ccr)
    }

    /// Finish registration ceremony
    pub async fn finish_registration(
        &self,
        reg: &RegisterPublicKeyCredential,
        credential_name: &str,
    ) -> Result<()> {
        // Load the most recent registration challenge
        let row = sqlx::query(
            "SELECT id, state_json FROM webauthn_challenges WHERE challenge_type = 'registration' ORDER BY created_at DESC LIMIT 1"
        )
            .fetch_optional(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?
            .ok_or_else(|| AppError::BadRequest("No pending registration challenge found".to_string()))?;

        let challenge_id: String = row.get("id");
        let state_json: String = row.get("state_json");

        let reg_state: PasskeyRegistration = serde_json::from_str(&state_json)
            .map_err(|e| AppError::Internal(format!("Deserialization error: {}", e)))?;

        let passkey = self
            .webauthn
            .finish_passkey_registration(reg, &reg_state)
            .map_err(|e| AppError::BadRequest(format!("WebAuthn registration failed: {}", e)))?;

        // Store credential
        let id = Uuid::new_v4().to_string();
        let cred_id = base64url::encode(passkey.cred_id().as_ref());
        let cred_json = serde_json::to_string(&passkey)
            .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;

        sqlx::query(
            "INSERT INTO webauthn_credentials (id, credential_id, credential_json, name) VALUES (?, ?, ?, ?)"
        )
            .bind(&id)
            .bind(&cred_id)
            .bind(&cred_json)
            .bind(credential_name)
            .execute(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;

        // Clean up challenge
        sqlx::query("DELETE FROM webauthn_challenges WHERE id = ?")
            .bind(&challenge_id)
            .execute(&*self.db.pool)
            .await
            .ok();

        tracing::info!("WebAuthn credential registered: {} ({})", credential_name, cred_id);
        Ok(())
    }

    /// Start authentication ceremony
    pub async fn start_authentication(&self) -> Result<RequestChallengeResponse> {
        let passkeys = self.load_all_passkeys().await?;
        if passkeys.is_empty() {
            return Err(AppError::BadRequest("No WebAuthn credentials registered".to_string()));
        }

        let (rcr, auth_state) = self
            .webauthn
            .start_passkey_authentication(&passkeys)
            .map_err(|e| AppError::Internal(format!("WebAuthn auth start error: {}", e)))?;

        // Store challenge state
        let state_json = serde_json::to_string(&auth_state)
            .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;
        let challenge_id = Uuid::new_v4().to_string();

        // Clean old challenges
        sqlx::query("DELETE FROM webauthn_challenges WHERE created_at < datetime('now', '-5 minutes')")
            .execute(&*self.db.pool)
            .await
            .ok();

        sqlx::query("INSERT INTO webauthn_challenges (id, challenge_type, state_json) VALUES (?, 'authentication', ?)")
            .bind(&challenge_id)
            .bind(&state_json)
            .execute(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;

        Ok(rcr)
    }

    /// Finish authentication ceremony — returns the admin token on success
    pub async fn finish_authentication(
        &self,
        auth: &PublicKeyCredential,
        admin_token: &str,
    ) -> Result<String> {
        // Load the most recent auth challenge
        let row = sqlx::query(
            "SELECT id, state_json FROM webauthn_challenges WHERE challenge_type = 'authentication' ORDER BY created_at DESC LIMIT 1"
        )
            .fetch_optional(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?
            .ok_or_else(|| AppError::BadRequest("No pending authentication challenge found".to_string()))?;

        let challenge_id: String = row.get("id");
        let state_json: String = row.get("state_json");

        let auth_state: PasskeyAuthentication = serde_json::from_str(&state_json)
            .map_err(|e| AppError::Internal(format!("Deserialization error: {}", e)))?;

        let auth_result = self
            .webauthn
            .finish_passkey_authentication(auth, &auth_state)
            .map_err(|e| AppError::Unauthorized(format!("WebAuthn authentication failed: {}", e)))?;

        // Update credential counter and last_used_at
        let cred_id_b64 = base64url::encode(auth_result.cred_id().as_ref());
        if let Ok(Some(row)) = sqlx::query("SELECT id, credential_json FROM webauthn_credentials WHERE credential_id = ?")
            .bind(&cred_id_b64)
            .fetch_optional(&*self.db.pool)
            .await
        {
            let db_id: String = row.get("id");
            let cred_json_str: String = row.get("credential_json");
            if let Ok(mut passkey) = serde_json::from_str::<Passkey>(&cred_json_str) {
                passkey.update_credential(&auth_result);
                if let Ok(updated_json) = serde_json::to_string(&passkey) {
                    sqlx::query("UPDATE webauthn_credentials SET credential_json = ?, last_used_at = datetime('now') WHERE id = ?")
                        .bind(&updated_json)
                        .bind(&db_id)
                        .execute(&*self.db.pool)
                        .await
                        .ok();
                }
            }
        }

        // Clean up challenge
        sqlx::query("DELETE FROM webauthn_challenges WHERE id = ?")
            .bind(&challenge_id)
            .execute(&*self.db.pool)
            .await
            .ok();

        tracing::info!("WebAuthn authentication successful for credential: {}", cred_id_b64);

        // Return the admin token so the frontend can use it for subsequent requests
        Ok(admin_token.to_string())
    }

    /// Delete a credential by id
    pub async fn delete_credential(&self, id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM webauthn_credentials WHERE id = ?")
            .bind(id)
            .execute(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Credential not found".to_string()));
        }

        Ok(())
    }

    /// Load all stored passkeys
    async fn load_all_passkeys(&self) -> Result<Vec<Passkey>> {
        let rows = sqlx::query("SELECT credential_json FROM webauthn_credentials")
            .fetch_all(&*self.db.pool)
            .await
            .map_err(|e| AppError::Internal(format!("DB error: {}", e)))?;

        let mut passkeys = Vec::new();
        for row in rows {
            let json: String = row.get("credential_json");
            let passkey: Passkey = serde_json::from_str(&json)
                .map_err(|e| AppError::Internal(format!("Credential deserialization error: {}", e)))?;
            passkeys.push(passkey);
        }

        Ok(passkeys)
    }
}
