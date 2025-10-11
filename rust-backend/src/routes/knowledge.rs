use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppResult;
use crate::middleware::{AuthMiddleware, AuthUser};
use crate::services::knowledge::KnowledgeService;
use crate::models::knowledge::KnowledgeResponse;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct KnowledgeForm {
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    #[serde(default)]
    pub meta: Option<serde_json::Value>,
    #[serde(default)]
    pub access_control: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKnowledgeForm {
    pub name: Option<String>,
    pub description: Option<String>,
    pub data: Option<serde_json::Value>,
    pub meta: Option<serde_json::Value>,
    pub access_control: Option<serde_json::Value>,
}

// GET / - Get knowledge bases
async fn get_knowledge_bases(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    // Check if admin should bypass access control
    let config = state.config.read().unwrap();
    let bypass_admin_access = config.bypass_admin_access_control.unwrap_or(false);
    drop(config);
    
    let knowledge_bases = if auth_user.user.role == "admin" && bypass_admin_access {
        service.get_all_knowledge().await?
    } else {
        // TODO: Implement access control filtering
        // For now, return user's knowledge bases
        service.get_knowledge_by_user_id(&auth_user.user.id).await?
    };
    
    // TODO: Get files for each knowledge base and check integrity
    // For now, return knowledge bases without file details
    
    let responses: Vec<KnowledgeResponse> = knowledge_bases.into_iter().map(|k| k.into()).collect();
    Ok(HttpResponse::Ok().json(responses))
}

// GET /list - Get knowledge list (with write access)
async fn get_knowledge_list(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let config = state.config.read().unwrap();
    let bypass_admin_access = config.bypass_admin_access_control.unwrap_or(false);
    drop(config);
    
    let knowledge_bases = if auth_user.user.role == "admin" && bypass_admin_access {
        service.get_all_knowledge().await?
    } else {
        // TODO: Filter by write access
        service.get_knowledge_by_user_id(&auth_user.user.id).await?
    };
    
    let responses: Vec<KnowledgeResponse> = knowledge_bases.into_iter().map(|k| k.into()).collect();
    Ok(HttpResponse::Ok().json(responses))
}

// POST /create - Create new knowledge base
async fn create_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form: web::Json<KnowledgeForm>,
) -> AppResult<HttpResponse> {
    // TODO: Check workspace.knowledge permission
    // if auth_user.user.role != "admin" && !has_permission(...) { return 401; }
    
    let service = KnowledgeService::new(&state.db);
    
    let knowledge_id = Uuid::new_v4().to_string();
    let knowledge = service.create_knowledge(
        &knowledge_id,
        &auth_user.user.id,
        &form.name,
        form.description.as_deref(),
        form.data.clone(),
    ).await?;
    
    let response: KnowledgeResponse = knowledge.into();
    Ok(HttpResponse::Ok().json(response))
}

// GET /{id} - Get knowledge by ID
async fn get_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let knowledge = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if knowledge.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let knowledge = knowledge.unwrap();
    
    // Check access: owner or admin
    if knowledge.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        // TODO: Check access_control
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let response: KnowledgeResponse = knowledge.into();
    Ok(HttpResponse::Ok().json(response))
}

// POST /{id}/update - Update knowledge
async fn update_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<UpdateKnowledgeForm>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        // TODO: Check write access_control
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    let updated = service.update_knowledge(
        &knowledge_id,
        form.name.as_deref(),
        form.description.as_deref(),
        form.data.clone(),
    ).await?;
    
    let response: KnowledgeResponse = updated.into();
    Ok(HttpResponse::Ok().json(response))
}

// DELETE /{id}/delete - Delete knowledge
async fn delete_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::Ok().json(false));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Ok(HttpResponse::Ok().json(false));
    }
    
    service.delete_knowledge(&knowledge_id).await?;
    
    // TODO: Delete associated files
    // TODO: Delete from vector DB
    
    Ok(HttpResponse::Ok().json(true))
}

// POST /{id}/file/add - Add file to knowledge
async fn add_file_to_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    // TODO: Add file ID to knowledge data.file_ids array
    // TODO: Process file and add to vector DB
    
    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "File operations not yet implemented"
    })))
}

// POST /{id}/file/remove - Remove file from knowledge
async fn remove_file_from_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    // TODO: Remove file ID from knowledge data.file_ids array
    // TODO: Remove from vector DB
    
    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "File operations not yet implemented"
    })))
}

// POST /{id}/reset - Reset knowledge (re-index all files)
async fn reset_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    // TODO: Delete vector collection and re-index all files
    
    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Vector DB reset not yet implemented"
    })))
}

// POST /{id}/file/update - Update file in knowledge
async fn update_file_in_knowledge(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    _form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    // TODO: Update file metadata and re-index
    
    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "File update not yet implemented"
    })))
}

// POST /reindex - Reindex all knowledge files
async fn reindex_all_knowledge(
    _state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    // TODO: Check permission
    if auth_user.user.role != "admin" {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    // TODO: Reindex all knowledge bases
    
    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Reindex not yet implemented"
    })))
}

// POST /{id}/files/batch/add - Add multiple files to knowledge
async fn add_files_batch(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    knowledge_id: web::Path<String>,
    _form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    let service = KnowledgeService::new(&state.db);
    
    let existing = service.get_knowledge_by_id(&knowledge_id).await?;
    
    if existing.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "detail": "Knowledge not found"
        })));
    }
    
    let existing = existing.unwrap();
    
    // Check write access
    if existing.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "detail": "Unauthorized"
        })));
    }
    
    // TODO: Add multiple files and process in batch
    
    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Batch file operations not yet implemented"
    })))
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
            .route(web::get().to(get_knowledge)),
    )
    .service(
        web::resource("/{id}/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_knowledge)),
    )
    .service(
        web::resource("/{id}/delete")
            .wrap(AuthMiddleware)
            .route(web::delete().to(delete_knowledge)),
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
