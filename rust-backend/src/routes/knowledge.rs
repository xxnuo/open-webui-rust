use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::{AuthMiddleware, AuthUser};
use crate::models::knowledge::{KnowledgeFilesResponse, KnowledgeResponse, KnowledgeUserResponse};
use crate::services::file::FileService;
use crate::services::group::GroupService;
use crate::services::knowledge::KnowledgeService;
use crate::services::user::UserService;
use crate::utils::misc::{has_access, has_permission};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct KnowledgeForm {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    #[serde(default)]
    pub access_control: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct KnowledgeFileIdForm {
    pub file_id: String,
}

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_knowledge_bases)),
    )
    .service(
        web::resource("/")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_knowledge_bases)),
    )
    .service(
        web::resource("/list")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_knowledge_list)),
    )
    .service(
        web::resource("/create")
            .wrap(AuthMiddleware)
            .route(web::post().to(create_knowledge)),
    )
    .service(
        web::resource("/reindex")
            .wrap(AuthMiddleware)
            .route(web::post().to(reindex_all_knowledge)),
    )
    .service(
        web::resource("/{id}")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_knowledge_by_id)),
    )
    .service(
        web::resource("/{id}/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_knowledge)),
    )
    .service(
        web::resource("/{id}/delete")
            .wrap(AuthMiddleware)
            .route(web::delete().to(delete_knowledge_by_id)),
    )
    .service(
        web::resource("/{id}/file/add")
            .wrap(AuthMiddleware)
            .route(web::post().to(add_file_to_knowledge)),
    )
    .service(
        web::resource("/{id}/file/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_file_in_knowledge)),
    )
    .service(
        web::resource("/{id}/file/remove")
            .wrap(AuthMiddleware)
            .route(web::post().to(remove_file_from_knowledge)),
    )
    .service(
        web::resource("/{id}/reset")
            .wrap(AuthMiddleware)
            .route(web::post().to(reset_knowledge)),
    )
    .service(
        web::resource("/{id}/files/batch/add")
            .wrap(AuthMiddleware)
            .route(web::post().to(add_files_batch)),
    );
}

// GET / - Get knowledge bases with read access
async fn get_knowledge_bases(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let user_service = UserService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let config = state.config.read().unwrap();
    let bypass_admin_access = config.bypass_admin_access_control.unwrap_or(false);
    drop(config);

    let knowledge_bases = if auth_user.user.role == "admin" && bypass_admin_access {
        knowledge_service.get_all_knowledge().await?
    } else {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        let all_knowledge = knowledge_service.get_all_knowledge().await?;
        all_knowledge
            .into_iter()
            .filter(|k| {
                k.user_id == auth_user.user.id
                    || has_access(
                        &auth_user.user.id,
                        "read",
                        &k.access_control,
                        &user_group_ids,
                    )
            })
            .collect()
    };

    // Get unique user IDs
    let user_ids: HashSet<String> = knowledge_bases.iter().map(|k| k.user_id.clone()).collect();

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

    // Get files for each knowledge base
    let mut responses = Vec::new();
    for knowledge in knowledge_bases {
        let mut files = Vec::new();
        if let Some(data) = &knowledge.data {
            if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
                let file_id_strings: Vec<String> = file_ids
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();

                // Get file metadata for each file
                for file_id in file_id_strings {
                    if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                        files.push(json!({
                            "id": file.id,
                            "filename": file.filename,
                            "meta": file.meta,
                            "created_at": file.created_at,
                            "updated_at": file.updated_at,
                        }));
                    }
                }
            }
        }

        let user = users_map.get(&knowledge.user_id).cloned();
        responses.push(KnowledgeUserResponse::from_knowledge_and_user(
            knowledge,
            user,
            Some(files),
        ));
    }

    Ok(HttpResponse::Ok().json(responses))
}

