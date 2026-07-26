use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
    Pool, Sqlite,
};
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;

pub mod repositories;

pub type DatabasePool = Pool<Sqlite>;

#[derive(Debug, Clone)]
pub struct Database {
    pub pool: Arc<DatabasePool>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(SqliteJournalMode::Wal)
            .busy_timeout(Duration::from_secs(5));
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        Ok(Database {
            pool: Arc::new(pool),
        })
    }

    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        sqlx::migrate!("./migrations").run(&*self.pool).await?;
        Ok(())
    }

    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }
}
