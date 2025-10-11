use actix_web::{web, HttpResponse};
use serde::Deserialize;

use crate::error::{AppError, AppResult};
use crate::middleware::{AuthMiddleware, AuthUser};
use crate::models::model::{Model, ModelForm};
use crate::services::model::ModelService;
use crate::AppState;

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
            .wrap(AuthMiddleware)
            .route("", web::get().to(get_models))
            .route("/", web::get().to(get_models))
            .route("/base", web::get().to(get_base_models))
            .route("/create", web::post().to(create_model))
            .route("/export", web::get().to(export_models))
            .route("/import", web::post().to(import_models))
            .route("/sync", web::post().to(sync_models))
            .route("/model", web::get().to(get_model_by_id))
            .route("/model/profile/image", web::get().to(get_model_profile_image))
            .route("/model/toggle", web::post().to(toggle_model_by_id))
            .route("/model/update", web::post().to(update_model_by_id))
            .route("/model/delete", web::delete().to(delete_model_by_id))
            .route("/delete/all", web::delete().to(delete_all_models)),
    );
}

// GET / - Get models for current user
async fn get_models(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    let model_service = ModelService::new(&state.db);

    // Admins with bypass can see all models
    let config = state.config.read().unwrap();
    let bypass_admin_access_control = config.bypass_admin_access_control.unwrap_or(false);

    let models = if auth_user.user.role == "admin" && bypass_admin_access_control {
        model_service.get_models().await?
    } else {
        model_service.get_models_by_user_id(&auth_user.user.id).await?
    };

    Ok(HttpResponse::Ok().json(models))
}

// GET /base - Get base models (admin only)
async fn get_base_models(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let model_service = ModelService::new(&state.db);
    let models = model_service.get_base_models().await?;

    Ok(HttpResponse::Ok().json(models))
}

// POST /create - Create a new model
async fn create_model(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form_data: web::Json<ModelForm>,
) -> AppResult<HttpResponse> {
    // Check user permissions
    if auth_user.user.role != "admin" {
        let config = state.config.read().unwrap();
        let user_permissions = config.user_permissions.clone();
        
        // Check if user has workspace.models permission
        if let Some(workspace) = user_permissions.get("workspace") {
            if !workspace.get("models").and_then(|v| v.as_bool()).unwrap_or(false) {
                return Err(AppError::Forbidden("Permission denied".to_string()));
            }
        } else {
            return Err(AppError::Forbidden("Permission denied".to_string()));
        }
    }

    let model_service = ModelService::new(&state.db);

    // Check if model ID already exists
    if let Some(_) = model_service.get_model_by_id(&form_data.id).await? {
        return Err(AppError::BadRequest("Model ID already taken".to_string()));
    }

    let model = model_service
        .insert_new_model(form_data.into_inner(), &auth_user.user.id)
        .await?;

    Ok(HttpResponse::Ok().json(model))
}

// GET /export - Export all models (admin only)
async fn export_models(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let model_service = ModelService::new(&state.db);
    let models = model_service.get_models().await?;

    Ok(HttpResponse::Ok().json(models))
}

// POST /import - Import models (admin only)
#[derive(Debug, Deserialize)]
struct ImportModelsForm {
    models: Vec<serde_json::Value>,
}

async fn import_models(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form_data: web::Json<ImportModelsForm>,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let model_service = ModelService::new(&state.db);

    for model_data in &form_data.models {
        if let Some(model_id) = model_data["id"].as_str() {
            // Check if model exists
            if let Some(existing) = model_service.get_model_by_id(model_id).await? {
                // Update existing model
                let mut updated_data = existing.clone();
                
                // Merge the imported data
                if let Some(obj) = model_data.as_object() {
                    for (key, value) in obj {
                        match key.as_str() {
                            "id" | "base_model_id" | "name" => {
                                // These are handled by ModelForm
                            }
                            "meta" => {
                                updated_data.meta = serde_json::from_value(value.clone()).unwrap_or_default();
                            }
                            "params" => {
                                updated_data.params = serde_json::from_value(value.clone()).unwrap_or_default();
                            }
                            _ => {}
                        }
                    }
                }

                let form = ModelForm {
                    id: updated_data.id.clone(),
                    base_model_id: updated_data.base_model_id.clone(),
                    name: updated_data.name.clone(),
                    meta: updated_data.meta.unwrap_or_else(|| serde_json::json!({})),
                    params: updated_data.params,
                    access_control: updated_data.access_control,
                };

                model_service.update_model_by_id(model_id, form).await?;
            } else {
                // Insert new model
                let form: ModelForm = serde_json::from_value(model_data.clone())
                    .map_err(|e| AppError::BadRequest(format!("Invalid model data: {}", e)))?;
                
                model_service.insert_new_model(form, &auth_user.user.id).await?;
            }
        }
    }

    Ok(HttpResponse::Ok().json(true))
}

