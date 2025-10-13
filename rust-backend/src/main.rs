mod config;
mod db;
mod error;
mod middleware;
mod models;
mod routes;
mod services;
mod socket;
mod utils;
mod websocket_chat;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::{
    http::header,
    middleware::{Compress, Logger, NormalizePath},
    web, App, HttpRequest, HttpResponse, HttpServer,
};
use std::net::SocketAddr;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::config::{Config, MutableConfig};
use crate::db::Database;
use crate::routes::create_routes;
use std::sync::{Arc, RwLock};

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub config: MutableConfig,
    pub redis: Option<deadpool_redis::Pool>,
    // Model cache: model_id -> model info (with urlIdx, etc.)
    pub models_cache: Arc<RwLock<std::collections::HashMap<String, serde_json::Value>>>,
    // Socket state for tracking sessions and users (Socket.IO-like functionality)
    pub socket_state: Option<socket::SocketState>,
}

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    dotenvy::dotenv().ok();

    let log_level = std::env::var("RUST_LOG")
        .unwrap_or_else(|_| "info".to_string())
        .parse()
        .unwrap_or(Level::INFO);

    let subscriber = FmtSubscriber::builder()
        .with_max_level(log_level)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .finish();

    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting Open WebUI Rust Backend");

    // Load configuration from environment
    let config = Config::from_env()?;
    info!("Configuration loaded from environment");

    // Initialize database
    let db = Database::new(&config.database_url).await?;
    info!("Database connected");

    // Run migrations
    db.run_migrations().await?;
    info!("Database migrations completed");

    // Load and merge config from database (PersistentConfig behavior)
    let config = services::ConfigService::load_from_db(&db, config).await?;
    info!("Configuration loaded and merged from database");

    // Initialize Redis if enabled
    let redis = if config.enable_redis {
        let redis_config = deadpool_redis::Config::from_url(&config.redis_url);
        let pool = redis_config.create_pool(Some(deadpool_redis::Runtime::Tokio1))?;
        info!("Redis connected");
        Some(pool)
    } else {
        None
    };

    // Create Socket state if WebSocket support is enabled
    let socket_state = if config.enable_websocket_support {
        use crate::socket::SocketState;
        Some(SocketState::new())
    } else {
        None
    };

    // Create app state
    let state = web::Data::new(AppState {
        db: db.clone(),
        config: Arc::new(RwLock::new(config.clone())),
        redis: redis.clone(),
        models_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        socket_state,
    });


    // Start server
    let addr = SocketAddr::from((config.host.parse::<std::net::IpAddr>()?, config.port));
    let cors_allow_origin = config.cors_allow_origin.clone();

    info!("🚀 Server running at http://{}", addr);

    HttpServer::new(move || {
        // Create CORS middleware
        // NOTE: When credentials are needed (cookies/auth), we cannot use allow_any_origin()
        // Instead, we need to allow specific origins or use allowed_origin_fn to dynamically allow
        let cors = if cors_allow_origin == "*" {
            // When "*" is specified, allow any origin dynamically while supporting credentials
            Cors::default()
                .allowed_origin_fn(|_origin, _req_head| {
                    // Allow all origins when * is configured
                    true
                })
                .allow_any_method()
                .allow_any_header()
                .expose_headers(vec![header::SET_COOKIE])
                .supports_credentials()
                .max_age(3600)
        } else {
            let origins: Vec<&str> = cors_allow_origin.split(',').map(|s| s.trim()).collect();
            let mut cors = Cors::default();
            for origin in origins {
                cors = cors.allowed_origin(origin);
            }
            cors.allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
                .allowed_headers(vec![
                    header::CONTENT_TYPE,
                    header::AUTHORIZATION,
                    header::ACCEPT,
                    header::COOKIE,
                ])
                .expose_headers(vec![header::SET_COOKIE])
                .supports_credentials()
                .max_age(3600)
        };

        App::new()
            .app_data(state.clone())
            .wrap(cors)
            .wrap(Compress::default())
            .wrap(Logger::default())
            .wrap(NormalizePath::trim())
            // Health checks
            .route("/health", web::get().to(health_check))
            .route("/health/db", web::get().to(health_check_db))
            // Config and version
            .route("/api/config", web::get().to(get_app_config))
            .route("/api/version", web::get().to(get_app_version))
            .route("/api/version/updates", web::get().to(get_app_latest_version))
            // Models list endpoint (OpenAI compatible - returns {"data": [...]})
            .route("/api/models", web::get().to(get_models))
            .route("/api/models/base", web::get().to(get_base_models))
            // API routes (nested after specific routes to avoid conflicts)
            .service(web::scope("/api/v1").configure(create_routes))
            // OpenAI compatible API
            .service(
                web::scope("/openai").configure(routes::openai::create_routes),
            )
            // Chat endpoints (legacy routes without /v1 prefix)
            .service(
                web::resource("/api/chat/completions")
                    .wrap(middleware::AuthMiddleware)
                    .route(web::post().to(chat_completions))
            )
            .service(
                web::resource("/api/chat/completed")
                    .wrap(middleware::AuthMiddleware)
                    .route(web::post().to(chat_completed))
            )
            // WebSocket endpoint for real-time chat streaming
            .service(
                web::resource("/api/ws/chat")
                    .route(web::get().to(websocket_chat::websocket_chat_handler))
            )
            // Socket.IO bridge authentication endpoint
            .route("/api/socketio/auth", web::post().to(socketio_auth))
            // Socket.IO emit endpoint for hybrid mode
            .route("/api/socketio/emit", web::post().to(socketio_emit))
            .service(
                web::resource("/api/chat/actions/{action_id}")
                    .wrap(middleware::AuthMiddleware)
                    .route(web::post().to(chat_action))
            )
            // Embeddings endpoint (legacy route without /v1 prefix)
            .route("/api/embeddings", web::post().to(embeddings))
            // Task management
            .route("/api/tasks", web::get().to(list_tasks))
            .route("/api/tasks/stop/{task_id}", web::post().to(stop_task))
            .route(
                "/api/tasks/chat/{chat_id}",
                web::get().to(list_tasks_by_chat),
            )
            // Usage and webhook
            .route("/api/usage", web::get().to(get_usage))
            .route("/api/webhook", web::get().to(get_webhook))
            .route("/api/webhook", web::post().to(update_webhook))
            // OAuth integration endpoints (for MCP and other tools)
            .route(
                "/oauth/clients/{client_id}/authorize",
                web::get().to(oauth_client_authorize),
            )
            .route(
                "/oauth/clients/{client_id}/callback",
                web::get().to(oauth_client_callback),
            )
            // PWA manifest and opensearch
            .route("/manifest.json", web::get().to(get_manifest))
            .route("/opensearch.xml", web::get().to(get_opensearch))
            // Favicon
            .route("/favicon.png", web::get().to(serve_favicon))
            // Cache file serving
            .route("/cache/{path:.*}", web::get().to(serve_cache_file))
            // Serve default user avatar at root (for backward compatibility)
            .route("/user.png", web::get().to(serve_user_avatar))
            // Serve static files from static directory
            .service(Files::new("/static", "../static/static"))
    })
    // CRITICAL: Disable keep-alive buffering for real-time streaming
    .keep_alive(actix_web::http::KeepAlive::Timeout(std::time::Duration::from_secs(75)))
    // CRITICAL: Set client timeout high for long-running streams
    .client_request_timeout(std::time::Duration::from_secs(300))
    .bind(addr)?
    .run()
    .await?;

    Ok(())
}

