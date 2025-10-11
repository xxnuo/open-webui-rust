use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use validator::Validate;

use crate::error::{AppError, AppResult};
use crate::middleware::{AuthMiddleware, AuthUser};
use crate::services::tool::ToolService;
use crate::AppState;

#[derive(Debug, Serialize)]
struct ToolUserResponse {
    id: String,
    user_id: String,
    name: String,
    meta: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    access_control: Option<serde_json::Value>,
    updated_at: i64,
    created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    has_user_valves: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
struct ToolForm {
    #[validate(length(min = 1))]
    id: String,
    #[validate(length(min = 1))]
    name: String,
    content: String,
    meta: serde_json::Value,
    #[serde(default)]
    access_control: Option<serde_json::Value>,
}

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tools))
    )
    .service(
        web::resource("/")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tools))
    )
    .service(
        web::resource("/list")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_list))
    )
    .service(
        web::resource("/export")
            .wrap(AuthMiddleware)
            .route(web::get().to(export_tools))
    )
    .service(
        web::resource("/create")
            .wrap(AuthMiddleware)
            .route(web::post().to(create_new_tool))
    )
    .service(
        web::resource("/id/{id}")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_by_id))
    )
    .service(
        web::resource("/id/{id}/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_tool_by_id))
    )
    .service(
        web::resource("/id/{id}/delete")
            .wrap(AuthMiddleware)
            .route(web::delete().to(delete_tool_by_id))
    )
    .service(
        web::resource("/id/{id}/valves")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_valves))
    )
    .service(
        web::resource("/id/{id}/valves/spec")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_valves_spec))
    )
    .service(
        web::resource("/id/{id}/valves/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_tool_valves))
    )
    .service(
        web::resource("/id/{id}/valves/user")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_user_valves))
    )
    .service(
        web::resource("/id/{id}/valves/user/spec")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_user_valves_spec))
    )
    .service(
        web::resource("/id/{id}/valves/user/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_tool_user_valves))
    )
    .service(
        web::resource("/load/url")
            .wrap(AuthMiddleware)
            .route(web::post().to(load_tool_from_url))
    );
}

#[derive(Debug, Deserialize)]
struct LoadUrlForm {
    url: String,
}

fn github_url_to_raw_url(url: &str) -> String {
    // Handle 'tree' (folder) URLs
    if let Some(caps) = regex::Regex::new(r"https://github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.*)").unwrap().captures(url) {
        let org = &caps[1];
        let repo = &caps[2];
        let branch = &caps[3];
        let path = caps[4].trim_end_matches('/');
        return format!("https://raw.githubusercontent.com/{}/{}/refs/heads/{}/{}/main.py", org, repo, branch, path);
    }
    
    // Handle 'blob' (file) URLs
    if let Some(caps) = regex::Regex::new(r"https://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.*)").unwrap().captures(url) {
        let org = &caps[1];
        let repo = &caps[2];
        let branch = &caps[3];
        let path = &caps[4];
        return format!("https://raw.githubusercontent.com/{}/{}/refs/heads/{}/{}", org, repo, branch, path);
    }
    
    url.to_string()
}

async fn load_tool_from_url(
    _state: web::Data<AppState>,
    auth_user: AuthUser,
    form: web::Json<LoadUrlForm>,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }
    
    let url = form.url.clone();
    if url.is_empty() {
        return Err(AppError::BadRequest("Please enter a valid URL".to_string()));
    }
    
    // Transform GitHub URLs to raw content URLs
    let url = github_url_to_raw_url(&url);
    let url_parts: Vec<&str> = url.trim_end_matches('/').split('/').collect();
    
    let file_name = url_parts.last().unwrap_or(&"tool");
    let tool_name = if file_name.ends_with(".py") 
        && !file_name.starts_with("main.py") 
        && !file_name.starts_with("index.py") 
        && !file_name.starts_with("__init__.py") {
        file_name.trim_end_matches(".py")
    } else if url_parts.len() > 1 {
        url_parts[url_parts.len() - 2]
    } else {
        "tool"
    };
    
    // Fetch content from URL
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::BadRequest(format!("Failed to create HTTP client: {}", e)))?;
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to fetch URL: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::BadRequest(format!("Failed to fetch tool: HTTP {}", response.status())));
    }
    
    let content = response.text()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to read response: {}", e)))?;
    
    if content.is_empty() {
        return Err(AppError::BadRequest("No data received from the URL".to_string()));
    }
    
    Ok(HttpResponse::Ok().json(json!({
        "name": tool_name,
        "content": content,
    })))
}

