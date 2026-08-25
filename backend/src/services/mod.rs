pub mod about_service;
pub mod analytics_service;
pub mod book_service;
pub mod category_service;
pub mod changelog_service;
pub mod post_service;
pub mod tag_service;

pub use about_service::AboutService;
pub use analytics_service::AnalyticsService;
pub use book_service::BookService;
pub use category_service::CategoryService;
pub use changelog_service::ChangelogService;
pub use post_service::PostService;
pub use tag_service::TagService;

use crate::database::Database;
use crate::utils::R2Storage;
use std::sync::Arc;

/// 所有Service的集中容器，用于AppState注入
#[derive(Clone)]
pub struct Services {
    pub post: Arc<PostService>,
    pub category: Arc<CategoryService>,
    pub tag: Arc<TagService>,
    pub about: Arc<AboutService>,
    pub analytics: Arc<AnalyticsService>,
    pub book: Arc<BookService>,
    pub changelog: Arc<ChangelogService>,
}

impl Services {
    pub fn new(
        database: Database,
        r2_storage: Arc<R2Storage>,
        cloudflare_analytics: Option<crate::config::CloudflareAnalyticsConfig>,
    ) -> Self {
        Self {
            post: Arc::new(PostService::new(database.clone(), r2_storage.clone())),
            category: Arc::new(CategoryService::new(database.clone())),
            tag: Arc::new(TagService::new(database.clone())),
            about: Arc::new(AboutService::new(database.clone())),
            analytics: Arc::new(AnalyticsService::new(
                database.clone(),
                cloudflare_analytics,
            )),
            book: Arc::new(BookService::new(database.clone(), r2_storage)),
            changelog: Arc::new(ChangelogService::new(database.clone())),
        }
    }
}