// GET /list - Get knowledge list (with write access)
async fn get_knowledge_list(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let user_service = UserService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let config = state.config.read().unwrap();
    let bypass_admin_access = config.bypass_admin_access_control.unwrap_or(false);
    drop(config);

    let knowledge_bases = if auth_user.user.role == "admin" && bypass_admin_access {
        knowledge_service.get_all_knowledge().await?
    } else {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        let all_knowledge = knowledge_service.get_all_knowledge().await?;
        all_knowledge
            .into_iter()
            .filter(|k| {
                k.user_id == auth_user.user.id
                    || has_access(
                        &auth_user.user.id,
                        "write",
                        &k.access_control,
                        &user_group_ids,
                    )
            })
            .collect()
    };

    // Get unique user IDs
    let user_ids: HashSet<String> = knowledge_bases.iter().map(|k| k.user_id.clone()).collect();

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

    // Get files for each knowledge base
    let mut responses = Vec::new();
    for knowledge in knowledge_bases {
        let mut files = Vec::new();
        if let Some(data) = &knowledge.data {
            if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
                let file_id_strings: Vec<String> = file_ids
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();

                for file_id in file_id_strings {
                    if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                        files.push(json!({
                            "id": file.id,
                            "filename": file.filename,
                            "meta": file.meta,
                            "created_at": file.created_at,
                            "updated_at": file.updated_at,
                        }));
                    }
                }
            }
        }

        let user = users_map.get(&knowledge.user_id).cloned();
        responses.push(KnowledgeUserResponse::from_knowledge_and_user(
            knowledge,
            user,
            Some(files),
        ));
    }

    Ok(HttpResponse::Ok().json(responses))
}

// POST /create - Create new knowledge base
async fn create_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form: web::Json<KnowledgeForm>,
) -> AppResult<HttpResponse> {
    // Check workspace.knowledge permission
    if auth_user.user.role != "admin" {
        let config = state.config.read().unwrap();
        let user_permissions = config.user_permissions.clone();
        drop(config);

        if !has_permission(&auth_user.user.id, "workspace.knowledge", &user_permissions) {
            return Err(AppError::Unauthorized("Unauthorized".to_string()));
        }
    }

    // Check if user can share publicly
    let mut access_control = form.access_control.clone();
    if auth_user.user.role != "admin" && access_control.is_none() {
        let config = state.config.read().unwrap();
        let user_permissions = config.user_permissions.clone();
        drop(config);

        if !has_permission(
            &auth_user.user.id,
            "sharing.public_knowledge",
            &user_permissions,
        ) {
            access_control = Some(json!({}));
        }
    }

    let knowledge_service = KnowledgeService::new(&state.db);
    let knowledge_id = Uuid::new_v4().to_string();

    let mut data = form.data.clone().unwrap_or_else(|| json!({}));
    if data.get("file_ids").is_none() {
        data["file_ids"] = json!([]);
    }

    let knowledge = knowledge_service
        .create_knowledge_with_access_control(
            &knowledge_id,
            &auth_user.user.id,
            &form.name,
            Some(&form.description),
            Some(data),
            access_control,
        )
        .await?;

    Ok(HttpResponse::Ok().json(KnowledgeResponse::from(knowledge)))
}

// GET /{id} - Get knowledge by ID
async fn get_knowledge_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check access: owner, admin, or has read access
    if auth_user.user.role != "admin" && knowledge.user_id != auth_user.user.id {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "read",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Unauthorized("Not found".to_string()));
        }
    }

    // Get files
    let mut files = Vec::new();
    if let Some(data) = &knowledge.data {
        if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
            let file_id_strings: Vec<String> = file_ids
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();

            for file_id in file_id_strings {
                if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                    files.push(json!({
                        "id": file.id,
                        "filename": file.filename,
                        "meta": file.meta,
                        "created_at": file.created_at,
                        "updated_at": file.updated_at,
                    }));
                }
            }
        }
    }

    let response = KnowledgeFilesResponse::from_knowledge_and_files(knowledge, files);
    Ok(HttpResponse::Ok().json(response))
}

