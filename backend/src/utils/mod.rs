pub mod error;
pub mod file_handler;
pub mod text;

// 重新导出常用类型和常量，便于外部使用
pub use file_handler::{
    FileHandler, ImageOptimizeOptions, OptimizeResult, DOCUMENT_TYPES, IMAGE_TYPES, MUSIC_TYPES,
    PDF_TYPES,
};
