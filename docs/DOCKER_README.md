# Docker Setup Documentation

Complete Docker setup for Open WebUI with Rust backend, including PostgreSQL, Redis, Socket.IO, and frontend.

## Documentation Index

Choose the guide that fits your needs:

### [Quick Start Guide](DOCKER_QUICKSTART.md)
**For users who want to run the application quickly**
- Get started in 3 minutes
- Basic commands and troubleshooting
- Common operations
- Production deployment basics

### [Development Guide](DOCKER_DEV.md)
**For developers working on the codebase**
- Local development setup
- Running services in Docker while developing locally
- Debugging tips
- Database management
- Performance optimization

### [Complete Setup Guide](DOCKER_SETUP.md)
**For detailed information and advanced usage**
- Architecture explanation
- Service details
- Volume management
- Backup and restore procedures
- Production deployment
- Comprehensive troubleshooting

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Frontend   │  │  Socket.IO   │  │  Rust Backend   │ │
│  │  (SvelteKit)│──│  Bridge      │──│  (Actix-web)    │ │
│  │  Port 3000  │  │  Port 8081   │  │  Port 8080      │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                │                   │           │
│         └────────────────┴───────────────────┘           │
│                          │                               │
│         ┌────────────────┴────────────────┐              │
│         │                                 │              │
│  ┌──────▼───────┐              ┌─────────▼────────┐     │
│  │  PostgreSQL  │              │      Redis        │     │
│  │  Port 5432   │              │    Port 6379      │     │
│  └──────────────┘              └───────────────────┘     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Quick Commands

### First Time Setup
```bash
# 1. Setup environment
./docker-manage.sh setup

# 2. Start all services
./docker-manage.sh start

# 3. Access the app
open http://localhost:3000
```

### Daily Development
```bash
# Start
./docker-manage.sh start

# View logs
./docker-manage.sh logs

# Restart after changes
./docker-manage.sh restart rust-backend

# Stop
./docker-manage.sh stop
```

### Maintenance
```bash
# Check health
./docker-manage.sh health

# Backup
./docker-manage.sh backup

# View status
./docker-manage.sh status
```

## What's Included

### Production Stack (`docker-compose.yaml`)
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and session management
- **Rust Backend** - API server (Actix-web)
- **Socket.IO Bridge** - Real-time WebSocket support (Python)
- **Frontend** - SvelteKit UI with Python backend

### Development Stack (`docker-compose.dev.yaml`)
- PostgreSQL, Redis, Socket.IO Bridge
- **pgAdmin** - Database admin UI
- **Redis Commander** - Redis admin UI
- Optimized for local development with Rust backend and frontend running outside Docker

## Key Features

### ✅ Database Migrations
- Automatic migrations on startup
- Migration scripts in `rust-backend/migrations/postgres/`
- SQLx-based migration system

### ✅ Data Persistence
- All data stored in Docker volumes
- Easy backup and restore
- Separate dev and prod volumes

### ✅ Health Checks
- All services have health checks
- Proper startup ordering
- Dependencies managed automatically

### ✅ Real-time Features
- Socket.IO for WebSocket support
- Redis-backed for scalability
- Channel and chat events

### ✅ Development Tools
- pgAdmin for database inspection
- Redis Commander for cache inspection
- Hot reload support
- Detailed logging

## Requirements

- Docker 24.0+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB free disk space

## Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Rust Backend | 8080 | http://localhost:8080 |
| Socket.IO | 8081 | http://localhost:8081 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| pgAdmin | 5050 | http://localhost:5050 |
| Redis Commander | 8082 | http://localhost:8082 |

All ports are configurable via `.env` file.

## Security Notes

### Development (Default)
- Simple passwords in `env.example`
- Open CORS policy
- All features enabled
- ⚠️ **NOT for production use**

