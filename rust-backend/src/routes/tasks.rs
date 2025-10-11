use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{error::AppError, middleware::{AuthMiddleware, AuthUser}, AppState};

pub fn create_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/config")
            .wrap(AuthMiddleware)
            .route(web::get().to(get_task_config))
    )
    .service(
        web::resource("/config/update")
            .wrap(AuthMiddleware)
            .route(web::post().to(update_task_config))
    )
    .service(
        web::resource("/title/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_title))
    )
    .service(
        web::resource("/follow_up/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_follow_up))
    )
    .service(
        web::resource("/tags/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_tags))
    )
    .service(
        web::resource("/image_prompt/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_image_prompt))
    )
    .service(
        web::resource("/queries/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_queries))
    )
    .service(
        web::resource("/auto/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_autocomplete))
    )
    .service(
        web::resource("/emoji/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_emoji))
    )
    .service(
        web::resource("/moa/completions")
            .wrap(AuthMiddleware)
            .route(web::post().to(generate_moa))
    );
}

#[derive(Debug, Serialize)]
struct TaskConfig {
    #[serde(rename = "TASK_MODEL")]
    task_model: Option<String>,
    #[serde(rename = "TASK_MODEL_EXTERNAL")]
    task_model_external: Option<String>,
    #[serde(rename = "ENABLE_TITLE_GENERATION")]
    enable_title_generation: bool,
    #[serde(rename = "TITLE_GENERATION_PROMPT_TEMPLATE")]
    title_generation_prompt_template: String,
    #[serde(rename = "IMAGE_PROMPT_GENERATION_PROMPT_TEMPLATE")]
    image_prompt_generation_prompt_template: String,
    #[serde(rename = "ENABLE_AUTOCOMPLETE_GENERATION")]
    enable_autocomplete_generation: bool,
    #[serde(rename = "AUTOCOMPLETE_GENERATION_INPUT_MAX_LENGTH")]
    autocomplete_generation_input_max_length: i32,
    #[serde(rename = "TAGS_GENERATION_PROMPT_TEMPLATE")]
    tags_generation_prompt_template: String,
    #[serde(rename = "FOLLOW_UP_GENERATION_PROMPT_TEMPLATE")]
    follow_up_generation_prompt_template: String,
    #[serde(rename = "ENABLE_FOLLOW_UP_GENERATION")]
    enable_follow_up_generation: bool,
    #[serde(rename = "ENABLE_TAGS_GENERATION")]
    enable_tags_generation: bool,
    #[serde(rename = "ENABLE_SEARCH_QUERY_GENERATION")]
    enable_search_query_generation: bool,
    #[serde(rename = "ENABLE_RETRIEVAL_QUERY_GENERATION")]
    enable_retrieval_query_generation: bool,
    #[serde(rename = "QUERY_GENERATION_PROMPT_TEMPLATE")]
    query_generation_prompt_template: String,
    #[serde(rename = "TOOLS_FUNCTION_CALLING_PROMPT_TEMPLATE")]
    tools_function_calling_prompt_template: String,
}

#[derive(Debug, Deserialize)]
struct TaskConfigUpdate {
    #[serde(rename = "TASK_MODEL")]
    task_model: Option<String>,
    #[serde(rename = "TASK_MODEL_EXTERNAL")]
    task_model_external: Option<String>,
    #[serde(rename = "ENABLE_TITLE_GENERATION")]
    enable_title_generation: bool,
    #[serde(rename = "TITLE_GENERATION_PROMPT_TEMPLATE")]
    title_generation_prompt_template: String,
    #[serde(rename = "IMAGE_PROMPT_GENERATION_PROMPT_TEMPLATE")]
    image_prompt_generation_prompt_template: String,
    #[serde(rename = "ENABLE_AUTOCOMPLETE_GENERATION")]
    enable_autocomplete_generation: bool,
    #[serde(rename = "AUTOCOMPLETE_GENERATION_INPUT_MAX_LENGTH")]
    autocomplete_generation_input_max_length: i32,
    #[serde(rename = "TAGS_GENERATION_PROMPT_TEMPLATE")]
    tags_generation_prompt_template: String,
    #[serde(rename = "FOLLOW_UP_GENERATION_PROMPT_TEMPLATE")]
    follow_up_generation_prompt_template: String,
    #[serde(rename = "ENABLE_FOLLOW_UP_GENERATION")]
    enable_follow_up_generation: bool,
    #[serde(rename = "ENABLE_TAGS_GENERATION")]
    enable_tags_generation: bool,
    #[serde(rename = "ENABLE_SEARCH_QUERY_GENERATION")]
    enable_search_query_generation: bool,
    #[serde(rename = "ENABLE_RETRIEVAL_QUERY_GENERATION")]
    enable_retrieval_query_generation: bool,
    #[serde(rename = "QUERY_GENERATION_PROMPT_TEMPLATE")]
    query_generation_prompt_template: String,
    #[serde(rename = "TOOLS_FUNCTION_CALLING_PROMPT_TEMPLATE")]
    tools_function_calling_prompt_template: String,
}

async fn get_task_config(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    let response = TaskConfig {
        task_model: config.task_model.clone(),
        task_model_external: config.task_model_external.clone(),
        enable_title_generation: config.enable_title_generation,
        title_generation_prompt_template: config.title_generation_prompt_template.clone(),
        image_prompt_generation_prompt_template: config.image_prompt_generation_prompt_template.clone(),
        enable_autocomplete_generation: config.enable_autocomplete_generation,
        autocomplete_generation_input_max_length: config.autocomplete_generation_input_max_length,
        tags_generation_prompt_template: config.tags_generation_prompt_template.clone(),
        follow_up_generation_prompt_template: config.follow_up_generation_prompt_template.clone(),
        enable_follow_up_generation: config.enable_follow_up_generation,
        enable_tags_generation: config.enable_tags_generation,
        enable_search_query_generation: config.enable_search_query_generation,
        enable_retrieval_query_generation: config.enable_retrieval_query_generation,
        query_generation_prompt_template: config.query_generation_prompt_template.clone(),
        tools_function_calling_prompt_template: config.tools_function_calling_prompt_template.clone(),
    };
    
    Ok(HttpResponse::Ok().json(response))
}

async fn update_task_config(
    state: web::Data<AppState>,
    auth_user: AuthUser,
    payload: web::Json<TaskConfigUpdate>,
) -> Result<HttpResponse, AppError> {
    // Check if user is admin
    if auth_user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".to_string()));
    }
    
    let mut config = state.config.write().unwrap();
    
    config.task_model = payload.task_model.clone();
    config.task_model_external = payload.task_model_external.clone();
    config.enable_title_generation = payload.enable_title_generation;
    config.title_generation_prompt_template = payload.title_generation_prompt_template.clone();
    config.image_prompt_generation_prompt_template = payload.image_prompt_generation_prompt_template.clone();
    config.enable_autocomplete_generation = payload.enable_autocomplete_generation;
    config.autocomplete_generation_input_max_length = payload.autocomplete_generation_input_max_length;
    config.tags_generation_prompt_template = payload.tags_generation_prompt_template.clone();
    config.follow_up_generation_prompt_template = payload.follow_up_generation_prompt_template.clone();
    config.enable_follow_up_generation = payload.enable_follow_up_generation;
    config.enable_tags_generation = payload.enable_tags_generation;
    config.enable_search_query_generation = payload.enable_search_query_generation;
    config.enable_retrieval_query_generation = payload.enable_retrieval_query_generation;
    config.query_generation_prompt_template = payload.query_generation_prompt_template.clone();
    config.tools_function_calling_prompt_template = payload.tools_function_calling_prompt_template.clone();
    
    let response = TaskConfig {
        task_model: config.task_model.clone(),
        task_model_external: config.task_model_external.clone(),
        enable_title_generation: config.enable_title_generation,
        title_generation_prompt_template: config.title_generation_prompt_template.clone(),
        image_prompt_generation_prompt_template: config.image_prompt_generation_prompt_template.clone(),
        enable_autocomplete_generation: config.enable_autocomplete_generation,
        autocomplete_generation_input_max_length: config.autocomplete_generation_input_max_length,
        tags_generation_prompt_template: config.tags_generation_prompt_template.clone(),
        follow_up_generation_prompt_template: config.follow_up_generation_prompt_template.clone(),
        enable_follow_up_generation: config.enable_follow_up_generation,
        enable_tags_generation: config.enable_tags_generation,
        enable_search_query_generation: config.enable_search_query_generation,
        enable_retrieval_query_generation: config.enable_retrieval_query_generation,
        query_generation_prompt_template: config.query_generation_prompt_template.clone(),
        tools_function_calling_prompt_template: config.tools_function_calling_prompt_template.clone(),
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[derive(Debug, Deserialize)]
struct CompletionRequest {
    model: String,
    messages: Vec<serde_json::Value>,
    #[serde(default)]
    chat_id: Option<String>,
    #[serde(default)]
    prompt: Option<String>,
}

/// Generate a title for a chat based on its messages
async fn generate_title(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    // Check if title generation is enabled
    if !config.enable_title_generation {
        return Ok(HttpResponse::Ok().json(json!({
            "detail": "Title generation is disabled"
        })));
    }
    
    // Get the last 2 messages for title generation
    let messages_for_title: Vec<_> = payload.messages.iter()
        .rev()
        .take(2)
        .rev()
        .cloned()
        .collect();
    
    // Build the title generation prompt
    let template = if config.title_generation_prompt_template.is_empty() {
        DEFAULT_TITLE_GENERATION_PROMPT_TEMPLATE.to_string()
    } else {
        config.title_generation_prompt_template.clone()
    };
    
    // Replace {{MESSAGES:END:2}} with the actual messages
    let messages_text = messages_for_title.iter()
        .map(|m| {
            let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("user");
            let content = m.get("content").and_then(|v| v.as_str()).unwrap_or("");
            format!("{}: {}", role, content)
        })
        .collect::<Vec<_>>()
        .join("\n");
    
    let prompt = template.replace("{{MESSAGES:END:2}}", &messages_text);
    
    // Call OpenAI API for completion
    call_openai_completion(&config, &payload.model, &prompt, 50, 0.1).await
}

async fn generate_follow_up(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    if !config.enable_follow_up_generation {
        return Ok(HttpResponse::Ok().json(json!({
            "detail": "Follow-up generation is disabled"
        })));
    }
    
    let template = if config.follow_up_generation_prompt_template.is_empty() {
        DEFAULT_FOLLOW_UP_GENERATION_PROMPT_TEMPLATE.to_string()
    } else {
        config.follow_up_generation_prompt_template.clone()
    };
    
    let messages_text = format_messages(&payload.messages);
    let prompt = template.replace("{{MESSAGES}}", &messages_text);
    
    call_openai_completion(&config, &payload.model, &prompt, 200, 0.7).await
}

async fn generate_tags(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    if !config.enable_tags_generation {
        return Ok(HttpResponse::Ok().json(json!({
            "detail": "Tags generation is disabled"
        })));
    }
    
    let template = if config.tags_generation_prompt_template.is_empty() {
        DEFAULT_TAGS_GENERATION_PROMPT_TEMPLATE.to_string()
    } else {
        config.tags_generation_prompt_template.clone()
    };
    
    let messages_text = format_messages(&payload.messages);
    let prompt = template.replace("{{MESSAGES}}", &messages_text);
    
    call_openai_completion(&config, &payload.model, &prompt, 50, 0.5).await
}

async fn generate_image_prompt(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    let template = if config.image_prompt_generation_prompt_template.is_empty() {
        DEFAULT_IMAGE_PROMPT_GENERATION_PROMPT_TEMPLATE.to_string()
    } else {
        config.image_prompt_generation_prompt_template.clone()
    };
    
    let user_prompt = payload.prompt.as_deref().unwrap_or("");
    let prompt = template.replace("{{PROMPT}}", user_prompt);
    
    call_openai_completion(&config, &payload.model, &prompt, 200, 0.7).await
}

async fn generate_queries(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    if !config.enable_search_query_generation {
        return Ok(HttpResponse::Ok().json(json!({
            "detail": "Query generation is disabled"
        })));
    }
    
    let template = if config.query_generation_prompt_template.is_empty() {
        DEFAULT_QUERY_GENERATION_PROMPT_TEMPLATE.to_string()
    } else {
        config.query_generation_prompt_template.clone()
    };
    
    let messages_text = format_messages(&payload.messages);
    let prompt = template.replace("{{MESSAGES}}", &messages_text);
    
    call_openai_completion(&config, &payload.model, &prompt, 100, 0.3).await
}

async fn generate_autocomplete(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    if !config.enable_autocomplete_generation {
        return Ok(HttpResponse::Ok().json(json!({
            "detail": "Autocomplete generation is disabled"
        })));
    }
    
    let user_prompt = payload.prompt.as_deref().unwrap_or("");
    
    // Check max length
    if user_prompt.len() > config.autocomplete_generation_input_max_length as usize {
        return Ok(HttpResponse::Ok().json(json!({
            "detail": "Input too long for autocomplete"
        })));
    }
    
    let template = DEFAULT_AUTOCOMPLETE_GENERATION_PROMPT_TEMPLATE;
    let prompt = template.replace("{{PROMPT}}", user_prompt);
    
    call_openai_completion(&config, &payload.model, &prompt, 100, 0.7).await
}

async fn generate_emoji(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<CompletionRequest>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    let messages_text = format_messages(&payload.messages);
    let prompt = DEFAULT_EMOJI_GENERATION_PROMPT_TEMPLATE.replace("{{MESSAGES}}", &messages_text);
    
    call_openai_completion(&config, &payload.model, &prompt, 10, 0.5).await
}

async fn generate_moa(
    state: web::Data<AppState>,
    _auth_user: AuthUser,
    payload: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let config = state.config.read().unwrap();
    
    // MOA (Mixture of Agents) response aggregation
    let empty_vec = vec![];
    let responses = payload.get("responses").and_then(|r| r.as_array()).unwrap_or(&empty_vec);
    let query = payload.get("query").and_then(|q| q.as_str()).unwrap_or("");
    let model = payload.get("model").and_then(|m| m.as_str()).unwrap_or("gpt-3.5-turbo");
    
    let responses_text = responses.iter()
        .enumerate()
        .map(|(i, r)| {
            format!("Response {}:\n{}", i + 1, r.get("content").and_then(|c| c.as_str()).unwrap_or(""))
        })
        .collect::<Vec<_>>()
        .join("\n\n");
    
    let prompt = DEFAULT_MOA_GENERATION_PROMPT_TEMPLATE
        .replace("{{QUERY}}", query)
        .replace("{{RESPONSES}}", &responses_text);
    
    call_openai_completion(&config, model, &prompt, 500, 0.7).await
}

// Helper function to call OpenAI completion API
async fn call_openai_completion(
    config: &crate::config::Config,
    model: &str,
    prompt: &str,
    max_tokens: i32,
    temperature: f32,
) -> Result<HttpResponse, AppError> {
    // Determine which OpenAI endpoint to use
    let (endpoint_url, endpoint_key) = if config.openai_api_base_urls.is_empty() {
        return Err(AppError::InternalServerError("No OpenAI endpoint configured".to_string()));
    } else {
        (
            config.openai_api_base_urls[0].clone(),
            config.openai_api_keys.get(0).cloned().unwrap_or_default(),
        )
    };
    
    // Build the chat completion request
    let completion_payload = json!({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": false
    });
    
    // Call the OpenAI API
    let client = reqwest::Client::new();
    let mut request_builder = client
        .post(format!("{}/chat/completions", endpoint_url.trim_end_matches('/')))
        .header("Content-Type", "application/json");
    
    if !endpoint_key.is_empty() {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", endpoint_key));
    }
    
    match request_builder.json(&completion_payload).send().await {
        Ok(response) if response.status().is_success() => {
            let json_response = response.json::<serde_json::Value>().await
                .map_err(|e| AppError::InternalServerError(format!("Failed to parse response: {}", e)))?;
            
            Ok(HttpResponse::Ok().json(json_response))
        }
        Ok(response) => {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(AppError::InternalServerError(format!("API call failed with status {}: {}", status, error_text)))
        }
        Err(e) => {
            Err(AppError::InternalServerError(format!("API request failed: {}", e)))
        }
    }
}

// Helper function to format messages
fn format_messages(messages: &[serde_json::Value]) -> String {
    messages.iter()
        .map(|m| {
            let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("user");
            let content = m.get("content").and_then(|v| v.as_str()).unwrap_or("");
            format!("{}: {}", role, content)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

// Default prompt templates
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

const DEFAULT_FOLLOW_UP_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Generate 3-5 relevant follow-up questions based on the conversation.
### Output:
JSON format: { "questions": ["question 1", "question 2", "question 3"] }
### Chat History:
{{MESSAGES}}"#;

const DEFAULT_TAGS_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Generate 3-5 relevant tags for categorizing this conversation.
### Output:
JSON format: { "tags": ["tag1", "tag2", "tag3"] }
### Chat History:
{{MESSAGES}}"#;

const DEFAULT_IMAGE_PROMPT_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Enhance the following prompt for image generation, making it more detailed and descriptive.
### Original Prompt:
{{PROMPT}}
### Output:
JSON format: { "prompt": "enhanced prompt here" }"#;

const DEFAULT_QUERY_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Generate 2-3 search queries to find relevant information for this conversation.
### Output:
JSON format: { "queries": ["query 1", "query 2"] }
### Chat History:
{{MESSAGES}}"#;

const DEFAULT_AUTOCOMPLETE_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Complete the following text naturally and concisely.
### Input:
{{PROMPT}}
### Output:
JSON format: { "completion": "completed text here" }"#;

const DEFAULT_EMOJI_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Suggest a single emoji that best represents the mood or topic of this conversation.
### Output:
JSON format: { "emoji": "😊" }
### Chat History:
{{MESSAGES}}"#;

const DEFAULT_MOA_GENERATION_PROMPT_TEMPLATE: &str = r#"### Task:
Synthesize the following responses into a single, coherent answer to the query.
### Query:
{{QUERY}}
### Responses:
{{RESPONSES}}
### Output:
Provide a synthesized response that combines the best aspects of all responses."#;