// POST /sync - Sync models (admin only)
#[derive(Debug, Deserialize)]
struct SyncModelsForm {
    models: Vec<Model>,
}

async fn sync_models(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    form_data: web::Json<SyncModelsForm>,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let model_service = ModelService::new(&state.db);
    let synced = model_service
        .sync_models(&auth_user.user.id, form_data.models.clone())
        .await?;

    Ok(HttpResponse::Ok().json(synced))
}

// GET /model?id= - Get model by ID
#[derive(Debug, Deserialize)]
struct ModelQuery {
    id: String,
}

async fn get_model_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    query: web::Query<ModelQuery>,
) -> AppResult<HttpResponse> {
    let model_service = ModelService::new(&state.db);
    
    let model = model_service
        .get_model_by_id(&query.id)
        .await?
        .ok_or(AppError::NotFound("Model not found".to_string()))?;

    // Check access
    let config = state.config.read().unwrap();
    let bypass_admin_access_control = config.bypass_admin_access_control.unwrap_or(false);

    if auth_user.user.role == "admin" && bypass_admin_access_control {
        return Ok(HttpResponse::Ok().json(model));
    }

    if model.user_id == auth_user.user.id {
        return Ok(HttpResponse::Ok().json(model));
    }

        // Check access control
        if let Some(ref access_control) = model.access_control {
            if let Some(read_access) = access_control.get("read") {
                if let Some(_group_ids) = read_access.get("group_ids").and_then(|v| v.as_array()) {
                    // TODO: Check if user is in any of these groups
                    // For now, just allow if access_control exists
                    return Ok(HttpResponse::Ok().json(model));
                }
                if let Some(user_ids) = read_access.get("user_ids").and_then(|v| v.as_array()) {
                    for user_id in user_ids {
                        if user_id.as_str() == Some(&auth_user.user.id) {
                            return Ok(HttpResponse::Ok().json(model));
                        }
                    }
                }
            }
        }

    Err(AppError::Forbidden("Access denied".to_string()))
}

// GET /model/profile/image?id= - Get model profile image
async fn get_model_profile_image(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    query: web::Query<ModelQuery>,
) -> AppResult<HttpResponse> {
    let model_service = ModelService::new(&state.db);
    
    let model = model_service
        .get_model_by_id(&query.id)
        .await?
        .ok_or(AppError::NotFound("Model not found".to_string()))?;

    // Check if model has profile image URL
    if let Some(meta) = &model.meta {
        if let Some(profile_image_url) = meta.get("profile_image_url").and_then(|v| v.as_str()) {
            if profile_image_url.starts_with("http") {
                // Redirect to external URL
                return Ok(HttpResponse::Found()
                    .append_header(("Location", profile_image_url))
                    .finish());
            } else if profile_image_url.starts_with("data:image") {
                // Return base64 encoded image
                if let Some(comma_pos) = profile_image_url.find(',') {
                    let base64_data = &profile_image_url[comma_pos + 1..];
                    // Use base64 crate's Engine trait
                    use base64::{Engine, engine::general_purpose};
                    if let Ok(image_data) = general_purpose::STANDARD.decode(base64_data) {
                        return Ok(HttpResponse::Ok()
                            .content_type("image/png")
                            .body(image_data));
                    }
                }
            }
        }
    }

    // Return default favicon
    let static_dir = std::path::Path::new("../backend/open_webui/static");
    let favicon_path = static_dir.join("favicon.png");
    
    match std::fs::read(favicon_path) {
        Ok(image_data) => Ok(HttpResponse::Ok()
            .content_type("image/png")
            .body(image_data)),
        Err(_) => Err(AppError::NotFound("Default image not found".to_string()))
    }
}

