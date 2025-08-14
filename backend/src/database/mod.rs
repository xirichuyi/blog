use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::sync::Arc;

pub mod repositories;

pub type DatabasePool = Pool<Sqlite>;

#[derive(Debug, Clone)]
pub struct Database {
    pub pool: Arc<DatabasePool>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(database_url).await?;

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
