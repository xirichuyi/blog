use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsDashboard {
    pub available: bool,
    pub provider: &'static str,
    pub days: u16,
    pub from: NaiveDate,
    pub to: NaiveDate,
    pub pageviews: u64,
    pub visits: u64,
    pub trend: Vec<AnalyticsTrendPoint>,
    pub top_pages: Vec<AnalyticsPage>,
    pub referrers: Vec<AnalyticsBreakdown>,
    pub devices: Vec<AnalyticsBreakdown>,
    pub countries: Vec<AnalyticsBreakdown>,
    pub updated_at: DateTime<Utc>,
    pub cached: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsTrendPoint {
    pub date: NaiveDate,
    pub pageviews: u64,
    pub visits: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsPage {
    pub path: String,
    pub title: String,
    pub pageviews: u64,
    pub visits: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsBreakdown {
    pub key: String,
    pub label: String,
    pub pageviews: u64,
}
