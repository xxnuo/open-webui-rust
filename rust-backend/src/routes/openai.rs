use actix_web::{web, HttpResponse};
use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{
    error::AppError,
    middleware::{AuthMiddleware, AuthUser},
    AppState,
};

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIConfigResponse {
    #[serde(rename = "ENABLE_OPENAI_API")]
    enable_openai_api: bool,
    #[serde(rename = "OPENAI_API_BASE_URLS")]
    openai_api_base_urls: Vec<String>,
    #[serde(rename = "OPENAI_API_KEYS")]
    openai_api_keys: Vec<String>,
    #[serde(rename = "OPENAI_API_CONFIGS")]
    openai_api_configs: serde_json::Value,
}

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
            .wrap(AuthMiddleware)
            .route("/config", web::get().to(get_config))
            .route("/config/update", web::post().to(update_config))
            .route("/models", web::get().to(get_models))
            .route("/models/{url_idx}", web::get().to(get_models_by_idx))
            .route("/verify", web::post().to(verify_connection))
            .route("/audio/speech", web::post().to(audio_speech))
            .route("/embeddings", web::post().to(embeddings_endpoint))
            .route("/chat/completions", web::post().to(chat_completions))
            .route("/{path:.*}", web::to(proxy_request)),
    );
}

async fn get_config(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> Result<HttpResponse, AppError> {
    // Only admins can access this
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let config = state.config.read().unwrap();

    Ok(HttpResponse::Ok().json(OpenAIConfigResponse {
        enable_openai_api: config.enable_openai_api,
        openai_api_base_urls: config.openai_api_base_urls.clone(),
        openai_api_keys: config.openai_api_keys.clone(),
        openai_api_configs: config.openai_api_configs.clone(),
    }))
}

async fn update_config(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form_data: web::Json<OpenAIConfigResponse>,
) -> Result<HttpResponse, AppError> {
    // Only admins can update this
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    // Update in-memory config
    {
        let mut config = state.config.write().unwrap();

        config.enable_openai_api = form_data.enable_openai_api;
        config.openai_api_base_urls = form_data.openai_api_base_urls.clone();
        config.openai_api_keys = form_data.openai_api_keys.clone();

        // Ensure keys and URLs have the same length
        let urls_len = config.openai_api_base_urls.len();
        let keys_len = config.openai_api_keys.len();

        if keys_len != urls_len {
            if keys_len > urls_len {
                config.openai_api_keys.truncate(urls_len);
            } else {
                // Pad with empty strings
                let missing = urls_len - keys_len;
                config.openai_api_keys.extend(vec!["".to_string(); missing]);
            }
        }

        config.openai_api_configs = form_data.openai_api_configs.clone();
    }

    // Persist to database (best-effort, like Python)
    let config = state.config.read().unwrap();
    let openai_json = serde_json::json!({
        "enable": config.enable_openai_api,
        "api_base_urls": config.openai_api_base_urls,
        "api_keys": config.openai_api_keys,
        "api_configs": config.openai_api_configs
    });

    let _ = crate::services::ConfigService::update_section(&state.db, "openai", openai_json).await;

    Ok(HttpResponse::Ok().json(OpenAIConfigResponse {
        enable_openai_api: config.enable_openai_api,
        openai_api_base_urls: config.openai_api_base_urls.clone(),
        openai_api_keys: config.openai_api_keys.clone(),
        openai_api_configs: config.openai_api_configs.clone(),
    }))
}

// Get all OpenAI models from all configured endpoints
async fn get_models(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();

    if !config.enable_openai_api {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "data": []
        })));
    }

    let mut all_models = Vec::new();
    let client = reqwest::Client::new();

    // Fetch models from each configured OpenAI endpoint
    for (idx, url) in config.openai_api_base_urls.iter().enumerate() {
        if let Some(key) = config.openai_api_keys.get(idx) {
            // Get API config for this endpoint
            let api_config = config
                .openai_api_configs
                .get(idx.to_string())
                .or_else(|| config.openai_api_configs.get(url))
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();

            // Check if this endpoint is enabled
            let enabled = api_config
                .get("enable")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);

            if !enabled {
                continue;
            }

            // Check if it's Azure
            let is_azure = api_config
                .get("azure")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            if is_azure {
                // For Azure, use model_ids from config
                if let Some(model_ids) = api_config.get("model_ids").and_then(|v| v.as_array()) {
                    for model_id in model_ids {
                        if let Some(id_str) = model_id.as_str() {
                            all_models.push(serde_json::json!({
                                "id": id_str,
                                "name": id_str,
                                "object": "model",
                                "owned_by": "azure",
                                "urlIdx": idx,
                                "connection_type": "external"
                            }));
                        }
                    }
                }
            } else {
                // Fetch models from the endpoint
                match client
                    .get(format!("{}/models", url))
                    .header("Authorization", format!("Bearer {}", key))
                    .header("Content-Type", "application/json")
                    .send()
                    .await
                {
                    Ok(response) if response.status().is_success() => {
                        if let Ok(models_response) = response.json::<serde_json::Value>().await {
                            if let Some(data) =
                                models_response.get("data").and_then(|v| v.as_array())
                            {
                                for model in data {
                                    if let Some(model_id) = model.get("id").and_then(|v| v.as_str())
                                    {
                                        // Filter out certain OpenAI models
                                        if url.contains("api.openai.com") {
                                            let should_skip = [
                                                "babbage",
                                                "dall-e",
                                                "davinci",
                                                "embedding",
                                                "tts",
                                                "whisper",
                                            ]
                                            .iter()
                                            .any(|name| model_id.contains(name));

                                            if should_skip {
                                                continue;
                                            }
                                        }

                                        all_models.push(serde_json::json!({
                                            "id": model_id,
                                            "name": model.get("name").and_then(|v| v.as_str()).unwrap_or(model_id),
                                            "object": "model",
                                            "owned_by": model.get("owned_by").and_then(|v| v.as_str()).unwrap_or("openai"),
                                            "openai": model,
                                            "connection_type": "external",
                                            "urlIdx": idx
                                        }));
                                    }
                                }
                            }
                        }
                    }
                    Ok(response) => {
                        eprintln!(
                            "Failed to fetch models from {}: status {}",
                            url,
                            response.status()
                        );
                    }
                    Err(e) => {
                        eprintln!("Error fetching models from {}: {}", url, e);
                    }
                }
            }
        }
    }

    // Cache the models in app state (like Python's OPENAI_MODELS)
    {
        let mut cache = state.models_cache.write().unwrap();
        cache.clear();
        for model in &all_models {
            if let Some(model_id) = model.get("id").and_then(|v| v.as_str()) {
                cache.insert(model_id.to_string(), model.clone());
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": all_models
    })))
}

// Get models from a specific OpenAI endpoint by index
async fn get_models_by_idx(
    state: web::Data<AppState>,
    url_idx: web::Path<usize>,
    _auth_user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let idx = url_idx.into_inner();
    let config = state.config.read().unwrap();

    if idx >= config.openai_api_base_urls.len() {
        return Err(AppError::NotFound("OpenAI endpoint not found".to_string()));
    }

    let url = &config.openai_api_base_urls[idx];
    let key = config
        .openai_api_keys
        .get(idx)
        .map(|s| s.as_str())
        .unwrap_or("");

    // Get API config for this endpoint
    let api_config = config
        .openai_api_configs
        .get(idx.to_string())
        .or_else(|| config.openai_api_configs.get(url))
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    // Check if it's Azure
    let is_azure = api_config
        .get("azure")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if is_azure {
        // For Azure, return model_ids from config
        let model_ids = api_config
            .get("model_ids")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "data": model_ids,
            "object": "list"
        })));
    }

    // Fetch models from the endpoint
    let client = reqwest::Client::new();

    match client
        .get(format!("{}/models", url))
        .header("Authorization", format!("Bearer {}", key))
        .header("Content-Type", "application/json")
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            if let Ok(mut models_response) = response.json::<serde_json::Value>().await {
                // Filter OpenAI API models
                if url.contains("api.openai.com") {
                    if let Some(data) = models_response
                        .get_mut("data")
                        .and_then(|v| v.as_array_mut())
                    {
                        data.retain(|model| {
                            if let Some(model_id) = model.get("id").and_then(|v| v.as_str()) {
                                ![
                                    "babbage",
                                    "dall-e",
                                    "davinci",
                                    "embedding",
                                    "tts",
                                    "whisper",
                                ]
                                .iter()
                                .any(|name| model_id.contains(name))
                            } else {
                                false
                            }
                        });
                    }
                }

                // Check if it's a pipeline
                if models_response.get("pipelines").is_some() {
                    models_response["pipelines"] = serde_json::json!(true);
                }

                Ok(HttpResponse::Ok().json(models_response))
            } else {
                Err(AppError::InternalServerError(
                    "Failed to parse models response".to_string(),
                ))
            }
        }
        Ok(response) => {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            eprintln!(
                "Failed to fetch models from {}: {} - {}",
                url, status, error_text
            );

            // Return empty list instead of error
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "data": [],
                "object": "list",
                "error": format!("Failed to fetch models: {}", status)
            })))
        }
        Err(e) => {
            eprintln!("Error fetching models from {}: {}", url, e);

            // Return empty list instead of error
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "data": [],
                "object": "list",
                "error": format!("Error: {}", e)
            })))
        }
    }
}

