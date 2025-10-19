/// Native Rust Socket.IO implementation
/// 
/// This module provides a complete Socket.IO v4 server implementation
/// built from scratch for the Open WebUI Rust backend.
/// 
/// Architecture:
/// - Protocol: Socket.IO packet encoding/decoding
/// - Transport: WebSocket and HTTP long-polling support
/// - Manager: Session, room, and user management
/// - Events: Event handlers for all Socket.IO events
/// - Redis: Optional Redis pub/sub for horizontal scaling

pub mod protocol;
pub mod transport;
pub mod manager;
pub mod events;
pub mod redis_adapter;

pub use manager::SocketIOManager;
pub use events::EventHandler;

