use crate::database::{repositories::MusicRepository, Database};
use crate::models::{CreateMusicRequest, Music, MusicListQuery, UpdateMusicRequest};
use crate::utils::error::Result;
use crate::utils::FileHandler;

pub struct MusicService {
    database: Database,
    file_handler: FileHandler,
}

impl MusicService {
    pub fn new(database: Database, file_handler: FileHandler) -> Self {
        Self {
            database,
            file_handler,
        }
    }

    pub async fn create_music(&self, request: CreateMusicRequest) -> Result<Music> {
        MusicRepository::create(self.database.pool(), request).await
    }

    pub async fn get_music(&self, id: i64) -> Result<Option<Music>> {
        MusicRepository::get_by_id(self.database.pool(), id).await
    }

    pub async fn list_music(&self, query: MusicListQuery) -> Result<(Vec<Music>, i64)> {
        MusicRepository::list(self.database.pool(), query).await
    }

    pub async fn update_music(
        &self,
        id: i64,
        request: UpdateMusicRequest,
    ) -> Result<Option<Music>> {
        MusicRepository::update(self.database.pool(), id, request).await
    }

    pub async fn delete_music(&self, id: i64) -> Result<bool> {
        // Get music to check for files to delete
        if let Some(music) = MusicRepository::get_by_id(self.database.pool(), id).await? {
            // Delete music file
            let _ = self.file_handler.delete_file(&music.music_url).await;

            // Delete cover image if exists
            if let Some(cover_url) = &music.music_cover_url {
                let _ = self.file_handler.delete_file(cover_url).await;
            }

            // Soft delete the music
            MusicRepository::delete(self.database.pool(), id).await
        } else {
            Ok(false)
        }
    }

    pub async fn update_music_cover(
        &self,
        id: i64,
        new_cover_url: String,
    ) -> Result<Option<Music>> {
        // Get existing music to delete old cover
        if let Some(existing_music) = MusicRepository::get_by_id(self.database.pool(), id).await? {
            // Delete old cover if exists
            if let Some(old_cover_url) = &existing_music.music_cover_url {
                let _ = self.file_handler.delete_file(old_cover_url).await;
            }

            // Update with new cover
            let update_request = UpdateMusicRequest {
                music_name: None,
                music_author: None,
                music_url: None,
                music_cover_url: Some(new_cover_url),
                status: None,
            };

            MusicRepository::update(self.database.pool(), id, update_request).await
        } else {
            Ok(None)
        }
    }
}
