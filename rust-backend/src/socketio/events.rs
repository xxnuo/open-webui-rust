/// Socket.IO Event Handlers
/// 
/// Handles all Socket.IO events including:
/// - Authentication (user-join)
/// - Chat events (chat-events)
/// - Channel events (channel-events)
/// - Yjs collaborative editing (ydoc:*)
/// - Usage tracking

use crate::socketio::manager::SocketIOManager;
use crate::socketio::protocol::{EnginePacket, SocketPacket};
use actix_web::web;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;

/// Connection registry - maps session IDs to their websocket senders
/// This allows us to send messages to specific sessions
type ConnectionRegistry = Arc<RwLock<HashMap<String, tokio::sync::mpsc::UnboundedSender<String>>>>;

/// Event handler for Socket.IO events
#[derive(Clone)]
pub struct EventHandler {
    manager: SocketIOManager,
    connections: ConnectionRegistry,
    auth_endpoint: String,
}

impl EventHandler {
    pub fn new(manager: SocketIOManager, auth_endpoint: String) -> Self {
        Self {
            manager,
            connections: Arc::new(RwLock::new(HashMap::new())),
            auth_endpoint,
        }
    }

    /// Register a connection
    pub async fn register_connection(
        &self,
        sid: &str,
        sender: tokio::sync::mpsc::UnboundedSender<String>,
    ) {
        let mut connections = self.connections.write().await;
        connections.insert(sid.to_string(), sender);
        tracing::info!("Registered connection: {}", sid);
    }

    /// Unregister a connection
    pub async fn unregister_connection(&self, sid: &str) {
        let mut connections = self.connections.write().await;
        connections.remove(sid);
        tracing::info!("Unregistered connection: {}", sid);
    }

    /// Emit event to a specific session
    pub async fn emit_to_session(&self, sid: &str, event: &str, data: JsonValue) -> Result<(), String> {
        let connections = self.connections.read().await;
        if let Some(sender) = connections.get(sid) {
            let socket_packet = SocketPacket::event("/", event, data);
            let engine_packet = EnginePacket::message(socket_packet.encode().into_bytes());
            
            sender.send(engine_packet.encode()).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err(format!("Session not found: {}", sid))
        }
    }

    /// Emit event to all sessions of a user
    pub async fn emit_to_user(&self, user_id: &str, event: &str, data: JsonValue) -> Result<usize, String> {
        let sids = self.manager.get_user_sessions(user_id).await;
        let mut sent = 0;

        for sid in sids {
            if self.emit_to_session(&sid, event, data.clone()).await.is_ok() {
                sent += 1;
            }
        }

        Ok(sent)
    }

    /// Broadcast event to all sessions in a room
    pub async fn broadcast_to_room(
        &self,
        room: &str,
        event: &str,
        data: JsonValue,
        exclude_sid: Option<&str>,
    ) -> Result<usize, String> {
        let sids = self.manager.get_room_sessions(room).await;
        let mut sent = 0;

        for sid in sids {
            if Some(sid.as_str()) == exclude_sid {
                continue;
            }

            if self.emit_to_session(&sid, event, data.clone()).await.is_ok() {
                sent += 1;
            }
        }

        Ok(sent)
    }

    /// Handle authentication (user-join event)
    pub async fn handle_user_join(
        &self,
        sid: &str,
        data: JsonValue,
        http_client: &reqwest::Client,
    ) -> Result<JsonValue, String> {
        let auth = data.get("auth")
            .ok_or("Missing auth data")?;
        
        let token = auth.get("token")
            .and_then(|t| t.as_str())
            .ok_or("Missing token")?;

        // Authenticate with backend
        let auth_url = format!("{}/api/socketio/auth", self.auth_endpoint);
        
        let response = http_client
            .post(&auth_url)
            .json(&serde_json::json!({"token": token}))
            .send()
            .await
            .map_err(|e| format!("Auth request failed: {}", e))?;

        if response.status().is_success() {
            let user: JsonValue = response.json()
                .await
                .map_err(|e| format!("Failed to parse user data: {}", e))?;

            // Set session user
            self.manager.set_session_user(sid, user.clone()).await?;

            tracing::info!(
                "User {} authenticated on session {}",
                user.get("email").and_then(|e| e.as_str()).unwrap_or("unknown"),
                sid
            );

            Ok(user)
        } else {
            Err(format!("Authentication failed: {}", response.status()))
        }
    }

    /// Handle usage tracking
    pub async fn handle_usage(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        if let Some(model_id) = data.get("model").and_then(|m| m.as_str()) {
            self.manager.track_usage(sid, model_id).await;
            Ok(())
        } else {
            Err("Missing model ID".to_string())
        }
    }

    /// Handle chat events
    pub async fn handle_chat_event(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        tracing::debug!("Chat event from {}: {:?}", sid, data);
        // Chat events are typically received from frontend and don't need special handling
        // The actual chat processing is done via HTTP API
        Ok(())
    }

