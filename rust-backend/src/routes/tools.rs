use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use std::collections::{HashMap, HashSet};
use validator::Validate;

use crate::error::{AppError, AppResult};
use crate::middleware::{AuthMiddleware, AuthUser};
use crate::models::tool::ToolUserResponse;
use crate::services::group::GroupService;
use crate::services::tool::ToolService;
use crate::services::user::UserService;
use crate::utils::misc::{has_access, has_permission};
use crate::AppState;

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

#[derive(Debug, Deserialize)]
struct LoadUrlForm {
    url: String,
}

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tools)),
    )
    .service(
        web::resource("/")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tools)),
    )
    .service(
        web::resource("/list")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_list)),
    )
    .service(
        web::resource("/export")
            .wrap(AuthMiddleware)
            .route(web::get().to(export_tools)),
    )
    .service(
        web::resource("/create")
            .wrap(AuthMiddleware)
            .route(web::post().to(create_new_tool)),
    )
    .service(
        web::resource("/id/{id}")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_by_id)),
    )
    .service(
        web::resource("/id/{id}/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_tool_by_id)),
    )
    .service(
        web::resource("/id/{id}/delete")
            .wrap(AuthMiddleware)
            .route(web::delete().to(delete_tool_by_id)),
    )
    .service(
        web::resource("/id/{id}/valves")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_valves)),
    )
    .service(
        web::resource("/id/{id}/valves/spec")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_valves_spec)),
    )
    .service(
        web::resource("/id/{id}/valves/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_tool_valves)),
    )
    .service(
        web::resource("/id/{id}/valves/user")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_user_valves)),
    )
    .service(
        web::resource("/id/{id}/valves/user/spec")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_tool_user_valves_spec)),
    )
    .service(
        web::resource("/id/{id}/valves/user/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_tool_user_valves)),
    )
    .service(
        web::resource("/load/url")
            .wrap(AuthMiddleware)
            .route(web::post().to(load_tool_from_url)),
    );
}

fn github_url_to_raw_url(url: &str) -> String {
    // Handle 'tree' (folder) URLs
    if let Some(caps) = regex::Regex::new(r"https://github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.*)")
        .unwrap()
        .captures(url)
    {
        let org = &caps[1];
        let repo = &caps[2];
        let branch = &caps[3];
        let path = caps[4].trim_end_matches('/');
        return format!(
            "https://raw.githubusercontent.com/{}/{}/refs/heads/{}/{}/main.py",
            org, repo, branch, path
        );
    }

    // Handle 'blob' (file) URLs
    if let Some(caps) = regex::Regex::new(r"https://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.*)")
        .unwrap()
        .captures(url)
    {
        let org = &caps[1];
        let repo = &caps[2];
        let branch = &caps[3];
        let path = &caps[4];
        return format!(
            "https://raw.githubusercontent.com/{}/{}/refs/heads/{}/{}",
            org, repo, branch, path
        );
    }

    url.to_string()
}

// POST /load/url - Load tool from URL (admin only)
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
        && !file_name.starts_with("__init__.py")
    {
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

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to fetch URL: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::BadRequest(format!(
            "Failed to fetch tool: HTTP {}",
            response.status()
        )));
    }

    let content = response
        .text()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to read response: {}", e)))?;

    if content.is_empty() {
        return Err(AppError::BadRequest(
            "No data received from the URL".to_string(),
        ));
    }

    Ok(HttpResponse::Ok().json(json!({
        "name": tool_name,
        "content": content,
    })))
}