/// Public helper to get first enabled OpenAI endpoint for tasks like title generation
pub fn get_openai_endpoint(
    config: &crate::config::Config,
    _model_id: &str,
) -> Result<(String, String, serde_json::Value), AppError> {
    // Find first enabled endpoint
    for (idx, endpoint_url) in config.openai_api_base_urls.iter().enumerate() {
        let api_cfg = config
            .openai_api_configs
            .get(idx.to_string())
            .or_else(|| config.openai_api_configs.get(endpoint_url))
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or_default();

        let enabled = api_cfg
            .get("enable")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        if enabled {
            let endpoint_key = config
                .openai_api_keys
                .get(idx)
                .map(|s| s.to_string())
                .unwrap_or_default();
            return Ok((
                endpoint_url.clone(),
                endpoint_key,
                serde_json::json!(api_cfg),
            ));
        }
    }

    Err(AppError::NotFound(
        "No enabled OpenAI endpoint configured".to_string(),
    ))
}

/// Helper function to get endpoint from cache or config (non-direct routing)
fn get_endpoint_from_cache_or_config(
    state: &web::Data<AppState>,
    config: &crate::config::Config,
    model_id: &str,
    model_item: &serde_json::Value,
    payload_obj: &serde_json::Value,
) -> Result<(String, String, serde_json::Value), AppError> {
    // Try to get urlIdx from model_item, payload, or cache
    let url_idx = model_item
        .get("urlIdx")
        .and_then(|v| v.as_u64())
        .or_else(|| payload_obj.get("urlIdx").and_then(|v| v.as_u64()))
        .or_else(|| {
            // Try to find model in cache and get its urlIdx
            let cache = state.models_cache.read().unwrap();
            cache
                .get(model_id)
                .and_then(|model| model.get("urlIdx"))
                .and_then(|v| v.as_u64())
        })
        .map(|i| i as usize);

    let selected_idx = if let Some(idx) = url_idx {
        // Use the provided urlIdx
        if idx >= config.openai_api_base_urls.len() {
            return Err(AppError::NotFound(format!(
                "OpenAI endpoint index {} not found",
                idx
            )));
        }
        idx
    } else {
        // No urlIdx found, try to find the first enabled endpoint
        let mut found_idx = None;
        for (idx, endpoint_url) in config.openai_api_base_urls.iter().enumerate() {
            let api_cfg = config
                .openai_api_configs
                .get(idx.to_string())
                .or_else(|| config.openai_api_configs.get(endpoint_url))
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();

            let enabled = api_cfg
                .get("enable")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);

            if enabled {
                found_idx = Some(idx);
                break;
            }
        }

        found_idx.ok_or_else(|| {
            AppError::NotFound("No enabled OpenAI endpoint configured".to_string())
        })?
    };

    let endpoint_url = config.openai_api_base_urls[selected_idx].clone();
    let endpoint_key = config
        .openai_api_keys
        .get(selected_idx)
        .map(|s| s.to_string())
        .unwrap_or_default();

    let api_cfg = config
        .openai_api_configs
        .get(selected_idx.to_string())
        .or_else(|| config.openai_api_configs.get(&endpoint_url))
        .cloned()
        .unwrap_or(serde_json::json!({}));

    tracing::info!(
        "Using endpoint {} (idx: {}) for model {}",
        endpoint_url,
        selected_idx,
        model_id
    );
    Ok((endpoint_url, endpoint_key, api_cfg))
}

// Verify connection endpoint - test OpenAI API connection
#[derive(Debug, Deserialize)]
struct VerifyConnectionRequest {
    url: String,
    key: String,
    #[serde(default)]
    config: serde_json::Value,
}

async fn verify_connection(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<VerifyConnectionRequest>,
) -> Result<HttpResponse, AppError> {
    let url = &payload.url;
    let key = &payload.key;
    let api_config = if payload.config.is_null() {
        serde_json::json!({})
    } else {
        payload.config.clone()
    };

    let client = reqwest::Client::new();

    // Check if it's Azure
    let is_azure = api_config
        .get("azure")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if is_azure {
        let api_version = api_config
            .get("api_version")
            .and_then(|v| v.as_str())
            .unwrap_or("2023-03-15-preview");

        let auth_type = api_config
            .get("auth_type")
            .and_then(|v| v.as_str())
            .unwrap_or("bearer");

        let mut request_builder =
            client.get(format!("{}/openai/models?api-version={}", url, api_version));

        // Only set api-key header if not using Azure Entra ID
        if auth_type != "azure_ad" && auth_type != "microsoft_entra_id" {
            request_builder = request_builder.header("api-key", key);
        }

        match request_builder.send().await {
            Ok(response) => {
                let status_code = response.status().as_u16();
                if let Ok(json_body) = response.json::<serde_json::Value>().await {
                    Ok(HttpResponse::build(
                        actix_web::http::StatusCode::from_u16(status_code)
                            .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR),
                    )
                    .json(json_body))
                } else {
                    Ok(HttpResponse::build(
                        actix_web::http::StatusCode::from_u16(status_code)
                            .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR),
                    )
                    .finish())
                }
            }
            Err(e) => Err(AppError::InternalServerError(format!(
                "Connection error: {}",
                e
            ))),
        }
    } else {
        // Regular OpenAI endpoint
        match client
            .get(format!("{}/models", url))
            .header("Authorization", format!("Bearer {}", key))
            .send()
            .await
        {
            Ok(response) => {
                let status_code = response.status().as_u16();
                if let Ok(json_body) = response.json::<serde_json::Value>().await {
                    Ok(HttpResponse::build(
                        actix_web::http::StatusCode::from_u16(status_code)
                            .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR),
                    )
                    .json(json_body))
                } else {
                    Ok(HttpResponse::build(
                        actix_web::http::StatusCode::from_u16(status_code)
                            .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR),
                    )
                    .finish())
                }
            }
            Err(e) => Err(AppError::InternalServerError(format!(
                "Connection error: {}",
                e
            ))),
        }
    }
}

// Audio speech endpoint - TTS via OpenAI
async fn audio_speech(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    req: actix_web::HttpRequest,
    body: web::Bytes,
) -> Result<HttpResponse, AppError> {
    // Try to find OpenAI endpoint
    let config = state.config.read().unwrap();

    let openai_idx = config
        .openai_api_base_urls
        .iter()
        .position(|url| url.contains("api.openai.com"));

    let idx = openai_idx.unwrap_or(0);

    if idx >= config.openai_api_base_urls.len() {
        return Err(AppError::NotFound(
            "OpenAI endpoint not configured".to_string(),
        ));
    }

    let url = config.openai_api_base_urls[idx].clone();
    let key = config
        .openai_api_keys
        .get(idx)
        .map(|s| s.to_string())
        .unwrap_or_default();

    let api_config = config
        .openai_api_configs
        .get(idx.to_string())
        .or_else(|| config.openai_api_configs.get(&url))
        .cloned()
        .unwrap_or(serde_json::json!({}));

    drop(config); // Release lock

    // Calculate hash for caching
    let hash = format!("{:x}", md5::compute(&body));

    // Check cache directory
    let cache_dir = std::path::Path::new("./data/cache/audio/speech");
    if let Err(e) = std::fs::create_dir_all(cache_dir) {
        tracing::warn!("Failed to create cache directory: {}", e);
    }

    let file_path = cache_dir.join(format!("{}.mp3", hash));

    // Check if cached
    if file_path.exists() {
        return Ok(HttpResponse::Ok().content_type("audio/mpeg").body(
            std::fs::read(&file_path).map_err(|e| {
                AppError::InternalServerError(format!("Failed to read cached file: {}", e))
            })?,
        ));
    }

    // Make request to OpenAI
    let client = reqwest::Client::new();
    let mut request_builder = client
        .post(format!("{}/audio/speech", url))
        .header("Content-Type", "application/json")
        .body(body.to_vec());

    let auth_type = api_config
        .get("auth_type")
        .and_then(|v| v.as_str())
        .unwrap_or("bearer");

    if auth_type != "none" && !key.is_empty() {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", key));
    }

    match request_builder.send().await {
        Ok(response) if response.status().is_success() => {
            let audio_bytes = response.bytes().await.map_err(|e| {
                AppError::InternalServerError(format!("Failed to read audio response: {}", e))
            })?;

            // Cache the result
            if let Err(e) = std::fs::write(&file_path, &audio_bytes) {
                tracing::warn!("Failed to cache audio file: {}", e);
            }

            Ok(HttpResponse::Ok()
                .content_type("audio/mpeg")
                .body(audio_bytes.to_vec()))
        }
        Ok(response) => {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::InternalServerError(format!(
                "OpenAI API error: {} - {}",
                status, error_text
            )))
        }
        Err(e) => Err(AppError::InternalServerError(format!(
            "Request error: {}",
            e
        ))),
    }
}