// Serve default user avatar
async fn serve_user_avatar() -> Result<actix_files::NamedFile, crate::error::AppError> {
    let path = std::path::Path::new("../static/static/user.png");
    actix_files::NamedFile::open(path)
        .map_err(|_| crate::error::AppError::NotFound("User avatar not found".to_string()))
}

// Serve favicon
async fn serve_favicon() -> Result<actix_files::NamedFile, crate::error::AppError> {
    let path = std::path::Path::new("../static/static/favicon.png");
    actix_files::NamedFile::open(path)
        .map_err(|_| crate::error::AppError::NotFound("Favicon not found".to_string()))
}

// Health check endpoints
async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({ "status": true }))
}

async fn health_check_db(state: web::Data<AppState>) -> Result<HttpResponse, crate::error::AppError> {
    sqlx::query("SELECT 1")
        .execute(state.db.pool())
        .await
        .map_err(|e| crate::error::AppError::Database(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": true })))
}

async fn get_app_config(
    state: web::Data<AppState>,
    req: HttpRequest,
) -> HttpResponse {
    use serde_json::json;

    // Get read lock on config
    let config = state.config.read().unwrap();

    // Try to get user from token (in Authorization header or cookie)
    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer ").map(|s| s.to_string()))
        .or_else(|| {
            req.cookie("token").map(|c| c.value().to_string())
        });

    // Get actual user from database if token is valid
    let user = if let Some(ref token) = token {
        match crate::utils::auth::verify_jwt(&token, &config.webui_secret_key) {
            Ok(claims) => {
                // Get user from database (properly async)
                let user_service = services::user::UserService::new(&state.db);
                user_service.get_user_by_id(&claims.sub).await.ok().flatten()
            }
            Err(_) => None
        }
    } else {
        None
    };

    // Get actual user count from database (properly async)
    let user_service = services::user::UserService::new(&state.db);
    let user_count = user_service.get_user_count().await.unwrap_or(0);
    
    let onboarding = user.is_none() && user_count == 0;

    let mut response = json!({
        "status": true,
        "name": config.webui_name,
        "version": env!("CARGO_PKG_VERSION"),
        "default_locale": "en-US",
        "features": {
            "auth": config.webui_auth,
            "auth_trusted_header": false,
            "enable_signup": config.enable_signup,
            "enable_login_form": config.enable_login_form,
            "enable_api_key": config.enable_api_key,
            "enable_ldap": false,
            "enable_websocket": config.enable_websocket_support,
            "enable_version_update_check": config.enable_version_update_check,
            "enable_signup_password_confirmation": false,
        },
        "oauth": {
            "providers": {}
        }
    });

    if onboarding {
        response["onboarding"] = json!(true);
    }

    // Add authenticated user configuration
    if user.is_some() {
        response["features"]["enable_direct_connections"] = json!(config.enable_direct_connections);
        response["features"]["enable_channels"] = json!(config.enable_channels);
        response["features"]["enable_notes"] = json!(config.enable_notes);
        response["features"]["enable_web_search"] = json!(config.enable_web_search);
        response["features"]["enable_code_execution"] = json!(config.enable_code_execution);
        response["features"]["enable_code_interpreter"] = json!(config.enable_code_interpreter);
        response["features"]["enable_image_generation"] = json!(config.enable_image_generation);
        response["features"]["enable_autocomplete_generation"] = json!(config.enable_autocomplete_generation);
        response["features"]["enable_community_sharing"] = json!(config.enable_community_sharing);
        response["features"]["enable_message_rating"] = json!(config.enable_message_rating);
        response["features"]["enable_user_webhooks"] = json!(config.enable_user_webhooks);
        response["features"]["enable_admin_export"] = json!(config.enable_admin_export);
        response["features"]["enable_admin_chat_access"] = json!(config.enable_admin_chat_access);
        response["features"]["enable_google_drive_integration"] = json!(config.enable_google_drive_integration);
        response["features"]["enable_onedrive_integration"] = json!(config.enable_onedrive_integration);

        // Convert default_models to comma-separated string (or null if empty) to match Python backend
        response["default_models"] = if config.default_models.is_empty() {
            json!(null)
        } else {
            json!(&config.default_models)
        };
        response["default_prompt_suggestions"] = config.default_prompt_suggestions.clone();
        response["user_count"] = json!(user_count);

        response["code"] = json!({
            "engine": if config.enable_code_execution { "python" } else { "" }
        });

        response["audio"] = json!({
            "tts": {
                "engine": &config.tts_engine,
                "voice": &config.tts_voice,
                "split_on": &config.tts_split_on
            },
            "stt": {
                "engine": &config.stt_engine,
            }
        });

        response["file"] = json!({
            "max_size": 10485760, // 10MB default
            "max_count": 10,
            "image_compression": {
                "width": 1024,
                "height": 1024
            }
        });

        response["permissions"] = json!({
            "chat": {
                "deletion": true,
                "edit": true,
                "temporary": true
            }
        });

        response["google_drive"] = json!({
            "client_id": "",
            "api_key": ""
        });

        response["onedrive"] = json!({
            "client_id_personal": "",
            "client_id_business": "",
            "sharepoint_url": "",
            "sharepoint_tenant_id": ""
        });

        response["ui"] = json!({});
    }

    HttpResponse::Ok().json(response)
}

async fn get_app_version() -> HttpResponse {
    use serde_json::json;

    HttpResponse::Ok().json(json!({
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn get_app_latest_version() -> HttpResponse {
    use serde_json::json;

    // TODO: Implement actual version checking from GitHub API
    let current_version = env!("CARGO_PKG_VERSION");

    HttpResponse::Ok().json(json!({
        "current": current_version,
        "latest": current_version,
    }))
}

// Models endpoints
async fn get_models(_state: web::Data<AppState>) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement model fetching from configured backends
    HttpResponse::Ok().json(json!({
        "data": []
    }))
}

async fn get_base_models(_state: web::Data<AppState>) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement base model fetching
    HttpResponse::Ok().json(json!({
        "data": []
    }))
}

// Chat endpoints
async fn chat_completions(
    state: web::Data<AppState>,
    payload: web::Json<serde_json::Value>,
    auth_user: middleware::AuthUser,
) -> Result<HttpResponse, crate::error::AppError> {
    // Forward to OpenAI chat completions handler
    routes::openai::handle_chat_completions(state, auth_user, payload).await
}

// Socket.IO bridge endpoints
async fn socketio_auth(
    state: web::Data<AppState>,
    payload: web::Json<serde_json::Value>,
) -> HttpResponse {
    use crate::utils::auth::verify_jwt;
    
    let token = match payload.get("token").and_then(|t| t.as_str()) {
        Some(t) => t,
        None => return HttpResponse::BadRequest().json(serde_json::json!({"error": "Missing token"})),
    };
    
    let webui_secret_key = {
        let config = state.config.read().unwrap();
        config.webui_secret_key.clone()
    };
    
    match verify_jwt(token, &webui_secret_key) {
        Ok(claims) => {
            // Get user from database
            let user_service = services::user::UserService::new(&state.db);
            match user_service.get_user_by_id(&claims.sub).await {
                Ok(Some(user)) => {
                    HttpResponse::Ok().json(serde_json::json!({
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "role": user.role,
                    }))
                }
                _ => HttpResponse::Unauthorized().json(serde_json::json!({"error": "User not found"})),
            }
        }
        Err(_) => HttpResponse::Unauthorized().json(serde_json::json!({"error": "Invalid token"})),
    }
}

async fn socketio_emit(
    _state: web::Data<AppState>,
    _payload: web::Json<serde_json::Value>,
) -> HttpResponse {
    // This endpoint is for the Python bridge to emit events
    // In hybrid mode, the Rust backend calls the Python bridge's /emit endpoint instead
    HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
}

async fn chat_completed(
    _state: web::Data<AppState>,
    _payload: web::Json<serde_json::Value>,
) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement chat completed handler
    HttpResponse::Ok().json(json!({
        "status": "ok"
    }))
}

async fn chat_action(
    _state: web::Data<AppState>,
    _action_id: web::Path<String>,
    _payload: web::Json<serde_json::Value>,
) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement chat action handler
    HttpResponse::Ok().json(json!({
        "status": "ok"
    }))
}

// Embeddings endpoint
async fn embeddings(
    _state: web::Data<AppState>,
    _payload: web::Json<serde_json::Value>,
) -> Result<HttpResponse, crate::error::AppError> {
    // TODO: Implement embeddings handler
    Err(crate::error::AppError::NotImplemented(
        "Embeddings endpoint not fully implemented yet".to_string(),
    ))
}

// Task management
async fn list_tasks(_state: web::Data<AppState>) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement task listing from Redis
    HttpResponse::Ok().json(json!({
        "tasks": []
    }))
}

async fn stop_task(
    state: web::Data<AppState>,
    task_id: web::Path<String>,
) -> Result<HttpResponse, crate::error::AppError> {
    use serde_json::json;

    // Emit cancel event through Socket.IO
    // The task_id is the chat_id in our Socket.IO streaming implementation
    if let Some(ref socket_state) = state.socket_state {
        // Send cancel event to all connected clients for this chat
        // This will trigger the frontend to stop listening for streaming events
        tracing::info!("Sending stop signal for chat: {}", task_id.as_str());
        
        // Note: In the current Socket.IO bridge implementation,
        // we emit a chat:tasks:cancel event that the frontend listens for
        let event_emitter = crate::socket::get_event_emitter(
            socket_state.clone(),
            "system".to_string(),  // system user for admin actions
            Some(task_id.to_string()),
            None,
            None,
        );
        
        event_emitter(json!({
            "type": "chat:tasks:cancel"
        })).await;
    }

    Ok(HttpResponse::Ok().json(json!({
        "status": true,
        "message": format!("Stop signal sent for {}", task_id.as_str())
    })))
}

async fn list_tasks_by_chat(
    _state: web::Data<AppState>,
    _chat_id: web::Path<String>,
) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement task listing by chat ID
    HttpResponse::Ok().json(json!({
        "task_ids": []
    }))
}