async fn get_tools(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tools = tool_service.get_all_tools().await?;
    
    // Filter based on access control - for now return all as the frontend will handle filtering
    let response: Vec<ToolUserResponse> = tools
        .iter()
        .map(|tool| ToolUserResponse {
            id: tool.id.clone(),
            user_id: tool.user_id.clone(),
            name: tool.name.clone(),
            meta: tool.meta.clone().unwrap_or(json!({"description": ""})),
            access_control: tool.access_control.clone(),
            updated_at: tool.updated_at,
            created_at: tool.created_at,
            has_user_valves: Some(false), // TODO: Implement UserValves check
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

async fn get_tool_list(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tools = if auth_user.user.role == "admin" {
        tool_service.get_all_tools().await?
    } else {
        tool_service.get_tools_by_user_id(&auth_user.user.id).await?
    };
    
    let response: Vec<ToolUserResponse> = tools
        .iter()
        .map(|tool| ToolUserResponse {
            id: tool.id.clone(),
            user_id: tool.user_id.clone(),
            name: tool.name.clone(),
            meta: tool.meta.clone().unwrap_or(json!({"description": ""})),
            access_control: tool.access_control.clone(),
            updated_at: tool.updated_at,
            created_at: tool.created_at,
            has_user_valves: Some(false),
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

async fn export_tools(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }
    
    let tool_service = ToolService::new(&state.db);
    let tools = tool_service.get_all_tools().await?;
    
    Ok(HttpResponse::Ok().json(tools))
}

async fn create_new_tool(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form: web::Json<ToolForm>,
) -> AppResult<HttpResponse> {
    // TODO: Check permissions
    form.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    
    let tool_service = ToolService::new(&state.db);
    
    // Check if tool already exists
    if let Some(_) = tool_service.get_tool_by_id(&form.id).await? {
        return Err(AppError::Conflict("Tool ID already exists".to_string()));
    }
    
    // Create tool with empty specs for now (would need tool module parsing in production)
    let specs = json!([]);
    let tool = tool_service.create_tool(
        &form.id,
        &auth_user.user.id,
        &form.name,
        &form.content,
        specs,
        form.meta.clone(),
        form.access_control.clone(),
    ).await?;
    
    Ok(HttpResponse::Ok().json(tool))
}

async fn get_tool_by_id(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    // TODO: Check access control
    Ok(HttpResponse::Ok().json(tool))
}

async fn update_tool_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
    form: web::Json<ToolForm>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    // Check ownership or access
    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }
    
    let specs = json!([]);
    let updated_tool = tool_service.update_tool(
        &id,
        Some(&form.name),
        Some(&form.content),
        Some(specs),
        Some(form.meta.clone()),
        form.access_control.clone(),
    ).await?;
    
    Ok(HttpResponse::Ok().json(updated_tool))
}

async fn delete_tool_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    // Check ownership or access
    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }
    
    tool_service.delete_tool(&id).await?;
    
    Ok(HttpResponse::Ok().json(true))
}

async fn get_tool_valves(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    let valves = tool.valves.unwrap_or(json!({}));
    Ok(HttpResponse::Ok().json(valves))
}

async fn get_tool_valves_spec(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    _id: web::Path<String>,
) -> AppResult<HttpResponse> {
    // TODO: Implement tool module loading and Valves spec extraction
    Ok(HttpResponse::Ok().json(json!(null)))
}

async fn update_tool_valves(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
    valves: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    // Check ownership or access
    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }
    
    let valves_data = valves.into_inner();
    tool_service.update_tool_valves(&id, valves_data.clone()).await?;
    Ok(HttpResponse::Ok().json(valves_data))
}

async fn get_tool_user_valves(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let _tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    // TODO: Get user valves from user settings
    Ok(HttpResponse::Ok().json(json!({})))
}

async fn get_tool_user_valves_spec(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    _id: web::Path<String>,
) -> AppResult<HttpResponse> {
    // TODO: Implement UserValves spec extraction
    Ok(HttpResponse::Ok().json(json!(null)))
}

async fn update_tool_user_valves(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    id: web::Path<String>,
    valves: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let _tool = tool_service.get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;
    
    // TODO: Update user valves in user settings
    let valves_data = valves.into_inner();
    Ok(HttpResponse::Ok().json(valves_data))
}
