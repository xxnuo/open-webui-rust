use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::db::Database;
use crate::error::AppResult;
use crate::middleware::auth::{AdminMiddleware, AuthUser};

#[derive(Debug, Serialize)]
struct PipelineInfo {
    url: String,
    idx: usize,
}

#[derive(Debug, Serialize)]
struct PipelineListResponse {
    data: Vec<PipelineInfo>,
}

// GET /list - Get pipelines list (admin only)
async fn get_pipelines_list(
    _db: web::Data<Database>,
    config: web::Data<Config>,
    _user: AuthUser,
) -> AppResult<HttpResponse> {
    // TODO: Implement get_all_models_responses to check which URLs have pipelines
    // For now, return empty list

    let pipeline_urls: Vec<PipelineInfo> = vec![];

    Ok(HttpResponse::Ok().json(PipelineListResponse {
        data: pipeline_urls,
    }))
}

// POST /upload - Upload pipeline (admin only)
async fn upload_pipeline(
    _db: web::Data<Database>,
    _user: AuthUser,
    _form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    // TODO: Implement pipeline upload with multipart
    // This requires file upload and processing

    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Pipeline upload not yet implemented"
    })))
}

// POST /add - Add pipeline from URL (admin only)
async fn add_pipeline(
    _db: web::Data<Database>,
    _user: AuthUser,
    _form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    // TODO: Implement pipeline addition from URL

    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Pipeline add not yet implemented"
    })))
}

// DELETE /delete - Delete pipeline (admin only)
async fn delete_pipeline(
    _db: web::Data<Database>,
    _user: AuthUser,
    _form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    // TODO: Implement pipeline deletion

    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Pipeline deletion not yet implemented"
    })))
}

// GET / - Get all pipelines (admin only)
async fn get_all_pipelines(_db: web::Data<Database>, _user: AuthUser) -> AppResult<HttpResponse> {
    // TODO: Get all pipelines from configured URLs

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "data": []
    })))
}

// GET /{pipeline_id}/valves - Get pipeline valves (admin only)
async fn get_pipeline_valves(
    _db: web::Data<Database>,
    _user: AuthUser,
    _pipeline_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    // TODO: Get pipeline valves configuration

    Ok(HttpResponse::Ok().json(serde_json::json!({})))
}

// GET /{pipeline_id}/valves/spec - Get pipeline valves spec (admin only)
async fn get_pipeline_valves_spec(
    _db: web::Data<Database>,
    _user: AuthUser,
    _pipeline_id: web::Path<String>,
) -> AppResult<HttpResponse> {
    // TODO: Get pipeline valves specification

    Ok(HttpResponse::Ok().json(serde_json::json!(null)))
}

// POST /{pipeline_id}/valves/update - Update pipeline valves (admin only)
async fn update_pipeline_valves(
    _db: web::Data<Database>,
    _user: AuthUser,
    _pipeline_id: web::Path<String>,
    _form: web::Json<serde_json::Value>,
) -> AppResult<HttpResponse> {
    // TODO: Update pipeline valves configuration

    Ok(HttpResponse::NotImplemented().json(serde_json::json!({
        "detail": "Pipeline valves update not yet implemented"
    })))
}

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/pipelines")
            .wrap(AdminMiddleware)
            .route(web::get().to(get_all_pipelines)),
    )
    .service(
        web::resource("/pipelines/list")
            .wrap(AdminMiddleware)
            .route(web::get().to(get_pipelines_list)),
    )
    .service(
        web::resource("/pipelines/upload")
            .wrap(AdminMiddleware)
            .route(web::post().to(upload_pipeline)),
    )
    .service(
        web::resource("/pipelines/add")
            .wrap(AdminMiddleware)
            .route(web::post().to(add_pipeline)),
    )
    .service(
        web::resource("/pipelines/delete")
            .wrap(AdminMiddleware)
            .route(web::delete().to(delete_pipeline)),
    )
    .service(
        web::resource("/pipelines/{pipeline_id}/valves")
            .wrap(AdminMiddleware)
            .route(web::get().to(get_pipeline_valves)),
    )
    .service(
        web::resource("/pipelines/{pipeline_id}/valves/spec")
            .wrap(AdminMiddleware)
            .route(web::get().to(get_pipeline_valves_spec)),
    )
    .service(
        web::resource("/pipelines/{pipeline_id}/valves/update")
            .wrap(AdminMiddleware)
            .route(web::post().to(update_pipeline_valves)),
    );
}