// Usage and webhook
async fn get_usage(_state: web::Data<AppState>) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement usage tracking (models in use, active users)
    HttpResponse::Ok().json(json!({
        "model_ids": [],
        "user_ids": []
    }))
}

async fn get_webhook(state: web::Data<AppState>) -> HttpResponse {
    use serde_json::json;

    let config = state.config.read().unwrap();
    HttpResponse::Ok().json(json!({
        "url": config.webhook_url.as_deref().unwrap_or("")
    }))
}

async fn update_webhook(
    _state: web::Data<AppState>,
    _payload: web::Json<serde_json::Value>,
) -> HttpResponse {
    use serde_json::json;

    // TODO: Implement webhook URL update
    HttpResponse::Ok().json(json!({
        "url": ""
    }))
}

// OAuth integration endpoints
async fn oauth_client_authorize(
    _state: web::Data<AppState>,
    _client_id: web::Path<String>,
) -> Result<HttpResponse, crate::error::AppError> {
    // TODO: Implement OAuth client authorization
    Err(crate::error::AppError::NotImplemented(
        "OAuth client authorization not implemented yet".to_string(),
    ))
}

async fn oauth_client_callback(
    _state: web::Data<AppState>,
    _client_id: web::Path<String>,
) -> Result<HttpResponse, crate::error::AppError> {
    use serde_json::json;

    // TODO: Implement OAuth client callback
    Ok(HttpResponse::Ok().json(json!({
        "status": "ok"
    })))
}

