# Socket.IO Hybrid Architecture

## Overview

This implementation uses a **hybrid architecture** where:
- **Rust backend** handles all main application logic (API, database, chat processing)
- **Python Socket.IO bridge** handles WebSocket connections using `python-socketio`

This approach leverages the strengths of both:
- Rust for performance and type safety
- Python's mature Socket.IO implementation for WebSocket compatibility

## Architecture

```
Frontend (socket.io-client)
          ↓
Python Socket.IO Bridge (:8081)
    ↓            ↓
   Auth       Events
    ↓            ↑
Rust Backend (:8080)
    - API endpoints
    - Chat processing
    - Database
    - Streaming logic
```

## How It Works

1. **Frontend connects** to Python Socket.IO bridge at `ws://localhost:8081/socket.io/`
2. **Authentication**: Python bridge calls Rust `/api/socketio/auth` to validate JWT
3. **Chat requests**: Frontend sends requests to Rust backend
4. **Streaming**: Rust backend emits events via HTTP POST to Python bridge's `/emit` endpoint
5. **Real-time updates**: Python bridge forwards events to connected clients via Socket.IO

## Starting the Services

### Quick Start
```bash
cd rust-backend
./start_with_socketio.sh
```

This script will:
1. Create Python virtual environment (if needed)
2. Install Socket.IO dependencies
3. Start Python Socket.IO bridge on port 8081
4. Start Rust backend on port 8080

### Manual Start

**Terminal 1: Start Python Socket.IO Bridge**
```bash
cd rust-backend
python3 -m venv venv
source venv/bin/activate
pip install -r socketio_requirements.txt
python3 socketio_bridge.py
```

**Terminal 2: Start Rust Backend**
```bash
cd rust-backend
cargo run
```

## Configuration

### Environment Variables

**Python Socket.IO Bridge:**
- `SOCKETIO_PORT`: Port for Socket.IO bridge (default: 8081)
- `RUST_BACKEND_URL`: URL of Rust backend (default: http://localhost:8080)
- `CORS_ORIGINS`: CORS allowed origins (default: *)

**Rust Backend:**
- `SOCKETIO_BRIDGE_URL`: URL of Socket.IO bridge (default: http://localhost:8081)

### Frontend Configuration

Update your frontend to connect to the Socket.IO bridge:

```javascript
// src/routes/+layout.svelte
const setupSocket = async (enableWebsocket) => {
    const _socket = io(`http://localhost:8081`, {  // Changed from 8080 to 8081
        reconnection: true,
        path: '/socket.io',  // Default Socket.IO path
        transports: enableWebsocket ? ['websocket'] : ['polling', 'websocket'],
        auth: { token: localStorage.token }
    });
    // ...
};
```

Or use environment variable:
```javascript
const SOCKETIO_URL = import.meta.env.VITE_SOCKETIO_URL || 'http://localhost:8081';
```

## Testing

1. Start both services using `./start_with_socketio.sh`
2. Open frontend at `http://localhost:5173`
3. Login with test credentials: `test@test.com` / `test1234`
4. Start a chat - you should see:
   - ✅ Socket.IO connection established (no errors!)
   - ✅ Real-time streaming responses word-by-word
   - ✅ Full compatibility with Python backend behavior

## Monitoring

### Check Socket.IO Bridge Health
```bash
curl http://localhost:8081/health
```

Response:
```json
{
  "status": "ok",
  "connected_users": 1,
  "active_sessions": 1
}
```

### Check Rust Backend Health
```bash
curl http://localhost:8080/health
```

## Production Deployment

For production, consider:

1. **Reverse Proxy**: Use nginx to route Socket.IO traffic
   ```nginx
   location /socket.io/ {
       proxy_pass http://localhost:8081;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   
   location / {
       proxy_pass http://localhost:8080;
   }
   ```

2. **Process Management**: Use systemd or supervisor to manage both processes

3. **Monitoring**: Set up health checks for both services

## Benefits of Hybrid Approach

✅ **Production-ready**: Uses battle-tested `python-socketio`  
✅ **Full compatibility**: 100% compatible with existing frontend  
✅ **Performance**: Rust handles compute-intensive tasks  
✅ **Maintainable**: Clear separation of concerns  
✅ **Flexible**: Easy to add more Socket.IO features in Python  

## Troubleshooting

**Frontend can't connect to Socket.IO:**
- Check Python bridge is running on port 8081
- Verify CORS settings in `socketio_bridge.py`
- Check browser console for connection URL

**Events not reaching frontend:**
- Verify Rust backend can reach Python bridge (check `SOCKETIO_BRIDGE_URL`)
- Check Python bridge logs for `/emit` requests
- Verify user authentication was successful

**Authentication failures:**
- Check JWT token is valid
- Verify `WEBUI_SECRET_KEY` matches between services
- Check Rust backend `/api/socketio/auth` endpoint

