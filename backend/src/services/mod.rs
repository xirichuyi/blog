pub mod about_service;
pub mod category_service;
pub mod download_service;
pub mod music_service;
pub mod pdf_service;
pub mod post_service;
pub mod resource_service;
pub mod tag_service;

pub use about_service::AboutService;
pub use category_service::CategoryService;
pub use download_service::DownloadService;
pub use music_service::MusicService;
pub use pdf_service::PdfService;
pub use post_service::PostService;
pub use resource_service::ResourceService;
pub use tag_service::TagService;

use crate::database::Database;
use crate::utils::FileHandler;
use std::sync::Arc;

/// 所有Service的集中容器，用于AppState注入
#[derive(Clone)]
pub struct Services {
    pub post: Arc<PostService>,
    pub music: Arc<MusicService>,
    pub download: Arc<DownloadService>,
    pub category: Arc<CategoryService>,
    pub tag: Arc<TagService>,
    pub about: Arc<AboutService>,
    pub pdf: Arc<PdfService>,
    pub resource: Arc<ResourceService>,
}

impl Services {
    pub fn new(database: Database, file_handler: Arc<FileHandler>, upload_dir: String) -> Self {
        Self {
            post: Arc::new(PostService::new(database.clone(), file_handler.clone())),
            music: Arc::new(MusicService::new(database.clone(), file_handler.clone())),
            download: Arc::new(DownloadService::new(database.clone(), file_handler.clone())),
            category: Arc::new(CategoryService::new(database.clone())),
            tag: Arc::new(TagService::new(database.clone())),
            about: Arc::new(AboutService::new(database.clone())),
            pdf: Arc::new(PdfService::new(database.clone(), file_handler.clone())),
            resource: Arc::new(ResourceService::new(database, file_handler, upload_dir)),
        }
    }
}
