# Docker Quick Start Guide

## Get Started in 3 Minutes

### Prerequisites
- Docker & Docker Compose installed
- At least 4GB RAM available
- 10GB free disk space

### Step 1: Clone and Navigate
```bash
cd open-webui-rust
```

### Step 2: Setup Environment
```bash
./docker-manage.sh setup
```

This will:
- Create `.env` file from template
- Generate secure `WEBUI_SECRET_KEY`
- Set default configurations

### Step 3: Start Everything
```bash
./docker-manage.sh start
```

Or manually:
```bash
docker-compose up -d
```

### Step 4: Access the App
Open http://localhost:3000 in your browser and create your admin account!

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Port 3000)                   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
        ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│   Frontend   │          │  Socket.IO       │
│  (SvelteKit  │◄────────►│  Bridge          │
│  + Python)   │          │  (Python)        │
│  Port 8080   │          │  Port 8081       │
└──────┬───────┘          └────────┬─────────┘
       │                           │
       │         ┌─────────────────┘
       │         │
       ▼         ▼
┌─────────────────────┐
│   Rust Backend      │
│   (Actix-web)       │
│   Port 8080         │
└──────┬──────┬───────┘
       │      │
       ▼      ▼
┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │
│Port 5432 │  │Port 6379 │
└──────────┘  └──────────┘
```

---

## Common Commands

### Service Management

```bash
# View all services status
./docker-manage.sh status

# View logs (all services)
./docker-manage.sh logs

# View logs (specific service)
./docker-manage.sh logs rust-backend

# Restart a service
./docker-manage.sh restart socketio-bridge

# Check health of all services
./docker-manage.sh health
```

### Development Workflow

```bash
# After code changes to Rust backend
./docker-manage.sh rebuild rust-backend
docker-compose up -d rust-backend

# After code changes to Socket.IO bridge
./docker-manage.sh rebuild socketio-bridge
docker-compose up -d socketio-bridge

# After code changes to frontend
./docker-manage.sh rebuild frontend
docker-compose up -d frontend
```

### Database Operations

```bash
# Access PostgreSQL
./docker-manage.sh shell postgres

# View tables
docker-compose exec postgres psql -U open_webui -d open_webui -c "\dt"

# Backup database
./docker-manage.sh backup

# Restore database
./docker-manage.sh restore backups/db_backup_20250101_120000.sql
```

---

## Service Details

### Rust Backend
- **URL**: http://localhost:8080
- **API Docs**: http://localhost:8080/api/docs (if enabled)
- **Health**: http://localhost:8080/health

### Socket.IO Bridge
- **URL**: http://localhost:8081
- **Health**: http://localhost:8081/health
- **WebSocket**: ws://localhost:8081/socket.io

### Frontend
- **URL**: http://localhost:3000
- **Health**: http://localhost:3000/health

### PostgreSQL
- **Port**: 5432
- **Database**: `open_webui`
- **User**: `open_webui`
- **Password**: Set in `.env`

### Redis
- **Port**: 6379
- **Purpose**: Caching, session management, WebSocket coordination

---

## Troubleshooting

### Services Won't Start

```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :8080  # Rust backend
lsof -i :8081  # Socket.IO
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# View detailed logs
docker-compose logs
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U open_webui
```

### Reset Everything

```bash
# ⚠️ This will delete ALL data!
./docker-manage.sh clean
./docker-manage.sh start
```

### View Real-time Logs

```bash
# All services
docker-compose logs -f

# Multiple specific services
docker-compose logs -f rust-backend socketio-bridge
```

---

## Configuration

### Environment Variables

Key variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | - | Database password (**change this!**) |
| `WEBUI_SECRET_KEY` | auto-generated | JWT signing key |
| `OPEN_WEBUI_PORT` | 3000 | Frontend port |
| `RUST_PORT` | 8080 | Rust backend port |
| `SOCKETIO_PORT` | 8081 | Socket.IO port |
| `ENABLE_SIGNUP` | true | Allow new user registration |
| `ENABLE_REDIS` | true | Use Redis for caching |

### Customizing Ports

Edit `.env`:
```bash
OPEN_WEBUI_PORT=3001
RUST_PORT=8090
SOCKETIO_PORT=8091
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

---

## Data Persistence

All data is stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep open-webui

# Inspect a volume
docker volume inspect open-webui-rust_postgres_data

# Backup volumes
./docker-manage.sh backup
```

Volumes:
- `postgres_data` - All database data
- `redis_data` - Redis persistence
- `rust_backend_data` - Uploaded files, cache
- `frontend_data` - Models, embeddings, etc.

---

## Production Deployment

1. **Change all passwords**:
   ```bash
   POSTGRES_PASSWORD=<strong-password>
   WEBUI_SECRET_KEY=$(openssl rand -hex 32)
   ```

2. **Use a reverse proxy** (nginx, Traefik, Caddy):
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

3. **Enable backups**:
   ```bash
   # Add to crontab
   0 2 * * * /path/to/docker-manage.sh backup
   ```

4. **Monitor logs**:
   ```bash
   docker-compose logs -f > logs/app.log 2>&1
   ```

---

## Getting Help

- **Check logs first**: `./docker-manage.sh logs`
- **Check service health**: `./docker-manage.sh health`
- **View full documentation**: See `DOCKER_SETUP.md`
- **GitHub Issues**: https://github.com/knoxchat/open-webui-rust

---

## Additional Resources

- Full Docker Setup Guide: `DOCKER_SETUP.md`
- Rust Backend Development: `rust-backend/README.md`
- Frontend Development: Main `README.md`

---

**Happy coding! 🎉**

