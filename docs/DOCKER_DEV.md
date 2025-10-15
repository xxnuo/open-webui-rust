# Docker Development Guide

This guide is for developers working on Open WebUI with the Rust backend. It explains how to use Docker for the infrastructure (PostgreSQL, Redis, Socket.IO) while running the Rust backend and frontend locally for faster development.

## Development Architecture

**Recommended Setup for Development:**
- PostgreSQL: Docker ✅
- Redis: Docker ✅
- Socket.IO Bridge: Docker ✅
- Rust Backend: Local (for fast iteration with `cargo run`) ⚡
- Frontend: Local (for HMR/hot reload) ⚡

## Quick Start

### 1. Start Infrastructure Only

```bash
# Start just PostgreSQL, Redis, and Socket.IO
docker-compose -f docker-compose.dev.yaml up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Socket.IO Bridge on port 8081

### 2. Setup Environment for Local Development

Create or update `.env`:
```bash
# Database (points to Docker)
DATABASE_URL=postgresql://open_webui:open_webui_password@localhost:5432/open_webui

# Redis (points to Docker)
REDIS_URL=redis://localhost:6379
ENABLE_REDIS=true

# Socket.IO (points to Docker)
SOCKETIO_BRIDGE_URL=http://localhost:8081

# Server
HOST=0.0.0.0
PORT=8080
RUST_LOG=debug
GLOBAL_LOG_LEVEL=debug

# Authentication
WEBUI_SECRET_KEY=your_secret_key_here
JWT_EXPIRES_IN=30d
ENABLE_SIGNUP=true
```

### 3. Run Rust Backend Locally

```bash
cd rust-backend

# Load environment
source ../.env  # or use direnv

# Run with auto-reload
cargo watch -x run

# Or just run normally
cargo run
```

### 4. Run Frontend Locally

```bash
# In the project root
npm install
npm run dev
```

Access:
- Frontend: http://localhost:5173 (Vite dev server with HMR)
- Backend API: http://localhost:8080
- Socket.IO: http://localhost:8081

## Development Tools

### Start with Admin Tools

```bash
# Start infrastructure + pgAdmin + Redis Commander
docker-compose -f docker-compose.dev.yaml --profile tools up -d
```

Access:
- **pgAdmin**: http://localhost:5050
  - Email: `admin@admin.com`
  - Password: `admin`
  
- **Redis Commander**: http://localhost:8082
  - User: `admin`
  - Password: `admin`

### Configure pgAdmin

1. Open http://localhost:5050
2. Add Server:
   - Name: `Open WebUI Dev`
   - Host: `postgres` (or `localhost` if accessing from host)
   - Port: `5432`
   - Database: `open_webui`
   - Username: `open_webui`
   - Password: `open_webui_password`

## Development Workflow

### Typical Development Cycle

1. **Start infrastructure**:
   ```bash
   docker-compose -f docker-compose.dev.yaml up -d
   ```

2. **Make code changes** in your editor

3. **Rust backend auto-reloads** (if using `cargo watch`)

4. **Frontend HMR** updates instantly

5. **Test changes** at http://localhost:5173

### Working with Migrations

```bash
# Run migrations (Rust backend does this automatically on startup)
cd rust-backend
DATABASE_URL=postgresql://open_webui:open_webui_password@localhost:5432/open_webui cargo run

# Or manually with sqlx
sqlx migrate run --database-url postgresql://open_webui:open_webui_password@localhost:5432/open_webui
```

### Reset Database

```bash
# Drop and recreate
docker-compose -f docker-compose.dev.yaml down postgres
docker volume rm open-webui-rust_postgres_data_dev
docker-compose -f docker-compose.dev.yaml up -d postgres

# Migrations will run automatically when you start the Rust backend
```

### View Logs

```bash
# All infrastructure
docker-compose -f docker-compose.dev.yaml logs -f

# Specific service
docker-compose -f docker-compose.dev.yaml logs -f socketio-bridge

# Rust backend (if running locally)
# Logs appear in your terminal where you ran `cargo run`

# Frontend (if running locally)
# Logs appear in your terminal where you ran `npm run dev`
```

## Testing

### Test with Demo Account

The Rust backend seeds a test account on first run:
- Email: `test@test.com`
- Password: `test1234`

### Integration Tests

```bash
cd rust-backend

# Run tests (uses test database)
cargo test

# Run specific test
cargo test test_auth

# Run with output
cargo test -- --nocapture
```

## Database Management

### Access PostgreSQL CLI

```bash
# Via Docker
docker-compose -f docker-compose.dev.yaml exec postgres psql -U open_webui -d open_webui

# Or from host (if psql installed)
psql postgresql://open_webui:open_webui_password@localhost:5432/open_webui
```

### Useful SQL Commands

```sql
-- List all tables
\dt

-- Describe a table
\d users