// POST /{id}/update - Update knowledge
async fn update_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<KnowledgeForm>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // Check if user can share publicly
    let mut access_control = form.access_control.clone();
    if auth_user.user.role != "admin" && access_control.is_none() {
        let config = state.config.read().unwrap();
        let user_permissions = config.user_permissions.clone();
        drop(config);

        if !has_permission(
            &auth_user.user.id,
            "sharing.public_knowledge",
            &user_permissions,
        ) {
            access_control = Some(json!({}));
        }
    }

    let updated = knowledge_service
        .update_knowledge_full(
            &knowledge_id,
            Some(&form.name),
            Some(&form.description),
            form.data.clone(),
            access_control,
        )
        .await?;

    // Get files
    let mut files = Vec::new();
    if let Some(data) = &updated.data {
        if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
            let file_id_strings: Vec<String> = file_ids
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();

            for file_id in file_id_strings {
                if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                    files.push(json!({
                        "id": file.id,
                        "filename": file.filename,
                        "meta": file.meta,
                        "created_at": file.created_at,
                        "updated_at": file.updated_at,
                    }));
                }
            }
        }
    }

    let response = KnowledgeFilesResponse::from_knowledge_and_files(updated, files);
    Ok(HttpResponse::Ok().json(response))
}

// DELETE /{id}/delete - Delete knowledge by ID
async fn delete_knowledge_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // TODO: Delete vector collection (requires vector DB integration)

    knowledge_service.delete_knowledge(&knowledge_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

// POST /{id}/file/add - Add file to knowledge
async fn add_file_to_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<KnowledgeFileIdForm>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // Check if file exists
    let _file = file_service
        .get_file_by_id(&form.file_id)
        .await?
        .ok_or_else(|| AppError::NotFound("File not found".to_string()))?;

    // TODO: Process file and add to vector DB (requires vector DB integration)

    // Add file ID to knowledge data
    let mut data = knowledge.data.clone().unwrap_or_else(|| json!({}));
    let mut file_ids = data
        .get("file_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<String>>()
        })
        .unwrap_or_default();

    if !file_ids.contains(&form.file_id) {
        file_ids.push(form.file_id.clone());
        data["file_ids"] = json!(file_ids);

        let updated = knowledge_service
            .update_knowledge_data(&knowledge_id, data)
            .await?;

        // Get files
        let mut files = Vec::new();
        if let Some(data) = &updated.data {
            if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
                let file_id_strings: Vec<String> = file_ids
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();

                for file_id in file_id_strings {
                    if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                        files.push(json!({
                            "id": file.id,
                            "filename": file.filename,
                            "meta": file.meta,
                            "created_at": file.created_at,
                            "updated_at": file.updated_at,
                        }));
                    }
                }
            }
        }

        let response = KnowledgeFilesResponse::from_knowledge_and_files(updated, files);
        return Ok(HttpResponse::Ok().json(response));
    }

    Err(AppError::BadRequest(
        "File already in knowledge base".to_string(),
    ))
}

// POST /{id}/file/update - Update file in knowledge
async fn update_file_in_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<KnowledgeFileIdForm>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // Check if file exists
    let _file = file_service
        .get_file_by_id(&form.file_id)
        .await?
        .ok_or_else(|| AppError::NotFound("File not found".to_string()))?;

    // TODO: Remove old content from vector DB and re-index (requires vector DB integration)

    // Get files for response
    let mut files = Vec::new();
    if let Some(data) = &knowledge.data {
        if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
            let file_id_strings: Vec<String> = file_ids
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();

            for file_id in file_id_strings {
                if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                    files.push(json!({
                        "id": file.id,
                        "filename": file.filename,
                        "meta": file.meta,
                        "created_at": file.created_at,
                        "updated_at": file.updated_at,
                    }));
                }
            }
        }
    }

    let response = KnowledgeFilesResponse::from_knowledge_and_files(knowledge, files);
    Ok(HttpResponse::Ok().json(response))
}

// POST /{id}/file/remove - Remove file from knowledge
#[derive(Debug, Deserialize)]
struct RemoveFileQuery {
    delete_file: Option<bool>,
}

