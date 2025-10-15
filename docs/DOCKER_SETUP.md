# Docker Setup for Open WebUI (Rust Backend)

This guide explains how to run Open WebUI with the Rust backend using Docker Compose.

## Architecture

The Docker Compose setup includes the following services:

1. **PostgreSQL** - Primary database for storing all application data
2. **Redis** - Caching and WebSocket/Socket.IO session management
3. **Rust Backend** - Main API server (Actix-web based)
4. **Socket.IO Bridge** - Python-based Socket.IO server for real-time features
5. **Frontend** - SvelteKit frontend with Python backend (for backward compatibility)

## Prerequisites

- Docker 24.0 or higher
- Docker Compose 2.0 or higher
- At least 4GB of available RAM
- 10GB of free disk space

## Quick Start

### 1. Copy the environment file

```bash
cp env.example .env
```

### 2. Configure environment variables

Edit `.env` and set at minimum:

```bash
# Required: Generate a strong secret key
WEBUI_SECRET_KEY=$(openssl rand -hex 32)

# Database credentials (change these!)
POSTGRES_PASSWORD=your_secure_password

# Optional: OpenAI API configuration
OPENAI_API_KEY=sk-...
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

### 3. Start all services

```bash
docker-compose up -d
```

This will:
- Pull/build all required Docker images
- Create necessary volumes for data persistence
- Start all services in the correct order
- Run database migrations automatically

### 4. Access the application

- **Frontend**: http://localhost:3000
- **Rust Backend API**: http://localhost:8080
- **Socket.IO**: http://localhost:8081

### 5. Create admin account

On first run, create an admin account by signing up at:
http://localhost:3000/auth

The first user will automatically become an admin.

## Service Details

### PostgreSQL (postgres)

- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: `open_webui` (configurable via `POSTGRES_DB`)
- **Volume**: `postgres_data` - persists all database data
- **Health Check**: Ensures database is ready before other services start

### Redis (redis)

- **Port**: 6379 (configurable via `REDIS_PORT`)
- **Volume**: `redis_data` - persists Redis data (AOF enabled)
- **Purpose**: Session management, caching, WebSocket coordination

### Rust Backend (rust-backend)

- **Port**: 8080 (configurable via `RUST_PORT`)
- **Volume**: `rust_backend_data` - stores uploads and cache
- **Features**:
  - REST API endpoints
  - Database migrations (auto-run on startup)
  - Authentication & authorization
  - File uploads
  - Integration with Socket.IO bridge

### Socket.IO Bridge (socketio-bridge)

- **Port**: 8081 (configurable via `SOCKETIO_PORT`)
- **Technology**: Python with `python-socketio` and `aiohttp`
- **Purpose**: Provides production-ready Socket.IO support for:
  - Real-time chat updates
  - Channel messages
  - User presence
  - Usage tracking
  - Collaborative features

### Frontend (frontend)

- **Port**: 3000 (mapped from internal 8080, configurable via `OPEN_WEBUI_PORT`)
- **Volume**: `frontend_data` - stores frontend-specific data
- **Technologies**: SvelteKit + Python backend (for RAG, embeddings, etc.)

## Common Commands

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f rust-backend
docker-compose logs -f socketio-bridge
docker-compose logs -f frontend
```

### Restart a service

```bash
docker-compose restart rust-backend
docker-compose restart socketio-bridge
```

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes all data)

```bash
docker-compose down -v
```

### Rebuild after code changes

```bash
# Rebuild specific service
docker-compose build rust-backend
docker-compose build socketio-bridge

# Rebuild and restart
docker-compose up -d --build rust-backend
```

### Access service shell

```bash
# Rust backend
docker-compose exec rust-backend sh

# PostgreSQL
docker-compose exec postgres psql -U open_webui -d open_webui
```

## Database Migrations

Database migrations run automatically when the Rust backend starts. They are located in:

```
rust-backend/migrations/postgres/
├── 001_initial.sql
├── 002_add_missing_columns.sql
├── 003_add_config_table.sql
├── 004_add_channel_messages.sql
└── 005_add_note_feedback_tables.sql
```

### Manual migration management

If you need to run migrations manually:

```bash
# Access Rust backend container
docker-compose exec rust-backend sh

# Migrations are run automatically, but you can check status via PostgreSQL
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT * FROM _sqlx_migrations;"
```

## Volume Management

All data is persisted in Docker volumes:

- `postgres_data` - PostgreSQL database
- `redis_data` - Redis cache and session data
- `rust_backend_data` - Uploaded files, cache
- `frontend_data` - Frontend-specific data (embeddings, models)

### Backup volumes

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U open_webui open_webui > backup.sql

# Backup uploaded files
docker run --rm -v open-webui-rust_rust_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### Restore volumes

```bash
# Restore PostgreSQL
cat backup.sql | docker-compose exec -T postgres psql -U open_webui open_webui

# Restore uploaded files
docker run --rm -v open-webui-rust_rust_backend_data:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## Troubleshooting

### Services fail to start

Check the logs:
```bash
docker-compose logs
```

Ensure required ports are not in use:
```bash
# Check if ports are available
lsof -i :3000  # Frontend
lsof -i :8080  # Rust backend
lsof -i :8081  # Socket.IO
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

### Database connection issues

Check PostgreSQL is running:
```bash
docker-compose ps postgres
docker-compose logs postgres
```

Test connection:
```bash
docker-compose exec postgres pg_isready -U open_webui
```

### Migration errors

View migration status:
```bash
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT * FROM _sqlx_migrations ORDER BY version;"
```

### Socket.IO not working

Check the bridge is running:
```bash
docker-compose ps socketio-bridge
docker-compose logs socketio-bridge
```

Test health endpoint:
```bash
curl http://localhost:8081/health
```

### Reset everything

To completely reset (⚠️ deletes all data):

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d
```

## Production Deployment

For production deployments:

1. **Change default passwords**:
   - `POSTGRES_PASSWORD`
   - `WEBUI_SECRET_KEY`

2. **Configure SSL/TLS**:
   - Use a reverse proxy (nginx, Traefik, Caddy)
   - Obtain SSL certificates (Let's Encrypt)

3. **Adjust resource limits**:
   ```yaml
   rust-backend:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
   ```

4. **Set up monitoring**:
   - Use Prometheus for metrics
   - Configure log aggregation (ELK, Loki)

5. **Enable backups**:
   - Automated PostgreSQL backups
   - Volume snapshots

6. **Security hardening**:
   - Run containers as non-root user
   - Enable SELinux/AppArmor
   - Use secrets management (Docker Secrets, Vault)

## Environment Variables Reference

See `env.example` for a complete list of configuration options.

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | - | PostgreSQL password (required) |
| `WEBUI_SECRET_KEY` | - | JWT signing key (required) |
| `RUST_PORT` | 8080 | Rust backend port |
| `SOCKETIO_PORT` | 8081 | Socket.IO bridge port |
| `OPEN_WEBUI_PORT` | 3000 | Frontend port |
| `ENABLE_REDIS` | true | Enable Redis caching |
| `ENABLE_SIGNUP` | true | Allow user registration |
| `ENABLE_CHANNELS` | true | Enable channels feature |
| `OPENAI_API_KEY` | - | OpenAI API key |

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review configuration: `docker-compose config`
- GitHub Issues: [knoxchat/open-webui-rust](https://github.com/knoxchat/open-webui-rust)

