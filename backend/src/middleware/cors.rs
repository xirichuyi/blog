use tower_http::cors::{Any, CorsLayer};
use crate::config::Config;

pub fn create_cors_layer(config: &Config) -> CorsLayer {
    if config.cors.origins.is_empty() || config.cors.origins.contains(&"*".to_string()) {
        CorsLayer::permissive()
    } else {
        CorsLayer::new()
            .allow_origin(
                config
                    .cors
                    .origins
                    .iter()
                    .map(|origin| origin.parse().unwrap())
                    .collect::<Vec<_>>(),
            )
            .allow_methods(Any)
            .allow_headers(Any)
    }
}