async fn remove_file_from_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<KnowledgeFileIdForm>,
    query: web::Query<RemoveFileQuery>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // TODO: Remove content from vector DB (requires vector DB integration)

    // Delete file from database if requested
    let delete_file = query.delete_file.unwrap_or(true);
    if delete_file {
        // TODO: Delete file's collection from vector database
        file_service.delete_file(&form.file_id).await?;
    }

    // Remove file ID from knowledge data
    let mut data = knowledge.data.clone().unwrap_or_else(|| json!({}));
    let mut file_ids = data
        .get("file_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<String>>()
        })
        .unwrap_or_default();

    if let Some(pos) = file_ids.iter().position(|id| id == &form.file_id) {
        file_ids.remove(pos);
        data["file_ids"] = json!(file_ids);

        let updated = knowledge_service
            .update_knowledge_data(&knowledge_id, data)
            .await?;

        // Get files
        let mut files = Vec::new();
        if let Some(data) = &updated.data {
            if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
                let file_id_strings: Vec<String> = file_ids
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();

                for file_id in file_id_strings {
                    if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                        files.push(json!({
                            "id": file.id,
                            "filename": file.filename,
                            "meta": file.meta,
                            "created_at": file.created_at,
                            "updated_at": file.updated_at,
                        }));
                    }
                }
            }
        }

        let response = KnowledgeFilesResponse::from_knowledge_and_files(updated, files);
        return Ok(HttpResponse::Ok().json(response));
    }

    Err(AppError::BadRequest(
        "File not in knowledge base".to_string(),
    ))
}

// POST /{id}/reset - Reset knowledge (delete all files and vector data)
async fn reset_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // TODO: Delete vector collection (requires vector DB integration)

    // Reset file_ids to empty array
    let data = json!({"file_ids": []});
    let updated = knowledge_service
        .update_knowledge_data(&knowledge_id, data)
        .await?;

    Ok(HttpResponse::Ok().json(updated))
}

// POST /reindex - Reindex all knowledge files (admin only)
async fn reindex_all_knowledge(
    _state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Unauthorized("Unauthorized".to_string()));
    }

    // TODO: Reindex all knowledge bases (requires vector DB integration)

    Ok(HttpResponse::Ok().json(true))
}

// POST /{id}/files/batch/add - Add multiple files to knowledge
async fn add_files_batch(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<Vec<KnowledgeFileIdForm>>,
) -> AppResult<HttpResponse> {
    let knowledge_service = KnowledgeService::new(&state.db);
    let file_service = FileService::new(&state.db);

    let knowledge = knowledge_service
        .get_knowledge_by_id(&knowledge_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Knowledge not found".to_string()))?;

    // Check write access
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        let group_service = GroupService::new(&state.db);
        let groups = group_service
            .get_groups_by_member_id(&auth_user.user.id)
            .await?;
        let user_group_ids: HashSet<String> = groups.into_iter().map(|g| g.id).collect();

        if !has_access(
            &auth_user.user.id,
            "write",
            &knowledge.access_control,
            &user_group_ids,
        ) {
            return Err(AppError::Forbidden("Access prohibited".to_string()));
        }
    }

    // TODO: Process files in batch and add to vector DB (requires vector DB integration)

    // Add file IDs to knowledge data
    let mut data = knowledge.data.clone().unwrap_or_else(|| json!({}));
    let mut file_ids = data
        .get("file_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<String>>()
        })
        .unwrap_or_default();

    for file_form in form.iter() {
        if !file_ids.contains(&file_form.file_id) {
            file_ids.push(file_form.file_id.clone());
        }
    }

    data["file_ids"] = json!(file_ids);
    let updated = knowledge_service
        .update_knowledge_data(&knowledge_id, data)
        .await?;

    // Get files
    let mut files = Vec::new();
    if let Some(data) = &updated.data {
        if let Some(file_ids) = data.get("file_ids").and_then(|v| v.as_array()) {
            let file_id_strings: Vec<String> = file_ids
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();

            for file_id in file_id_strings {
                if let Ok(Some(file)) = file_service.get_file_by_id(&file_id).await {
                    files.push(json!({
                        "id": file.id,
                        "filename": file.filename,
                        "meta": file.meta,
                        "created_at": file.created_at,
                        "updated_at": file.updated_at,
                    }));
                }
            }
        }
    }

    let response = KnowledgeFilesResponse::from_knowledge_and_files(updated, files);
    Ok(HttpResponse::Ok().json(response))
}
