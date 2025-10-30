use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::{
    error::{AppError, AppResult},
    middleware::{AdminMiddleware, AuthMiddleware, AuthUser},
    AppState,
};

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
            .wrap(AuthMiddleware)
            .route("/gravatar", web::get().to(get_gravatar))
            .route("/markdown", web::post().to(get_html_from_markdown))
            .route("/pdf", web::post().to(download_chat_as_pdf))
            .service(
                web::scope("/code")
                    .wrap(AdminMiddleware)
                    .route("/format", web::post().to(format_code))
                    .route("/execute", web::post().to(execute_code)),
            )
            .service(
                web::scope("/db")
                    .wrap(AdminMiddleware)
                    .route("/download", web::get().to(download_db)),
            ),
    );
}

#[derive(Debug, Deserialize)]
struct GravatarQuery {
    email: String,
}

/// GET /gravatar - Get gravatar URL for email
async fn get_gravatar(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    query: web::Query<GravatarQuery>,
) -> AppResult<HttpResponse> {
    let email = query.email.trim().to_lowercase();
    // Simple MD5 hash implementation for gravatar
    // TODO: Add md5 crate dependency or use a different method
    let hash = format!("{:x}", md5::compute(email.as_bytes()));

    let gravatar_url = format!("https://www.gravatar.com/avatar/{}", hash);
    Ok(HttpResponse::Ok().json(gravatar_url))
}

#[derive(Debug, Deserialize)]
struct MarkdownForm {
    md: String,
}

#[derive(Debug, Serialize)]
struct HtmlResponse {
    html: String,
}

/// POST /markdown - Convert markdown to HTML
async fn get_html_from_markdown(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    form_data: web::Json<MarkdownForm>,
) -> AppResult<HttpResponse> {
    // TODO: Use a markdown parser like pulldown-cmark or comrak
    // For now, return the markdown as-is
    let html = format!("<pre>{}</pre>", form_data.md);

    Ok(HttpResponse::Ok().json(HtmlResponse { html }))
}

#[derive(Debug, Deserialize)]
struct ChatTitleMessagesForm {
    title: String,
    messages: Vec<serde_json::Value>,
}

/// POST /pdf - Generate PDF from chat
async fn download_chat_as_pdf(
    _state: web::Data<AppState>,
    _auth_user: AuthUser,
    _form_data: web::Json<ChatTitleMessagesForm>,
) -> AppResult<HttpResponse> {
    // TODO: Implement PDF generation
    // This would require a PDF library like printpdf or genpdf
    Err(AppError::NotImplemented(
        "PDF generation not yet implemented".to_string(),
    ))
}

#[derive(Debug, Deserialize)]
struct CodeForm {
    code: String,
}

#[derive(Debug, Serialize)]
struct CodeResponse {
    code: String,
}

/// POST /code/format - Format JSON/YAML/Python code (admin only)
async fn format_code(
    _state: web::Data<AppState>,
    _auth_user: AuthUser, // AdminMiddleware already checked
    form_data: web::Json<CodeForm>,
) -> AppResult<HttpResponse> {
    // Detect content type by trying to parse

    // Try JSON first (most common for Tools)
    if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&form_data.code) {
        match serde_json::to_string_pretty(&json_value) {
            Ok(formatted) => {
                return Ok(HttpResponse::Ok().json(CodeResponse { code: formatted }));
            }
            Err(e) => {
                return Err(AppError::BadRequest(format!(
                    "JSON formatting error: {}",
                    e
                )));
            }
        }
    }

    // Try YAML
    if let Ok(yaml_value) = serde_yaml::from_str::<serde_yaml::Value>(&form_data.code) {
        match serde_yaml::to_string(&yaml_value) {
            Ok(formatted) => {
                return Ok(HttpResponse::Ok().json(CodeResponse { code: formatted }));
            }
            Err(e) => {
                return Err(AppError::BadRequest(format!(
                    "YAML formatting error: {}",
                    e
                )));
            }
        }
    }

    // If neither JSON nor YAML, assume it's Python code (for Functions)
    // For now, just return the code unchanged since we don't have Python formatter
    // In the future, could integrate with ruff or call python -m black
    Ok(HttpResponse::Ok().json(CodeResponse {
        code: form_data.code.clone(),
    }))
}

/// POST /code/execute - Execute code (admin only)
async fn execute_code(
    state: web::Data<AppState>,
    _auth_user: AuthUser, // AdminMiddleware already checked
    _form_data: web::Json<CodeForm>,
) -> AppResult<HttpResponse> {
    let config = state.config.read().unwrap();

    if config.code_execution_engine != "jupyter" {
        return Err(AppError::BadRequest(
            "Code execution engine not supported".to_string(),
        ));
    }

    // TODO: Implement Jupyter code execution
    // This would require HTTP client to communicate with Jupyter server
    // and handle authentication (token or password)
    drop(config);

    Err(AppError::NotImplemented(
        "Code execution not yet implemented".to_string(),
    ))
}

/// GET /db/download - Download database (admin only, SQLite only)
async fn download_db(
    state: web::Data<AppState>,
    _auth_user: AuthUser, // AdminMiddleware already checked
) -> AppResult<HttpResponse> {
    let config = state.config.read().unwrap();

    if !config.enable_admin_export {
        return Err(AppError::Unauthorized(
            "Admin export is not enabled".to_string(),
        ));
    }

    // Check if database is SQLite
    // For PostgreSQL, this endpoint doesn't make sense
    // TODO: Implement SQLite database file download if using SQLite
    drop(config);

    Err(AppError::NotImplemented(
        "Database download only supported for SQLite".to_string(),
    ))
}