    /// Handle channel events (broadcast to channel room)
    pub async fn handle_channel_event(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        let channel_id = data.get("channel_id")
            .and_then(|c| c.as_str())
            .ok_or("Missing channel_id")?;

        let room = format!("channel:{}", channel_id);

        // Get session user
        let session = self.manager.get_session(sid).await
            .ok_or("Session not found")?;
        
        let user = session.user.clone().unwrap_or(serde_json::json!({}));

        // Broadcast to room (excluding sender)
        let broadcast_data = serde_json::json!({
            "channel_id": channel_id,
            "message_id": data.get("message_id"),
            "data": data.get("data").unwrap_or(&serde_json::json!({})),
            "user": user,
        });

        self.broadcast_to_room(&room, "channel-events", broadcast_data, Some(sid)).await?;
        tracing::debug!("Broadcasted channel event to room: {}", room);

        Ok(())
    }

    /// Handle Yjs document join
    pub async fn handle_ydoc_join(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        let doc_id = data.get("document_id")
            .and_then(|d| d.as_str())
            .ok_or("Missing document_id")?;

        let room = format!("ydoc:{}", doc_id);
        self.manager.join_room(sid, &room).await?;

        tracing::info!("Session {} joined Yjs document: {}", sid, doc_id);

        // Request current document state
        // In a full implementation, we would fetch the current Yjs state from storage
        // and send it to the client

        Ok(())
    }

    /// Handle Yjs document leave
    pub async fn handle_ydoc_leave(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        let doc_id = data.get("document_id")
            .and_then(|d| d.as_str())
            .ok_or("Missing document_id")?;

        let room = format!("ydoc:{}", doc_id);
        self.manager.leave_room(sid, &room).await?;

        tracing::info!("Session {} left Yjs document: {}", sid, doc_id);
        Ok(())
    }

    /// Handle Yjs document update (broadcast to room)
    pub async fn handle_ydoc_update(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        let doc_id = data.get("document_id")
            .and_then(|d| d.as_str())
            .ok_or("Missing document_id")?
            .to_string();

        let room = format!("ydoc:{}", doc_id);

        // Broadcast update to all other clients in the room
        self.broadcast_to_room(&room, "ydoc:document:update", data, Some(sid)).await?;

        tracing::debug!("Broadcasted Yjs update for document: {}", doc_id);
        Ok(())
    }

    /// Handle Yjs document state request
    pub async fn handle_ydoc_state_request(&self, sid: &str, data: JsonValue) -> Result<(), String> {
        let doc_id = data.get("document_id")
            .and_then(|d| d.as_str())
            .ok_or("Missing document_id")?;

        // In a full implementation, we would:
        // 1. Fetch the current Yjs state from storage (e.g., database or Redis)
        // 2. Send it back to the requesting client
        
        // For now, send an empty state
        let state_data = serde_json::json!({
            "document_id": doc_id,
            "state": [],
        });

        self.emit_to_session(sid, "ydoc:document:state", state_data).await?;

        tracing::debug!("Sent Yjs state for document: {}", doc_id);
        Ok(())
    }

    /// Handle Yjs awareness update (broadcast to room)
    pub async fn handle_ydoc_awareness_update(&self, _sid: &str, data: JsonValue) -> Result<(), String> {
        let doc_id = data.get("document_id")
            .and_then(|d| d.as_str())
            .ok_or("Missing document_id")?
            .to_string();

        let room = format!("ydoc:{}", doc_id);

        // Broadcast awareness update to all clients in the room (including sender)
        let room_sids = self.manager.get_room_sessions(&room).await;
        
        for session_sid in room_sids {
            let _ = self.emit_to_session(&session_sid, "ydoc:awareness:update", data.clone()).await;
        }

        tracing::debug!("Broadcasted Yjs awareness update for document: {}", doc_id);
        Ok(())
    }

    /// Get manager reference
    pub fn manager(&self) -> &SocketIOManager {
        &self.manager
    }
}

/// HTTP endpoint for emitting events from Rust backend
#[derive(Debug, Deserialize)]
pub struct EmitRequest {
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub room: Option<String>,
    pub event: String,
    pub data: JsonValue,
}

#[derive(Debug, Serialize)]
pub struct EmitResponse {
    pub status: String,
    pub sent: usize,
}

/// Handle emit endpoint
pub async fn handle_emit_request(
    event_handler: web::Data<EventHandler>,
    req: web::Json<EmitRequest>,
) -> Result<web::Json<EmitResponse>, actix_web::Error> {
    let sent = if let Some(user_id) = &req.user_id {
        // Emit to user
        event_handler
            .emit_to_user(user_id, &req.event, req.data.clone())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    } else if let Some(session_id) = &req.session_id {
        // Emit to specific session
        event_handler
            .emit_to_session(session_id, &req.event, req.data.clone())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
        1
    } else if let Some(room) = &req.room {
        // Broadcast to room
        event_handler
            .broadcast_to_room(room, &req.event, req.data.clone(), None)
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    } else {
        return Err(actix_web::error::ErrorBadRequest(
            "Must specify user_id, session_id, or room",
        ));
    };

    Ok(web::Json(EmitResponse {
        status: "ok".to_string(),
        sent,
    }))
}

/// Health check endpoint
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub sessions: usize,
    pub users: usize,
    pub rooms: usize,
}

pub async fn handle_health_check(
    event_handler: web::Data<EventHandler>,
) -> Result<web::Json<HealthResponse>, actix_web::Error> {
    let stats = event_handler.manager().get_stats().await;

    Ok(web::Json(HealthResponse {
        status: "ok".to_string(),
        sessions: *stats.get("sessions").unwrap_or(&0),
        users: *stats.get("users").unwrap_or(&0),
        rooms: *stats.get("rooms").unwrap_or(&0),
    }))
}

