//! 进程内共享的出站 HTTP 客户端，复用连接池并统一超时。

use std::sync::LazyLock;
use std::time::Duration;

pub static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(20))
        .build()
        .expect("HTTP client configuration is valid")
});