// Embeddings endpoint
async fn embeddings_endpoint(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    payload: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();

    if !config.enable_openai_api {
        return Err(AppError::NotImplemented(
            "OpenAI API is not enabled".to_string(),
        ));
    }

    let model_id = payload.get("model").and_then(|v| v.as_str()).unwrap_or("");

    // Find the endpoint for this model
    let mut idx = 0;

    // Try to find in cache first
    {
        let cache = state.models_cache.read().unwrap();
        if let Some(model) = cache.get(model_id) {
            if let Some(url_idx) = model.get("urlIdx").and_then(|v| v.as_u64()) {
                idx = url_idx as usize;
            }
        }
    }

    if idx >= config.openai_api_base_urls.len() {
        idx = 0; // Fallback to first endpoint
    }

    let url = config.openai_api_base_urls[idx].clone();
    let key = config
        .openai_api_keys
        .get(idx)
        .map(|s| s.to_string())
        .unwrap_or_default();

    let api_config = config
        .openai_api_configs
        .get(idx.to_string())
        .or_else(|| config.openai_api_configs.get(&url))
        .cloned()
        .unwrap_or(serde_json::json!({}));

    drop(config);

    // Make request
    let client = reqwest::Client::new();
    let mut request_builder = client
        .post(format!("{}/embeddings", url))
        .header("Content-Type", "application/json")
        .json(&payload.into_inner());

    let auth_type = api_config
        .get("auth_type")
        .and_then(|v| v.as_str())
        .unwrap_or("bearer");

    if auth_type != "none" && !key.is_empty() {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", key));
    }

    match request_builder.send().await {
        Ok(response) if response.status().is_success() => {
            let json_response = response.json::<serde_json::Value>().await.map_err(|e| {
                AppError::InternalServerError(format!("Failed to parse response: {}", e))
            })?;
            Ok(HttpResponse::Ok().json(json_response))
        }
        Ok(response) => {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::InternalServerError(format!(
                "OpenAI API error: {} - {}",
                status, error_text
            )))
        }
        Err(e) => Err(AppError::InternalServerError(format!(
            "Request error: {}",
            e
        ))),
    }
}

// Proxy endpoint - catch-all for other OpenAI API paths
async fn proxy_request(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    req: actix_web::HttpRequest,
    path: web::Path<String>,
    body: web::Bytes,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();

    let idx = 0; // Default to first endpoint

    if idx >= config.openai_api_base_urls.len() {
        return Err(AppError::NotFound(
            "OpenAI endpoint not configured".to_string(),
        ));
    }

    let url = config.openai_api_base_urls[idx].clone();
    let key = config
        .openai_api_keys
        .get(idx)
        .map(|s| s.to_string())
        .unwrap_or_default();

    let api_config = config
        .openai_api_configs
        .get(idx.to_string())
        .or_else(|| config.openai_api_configs.get(&url))
        .cloned()
        .unwrap_or(serde_json::json!({}));

    drop(config);

    let request_path = path.into_inner();
    let method = req.method().clone();

    // Check if Azure
    let is_azure = api_config
        .get("azure")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let client = reqwest::Client::new();
    let request_url = if is_azure {
        let api_version = api_config
            .get("api_version")
            .and_then(|v| v.as_str())
            .unwrap_or("2023-03-15-preview");

        // Parse JSON body to get model for Azure
        let mut body_json = serde_json::from_slice::<serde_json::Value>(&body).ok();
        let mut modified_url = url.clone();
        let mut modified_body = body.to_vec();

        if let Some(ref mut payload) = body_json {
            if let Some(model) = payload.get("model").and_then(|m| m.as_str()) {
                modified_url = format!("{}/openai/deployments/{}", url, model);

                // Filter Azure-allowed parameters
                // This is simplified; Python has more complex filtering
                modified_body = serde_json::to_vec(&payload).unwrap_or(body.to_vec());
            }
        }

        format!(
            "{}/{}?api-version={}",
            modified_url, request_path, api_version
        )
    } else {
        format!("{}/{}", url, request_path)
    };

    let mut request_builder = match method.as_str() {
        "GET" => client.get(&request_url),
        "POST" => client.post(&request_url),
        "PUT" => client.put(&request_url),
        "DELETE" => client.delete(&request_url),
        "PATCH" => client.patch(&request_url),
        _ => client.get(&request_url),
    };

    request_builder = request_builder
        .header("Content-Type", "application/json")
        .body(body.to_vec());

    let auth_type = api_config
        .get("auth_type")
        .and_then(|v| v.as_str())
        .unwrap_or("bearer");

    if is_azure {
        if auth_type != "azure_ad" && auth_type != "microsoft_entra_id" {
            request_builder = request_builder.header("api-key", key);
        }
    } else if auth_type != "none" && !key.is_empty() {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", key));
    }

    match request_builder.send().await {
        Ok(response) => {
            let status_code = response.status().as_u16();
            let actix_status = actix_web::http::StatusCode::from_u16(status_code)
                .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);
            let content_type = response
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("application/json")
                .to_string();

            // Check if streaming
            if content_type.contains("text/event-stream") {
                use bytes::Bytes;
                let stream = response.bytes_stream().map(move |result| match result {
                    Ok(bytes) => Ok::<Bytes, actix_web::Error>(bytes),
                    Err(e) => Err(actix_web::error::ErrorInternalServerError(e)),
                });

                Ok(HttpResponse::build(actix_status)
                    .content_type(content_type)
                    .streaming(stream))
            } else {
                // Regular response
                if let Ok(json_body) = response.json::<serde_json::Value>().await {
                    Ok(HttpResponse::build(actix_status).json(json_body))
                } else {
                    Ok(HttpResponse::build(actix_status).finish())
                }
            }
        }
        Err(e) => Err(AppError::InternalServerError(format!(
            "Proxy request error: {}",
            e
        ))),
    }
}

// Chat completions endpoint - proxy to the appropriate OpenAI endpoint
async fn chat_completions(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    payload: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    handle_chat_completions(state, auth_user, payload).await
}

