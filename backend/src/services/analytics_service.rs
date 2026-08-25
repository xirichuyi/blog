use crate::config::CloudflareAnalyticsConfig;
use crate::database::Database;
use crate::models::{AnalyticsBreakdown, AnalyticsDashboard, AnalyticsPage, AnalyticsTrendPoint};
use crate::utils::error::{AppError, Result};
use chrono::{Days, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

const GRAPHQL_ENDPOINT: &str = "https://api.cloudflare.com/client/v4/graphql";
const CACHE_TTL: Duration = Duration::from_secs(5 * 60);
const PROVIDER: &str = "Cloudflare Web Analytics";

const ANALYTICS_QUERY: &str = r#"
query BlogAnalytics(
  $accountTag: string!
  $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      trend: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 100
        orderBy: [date_ASC]
      ) {
        count
        sum { visits }
        dimensions { date }
      }
      paths: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 12
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
      referrers: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 10
        orderBy: [count_DESC]
      ) {
        count
        dimensions { refererHost }
      }
      devices: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 10
        orderBy: [count_DESC]
      ) {
        count
        dimensions { deviceType }
      }
      countries: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 10
        orderBy: [count_DESC]
      ) {
        count
        dimensions { countryName }
      }
    }
  }
}
"#;

pub struct AnalyticsService {
    database: Database,
    config: Option<CloudflareAnalyticsConfig>,
    client: reqwest::Client,
    cache: RwLock<HashMap<u16, CacheEntry>>,
}

struct CacheEntry {
    stored_at: Instant,
    dashboard: AnalyticsDashboard,
}