### Production
Required changes:
1. Generate strong `WEBUI_SECRET_KEY`
2. Change `POSTGRES_PASSWORD`
3. Configure CORS properly
4. Use HTTPS (reverse proxy)
5. Enable firewall rules
6. Regular backups

See [Complete Setup Guide](DOCKER_SETUP.md) for production deployment.

## Data Flow

```
User Request
    │
    ▼
Frontend (Browser)
    │
    ├─► REST API ──────► Rust Backend ──┬─► PostgreSQL
    │                                    └─► Redis
    │
    └─► WebSocket ─────► Socket.IO ─────┬─► Rust Backend
                         Bridge          └─► Redis
```

## Troubleshooting

### Services won't start
```bash
./docker-manage.sh health
docker-compose logs
```

### Port conflicts
```bash
lsof -i :3000
lsof -i :8080
```

### Database issues
```bash
./docker-manage.sh shell postgres
docker-compose logs postgres
```

### Reset everything
```bash
./docker-manage.sh clean  # ⚠️ Deletes all data
./docker-manage.sh start
```

## 📖 Documentation Structure

```
DOCKER_README.md           ← You are here (overview)
├── DOCKER_QUICKSTART.md   ← 3-minute quick start
├── DOCKER_SETUP.md        ← Complete setup guide
└── DOCKER_DEV.md          ← Development workflow
```

## 🛠️ Files Overview

### Configuration
- `docker-compose.yaml` - Production stack
- `docker-compose.dev.yaml` - Development stack
- `env.example` - Environment variables template
- `.dockerignore` - Docker build ignore rules

### Dockerfiles
- `Dockerfile` - Frontend (SvelteKit + Python)
- `rust-backend/Dockerfile` - Rust backend
- `rust-backend/Dockerfile.socketio` - Socket.IO bridge

### Scripts
- `docker-manage.sh` - Management helper script
- `rust-backend/build.sh` - Rust build script

### Documentation
- `DOCKER_README.md` - This file
- `DOCKER_QUICKSTART.md` - Quick start
- `DOCKER_SETUP.md` - Complete guide
- `DOCKER_DEV.md` - Development guide

## 🚀 Getting Started

### New Users (Just Want to Run It)
1. Read [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)
2. Run `./docker-manage.sh setup`
3. Run `./docker-manage.sh start`
4. Open http://localhost:3000

### Developers (Working on Code)
1. Read [DOCKER_DEV.md](DOCKER_DEV.md)
2. Start infrastructure: `docker-compose -f docker-compose.dev.yaml up -d`
3. Run Rust backend locally: `cd rust-backend && cargo run`
4. Run frontend locally: `npm run dev`
5. Access http://localhost:5173

### System Administrators (Production)
1. Read [DOCKER_SETUP.md](DOCKER_SETUP.md)
2. Configure `.env` with production values
3. Setup reverse proxy (nginx/Traefik/Caddy)
4. Configure SSL/TLS
5. Setup backups
6. Deploy with `docker-compose up -d`

## 💡 Tips

- Use `./docker-manage.sh` for convenience
- Check logs with `./docker-manage.sh logs [service]`
- Backup regularly with `./docker-manage.sh backup`
- Use dev compose for local development
- Enable tools profile for debugging: `--profile tools`

## 🆘 Support

- **Logs**: `./docker-manage.sh logs`
- **Status**: `./docker-manage.sh status`
- **Health**: `./docker-manage.sh health`
- **Help**: `./docker-manage.sh help`

For detailed information, see the specific guide:
- Quick Start: `DOCKER_QUICKSTART.md`
- Development: `DOCKER_DEV.md`
- Complete Guide: `DOCKER_SETUP.md`

---

**Choose your path:**
- 🚀 Want to run it now? → [Quick Start](DOCKER_QUICKSTART.md)
- 🔧 Developer? → [Development Guide](DOCKER_DEV.md)
- 📖 Need details? → [Complete Setup](DOCKER_SETUP.md)

