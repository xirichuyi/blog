use crate::database::{repositories::TagRepository, Database};
use crate::models::{CreateTagRequest, Tag, UpdateTagRequest};
use crate::utils::error::Result;

pub struct TagService {
    database: Database,
}

impl TagService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn create_tag(&self, request: CreateTagRequest) -> Result<Tag> {
        TagRepository::create(self.database.pool(), request).await
    }

    #[allow(dead_code)]
    pub async fn get_tag(&self, id: i64) -> Result<Option<Tag>> {
        TagRepository::get_by_id(self.database.pool(), id).await
    }

    pub async fn list_tags(&self) -> Result<Vec<Tag>> {
        TagRepository::list(self.database.pool()).await
    }

    pub async fn update_tag(&self, id: i64, request: UpdateTagRequest) -> Result<Option<Tag>> {
        TagRepository::update(self.database.pool(), id, request).await
    }

    pub async fn delete_tag(&self, id: i64) -> Result<bool> {
        TagRepository::delete(self.database.pool(), id).await
    }

    pub async fn get_post_tags(&self, post_id: i64) -> Result<Vec<Tag>> {
        TagRepository::get_post_tags(self.database.pool(), post_id).await
    }

    pub async fn update_post_tags(&self, post_id: i64, tag_ids: Vec<i64>) -> Result<()> {
        TagRepository::update_post_tags(self.database.pool(), post_id, tag_ids).await
    }
}
