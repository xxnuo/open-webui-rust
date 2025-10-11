use serde_json::json;

/// Minimal Socket.IO state for hybrid mode
/// The Python Socket.IO bridge handles actual session management
#[derive(Clone)]
pub struct SocketState {
    // Placeholder for future extensions
}

impl SocketState {
    pub fn new() -> Self {
        Self {}
    }
}

/// Create event emitter function for streaming chat completions
/// In hybrid mode, this emits via HTTP to the Python Socket.IO bridge
pub fn get_event_emitter(
    _socket_state: SocketState,
    user_id: String,
    chat_id: Option<String>,
    message_id: Option<String>,
    session_id: Option<String>,
) -> impl Fn(serde_json::Value) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> + Send + Clone {
    move |event_data: serde_json::Value| {
        let user_id = user_id.clone();
        let chat_id = chat_id.clone();
        let message_id = message_id.clone();
        let session_id = session_id.clone();
        
        Box::pin(async move {
            // Prepare event payload
            let payload = json!({
                "chat_id": chat_id,
                "message_id": message_id,
                "data": event_data,
            });
            
            // Emit via HTTP to Python Socket.IO bridge
            let socketio_bridge_url = std::env::var("SOCKETIO_BRIDGE_URL")
                .unwrap_or_else(|_| "http://localhost:8081".to_string());
            
            let client = reqwest::Client::new();
            let emit_payload = json!({
                "user_id": user_id,
                "session_id": session_id,
                "event": "chat-events",
                "data": payload,
            });
            
            match client
                .post(format!("{}/emit", socketio_bridge_url))
                .json(&emit_payload)
                .send()
                .await
            {
                Ok(resp) => {
                    if !resp.status().is_success() {
                        tracing::warn!("Failed to emit to Socket.IO bridge: {}", resp.status());
                    }
                }
                Err(e) => {
                    tracing::error!("Error emitting to Socket.IO bridge: {}", e);
                }
            }
        })
    }
}
