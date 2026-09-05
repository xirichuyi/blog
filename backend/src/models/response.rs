use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub message: String,
    pub data: Option<T>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
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

    pub fn error(code: u16, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            data: None,
        }
    }
}

impl<T> Page<T> {
    pub fn new(items: Vec<T>, total: i64, page: u32, page_size: u32) -> Self {
        Self {
            items,
            total,
            page,
            page_size,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{ApiResponse, Page};

    #[test]
    fn response_has_one_stable_envelope() {
        let response = ApiResponse::success(Page::new(vec!["post"], 1, 1, 10));
        let json = serde_json::to_value(response).unwrap();

        assert_eq!(json["code"], 200);
        assert_eq!(json["message"], "Success");
        assert_eq!(json["data"]["items"][0], "post");
        assert_eq!(json["data"]["total"], 1);
        assert!(json.get("total").is_none());
    }
}
