use crate::database::{repositories::CategoryRepository, Database};
use crate::models::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use crate::utils::error::Result;

pub struct CategoryService {
    database: Database,
}

impl CategoryService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn create_category(&self, request: CreateCategoryRequest) -> Result<Category> {
        CategoryRepository::create(self.database.pool(), request).await
    }
    #[allow(dead_code)]
    pub async fn get_category(&self, id: i64) -> Result<Option<Category>> {
        CategoryRepository::get_by_id(self.database.pool(), id).await
    }

    pub async fn list_categories(&self) -> Result<Vec<Category>> {
        CategoryRepository::list(self.database.pool()).await
    }

    pub async fn update_category(
        &self,
        id: i64,
        request: UpdateCategoryRequest,
    ) -> Result<Option<Category>> {
        CategoryRepository::update(self.database.pool(), id, request).await
    }

    pub async fn delete_category(&self, id: i64) -> Result<bool> {
        CategoryRepository::delete(self.database.pool(), id).await
    }
}