-- View migrations
SELECT * FROM _sqlx_migrations;

-- Count users
SELECT COUNT(*) FROM users;

-- View recent chats
SELECT id, title, created_at FROM chat ORDER BY created_at DESC LIMIT 10;
```

### Backup & Restore in Development

```bash
# Backup
docker-compose -f docker-compose.dev.yaml exec -T postgres pg_dump -U open_webui open_webui > dev_backup.sql

# Restore
cat dev_backup.sql | docker-compose -f docker-compose.dev.yaml exec -T postgres psql -U open_webui open_webui
```

## Debugging

### Debug Rust Backend with LLDB/GDB

```bash
cd rust-backend

# Build with debug symbols
cargo build

# Run with debugger
rust-lldb target/debug/open-webui-rust
# or
rust-gdb target/debug/open-webui-rust
```

### Debug with VS Code

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Rust Backend",
      "cargo": {
        "args": ["build", "--bin=open-webui-rust"],
        "filter": {
          "name": "open-webui-rust",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}/rust-backend",
      "env": {
        "DATABASE_URL": "postgresql://open_webui:open_webui_password@localhost:5432/open_webui",
        "RUST_LOG": "debug"
      }
    }
  ]
}
```

### Enable Verbose Logging

```bash
# Rust backend
RUST_LOG=trace cargo run

# Or specific modules
RUST_LOG=open_webui_rust::routes=debug,sqlx=debug cargo run

# Socket.IO bridge
docker-compose -f docker-compose.dev.yaml logs -f socketio-bridge
```

### Check Service Health

```bash
# PostgreSQL
docker-compose -f docker-compose.dev.yaml exec postgres pg_isready

# Redis
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping

# Socket.IO
curl http://localhost:8081/health

# Rust backend (if running)
curl http://localhost:8080/health
```

## Performance Tips

### Use `cargo-watch` for Auto-Reload

```bash
# Install
cargo install cargo-watch

# Run with watch
cd rust-backend
cargo watch -x run

# Watch and clear screen on reload
cargo watch -c -x run

# Watch specific files
cargo watch -w src -x run
```

### Speed Up Rust Compilation

Add to `~/.cargo/config.toml`:
```toml
[build]
jobs = 8  # Adjust to your CPU cores

[profile.dev]
# Faster linking
split-debuginfo = "unpacked"

[target.x86_64-apple-darwin]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]  # Use LLD linker
```

### Optimize Frontend Dev Server

In `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    hmr: {
      overlay: false  // Disable error overlay if annoying
    },
    watch: {
      ignored: ['**/target/**', '**/node_modules/**']
    }
  }
});
```

## Working with Authentication

### Get JWT Token for Testing

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auths/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# Copy the token from response
TOKEN="eyJ..."

# Use token in requests
curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Get models (authenticated)
curl http://localhost:8080/api/models \
  -H "Authorization: Bearer $TOKEN"

# Create chat (authenticated)
curl -X POST http://localhost:8080/api/v1/chats/new \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat":{"title":"Test Chat"}}'
```

## Working with Socket.IO

### Test Socket.IO Connection

Using browser console:
```javascript
// Connect
const socket = io('http://localhost:8081');

// Authenticate
socket.emit('user-join', {
  auth: { token: 'your-jwt-token' }
});

// Listen for events
socket.on('chat-events', (data) => {
  console.log('Chat event:', data);
});
```

### Monitor Socket.IO Events

```bash
# View Socket.IO bridge logs
docker-compose -f docker-compose.dev.yaml logs -f socketio-bridge

# You'll see:
# - Connection events
# - Authentication attempts
# - Message broadcasts
```

## Common Issues

### Port Already in Use

```bash
# Find what's using a port
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Database Connection Refused

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.dev.yaml ps postgres

# Check logs
docker-compose -f docker-compose.dev.yaml logs postgres

# Restart if needed
docker-compose -f docker-compose.dev.yaml restart postgres
```

### Redis Connection Issues

```bash
# Test Redis
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping

# Should return: PONG
```

### Rust Compilation Errors

```bash
# Clean build
cd rust-backend
cargo clean
cargo build

# Update dependencies
cargo update
```

## Best Practices

1. **Always start infrastructure first**: `docker-compose -f docker-compose.dev.yaml up -d`
2. **Use `cargo watch`** for Rust backend auto-reload
3. **Keep migrations in sync**: Run backend after pulling changes
4. **Use environment variables**: Never hardcode credentials
5. **Test with demo account**: Use `test@test.com` / `test1234`
6. **Monitor logs**: Keep terminal with logs visible
7. **Use pgAdmin/Redis Commander**: Inspect data during development

## Production Testing

To test production-like environment locally:

```bash
# Use full docker-compose with all services
docker-compose up -d

# Access at http://localhost:3000 (not 5173)
```

This builds and runs everything in Docker, closer to production setup.

---