/// Process streaming response and emit events via Socket.IO
/// This mimics Python's middleware.py process_chat_response streaming logic
async fn process_streaming_via_socketio(
    response: reqwest::Response,
    state: &web::Data<AppState>,
    user_id: &str,
    model_id: String,
    messages: Vec<serde_json::Value>,
    chat_id: Option<String>,
    message_id: Option<String>,
    session_id: Option<String>,
    should_generate_title: bool,
    model_item: serde_json::Value,
    endpoint_url: String,
    endpoint_key: String,
    tool_ids: Vec<String>,
    tool_specs: Vec<serde_json::Value>,
) -> Result<(), Box<dyn std::error::Error>> {
    use serde_json::Value;

    // Get socket state
    let socket_state = match &state.socket_state {
        Some(state) => state.clone(),
        _ => {
            tracing::warn!("Socket state not available, cannot emit streaming events");
            return Ok(());
        }
    };

    // Create event emitter
    let event_emitter = crate::socket::get_event_emitter(
        socket_state,
        user_id.to_string(),
        chat_id.clone(),
        message_id.clone(),
        session_id,
    );

    // Stream the response with batching like Python backend
    let mut stream = response.bytes_stream();
    let mut content = String::new();

    // Delta batching to prevent flooding frontend (matches Python's delta_chunk_size)
    let delta_chunk_size = 1; // Default from Python CHAT_RESPONSE_STREAM_DELTA_CHUNK_SIZE
    let mut delta_count = 0;
    let mut last_delta_data: Option<serde_json::Value> = None;

    // Tool call tracking
    use std::collections::HashMap;
    let mut collected_tool_calls: HashMap<usize, serde_json::Value> = HashMap::new();
    let mut has_tool_calls = false;

    tracing::info!("🔴 Socket.IO STREAMING STARTED for user {}", user_id);

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                // Convert bytes to text
                if let Ok(text) = std::str::from_utf8(&chunk) {
                    tracing::debug!("⚡ Received chunk: {} bytes", text.len());

                    // Parse SSE format lines
                    for line in text.lines() {
                        let line = line.trim();

                        // Skip empty lines
                        if line.is_empty() {
                            continue;
                        }

                        // Handle SSE data lines
                        if line.starts_with("data: ") {
                            let data_str = &line[6..]; // Remove "data: " prefix

                            // Skip [DONE] marker
                            if data_str == "[DONE]" {
                                tracing::info!("✅ Streaming completed");

                                // Flush any pending delta
                                if let Some(pending_data) = last_delta_data.take() {
                                    let completion_event = json!({
                                        "type": "chat:completion",
                                        "data": pending_data
                                    });
                                    event_emitter(completion_event).await;
                                }
                                break;
                            }

                            // Parse JSON data
                            if let Ok(mut data) =
                                serde_json::from_str::<serde_json::Value>(data_str)
                            {
                                // Extract delta content
                                if let Some(choices) =
                                    data.get("choices").and_then(|c| c.as_array())
                                {
                                    if let Some(first_choice) = choices.first() {
                                        if let Some(delta) = first_choice.get("delta") {
                                            // Check for content delta
                                            if let Some(delta_content) =
                                                delta.get("content").and_then(|c| c.as_str())
                                            {
                                                content.push_str(delta_content);

                                                // Batch deltas like Python backend (delta_count logic)
                                                delta_count += 1;
                                                last_delta_data = Some(data.clone());

                                                // Only emit when batch size reached
                                                if delta_count >= delta_chunk_size {
                                                    let completion_event = json!({
                                                        "type": "chat:completion",
                                                        "data": data
                                                    });
                                                    event_emitter(completion_event).await;
                                                    delta_count = 0;
                                                    last_delta_data = None;
                                                }
                                            }

                                            // Check for tool_calls delta
                                            if let Some(tool_calls) = delta.get("tool_calls") {
                                                tracing::info!(
                                                    "🔧 Tool calls detected in stream: {:?}",
                                                    tool_calls
                                                );
                                                has_tool_calls = true;

                                                // Accumulate tool_calls by index
                                                if let Some(tool_calls_array) =
                                                    tool_calls.as_array()
                                                {
                                                    for tool_call in tool_calls_array {
                                                        if let Some(index) = tool_call
                                                            .get("index")
                                                            .and_then(|i| i.as_u64())
                                                        {
                                                            let idx = index as usize;
                                                            let entry = collected_tool_calls
                                                                .entry(idx)
                                                                .or_insert_with(|| {
                                                                    json!({
                                                                        "id": "",
                                                                        "type": "function",
                                                                        "function": {
                                                                            "name": "",
                                                                            "arguments": ""
                                                                        }
                                                                    })
                                                                });

                                                            // Merge fields
                                                            if let Some(id) = tool_call.get("id") {
                                                                entry["id"] = id.clone();
                                                            }
                                                            if let Some(tc_type) =
                                                                tool_call.get("type")
                                                            {
                                                                entry["type"] = tc_type.clone();
                                                            }
                                                            if let Some(function) =
                                                                tool_call.get("function")
                                                            {
                                                                if let Some(name) =
                                                                    function.get("name")
                                                                {
                                                                    entry["function"]["name"] =
                                                                        name.clone();
                                                                }
                                                                if let Some(args) = function
                                                                    .get("arguments")
                                                                    .and_then(|a| a.as_str())
                                                                {
                                                                    let current_args = entry
                                                                        ["function"]["arguments"]
                                                                        .as_str()
                                                                        .unwrap_or("");
                                                                    entry["function"]
                                                                        ["arguments"] =
                                                                        json!(format!(
                                                                            "{}{}",
                                                                            current_args, args
                                                                        ));
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                // Emit tool_calls immediately (don't batch)
                                                let completion_event = json!({
                                                    "type": "chat:completion",
                                                    "data": data
                                                });
                                                event_emitter(completion_event).await;

                                                // Clear any pending deltas since we're switching to tool mode
                                                last_delta_data = None;
                                                delta_count = 0;
                                            }
                                        }

                                        // Check for finish_reason
                                        if let Some(finish_reason) =
                                            first_choice.get("finish_reason")
                                        {
                                            if !finish_reason.is_null() {
                                                tracing::info!(
                                                    "✅ Stream finished with reason: {:?}",
                                                    finish_reason
                                                );

                                                // Flush any pending delta first
                                                if let Some(pending_data) = last_delta_data.take() {
                                                    let completion_event = json!({
                                                        "type": "chat:completion",
                                                        "data": pending_data
                                                    });
                                                    event_emitter(completion_event).await;
                                                    delta_count = 0;
                                                }

                                                // Mark as done and send final data with finish_reason
                                                data["done"] = json!(true);
                                                let completion_event = json!({
                                                    "type": "chat:completion",
                                                    "data": data
                                                });
                                                event_emitter(completion_event).await;

                                                // Save to database with done flag and model info
                                                if let (Some(cid), Some(mid)) =
                                                    (chat_id.as_ref(), message_id.as_ref())
                                                {
                                                    let _ = upsert_chat_message(
                                                        &state.db,
                                                        cid,
                                                        mid,
                                                        json!({
                                                            "role": "assistant",
                                                            "content": content,
                                                            "done": true,
                                                            "model": model_id.clone(),
                                                        }),
                                                    )
                                                    .await;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                tracing::error!("❌ Stream error: {}", e);

                // Emit error event
                let event_data = json!({
                    "type": "chat:completion",
                    "data": {
                        "error": {
                            "content": format!("Stream error: {}", e)
                        }
                    }
                });
                event_emitter(event_data).await;

                return Err(e.into());
            }
        }
    }

    // Execute tools if tool_calls were detected
    if has_tool_calls && !collected_tool_calls.is_empty() {
        tracing::info!(
            "🔧 Executing {} tool(s) after stream completion",
            collected_tool_calls.len()
        );

        // Convert collected_tool_calls HashMap to Vec, sorted by index
        let mut tool_calls_vec: Vec<_> = collected_tool_calls.into_iter().collect();
        tool_calls_vec.sort_by_key(|(index, _)| *index);
        let final_tool_calls: Vec<Value> = tool_calls_vec.into_iter().map(|(_, tc)| tc).collect();

        tracing::debug!("Final tool_calls to execute: {:?}", final_tool_calls);

        // Execute each tool and collect results
        let mut tool_results: Vec<Value> = Vec::new();

        for tool_call in &final_tool_calls {
            let tool_call_id = tool_call.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let tool_name = tool_call
                .get("function")
                .and_then(|f| f.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or("");
            let tool_args_str = tool_call
                .get("function")
                .and_then(|f| f.get("arguments"))
                .and_then(|a| a.as_str())
                .unwrap_or("{}");

            tracing::info!(
                "🔧 Executing tool: {} with args: {}",
                tool_name,
                tool_args_str
            );

            // Parse arguments
            let tool_args: HashMap<String, Value> = match serde_json::from_str(tool_args_str) {
                Ok(args) => args,
                Err(e) => {
                    tracing::error!("Failed to parse tool arguments: {}", e);
                    tool_results.push(json!({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "content": format!("Error: Failed to parse arguments - {}", e)
                    }));
                    continue;
                }
            };

            // Find the matching tool definition from tool_specs
            let mut tool_result_content = format!("Error: Tool '{}' not found", tool_name);

            // Execute the tool by finding it in tool_ids
            for tool_id in &tool_ids {
                // Load tool from database to verify it contains this tool_name
                let tool_service = crate::services::tool::ToolService::new(&state.db);
                if let Ok(Some(tool)) = tool_service.get_tool_by_id(tool_id).await {
                    // Parse tool content as ToolDefinition
                    if let Ok(tool_def) = serde_json::from_str::<
                        crate::models::tool_runtime::ToolDefinition,
                    >(&tool.content)
                    {
                        // Find matching tool spec by name
                        if tool_def.tools.iter().any(|t| t.name == tool_name) {
                            tracing::info!(
                                "✅ Found tool spec for: {} in tool_id: {}",
                                tool_name,
                                tool_id
                            );

                            // Execute the tool using ToolRuntimeService
                            let runtime_service =
                                crate::services::tool_runtime::ToolRuntimeService::new();

                            // Build execution context with user and environment
                            let mut environment = std::collections::HashMap::new();

                            // Add system environment variables that tools might need
                            if let Ok(val) = std::env::var("OPENWEATHER_API_KEY") {
                                environment.insert("OPENWEATHER_API_KEY".to_string(), val);
                            }
                            // Add other common API keys if needed
                            for key in &["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"] {
                                if let Ok(val) = std::env::var(key) {
                                    environment.insert(key.to_string(), val);
                                }
                            }

                            let execution_context = crate::models::tool_runtime::ExecutionContext {
                                user: Some(crate::models::tool_runtime::UserContext {
                                    id: user_id.to_string(),
                                    name: "User".to_string(), // TODO: Get actual user name from auth
                                    email: "user@example.com".to_string(), // TODO: Get actual email from auth
                                    role: Some("user".to_string()), // TODO: Get actual role from auth
                                }),
                                environment,
                                session: std::collections::HashMap::new(),
                            };

                            let exec_request = crate::models::tool_runtime::ToolExecutionRequest {
                                tool_id: tool_id.clone(),
                                tool_name: tool_name.to_string(),
                                parameters: tool_args.clone(),
                                context: execution_context,
                            };

                            match runtime_service.execute_tool(&state.db, exec_request).await {
                                Ok(exec_response) => {
                                    tool_result_content =
                                        serde_json::to_string(&exec_response.result)
                                            .unwrap_or_else(|_| {
                                                "Error serializing result".to_string()
                                            });
                                    tracing::info!(
                                        "✅ Tool executed successfully: {}",
                                        tool_result_content
                                    );
                                }
                                Err(e) => {
                                    tool_result_content = format!("Error executing tool: {}", e);
                                    tracing::error!("❌ Tool execution error: {}", e);
                                }
                            }
                            break;
                        }
                    }
                }
            }

            tool_results.push(json!({
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": tool_result_content
            }));
        }

        // Emit tool results to frontend (informational)
        tracing::info!(
            "📤 Emitting {} tool result(s) to frontend",
            tool_results.len()
        );
        for result in &tool_results {
            let tool_result_event = json!({
                "type": "chat:completion",
                "data": {
                    "content": format!("\n\n**Tool Result:**\n{}", result.get("content").and_then(|c| c.as_str()).unwrap_or(""))
                }
            });
            event_emitter(tool_result_event).await;
        }

        // Multi-turn: Make a new chat completion request with tool results
        tracing::info!("🔄 Starting multi-turn: sending tool results back to LLM for natural language response");

        // Build new messages array: original messages + assistant message with tool_calls + tool results
        let mut new_messages = messages.clone();

        // Add assistant message with tool_calls
        new_messages.push(json!({
            "role": "assistant",
            "content": "", // Empty content when using tool_calls
            "tool_calls": final_tool_calls
        }));

        // Add tool result messages
        for result in &tool_results {
            new_messages.push(result.clone());
        }

        tracing::debug!("🔄 New messages for multi-turn: {:?}", new_messages);

        // Make a new chat completion request
        let client = reqwest::Client::new();
        let mut request_builder = client
            .post(format!("{}/chat/completions", endpoint_url))
            .header("Content-Type", "application/json");

        if !endpoint_key.is_empty() {
            request_builder =
                request_builder.header("Authorization", format!("Bearer {}", endpoint_key));
        }

        // Build payload for the second request
        let second_request_payload = json!({
            "model": model_id,
            "messages": new_messages,
            "stream": true,
            "tools": tool_specs.iter().map(|spec| json!({
                "type": "function",
                "function": spec
            })).collect::<Vec<_>>(),
            "tool_choice": "auto"
        });

        tracing::info!("🔄 Sending second request to LLM with tool results");

        match request_builder.json(&second_request_payload).send().await {
            Ok(second_response) => {
                if !second_response.status().is_success() {
                    tracing::error!(
                        "❌ Second request failed with status: {}",
                        second_response.status()
                    );
                    let error_event = json!({
                        "type": "chat:completion",
                        "data": {
                            "content": format!("\n\n**Error:** Failed to get LLM response: {}", second_response.status())
                        }
                    });
                    event_emitter(error_event).await;
                } else {
                    tracing::info!("✅ Second request successful, streaming response...");

                    // Stream the second response
                    let mut second_stream = second_response.bytes_stream();
                    let mut second_content = String::new();
                    let mut second_delta_count = 0;
                    let mut second_last_delta: Option<Value> = None;

                    while let Some(chunk_result) = second_stream.next().await {
                        match chunk_result {
                            Ok(chunk) => {
                                if let Ok(text) = std::str::from_utf8(&chunk) {
                                    for line in text.lines() {
                                        let line = line.trim();
                                        if line.is_empty() {
                                            continue;
                                        }

                                        if line.starts_with("data: ") {
                                            let data_str = &line[6..];
                                            if data_str == "[DONE]" {
                                                // Flush pending delta
                                                if let Some(pending) = second_last_delta.take() {
                                                    let event = json!({
                                                        "type": "chat:completion",
                                                        "data": pending
                                                    });
                                                    event_emitter(event).await;
                                                }
                                                break;
                                            }

                                            if let Ok(mut data) =
                                                serde_json::from_str::<Value>(data_str)
                                            {
                                                if let Some(choices) =
                                                    data.get("choices").and_then(|c| c.as_array())
                                                {
                                                    if let Some(first_choice) = choices.first() {
                                                        if let Some(delta) =
                                                            first_choice.get("delta")
                                                        {
                                                            if let Some(delta_content) = delta
                                                                .get("content")
                                                                .and_then(|c| c.as_str())
                                                            {
                                                                second_content
                                                                    .push_str(delta_content);
                                                                second_delta_count += 1;
                                                                second_last_delta =
                                                                    Some(data.clone());

                                                                if second_delta_count
                                                                    >= delta_chunk_size
                                                                {
                                                                    let event = json!({
                                                                        "type": "chat:completion",
                                                                        "data": data
                                                                    });
                                                                    event_emitter(event).await;
                                                                    second_delta_count = 0;
                                                                    second_last_delta = None;
                                                                }
                                                            }
                                                        }

                                                        // Check for finish_reason
                                                        if let Some(finish_reason) =
                                                            first_choice.get("finish_reason")
                                                        {
                                                            if !finish_reason.is_null() {
                                                                tracing::info!("✅ Second stream finished with reason: {:?}", finish_reason);

                                                                // Flush pending delta
                                                                if let Some(pending) =
                                                                    second_last_delta.take()
                                                                {
                                                                    let event = json!({
                                                                        "type": "chat:completion",
                                                                        "data": pending
                                                                    });
                                                                    event_emitter(event).await;
                                                                }

                                                                // Send final message with done flag
                                                                data["done"] = json!(true);
                                                                let event = json!({
                                                                    "type": "chat:completion",
                                                                    "data": data
                                                                });
                                                                event_emitter(event).await;

                                                                // Update database with final content
                                                                if let (Some(cid), Some(mid)) = (
                                                                    chat_id.as_ref(),
                                                                    message_id.as_ref(),
                                                                ) {
                                                                    // Append the second response to the existing content
                                                                    let final_content = format!(
                                                                        "\n\n{}",
                                                                        second_content
                                                                    );
                                                                    let _ = upsert_chat_message(
                                                                        &state.db,
                                                                        cid,
                                                                        mid,
                                                                        json!({
                                                                            "role": "assistant",
                                                                            "content": final_content,
                                                                            "done": true,
                                                                            "model": model_id.clone(),
                                                                        }),
                                                                    ).await;
                                                                }
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::error!("❌ Error in second stream: {}", e);
                                break;
                            }
                        }
                    }

                    tracing::info!("✅ Multi-turn conversation completed successfully");
                }
            }
            Err(e) => {
                tracing::error!("❌ Failed to make second request: {}", e);
                let error_event = json!({
                    "type": "chat:completion",
                    "data": {
                        "content": format!("\n\n**Error:** Failed to send request to LLM: {}", e)
                    }
                });
                event_emitter(error_event).await;
            }
        }
    }

    // Generate title if requested
    if should_generate_title && chat_id.is_some() {
        tracing::info!(
            "Triggering title generation for chat: {}",
            chat_id.as_ref().unwrap()
        );

        // Spawn title generation as background task
        let state_clone = state.clone();
        let model_id_clone = model_id.clone();
        let messages_clone = messages.clone();
        let chat_id_clone = chat_id.clone().unwrap();
        let message_id_clone = message_id.clone();
        let user_id_clone = user_id.to_string();
        let model_item_clone = model_item.clone();
        let endpoint_url_clone = endpoint_url.clone();
        let endpoint_key_clone = endpoint_key.clone();
        let socket_state_clone = state.socket_state.clone();

        tokio::spawn(async move {
            if let Err(e) = generate_and_update_title(
                &state_clone,
                &model_id_clone,
                &messages_clone,
                &chat_id_clone,
                &message_id_clone,
                &user_id_clone,
                &model_item_clone,
                &endpoint_url_clone,
                &endpoint_key_clone,
                socket_state_clone,
            )
            .await
            {
                tracing::error!("Failed to generate title: {}", e);
            }
        });
    }

    Ok(())
}

/// Upsert a message to a chat
async fn upsert_chat_message(
    db: &crate::db::Database,
    chat_id: &str,
    message_id: &str,
    message_data: serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    use crate::services::chat::ChatService;

    // Get the chat
    let chat_service = ChatService::new(db);
    if let Some(chat) = chat_service.get_chat_by_id(chat_id).await? {
        // Update the chat's history.messages (matches Python backend structure)
        let mut chat_json = chat.chat.clone();

        // Sanitize content for null characters (matches Python backend)
        let mut sanitized_message_data = message_data.clone();
        if let Some(content) = sanitized_message_data
            .get("content")
            .and_then(|v| v.as_str())
        {
            let sanitized_content = content.replace("\x00", "");
            if let Some(obj) = sanitized_message_data.as_object_mut() {
                obj.insert("content".to_string(), serde_json::json!(sanitized_content));
            }
        }

        // Ensure chat.history.messages structure exists (Python backend format)
        if let Some(obj) = chat_json.as_object_mut() {
            let history = obj
                .entry("history")
                .or_insert_with(|| serde_json::json!({}));

            if let Some(history_obj) = history.as_object_mut() {
                let messages = history_obj
                    .entry("messages")
                    .or_insert_with(|| serde_json::json!({}));

                if let Some(messages_obj) = messages.as_object_mut() {
                    // Get existing message or create new one
                    let existing_message = messages_obj
                        .get(message_id)
                        .and_then(|v| v.as_object())
                        .cloned();

                    if let Some(mut existing_msg) = existing_message {
                        // Merge with existing message (Python: {...existing, ...new})
                        if let Some(new_data_obj) = sanitized_message_data.as_object() {
                            for (key, value) in new_data_obj.iter() {
                                existing_msg.insert(key.clone(), value.clone());
                            }
                        }
                        messages_obj
                            .insert(message_id.to_string(), serde_json::json!(existing_msg));
                    } else {
                        // Insert new message
                        messages_obj.insert(message_id.to_string(), sanitized_message_data);
                    }
                }

                // Update currentId (matches Python backend)
                history_obj.insert("currentId".to_string(), serde_json::json!(message_id));
            }
        }

        // Update the chat in database
        use crate::models::chat::UpdateChatRequest;
        let update_req = UpdateChatRequest {
            title: None,
            chat: Some(chat_json),
            folder_id: None,
            archived: None,
            pinned: None,
        };

        chat_service
            .update_chat(chat_id, &chat.user_id, update_req)
            .await?;
    }

    Ok(())
}

/// Generate title and update chat
async fn generate_and_update_title(
    state: &web::Data<AppState>,
    model_id: &str,
    messages: &[serde_json::Value],
    chat_id: &str,
    message_id: &Option<String>,
    user_id: &str,
    model_item: &serde_json::Value,
    endpoint_url: &str,
    endpoint_key: &str,
    socket_state: Option<crate::socket::SocketState>,
) -> Result<(), Box<dyn std::error::Error>> {
    use crate::services::chat::ChatService;

    tracing::info!(
        "Title generation starting - model: {}, user: {}, endpoint: {}, has_key: {}",
        model_id,
        user_id,
        endpoint_url,
        !endpoint_key.is_empty()
    );

    // Check if title generation is enabled
    let prompt = {
        let config = state.config.read().unwrap();

        if !config.enable_title_generation {
            return Ok(());
        }

        // Get the last 2 messages
        let messages_for_title: Vec<_> = messages.iter().rev().take(2).rev().cloned().collect();

        // Build prompt
        let template = if config.title_generation_prompt_template.is_empty() {
            DEFAULT_TITLE_GENERATION_PROMPT_TEMPLATE.to_string()
        } else {
            config.title_generation_prompt_template.clone()
        };

        let messages_text = messages_for_title
            .iter()
            .map(|m| {
                let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("user");
                let content = m.get("content").and_then(|v| v.as_str()).unwrap_or("");
                format!("{}: {}", role, content)
            })
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = template.replace("{{MESSAGES:END:2}}", &messages_text);

        prompt
    }; // config lock is dropped here

    // Build request payload
    let title_payload = json!({
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 50,
        "temperature": 0.1,
        "stream": false
    });

    let url = format!("{}/chat/completions", endpoint_url.trim_end_matches('/'));
    tracing::info!(
        "Title generation - URL: {}, has_key: {}, model: {}",
        url,
        !endpoint_key.is_empty(),
        model_id
    );

    let client = reqwest::Client::new();
    let mut request_builder = client.post(&url).header("Content-Type", "application/json");

    if !endpoint_key.is_empty() {
        let key_preview = if endpoint_key.len() > 10 {
            format!(
                "{}...{}",
                &endpoint_key[..5],
                &endpoint_key[endpoint_key.len() - 5..]
            )
        } else {
            "***".to_string()
        };
        tracing::info!("Title generation - Using API key: {}", key_preview);
        request_builder =
            request_builder.header("Authorization", format!("Bearer {}", endpoint_key));
    } else {
        tracing::warn!("Title generation - No API key provided!");
    }

    match request_builder.json(&title_payload).send().await {
        Ok(response) if response.status().is_success() => {
            let json_response = response.json::<serde_json::Value>().await?;

            // Extract title from response
            if let Some(title_string) = json_response
                .get("choices")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("message"))
                .and_then(|m| m.get("content"))
                .and_then(|c| c.as_str())
            {
                // Parse JSON from response
                let start = title_string.find('{');
                let end = title_string.rfind('}');

                if let (Some(start), Some(end)) = (start, end) {
                    let json_str = &title_string[start..=end];
                    if let Ok(title_json) = serde_json::from_str::<serde_json::Value>(json_str) {
                        if let Some(title) = title_json.get("title").and_then(|t| t.as_str()) {
                            // Update chat title
                            let db = &state.db;
                            let chat_service = ChatService::new(db);

                            use crate::models::chat::UpdateChatRequest;
                            if let Some(chat) = chat_service.get_chat_by_id(chat_id).await? {
                                let update_req = UpdateChatRequest {
                                    title: Some(title.to_string()),
                                    chat: None,
                                    folder_id: None,
                                    archived: None,
                                    pinned: None,
                                };

                                chat_service
                                    .update_chat(chat_id, &chat.user_id, update_req)
                                    .await?;
                                tracing::info!("Updated chat {} with title: {}", chat_id, title);

                                // Emit chat:title event to notify frontend
                                if let Some(socket_state) = &socket_state {
                                    let event_payload = json!({
                                        "chat_id": chat_id,
                                        "message_id": message_id.as_deref(),
                                        "data": {
                                            "type": "chat:title",
                                            "data": title,
                                        }
                                    });

                                    tracing::info!("📤 Attempting to emit chat:title event to user: {}, chat: {}, message: {:?}, title: {}", 
                                        user_id, chat_id, message_id, title);
                                    tracing::debug!(
                                        "Event payload: {}",
                                        serde_json::to_string_pretty(&event_payload)
                                            .unwrap_or_default()
                                    );

                                    match socket_state
                                        .native_handler
                                        .emit_to_user(user_id, "chat-events", event_payload)
                                        .await
                                    {
                                        Ok(sent_count) => {
                                            tracing::info!("✅ Emitted chat:title event to {} session(s) for chat {}: {}", sent_count, chat_id, title);
                                        }
                                        Err(e) => {
                                            tracing::error!(
                                                "❌ Failed to emit chat:title event: {}",
                                                e
                                            );
                                        }
                                    }
                                } else {
                                    tracing::warn!("⚠️  Socket state not available, cannot emit chat:title event");
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(response) => {
            tracing::warn!("Title generation failed with status: {}", response.status());
        }
        Err(e) => {
            tracing::error!("Title generation request error: {}", e);
        }
    }

    Ok(())
}

const DEFAULT_TITLE_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Generate a concise, 3-5 word title with an emoji summarizing the chat history.
### Guidelines:
- The title should clearly represent the main theme or subject of the conversation.
- Use emojis that enhance understanding of the topic, but avoid quotation marks or special formatting.
- Write the title in the chat's primary language; default to English if multilingual.
- Prioritize accuracy over excessive creativity; keep it clear and simple.
- Your entire response must consist solely of the JSON object, without any introductory or concluding text.
- The output must be a single, raw JSON object, without any markdown code fences or other encapsulating text.
- Ensure no conversational text, affirmations, or explanations precede or follow the raw JSON output, as this will cause direct parsing failure.
### Output:
JSON format: { "title": "your concise title here" }
### Examples:
- { "title": "📉 Stock Market Trends" },
- { "title": "🍪 Perfect Chocolate Chip Recipe" },
- { "title": "Evolution of Music Streaming" },
- { "title": "Remote Work Productivity Tips" },
- { "title": "Artificial Intelligence in Healthcare" },
- { "title": "🎮 Video Game Development Insights" }
### Chat History:
<chat_history>
{{MESSAGES:END:2}}
</chat_history>"#;

// Public handler for chat completions that can be called from main.rs
pub async fn handle_chat_completions(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    payload: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    // Check if OpenAI API is enabled
    let enable_openai_api = {
        let config = state.config.read().unwrap();
        config.enable_openai_api
    };

    if !enable_openai_api {
        return Err(AppError::NotImplemented(
            "OpenAI API is not enabled".to_string(),
        ));
    }

    // Get model ID from payload
    let model_id = payload
        .get("model")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("Model ID is required".to_string()))?
        .to_string();

    // Extract model_item from payload (matching Python's behavior exactly)
    let mut payload_obj = payload.into_inner();
    let model_item = payload_obj
        .as_object_mut()
        .and_then(|obj| obj.remove("model_item"))
        .unwrap_or(serde_json::json!({}));

    // Extract Socket.IO streaming metadata from top-level (frontend sends these at root level)
    let session_id = payload_obj
        .get("session_id")
        .and_then(|v| v.as_str())
        .map(String::from);
    let chat_id = payload_obj
        .get("chat_id")
        .and_then(|v| v.as_str())
        .map(String::from);
    let message_id = payload_obj
        .get("id")
        .and_then(|v| v.as_str())
        .map(String::from);

    // Extract background_tasks for title generation, etc.
    let background_tasks = payload_obj
        .as_object_mut()
        .and_then(|obj| obj.remove("background_tasks"))
        .unwrap_or(serde_json::json!({}));

    let should_generate_title = background_tasks
        .get("title_generation")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    // Extract messages for title generation before removing from payload
    let messages = payload_obj
        .get("messages")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // Extract tool_ids BEFORE removing from payload
    let tool_ids = payload_obj
        .get("tool_ids")
        .and_then(|t| t.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<String>>()
        })
        .unwrap_or_default();

    tracing::info!(
        "📋 Chat completion request received - tool_ids: {:?}",
        tool_ids
    );
    if !tool_ids.is_empty() {
        tracing::info!("🔧 Tools requested in chat: {}", tool_ids.join(", "));
    }

    // Remove these from payload before forwarding to LLM API
    if let Some(obj) = payload_obj.as_object_mut() {
        obj.remove("session_id");
        obj.remove("chat_id");
        obj.remove("id");
        // Remove other frontend-only fields
        obj.remove("filter_ids");
        obj.remove("tool_ids");
        obj.remove("tool_servers");
        obj.remove("features");
        obj.remove("variables");
        obj.remove("model_item");
    }

    // Prepare tool specs storage (moved outside if block for later use)
    let mut all_tool_specs = Vec::new();

    // Load and inject tools if tool_ids are provided
    if !tool_ids.is_empty() {
        use crate::models::tool_runtime::ToolDefinition;
        use crate::services::tool::ToolService;

        tracing::info!(
            "🔄 Loading {} tool(s) for chat completion: {:?}",
            tool_ids.len(),
            tool_ids
        );

        let tool_service = ToolService::new(&state.db);

        for tool_id in &tool_ids {
            match tool_service.get_tool_by_id(tool_id).await {
                Ok(Some(tool)) => {
                    // Check access permissions
                    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
                        use crate::services::group::GroupService;
                        use crate::utils::misc::has_access;
                        use std::collections::HashSet;

                        let group_service = GroupService::new(&state.db);
                        let groups = group_service
                            .get_groups_by_member_id(&auth_user.user.id)
                            .await
                            .unwrap_or_default();
                        let user_group_ids: HashSet<String> =
                            groups.into_iter().map(|g| g.id).collect();

                        if !has_access(
                            &auth_user.user.id,
                            "read",
                            &tool.get_access_control(),
                            &user_group_ids,
                        ) {
                            tracing::warn!(
                                "User {} does not have access to tool {}",
                                auth_user.user.id,
                                tool_id
                            );
                            continue;
                        }
                    }

                    // Parse tool definition and extract OpenAI specs
                    match ToolDefinition::from_json(&tool.content) {
                        Ok(tool_def) => {
                            let specs = tool_def.to_openai_specs();
                            tracing::info!(
                                "Loaded {} tool spec(s) from tool {}",
                                specs.len(),
                                tool_id
                            );
                            all_tool_specs.extend(specs);
                        }
                        Err(e) => {
                            tracing::error!(
                                "Failed to parse tool definition for {}: {}",
                                tool_id,
                                e
                            );
                        }
                    }
                }
                Ok(None) => {
                    tracing::warn!("Tool {} not found", tool_id);
                }
                Err(e) => {
                    tracing::error!("Failed to load tool {}: {}", tool_id, e);
                }
            }
        }

        // Inject tools into payload in OpenAI format
        if !all_tool_specs.is_empty() {
            tracing::info!(
                "✅ Injecting {} tool spec(s) into chat completion request",
                all_tool_specs.len()
            );

            let tools_array: Vec<serde_json::Value> = all_tool_specs
                .iter()
                .map(|spec| {
                    tracing::debug!(
                        "Tool spec: {}",
                        serde_json::to_string_pretty(spec).unwrap_or_default()
                    );
                    serde_json::json!({
                        "type": "function",
                        "function": spec
                    })
                })
                .collect();

            if let Some(obj) = payload_obj.as_object_mut() {
                obj.insert("tools".to_string(), serde_json::json!(tools_array));
                // Set tool_choice to "auto" to let the LLM decide when to use tools
                if !obj.contains_key("tool_choice") {
                    obj.insert("tool_choice".to_string(), serde_json::json!("auto"));
                }
                tracing::info!("🎯 Tool choice set to: auto");
            }
        } else {
            tracing::warn!(
                "⚠️  No tool specs were loaded even though tool_ids were provided: {:?}",
                tool_ids
            );
        }
    } else {
        tracing::debug!("ℹ️  No tools requested for this chat completion");
    }

    // Extract metadata for direct connections (this is different from Socket.IO metadata)
    let metadata = payload_obj
        .as_object_mut()
        .and_then(|obj| obj.remove("metadata"))
        .unwrap_or(serde_json::json!({}));

    tracing::debug!(
        "Chat completion request - model_id: {}, model_item: {}",
        model_id,
        serde_json::to_string(&model_item).unwrap_or_default()
    );

    // Check if this is a direct connection request (Python: if not model_item.get("direct", False))
    let is_direct = model_item
        .get("direct")
        .and_then(|d| d.as_bool())
        .unwrap_or(false);

    tracing::debug!(
        "is_direct: {}, session_id: {:?}, model_id: {}",
        is_direct,
        session_id,
        model_id
    );

    // If direct connections not enabled, just use regular OpenAI routing
    let config = state.config.read().unwrap();
    let (url, key, api_config) = if is_direct && config.enable_direct_connections {
        // Direct connection - look up URL and key from user settings using urlIdx
        // The frontend sends urlIdx which points to the user's directConnections settings

        // First, try explicit url/key in model_item (rare case)
        let direct_url = model_item
            .get("url")
            .and_then(|u| u.as_str())
            .filter(|s| !s.is_empty());

        let direct_key = model_item.get("key").and_then(|k| k.as_str()).unwrap_or("");

        if let Some(url_str) = direct_url {
            tracing::info!(
                "Using direct connection with explicit URL: {} for model {} by user {}",
                url_str,
                model_id,
                auth_user.user.email
            );

            let item_config = model_item
                .get("config")
                .cloned()
                .unwrap_or(serde_json::json!({}));

            (url_str.to_string(), direct_key.to_string(), item_config)
        } else {
            // No explicit URL - look up from user settings using urlIdx
            let url_idx = if let Some(idx_str) = model_item.get("urlIdx").and_then(|v| v.as_str()) {
                idx_str.to_string()
            } else if let Some(idx_num) = model_item.get("urlIdx").and_then(|v| v.as_u64()) {
                idx_num.to_string()
            } else {
                return Err(AppError::BadRequest(
                    "Direct connection requires urlIdx in model_item to look up user connection settings".to_string()
                ));
            };

            tracing::debug!(
                "Looking up direct connection from user settings with urlIdx: {}",
                url_idx
            );

            // Get user settings to find their direct connections
            tracing::debug!("User settings: {:?}", auth_user.user.settings);
            let user_settings = auth_user.user.settings.as_ref()
                .ok_or_else(|| AppError::BadRequest(
                    "User settings not found. Please configure your direct connections in Settings > Connections.".to_string()
                ))?;

            // Direct connections can be at settings.directConnections OR settings.ui.directConnections
            let direct_connections = user_settings.get("directConnections").or_else(|| {
                user_settings
                    .get("ui")
                    .and_then(|ui| ui.get("directConnections"))
            });

            if direct_connections.is_none() {
                tracing::warn!(
                    "Direct connections not configured for user {}. User settings structure: {:?}",
                    auth_user.user.email,
                    user_settings
                );
                return Err(AppError::BadRequest(
                    "Direct connections not configured. Please add your OpenAI API connections in Settings > Connections.".to_string()
                ));
            }

            let direct_connections = direct_connections.unwrap();

            // Extract URL and key arrays from settings
            tracing::debug!("Direct connections object: {:?}", direct_connections);

            let urls = direct_connections.get("OPENAI_API_BASE_URLS")
                .and_then(|v| v.as_array())
                .ok_or_else(|| {
                    tracing::error!("OPENAI_API_BASE_URLS missing or not an array in direct connections");
                    AppError::BadRequest("Direct connections configuration is invalid. Please check your Settings > Connections.".to_string())
                })?;

            let keys = direct_connections.get("OPENAI_API_KEYS")
                .and_then(|v| v.as_array())
                .ok_or_else(|| {
                    tracing::error!("OPENAI_API_KEYS missing or not an array in direct connections");
                    AppError::BadRequest("Direct connections configuration is invalid. Please check your Settings > Connections.".to_string())
                })?;

            let configs = direct_connections.get("OPENAI_API_CONFIGS")
                .and_then(|v| v.as_object())
                .ok_or_else(|| {
                    tracing::error!("OPENAI_API_CONFIGS missing or not an object in direct connections");
                    AppError::BadRequest("Direct connections configuration is invalid. Please check your Settings > Connections.".to_string())
                })?;

            // Parse urlIdx as number
            let idx: usize = url_idx
                .parse()
                .map_err(|_| AppError::BadRequest(format!("Invalid urlIdx: {}", url_idx)))?;

            tracing::debug!(
                "Looking up connection at index {} from {} total URLs",
                idx,
                urls.len()
            );

            // Get URL and key at that index
            let connection_url = urls.get(idx)
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    tracing::error!("No URL found at index {}. Available URLs: {} total", idx, urls.len());
                    AppError::BadRequest(format!(
                        "Connection not found at index {}. You have {} connection(s) configured. Please check your Settings > Connections.", 
                        idx, urls.len()
                    ))
                })?;

            let connection_key = keys.get(idx).and_then(|v| v.as_str()).unwrap_or("");

            // Get config for this connection (might be at string index)
            let connection_config = configs
                .get(&url_idx)
                .or_else(|| configs.get(connection_url))
                .cloned()
                .unwrap_or(serde_json::json!({}));

            tracing::info!(
                "Using direct connection from user settings: {} (idx: {}) for model {} by user {}",
                connection_url,
                idx,
                model_id,
                auth_user.user.email
            );

            (
                connection_url.to_string(),
                connection_key.to_string(),
                connection_config,
            )
        }
    } else if is_direct && !config.enable_direct_connections {
        // Direct requested but not enabled - return error message
        return Err(AppError::BadRequest(
            "Direct connections are not enabled. Please enable them in Admin Settings > Connections".to_string()
        ));
    } else {
        // Regular (non-direct) routing
        get_endpoint_from_cache_or_config(&state, &config, &model_id, &model_item, &payload_obj)?
    };

    // Prepare the request to the OpenAI-compatible endpoint
    let client = reqwest::Client::new();
    let mut request_builder = client
        .post(format!("{}/chat/completions", url))
        .header("Content-Type", "application/json");

    // Add authorization header based on auth_type
    let auth_type = api_config
        .get("auth_type")
        .and_then(|v| v.as_str())
        .unwrap_or("bearer");

    match auth_type {
        "none" => {
            // No authentication
        }
        _ => {
            // Default to bearer token for all other cases
            if !key.is_empty() {
                request_builder =
                    request_builder.header("Authorization", format!("Bearer {}", key));
            }
        } // TODO: Add support for other auth types like "session", "system_oauth", "azure_ad"
    }

    // Forward the modified payload (already extracted earlier)

    match request_builder.json(&payload_obj).send().await {
        Ok(response) if response.status().is_success() => {
            // Check if it's a streaming response
            let content_type = response
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");

            let is_stream = payload_obj
                .get("stream")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            tracing::debug!(
                "Response content-type: {}, stream param: {}",
                content_type,
                is_stream
            );

            if is_stream && content_type.contains("text/event-stream") {
                tracing::debug!("🔴 STREAMING: Real-time SSE response");

                // Check if we should use Socket.IO for streaming (all three required: session_id, chat_id, message_id)
                let use_socketio = session_id.is_some()
                    && chat_id.is_some()
                    && message_id.is_some()
                    && state.socket_state.is_some();

                tracing::info!("Socket.IO check - session_id: {:?}, chat_id: {:?}, message_id: {:?}, use_socketio: {}", 
                    session_id, chat_id, message_id, use_socketio);

                if use_socketio {
                    // Use Socket.IO streaming - process the stream and emit events
                    tracing::info!(
                        "🔵 Using Socket.IO for real-time streaming to session: {:?}",
                        session_id
                    );

                    // Spawn a task to process the stream via Socket.IO
                    let state_clone = state.clone();
                    let user_id = auth_user.user.id.clone();
                    let session_id_owned = session_id.clone();
                    let model_id_owned = model_id.clone();
                    let messages_owned = messages.clone();
                    let should_generate_title_owned = should_generate_title;
                    let model_item_owned = model_item.clone();
                    let url_owned = url.clone();
                    let key_owned = key.clone();
                    let tool_ids_owned = tool_ids.clone();
                    let all_tool_specs_owned = all_tool_specs.clone();

                    tokio::spawn(async move {
                        if let Err(e) = process_streaming_via_socketio(
                            response,
                            &state_clone,
                            &user_id,
                            model_id_owned,
                            messages_owned,
                            chat_id,
                            message_id,
                            session_id_owned,
                            should_generate_title_owned,
                            model_item_owned,
                            url_owned,
                            key_owned,
                            tool_ids_owned,
                            all_tool_specs_owned,
                        )
                        .await
                        {
                            tracing::error!("Error processing Socket.IO stream: {}", e);
                        }
                    });

                    // Return an immediate success response
                    // The actual streaming happens via Socket.IO
                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "status": "streaming",
                        "message": "Streaming via Socket.IO"
                    })))
                } else {
                    // Use traditional HTTP streaming
                    tracing::debug!("Using HTTP SSE streaming (no Socket.IO metadata)");

                    use bytes::Bytes;

                    let stream = response.bytes_stream().map(move |result| {
                        match result {
                            Ok(bytes) => {
                                // Forward immediately without ANY processing
                                Ok::<Bytes, actix_web::Error>(bytes)
                            }
                            Err(e) => {
                                tracing::error!("Stream error: {}", e);
                                Err(actix_web::error::ErrorInternalServerError(e))
                            }
                        }
                    });

                    Ok(HttpResponse::Ok()
                        .content_type("text/event-stream; charset=utf-8")
                        .append_header(("Cache-Control", "no-cache, no-transform"))
                        .append_header(("X-Accel-Buffering", "no"))
                        .append_header(("Connection", "keep-alive"))
                        // CRITICAL: Use insert_header instead of append_header for these
                        .insert_header(("Transfer-Encoding", "chunked"))
                        .insert_header(("X-Content-Type-Options", "nosniff"))
                        .streaming(stream))
                }
            } else {
                // Return JSON response
                tracing::debug!("Returning JSON response");
                if let Ok(json_response) = response.json::<serde_json::Value>().await {
                    Ok(HttpResponse::Ok().json(json_response))
                } else {
                    Err(AppError::InternalServerError(
                        "Failed to parse response".to_string(),
                    ))
                }
            }
        }
        Ok(response) => {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("OpenAI API error: {} - {}", status, error_text);
            Err(AppError::InternalServerError(format!(
                "OpenAI API error: {} - {}",
                status, error_text
            )))
        }
        Err(e) => {
            tracing::error!("Error calling OpenAI API: {}", e);
            Err(AppError::InternalServerError(format!(
                "Error calling OpenAI API: {}",
                e
            )))
        }
    }
}
