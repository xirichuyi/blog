//! 量化机器人收益数据端点(只读展示)。
//!
//! 数据由 Sigma 上的定时任务用「只读专用 SSH 钥匙」从 Vector 上的 Barter 机器人
//! `trades.db`(只读)提取 `daily_balance` 后,写到 `data/quant.json`。本端点只是
//! 把那个 JSON 原样吐给前端——机器人代码/服务全程不参与、不被触碰。

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

/// 收益快照文件(相对后端 WorkingDirectory;systemd 里是 /var/www/blog/backend)。
const QUANT_FILE: &str = "data/quant.json";

/// GET /api/quant —— 返回量化收益快照;文件缺失时返回 data:null(前端显示空态)。
pub async fn get_quant() -> Response {
    let data = match tokio::fs::read(QUANT_FILE).await {
        Ok(bytes) => serde_json::from_slice::<serde_json::Value>(&bytes)
            .unwrap_or(serde_json::Value::Null),
        Err(_) => serde_json::Value::Null,
    };
    (
        StatusCode::OK,
        Json(serde_json::json!({ "code": 0, "message": "ok", "data": data })),
    )
        .into_response()
}