// POST /model/toggle?id= - Toggle model visibility
async fn toggle_model_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    query: web::Query<ModelQuery>,
) -> AppResult<HttpResponse> {
    let model_service = ModelService::new(&state.db);
    
    let model = model_service
        .get_model_by_id(&query.id)
        .await?
        .ok_or(AppError::NotFound("Model not found".to_string()))?;

    // Check permissions
    if auth_user.user.role != "admin" && model.user_id != auth_user.user.id {
        // Check write access
        if let Some(ref access_control) = model.access_control {
            let has_write_access = access_control
                .get("write")
                .and_then(|w| w.get("user_ids"))
                .and_then(|ids| ids.as_array())
                .map(|arr| arr.iter().any(|id| id.as_str() == Some(&auth_user.user.id)))
                .unwrap_or(false);
            
            if !has_write_access {
                return Err(AppError::Forbidden("Access denied".to_string()));
            }
        } else {
            return Err(AppError::Forbidden("Access denied".to_string()));
        }
    }

    let toggled = model_service.toggle_model_by_id(&query.id).await?;

    Ok(HttpResponse::Ok().json(toggled))
}

// POST /model/update?id= - Update model
async fn update_model_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    query: web::Query<ModelQuery>,
    form_data: web::Json<ModelForm>,
) -> AppResult<HttpResponse> {
    let model_service = ModelService::new(&state.db);
    
    let model = model_service
        .get_model_by_id(&query.id)
        .await?
        .ok_or(AppError::NotFound("Model not found".to_string()))?;

    // Check permissions
    if model.user_id != auth_user.user.id && auth_user.user.role != "admin" {
        // Check write access
        if let Some(ref access_control) = model.access_control {
            let has_write_access = access_control
                .get("write")
                .and_then(|w| w.get("user_ids"))
                .and_then(|ids| ids.as_array())
                .map(|arr| arr.iter().any(|id| id.as_str() == Some(&auth_user.user.id)))
                .unwrap_or(false);
            
            if !has_write_access {
                return Err(AppError::Forbidden("Access denied".to_string()));
            }
        } else {
            return Err(AppError::Forbidden("Access denied".to_string()));
        }
    }

    let updated = model_service
        .update_model_by_id(&query.id, form_data.into_inner())
        .await?;

    Ok(HttpResponse::Ok().json(updated))
}

// DELETE /model/delete?id= - Delete model by ID
async fn delete_model_by_id(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    query: web::Query<ModelQuery>,
) -> AppResult<HttpResponse> {
    let model_service = ModelService::new(&state.db);
    
    let model = model_service
        .get_model_by_id(&query.id)
        .await?
        .ok_or(AppError::NotFound("Model not found".to_string()))?;

    // Check permissions
    if auth_user.user.role != "admin" && model.user_id != auth_user.user.id {
        // Check write access
        if let Some(ref access_control) = model.access_control {
            let has_write_access = access_control
                .get("write")
                .and_then(|w| w.get("user_ids"))
                .and_then(|ids| ids.as_array())
                .map(|arr| arr.iter().any(|id| id.as_str() == Some(&auth_user.user.id)))
                .unwrap_or(false);
            
            if !has_write_access {
                return Err(AppError::Forbidden("Access denied".to_string()));
            }
        } else {
            return Err(AppError::Forbidden("Access denied".to_string()));
        }
    }

    let result = model_service.delete_model_by_id(&query.id).await?;

    Ok(HttpResponse::Ok().json(result))
}

// DELETE /delete/all - Delete all models (admin only)
async fn delete_all_models(
    state: web::Data<AppState>,
    auth_user: AuthUser,
) -> AppResult<HttpResponse> {
    if auth_user.user.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let model_service = ModelService::new(&state.db);
    let result = model_service.delete_all_models().await?;

    Ok(HttpResponse::Ok().json(result))
}
