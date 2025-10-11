#!/usr/bin/env python3
"""
Socket.IO Bridge for Rust Backend
This provides Socket.IO WebSocket support using python-socketio while
the main application logic runs in Rust.
"""
import asyncio
import socketio
import aiohttp
import logging
import sys
import os
from typing import Dict, Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)

# Configuration
RUST_BACKEND_URL = os.getenv('RUST_BACKEND_URL', 'http://localhost:8080')
SOCKETIO_PORT = int(os.getenv('SOCKETIO_PORT', '8081'))
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins=CORS_ORIGINS if CORS_ORIGINS != '*' else [],
    async_mode='aiohttp',
    transports=['websocket', 'polling'],
    allow_upgrades=True,
    always_connect=True,
)

# Create AIOHTTP app
app = aiohttp.web.Application()
sio.attach(app, socketio_path='/socket.io')

# Session and User pools
SESSION_POOL: Dict[str, dict] = {}
USER_POOL: Dict[str, list] = {}
USAGE_POOL: Dict[str, dict] = {}

# HTTP session for communicating with Rust backend
http_session = None


async def init_http_session():
    """Initialize HTTP session for Rust backend communication"""
    global http_session
    http_session = aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=30)
    )


async def cleanup_http_session():
    """Cleanup HTTP session"""
    global http_session
    if http_session:
        await http_session.close()


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    log.info(f"Client connected: {sid}")
    
    # Try to authenticate
    user = None
    if auth and "token" in auth:
        # Forward auth to Rust backend for validation
        try:
            async with http_session.post(
                f"{RUST_BACKEND_URL}/api/socketio/auth",
                json={"token": auth["token"]}
            ) as resp:
                if resp.status == 200:
                    user = await resp.json()
                    SESSION_POOL[sid] = user
                    
                    user_id = user.get('id')
                    if user_id:
                        if user_id in USER_POOL:
                            USER_POOL[user_id].append(sid)
                        else:
                            USER_POOL[user_id] = [sid]
                        
                        log.info(f"User {user.get('email')} authenticated on session {sid}")
        except Exception as e:
            log.error(f"Authentication error: {e}")


@sio.on('user-join')
async def user_join(sid, data):
    """Handle user-join event"""
    log.info(f"User join from {sid}")
    
    auth = data.get('auth')
    if not auth or 'token' not in auth:
        return
    
    # Authenticate via Rust backend
    try:
        async with http_session.post(
            f"{RUST_BACKEND_URL}/api/socketio/auth",
            json={"token": auth['token']}
        ) as resp:
            if resp.status == 200:
                user = await resp.json()
                SESSION_POOL[sid] = user
                
                user_id = user.get('id')
                if user_id:
                    if user_id in USER_POOL:
                        if sid not in USER_POOL[user_id]:
                            USER_POOL[user_id].append(sid)
                    else:
                        USER_POOL[user_id] = [sid]
                    
                    log.info(f"User {user.get('email')} joined on session {sid}")
                    
                    # Join channels (if needed)
                    # This would be handled by Rust backend
                    
                    return {"id": user_id, "name": user.get('name')}
    except Exception as e:
        log.error(f"User join error: {e}")
        return None


@sio.on('usage')
async def usage(sid, data):
    """Handle usage tracking"""
    if sid in SESSION_POOL:
        model_id = data.get('model')
        if model_id:
            import time
            current_time = int(time.time())
            
            if model_id not in USAGE_POOL:
                USAGE_POOL[model_id] = {}
            
            USAGE_POOL[model_id][sid] = {"updated_at": current_time}
            log.debug(f"Usage tracked: {model_id} from {sid}")


@sio.on('chat-events')
async def chat_events(sid, data):
    """Handle chat events (usually just for receiving)"""
    log.debug(f"Chat event from {sid}: {data}")


@sio.on('channel-events')
async def channel_events(sid, data):
    """Handle channel events"""
    channel_id = data.get('channel_id')
    if channel_id:
        room = f"channel:{channel_id}"
        
        # Broadcast to room
        await sio.emit(
            'channel-events',
            {
                'channel_id': channel_id,
                'message_id': data.get('message_id'),
                'data': data.get('data', {}),
                'user': SESSION_POOL.get(sid, {}),
            },
            room=room,
            skip_sid=sid
        )


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    log.info(f"Client disconnected: {sid}")
    
    # Clean up session
    user = SESSION_POOL.pop(sid, None)
    if user:
        user_id = user.get('id')
        if user_id and user_id in USER_POOL:
            USER_POOL[user_id] = [s for s in USER_POOL[user_id] if s != sid]
            if not USER_POOL[user_id]:
                del USER_POOL[user_id]
    
    # Clean up usage
    for model_id in list(USAGE_POOL.keys()):
        if sid in USAGE_POOL[model_id]:
            del USAGE_POOL[model_id][sid]
        if not USAGE_POOL[model_id]:
            del USAGE_POOL[model_id]


# HTTP endpoint for Rust backend to emit events
async def emit_event(request):
    """
    Endpoint for Rust backend to emit Socket.IO events
    POST /emit
    Body: {
        "user_id": "...",
        "event": "chat-events",
        "data": {...}
    }
    """
    try:
        data = await request.json()
        user_id = data.get('user_id')
        event = data.get('event', 'chat-events')
        event_data = data.get('data', {})
        
        if user_id and user_id in USER_POOL:
            # Emit to all user's sessions
            for session_id in USER_POOL[user_id]:
                await sio.emit(event, event_data, room=session_id)
            
            return aiohttp.web.json_response({'status': 'ok', 'sent': len(USER_POOL[user_id])})
        else:
            return aiohttp.web.json_response({'status': 'error', 'message': 'User not found'}, status=404)
    except Exception as e:
        log.error(f"Emit error: {e}")
        return aiohttp.web.json_response({'status': 'error', 'message': str(e)}, status=500)


async def health_check(request):
    """Health check endpoint"""
    return aiohttp.web.json_response({
        'status': 'ok',
        'connected_users': len(USER_POOL),
        'active_sessions': len(SESSION_POOL)
    })


# Add HTTP routes
app.router.add_post('/emit', emit_event)
app.router.add_get('/health', health_check)

# Startup and cleanup
app.on_startup.append(lambda app: init_http_session())
app.on_cleanup.append(lambda app: cleanup_http_session())


if __name__ == '__main__':
    log.info(f"Starting Socket.IO bridge on port {SOCKETIO_PORT}")
    log.info(f"Rust backend URL: {RUST_BACKEND_URL}")
    log.info(f"CORS origins: {CORS_ORIGINS}")
    
    aiohttp.web.run_app(
        app,
        host='0.0.0.0',
        port=SOCKETIO_PORT,
        access_log=log
    )