// GET / - Get all tools with access filtering
async fn get_tools(state: web::Data<AppState>, auth_user: AuthUser) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let user_service = UserService::new(&state.db);

    let config = state.config.read().unwrap();
    let bypass_admin_access = config.bypass_admin_access_control.unwrap_or(false);
    drop(config);

    let tools = if auth_user.user.role == "admin" && bypass_admin_access {
        tool_service.get_all_tools().await?
    } else {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        let all_tools = tool_service.get_all_tools().await?;
        all_tools
            .into_iter()
            .filter(|t| {
                t.user_id == auth_user.user.id
                    || has_access(&auth_user.user.id, "read", &t.get_access_control(), &user_group_ids)
            })
            .collect()
    };

    // Get unique user IDs
    let user_ids: HashSet<String> = tools.iter().map(|t| t.user_id.clone()).collect();

    // Fetch users
    let mut users_map: HashMap<String, serde_json::Value> = HashMap::new();
    for user_id in user_ids {
        if let Ok(Some(user)) = user_service.get_user_by_id(&user_id).await {
            users_map.insert(
                user_id.clone(),
                json!({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "profile_image_url": user.profile_image_url,
                }),
            );
        }
    }

    // TODO: Implement OpenAPI Tool Servers integration
    // TODO: Implement MCP Tool Servers integration

    let response: Vec<ToolUserResponse> = tools
        .into_iter()
        .map(|t| {
            let user = users_map.get(&t.user_id).cloned();
            // TODO: Implement UserValves detection
            ToolUserResponse::from_tool_and_user(t, user, Some(false))
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

// GET /list - Get tool list (with write access)
async fn get_tool_list(state: web::Data<AppState>, auth_user: AuthUser) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);
    let user_service = UserService::new(&state.db);

    let config = state.config.read().unwrap();
    let bypass_admin_access = config.bypass_admin_access_control.unwrap_or(false);
    drop(config);

    let tools = if auth_user.user.role == "admin" && bypass_admin_access {
        tool_service.get_all_tools().await?
    } else {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        let all_tools = tool_service.get_all_tools().await?;
        all_tools
            .into_iter()
            .filter(|t| {
                t.user_id == auth_user.user.id
                    || has_access(&auth_user.user.id, "write", &t.get_access_control(), &user_group_ids)
            })
            .collect()
    };

    // Get unique user IDs
    let user_ids: HashSet<String> = tools.iter().map(|t| t.user_id.clone()).collect();

    // Fetch users
    let mut users_map: HashMap<String, serde_json::Value> = HashMap::new();
    for user_id in user_ids {
        if let Ok(Some(user)) = user_service.get_user_by_id(&user_id).await {
            users_map.insert(
                user_id.clone(),
                json!({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "profile_image_url": user.profile_image_url,
                }),
            );
        }
    }

    let response: Vec<ToolUserResponse> = tools
        .into_iter()
        .map(|t| {
            let user = users_map.get(&t.user_id).cloned();
            ToolUserResponse::from_tool_and_user(t, user, Some(false))
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

// GET /export - Export all tools (admin only)
async fn export_tools(state: web::Data<AppState>, auth_user: AuthUser) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let tool_service = ToolService::new(&state.db);
    let tools = tool_service.get_all_tools().await?;

    Ok(HttpResponse::Ok().json(tools))
}

// POST /create - Create a new tool
async fn create_new_tool(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form: web::Json<ToolForm>,
) -> AppResult<HttpResponse> {
    // Check workspace.tools permission
    if auth_user.user.role != "admin" {
        let config = state.config.read().unwrap();
        let user_permissions = config.user_permissions.clone();
        drop(config);

        if !has_permission(&auth_user.user.id, "workspace.tools", &user_permissions) {
            return Err(AppError::Unauthorized("Unauthorized".to_string()));
        }
    }

    form.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Validate tool ID (alphanumeric and underscores only)
    if !form.id.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err(AppError::BadRequest(
            "Only alphanumeric characters and underscores are allowed in the id".to_string(),
        ));
    }

    let tool_id = form.id.to_lowercase();
    let tool_service = ToolService::new(&state.db);

    // Check if tool already exists
    if tool_service.get_tool_by_id(&tool_id).await?.is_some() {
        return Err(AppError::BadRequest("Tool ID already exists".to_string()));
    }

    // TODO: Parse tool module and extract specs (requires Python integration)
    // For now, create tool with empty specs
    let specs = json!([]);

    let tool = tool_service
        .create_tool(
            &tool_id,
            &auth_user.user.id,
            &form.name,
            &form.content,
            specs,
            form.meta.clone(),
            form.access_control.clone(),
        )
        .await?;

    Ok(HttpResponse::Ok().json(tool))
}

// GET /id/{id} - Get tool by ID
async fn get_tool_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    // Check access
    if auth_user.user.role != "admin" && tool.user_id != auth_user.user.id {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "read",
            &tool.get_access_control(),
            &user_group_ids,
        ) {
            return Err(AppError::Unauthorized("Tool not found".to_string()));
        }
    }

    Ok(HttpResponse::Ok().json(tool))
}

// POST /id/{id}/update - Update tool by ID
async fn update_tool_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
    form: web::Json<ToolForm>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    // Check write access
    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &tool.get_access_control(),
            &user_group_ids,
        ) {
            return Err(AppError::Unauthorized("Unauthorized".to_string()));
        }
    }

    // TODO: Parse tool module and extract specs
    let specs = json!([]);

    let updated_tool = tool_service
        .update_tool(
            &id,
            Some(&form.name),
            Some(&form.content),
            Some(specs),
            Some(form.meta.clone()),
            form.access_control.clone(),
        )
        .await?;

    Ok(HttpResponse::Ok().json(updated_tool))
}

// DELETE /id/{id}/delete - Delete tool by ID
async fn delete_tool_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    // Check write access
    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &tool.get_access_control(),
            &user_group_ids,
        ) {
            return Err(AppError::Unauthorized("Unauthorized".to_string()));
        }
    }

    tool_service.delete_tool(&id).await?;

    Ok(HttpResponse::Ok().json(true))
}

// GET /id/{id}/valves - Get tool valves
async fn get_tool_valves(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    let valves = tool.valves.unwrap_or_else(|| json!({}));
    Ok(HttpResponse::Ok().json(valves))
}

// GET /id/{id}/valves/spec - Get tool valves spec
async fn get_tool_valves_spec(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    _id: web::Path<String>,
) -> AppResult<HttpResponse> {
    // TODO: Implement tool module loading and Valves spec extraction
    Ok(HttpResponse::Ok().json(json!(null)))
}

// POST /id/{id}/valves/update - Update tool valves
async fn update_tool_valves(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
    valves: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    // Check write access
    if tool.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &tool.get_access_control(),
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    let valves_data = valves.into_inner();
    tool_service
        .update_tool_valves(&id, valves_data.clone())
        .await?;

    Ok(HttpResponse::Ok().json(valves_data))
}

// GET /id/{id}/valves/user - Get tool user valves
async fn get_tool_user_valves(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let _tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    // TODO: Get user valves from user settings
    // For now, return empty object
    Ok(HttpResponse::Ok().json(json!({})))
}

// GET /id/{id}/valves/user/spec - Get tool user valves spec
async fn get_tool_user_valves_spec(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    _id: web::Path<String>,
) -> AppResult<HttpResponse> {
    // TODO: Implement UserValves spec extraction
    Ok(HttpResponse::Ok().json(json!(null)))
}

// POST /id/{id}/valves/user/update - Update tool user valves
async fn update_tool_user_valves(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    id: web::Path<String>,
    valves: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let tool_service = ToolService::new(&state.db);

    let _tool = tool_service
        .get_tool_by_id(&id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tool not found".to_string()))?;

    // TODO: Update user valves in user settings
    let valves_data = valves.into_inner();
    Ok(HttpResponse::Ok().json(valves_data))
}
