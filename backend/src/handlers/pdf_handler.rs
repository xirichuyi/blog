use crate::models::{ApiResponse, FileUploadResponse, UploadPdfRequest};
use crate::routes::AppState;
use crate::services::PdfService;
use crate::utils::FileHandler;
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use axum_extra::extract::Multipart;

/// Upload PDF file (for post)
pub async fn upload_pdf(
    State(app_state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Response, StatusCode> {
    let file_handler = FileHandler::new(
        app_state.config.storage.upload_dir.clone(),
        app_state.config.storage.max_file_size,
    );
    let service = PdfService::new(app_state.database, file_handler.clone());

    let mut field_data: Option<axum_extra::extract::multipart::Field> = None;
    let mut post_id: Option<i64> = None;

    // Parse multipart form data
    while let Ok(Some(field)) = multipart.next_field().await {
        let field_name = field.name().unwrap_or("");

        match field_name {
            "file" => {
                field_data = Some(field);
            }
            "post_id" => {
                if let Ok(text) = field.text().await {
                    if let Ok(id) = text.parse::<i64>() {
                        post_id = Some(id);
                    }
                }
            }
            _ => {}
        }
    }

    let field = field_data.ok_or_else(|| {
        tracing::error!("No file field found in multipart form");
        StatusCode::BAD_REQUEST
    })?;

    let request = UploadPdfRequest { post_id };

    match service.upload_pdf(field, request).await {
        Ok(pdf) => {
            let response = FileUploadResponse {
                file_url: format!("/uploads/pdfs/{}", pdf.file_name),
                file_name: pdf.file_name.clone(),
                file_size: pdf.file_size as u64,
            };
            Ok(Json(ApiResponse::success(response)).into_response())
        }
        Err(e) => {
            tracing::error!("Failed to upload PDF: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