// PWA manifest
async fn get_manifest(_state: web::Data<AppState>) -> HttpResponse {
    use serde_json::json;

    let webui_name = "Open WebUI";

    HttpResponse::Ok().json(json!({
        "name": webui_name,
        "short_name": webui_name,
        "description": format!("{} is an open, extensible, user-friendly interface for AI that adapts to your workflow.", webui_name),
        "start_url": "/",
        "display": "standalone",
        "background_color": "#343541",
        "icons": [
            {
                "src": "/static/logo.png",
                "type": "image/png",
                "sizes": "500x500",
                "purpose": "any",
            },
            {
                "src": "/static/logo.png",
                "type": "image/png",
                "sizes": "500x500",
                "purpose": "maskable",
            },
        ],
    }))
}

// OpenSearch XML
async fn get_opensearch() -> HttpResponse {
    let webui_name = "Open WebUI";
    let webui_url = "http://localhost:8080"; // TODO: Get from config

    let xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>{}</ShortName>
  <Description>Search {}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">{}/static/favicon.png</Image>
  <Url type="text/html" method="get" template="{}/?q={{searchTerms}}"/>
  <moz:SearchForm>{}</moz:SearchForm>
</OpenSearchDescription>"#,
        webui_name, webui_name, webui_url, webui_url, webui_url
    );

    HttpResponse::Ok()
        .content_type("application/xml")
        .body(xml)
}

// Cache file serving
async fn serve_cache_file(
    _state: web::Data<AppState>,
    _path: web::Path<String>,
) -> Result<HttpResponse, crate::error::AppError> {
    // TODO: Implement cache file serving with path traversal protection
    Err(crate::error::AppError::NotFound(
        "File not found".to_string(),
    ))
}
