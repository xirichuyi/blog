use crate::config::Settings;
use crate::database::{Database, UserRepository};
use crate::models::{AuthResponse, TokenClaims, User, UserCreate, UserLogin};
use crate::utils::{AppError, AppResult};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

pub struct AuthService {
    database: Database,
    settings: Settings,
}

impl AuthService {
    pub fn new(database: Database, settings: Settings) -> Self {
        Self { database, settings }
    }

    pub async fn login(&self, login_data: UserLogin) -> AppResult<AuthResponse> {
        let repo = self.database.user_repository();

        if let Some(user) = repo
            .verify_password(&login_data.username, &login_data.password)
            .await?
        {
            let token = self.generate_token(&user)?;
            Ok(AuthResponse {
                success: true,
                token: Some(token),
                message: None,
            })
        } else {
            Ok(AuthResponse {
                success: false,
                token: None,
                message: Some("Invalid username or password".to_string()),
            })
        }
    }

    pub async fn register(&self, user_data: UserCreate) -> AppResult<AuthResponse> {
        let repo = self.database.user_repository();

        // Check if user already exists
        if repo.find_by_username(&user_data.username).await?.is_some() {
            return Ok(AuthResponse {
                success: false,
                token: None,
                message: Some("Username already exists".to_string()),
            });
        }

        if repo.find_by_email(&user_data.email).await?.is_some() {
            return Ok(AuthResponse {
                success: false,
                token: None,
                message: Some("Email already exists".to_string()),
            });
        }

        let user = repo.create_user(user_data).await?;
        let token = self.generate_token(&user)?;

        Ok(AuthResponse {
            success: true,
            token: Some(token),
            message: None,
        })
    }

    pub fn verify_token(&self, token: &str) -> AppResult<TokenClaims> {
        let decoding_key = DecodingKey::from_secret(self.settings.auth.jwt_secret.as_ref());
        let validation = Validation::default();

        let token_data = decode::<TokenClaims>(token, &decoding_key, &validation)?;
        Ok(token_data.claims)
    }

    pub fn verify_admin_token(&self, token: &str) -> bool {
        // Simple token verification for admin (matches the original Next.js implementation)
        token == self.settings.auth.admin_token
    }

    pub async fn get_user_by_id(&self, user_id: i64) -> AppResult<Option<User>> {
        let repo = self.database.user_repository();
        Ok(repo.find_by_id(user_id).await?)
    }

    fn generate_token(&self, user: &User) -> AppResult<String> {
        let now = Utc::now();
        let exp = now + Duration::hours(24); // Token expires in 24 hours

        let claims = TokenClaims {
            sub: user.id.to_string(),
            username: user.username.clone(),
            is_admin: user.is_admin,
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        let encoding_key = EncodingKey::from_secret(self.settings.auth.jwt_secret.as_ref());
        let token = encode(&Header::default(), &claims, &encoding_key)?;

        Ok(token)
    }
}
