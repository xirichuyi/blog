use crate::models::{AnalyticsDashboard, ApiResponse};
use crate::routes::AppState;
use crate::utils::error::Result;
use axum::{
    extract::Query,
    extract::State,
    http::{header, HeaderValue},
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    #[serde(default = "default_days")]
    days: u16,
}

const fn default_days() -> u16 {
    30
}

pub async fn dashboard(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Response> {
    let dashboard = state.services.analytics.dashboard(query.days).await?;
    let mut response = Json(ApiResponse::<AnalyticsDashboard>::success(dashboard)).into_response();
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    Ok(response)
}
