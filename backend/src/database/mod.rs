use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
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
            .synchronous(SqliteSynchronous::Full)
            .busy_timeout(Duration::from_secs(5));
        // The bundled SQLite in SQLx 0.7 predates the WAL-reset race fix.
        // A single connection removes the concurrent checkpoint/write condition;
        // this blog's workload is small enough that serialization is acceptable.
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
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
