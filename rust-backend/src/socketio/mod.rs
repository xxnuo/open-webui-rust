/// Native Rust Socket.IO implementation
///
/// This module provides a complete Socket.IO v4 server implementation
/// built from scratch for the Open WebUI Rust backend.
///
/// Architecture:
/// - Protocol: Socket.IO packet encoding/decoding (with ACK support)
/// - Transport: WebSocket and HTTP long-polling support
/// - Manager: Session, room, and user management
/// - Events: Event handlers for all Socket.IO events
/// - Redis: Optional Redis pub/sub for horizontal scaling
/// - YDoc: Yjs CRDT for collaborative editing
/// - Metrics: Performance monitoring and observability
/// - RateLimit: Rate limiting and backpressure control
/// - Presence: User presence tracking and typing indicators
/// - Recovery: Connection recovery and session persistence
pub mod events;
pub mod logging;
pub mod manager;
pub mod metrics;
pub mod presence;
pub mod protocol;
pub mod rate_limit;
pub mod recovery;
pub mod redis_adapter;
pub mod transport;
pub mod ydoc;

pub use events::EventHandler;
pub use manager::SocketIOManager;
pub use metrics::SocketIOMetrics;
pub use presence::{PresenceConfig, PresenceManager};
pub use rate_limit::{RateLimitConfig, RateLimiter};
pub use recovery::{RecoveryConfig, RecoveryManager};
pub use ydoc::YDocManager;

// Logging utilities - available but not re-exported to avoid unused warnings
#[allow(unused_imports)]
pub use logging::{CorrelationId, LogContext, StructuredLogger};
