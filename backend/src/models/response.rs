use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiListResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<Vec<T>>,
    pub total: Option<i64>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 200,
            message: "Success".to_string(),
            data: Some(data),
        }
    }

    pub fn success_with_message(data: T, message: &str) -> Self {
        Self {
            code: 200,
            message: message.to_string(),
            data: Some(data),
        }
    }

    #[allow(dead_code)]
    pub fn error(code: i32, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            data: None,
        }
    }

    pub fn not_found(message: &str) -> Self {
        Self {
            code: 404,
            message: message.to_string(),
            data: None,
        }
    }

    pub fn bad_request(message: &str) -> Self {
        Self {
            code: 400,
            message: message.to_string(),
            data: None,
        }
    }

    #[allow(dead_code)]
    pub fn unauthorized(message: &str) -> Self {
        Self {
            code: 401,
            message: message.to_string(),
            data: None,
        }
    }

    pub fn internal_error(message: &str) -> Self {
        Self {
            code: 500,
            message: message.to_string(),
            data: None,
        }
    }
}

impl<T> ApiListResponse<T> {
    pub fn success(data: Vec<T>, total: i64, page: u32, page_size: u32) -> Self {
        Self {
            code: 200,
            message: "Success".to_string(),
            data: Some(data),
            total: Some(total),
            page: Some(page),
            page_size: Some(page_size),
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            data: None,
            total: None,
            page: None,
            page_size: None,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FileUploadResponse {
    pub file_url: String,
    pub file_name: String,
    pub file_size: u64,
}