impl AnalyticsService {
    pub fn new(database: Database, config: Option<CloudflareAnalyticsConfig>) -> Self {
        Self {
            database,
            config,
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(12))
                .build()
                .expect("Cloudflare analytics HTTP client should build"),
            cache: RwLock::new(HashMap::new()),
        }
    }

    pub async fn dashboard(&self, requested_days: u16) -> Result<AnalyticsDashboard> {
        let days = normalize_days(requested_days)?;
        if let Some(entry) = self.cache.read().await.get(&days) {
            if entry.stored_at.elapsed() < CACHE_TTL {
                let mut dashboard = entry.dashboard.clone();
                dashboard.cached = true;
                return Ok(dashboard);
            }
        }

        let today = Utc::now().date_naive();
        let from = start_date(today, days);
        let Some(config) = self.config.as_ref() else {
            return Ok(AnalyticsDashboard {
                available: false,
                provider: PROVIDER,
                days,
                from,
                to: today,
                pageviews: 0,
                visits: 0,
                trend: Vec::new(),
                top_pages: Vec::new(),
                referrers: Vec::new(),
                devices: Vec::new(),
                countries: Vec::new(),
                updated_at: Utc::now(),
                cached: false,
                message: Some("访问统计尚未配置。".to_string()),
            });
        };

        match self.fetch_dashboard(config, days, from, today).await {
            Ok(dashboard) => {
                self.cache.write().await.insert(
                    days,
                    CacheEntry {
                        stored_at: Instant::now(),
                        dashboard: dashboard.clone(),
                    },
                );
                Ok(dashboard)
            }
            Err(error) => {
                if let Some(entry) = self.cache.read().await.get(&days) {
                    tracing::warn!(
                        "Cloudflare analytics refresh failed; serving stale cache: {error}"
                    );
                    let mut dashboard = entry.dashboard.clone();
                    dashboard.cached = true;
                    dashboard.message =
                        Some("Cloudflare 暂时不可用，当前展示最近一次数据。".to_string());
                    return Ok(dashboard);
                }
                Err(error)
            }
        }
    }

    async fn fetch_dashboard(
        &self,
        config: &CloudflareAnalyticsConfig,
        days: u16,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<AnalyticsDashboard> {
        let body = GraphQlRequest {
            query: ANALYTICS_QUERY,
            variables: GraphQlVariables {
                account_tag: &config.account_id,
                filter: AnalyticsFilter {
                    date_geq: from,
                    date_leq: to,
                    site_tag: &config.site_tag,
                    bot: 0,
                },
            },
        };
        let response = self
            .client
            .post(GRAPHQL_ENDPOINT)
            .bearer_auth(&config.api_token)
            .json(&body)
            .send()
            .await
            .map_err(|error| {
                tracing::error!("Cloudflare analytics request failed: {error}");
                AppError::Internal("无法读取访问统计，请稍后重试。".to_string())
            })?;

        if !response.status().is_success() {
            tracing::error!("Cloudflare analytics returned HTTP {}", response.status());
            return Err(AppError::Internal(
                "Cloudflare 暂时无法返回访问统计。".to_string(),
            ));
        }

        let payload = response.json::<GraphQlResponse>().await.map_err(|error| {
            tracing::error!("Cloudflare analytics response was invalid: {error}");
            AppError::Internal("访问统计响应格式异常。".to_string())
        })?;
        if payload
            .errors
            .as_ref()
            .is_some_and(|errors| !errors.is_empty())
        {
            let messages = payload
                .errors
                .as_deref()
                .unwrap_or_default()
                .iter()
                .map(|error| error.message.as_str())
                .collect::<Vec<_>>()
                .join("; ");
            tracing::error!("Cloudflare analytics GraphQL error: {messages}");
            return Err(AppError::Internal(
                "Cloudflare 无法完成本次统计查询。".to_string(),
            ));
        }

        let account = payload
            .data
            .and_then(|data| data.viewer.accounts.into_iter().next())
            .ok_or_else(|| AppError::Internal("访问统计账户不可用。".to_string()))?;
        let trend = fill_trend(from, to, account.trend);
        let pageviews = trend.iter().map(|point| point.pageviews).sum();
        let visits = trend.iter().map(|point| point.visits).sum();
        let titles = self.post_titles().await?;

        Ok(AnalyticsDashboard {
            available: true,
            provider: PROVIDER,
            days,
            from,
            to,
            pageviews,
            visits,
            trend,
            top_pages: account
                .paths
                .into_iter()
                .filter_map(|group| {
                    let path = group.dimensions.request_path?;
                    if path.starts_with("/admin") {
                        return None;
                    }
                    Some(AnalyticsPage {
                        title: page_title(&path, &titles),
                        path,
                        pageviews: group.count,
                        visits: group.sum.map_or(0, |sum| sum.visits),
                    })
                })
                .collect(),
            referrers: account
                .referrers
                .into_iter()
                .filter_map(|group| {
                    let key = group.dimensions.referer_host?;
                    let label = if key.is_empty() {
                        "直接访问".to_string()
                    } else if key.eq_ignore_ascii_case(&config.site_host) {
                        "站内跳转".to_string()
                    } else {
                        key.clone()
                    };
                    Some(AnalyticsBreakdown {
                        key,
                        label,
                        pageviews: group.count,
                    })
                })
                .collect(),
            devices: account
                .devices
                .into_iter()
                .filter_map(|group| {
                    let key = group.dimensions.device_type?;
                    Some(AnalyticsBreakdown {
                        label: device_label(&key).to_string(),
                        key,
                        pageviews: group.count,
                    })
                })
                .collect(),
            countries: account
                .countries
                .into_iter()
                .filter_map(|group| {
                    let key = group.dimensions.country_name?;
                    Some(AnalyticsBreakdown {
                        label: key.clone(),
                        key,
                        pageviews: group.count,
                    })
                })
                .collect(),
            updated_at: Utc::now(),
            cached: false,
            message: None,
        })
    }

    async fn post_titles(&self) -> Result<HashMap<i64, String>> {
        let rows = sqlx::query("SELECT id, title FROM posts WHERE status != 2")
            .fetch_all(self.database.pool())
            .await?;
        Ok(rows
            .into_iter()
            .map(|row| (row.get::<i64, _>("id"), row.get::<String, _>("title")))
            .collect())
    }
}

fn normalize_days(days: u16) -> Result<u16> {
    match days {
        7 | 30 | 90 => Ok(days),
        _ => Err(AppError::Validation(
            "统计范围只支持 7、30 或 90 天。".to_string(),
        )),
    }
}

fn start_date(today: NaiveDate, days: u16) -> NaiveDate {
    today
        .checked_sub_days(Days::new(u64::from(days.saturating_sub(1))))
        .unwrap_or(today)
}

