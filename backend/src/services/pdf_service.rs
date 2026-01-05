use crate::database::Database;
use crate::models::{PdfDocument, UploadPdfRequest};
use crate::utils::error::{AppError, Result};
use crate::utils::{FileHandler, PDF_TYPES};
use axum_extra::extract::multipart::Field;
use std::sync::Arc;

pub struct PdfService {
    database: Database,
    file_handler: Arc<FileHandler>,
}

impl PdfService {
    pub fn new(database: Database, file_handler: Arc<FileHandler>) -> Self {
        Self {
            database,
            file_handler,
        }
    }

    pub async fn upload_pdf(&self, field: Field, request: UploadPdfRequest) -> Result<PdfDocument> {
        let file_name = field
            .file_name()
            .ok_or_else(|| AppError::BadRequest("No file name provided".to_string()))?
            .to_string();

        self.file_handler
            .validate_file_type(&file_name, PDF_TYPES)?;

        let (file_url, saved_file_name, file_size) = self
            .file_handler
            .save_pdf_with_original_name(field, "pdfs")
            .await?;

        let pdf = sqlx::query_as::<_, PdfDocument>(
            r#"
            INSERT INTO pdf_documents (file_name, file_path, file_size, post_id)
            VALUES (?1, ?2, ?3, ?4)
            RETURNING id, file_name, file_path, file_size, post_id, created_at, updated_at
            "#,
        )
        .bind(&saved_file_name)
        .bind(&file_url)
        .bind(file_size as i64)
        .bind(request.post_id)
        .fetch_one(&*self.database.pool())
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert PDF document: {}", e);
            AppError::Internal("Failed to save PDF document".to_string())
        })?;

        Ok(pdf)
    }

}
