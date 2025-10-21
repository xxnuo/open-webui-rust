use actix_web::{HttpRequest, HttpResponse};
use mime_guess::from_path;
use rust_embed::RustEmbed;

// Embed the frontend build directory into the binary
// The path is relative to the Cargo.toml directory
#[derive(RustEmbed)]
#[folder = "../../frontend/build/"]
pub struct FrontendAssets;

/// Serve embedded static files with SPA fallback
/// This handler serves both static assets and handles SPA routing
pub async fn serve(req: HttpRequest) -> HttpResponse {
    let mut path = req.path();
    
    // Remove leading slash
    path = path.trim_start_matches('/');
    
    // If path is empty (root), serve index.html
    if path.is_empty() {
        path = "index.html";
    }
    
    // Try to serve the requested file
    if let Some(content) = FrontendAssets::get(path) {
        let mime_type = from_path(path).first_or_octet_stream();
        
        return HttpResponse::Ok()
            .content_type(mime_type.as_ref())
            .body(content.data.into_owned());
    }
    
    // For SPA routing: if file not found and it doesn't look like an API request,
    // serve index.html to let the frontend router handle it
    if !path.starts_with("api/") && 
       !path.starts_with("openai/") && 
       !path.starts_with("oauth/") &&
       !path.starts_with("socket.io/") {
        if let Some(index) = FrontendAssets::get("index.html") {
            return HttpResponse::Ok()
                .content_type("text/html")
                .body(index.data.into_owned());
        }
    }
    
    // If it's an API request or index.html is not found, return 404
    HttpResponse::NotFound().body("404 Not Found")
}