fn fill_trend(
    from: NaiveDate,
    to: NaiveDate,
    groups: Vec<AnalyticsGroup>,
) -> Vec<AnalyticsTrendPoint> {
    let by_date = groups
        .into_iter()
        .filter_map(|group| {
            group
                .dimensions
                .date
                .map(|date| (date, (group.count, group.sum.map_or(0, |sum| sum.visits))))
        })
        .collect::<HashMap<_, _>>();
    let mut date = from;
    let mut points = Vec::new();
    while date <= to {
        let (pageviews, visits) = by_date.get(&date).copied().unwrap_or((0, 0));
        points.push(AnalyticsTrendPoint {
            date,
            pageviews,
            visits,
        });
        let Some(next) = date.succ_opt() else {
            break;
        };
        date = next;
    }
    points
}

fn page_title(path: &str, titles: &HashMap<i64, String>) -> String {
    if let Some(id) = path
        .strip_prefix("/article/")
        .and_then(|value| value.trim_end_matches('/').parse::<i64>().ok())
    {
        return titles
            .get(&id)
            .cloned()
            .unwrap_or_else(|| format!("文章 #{id}"));
    }
    match path.trim_end_matches('/') {
        "" => "首页".to_string(),
        "/articles" => "文章".to_string(),
        "/projects" => "项目".to_string(),
        "/books" => "书架".to_string(),
        "/about" => "关于".to_string(),
        "/guestbook" => "留言".to_string(),
        "/changelog" => "更新日志".to_string(),
        _ => path.to_string(),
    }
}

fn device_label(device: &str) -> &'static str {
    match device.to_ascii_lowercase().as_str() {
        "desktop" => "桌面设备",
        "mobile" => "移动设备",
        "tablet" => "平板设备",
        _ => "其他设备",
    }
}

#[derive(Serialize)]
struct GraphQlRequest<'a> {
    query: &'a str,
    variables: GraphQlVariables<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GraphQlVariables<'a> {
    account_tag: &'a str,
    filter: AnalyticsFilter<'a>,
}

#[derive(Serialize)]
struct AnalyticsFilter<'a> {
    date_geq: NaiveDate,
    date_leq: NaiveDate,
    #[serde(rename = "siteTag")]
    site_tag: &'a str,
    bot: u8,
}

#[derive(Deserialize)]
struct GraphQlResponse {
    data: Option<GraphQlData>,
    errors: Option<Vec<GraphQlError>>,
}

#[derive(Deserialize)]
struct GraphQlError {
    message: String,
}

#[derive(Deserialize)]
struct GraphQlData {
    viewer: AnalyticsViewer,
}

#[derive(Deserialize)]
struct AnalyticsViewer {
    accounts: Vec<AccountAnalytics>,
}

#[derive(Deserialize)]
struct AccountAnalytics {
    #[serde(default)]
    trend: Vec<AnalyticsGroup>,
    #[serde(default)]
    paths: Vec<AnalyticsGroup>,
    #[serde(default)]
    referrers: Vec<AnalyticsGroup>,
    #[serde(default)]
    devices: Vec<AnalyticsGroup>,
    #[serde(default)]
    countries: Vec<AnalyticsGroup>,
}

#[derive(Deserialize)]
struct AnalyticsGroup {
    count: u64,
    dimensions: AnalyticsDimensions,
    sum: Option<AnalyticsSum>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnalyticsDimensions {
    date: Option<NaiveDate>,
    request_path: Option<String>,
    referer_host: Option<String>,
    device_type: Option<String>,
    country_name: Option<String>,
}

#[derive(Deserialize)]
struct AnalyticsSum {
    visits: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_supported_ranges() {
        assert_eq!(normalize_days(7).expect("7 days should work"), 7);
        assert_eq!(normalize_days(30).expect("30 days should work"), 30);
        assert!(normalize_days(31).is_err());
    }

    #[test]
    fn resolves_article_and_public_route_titles() {
        let titles = HashMap::from([(42, "一篇安静的文章".to_string())]);
        assert_eq!(page_title("/article/42", &titles), "一篇安静的文章");
        assert_eq!(page_title("/", &titles), "首页");
        assert_eq!(page_title("/unknown", &titles), "/unknown");
    }

    #[test]
    fn fills_days_without_events() {
        let from = NaiveDate::from_ymd_opt(2026, 8, 1).expect("valid date");
        let to = NaiveDate::from_ymd_opt(2026, 8, 2).expect("valid date");
        let points = fill_trend(from, to, Vec::new());
        assert_eq!(points.len(), 2);
        assert!(points.iter().all(|point| point.pageviews == 0));
    }
}
