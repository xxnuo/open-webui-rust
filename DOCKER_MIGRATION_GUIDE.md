# Migration Guide: Python to Rust Backend

This guide helps users understand the differences between the Python backend and Rust backend Docker setups.

## Architecture Comparison

### Original Python Backend Setup

```
┌────────────────────────────────────┐
│    Single Container                 │
├────────────────────────────────────┤
│  - Python (FastAPI)                 │
│  - SvelteKit Frontend (built)       │
│  - All-in-one approach              │
│  - Port 8080 → 3000 (external)      │
└────────────────────────────────────┘
```

### New Rust Backend Setup

```
┌─────────────────────────────────────────────────────────┐
│         Multi-Container Architecture                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Frontend  │  │  Socket.IO   │  │  Rust Backend   │ │
│  │ Container  │  │  Container   │  │   Container     │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
│                                                          │
│  ┌────────────┐                    ┌─────────────────┐ │
│  │ PostgreSQL │                    │     Redis       │ │
│  │ Container  │                    │   Container     │ │
│  └────────────┘                    └─────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Key Differences

### Database

| Aspect | Python Backend | Rust Backend |
|--------|---------------|--------------|
| **Database** | SQLite (file-based) | PostgreSQL (server) |
| **Location** | Inside container | Dedicated container |
| **Migrations** | Alembic | SQLx |
| **Persistence** | Volume mount | Dedicated volume |
| **Scalability** | Single instance | Multi-instance ready |

### Caching & Sessions

| Aspect | Python Backend | Rust Backend |
|--------|---------------|--------------|
| **Caching** | In-memory | Redis |
| **Sessions** | In-memory | Redis |
| **WebSocket State** | In-memory | Redis |
| **Scalability** | Single instance | Multi-instance |

### Real-time Features

| Aspect | Python Backend | Rust Backend |
|--------|---------------|--------------|
| **WebSocket** | Native Python | Socket.IO Bridge |
| **Implementation** | python-socketio | Separate container |
| **Scalability** | Limited | Redis-backed |
| **Language** | Python | Python (bridge) |

### Performance

| Aspect | Python Backend | Rust Backend |
|--------|---------------|--------------|
| **Speed** | Good | Excellent |
| **Memory** | ~500MB | ~400MB (backend only) |
| **Concurrency** | asyncio | Tokio (better) |
| **Startup Time** | 10-20s | 5-10s |
| **Request Latency** | 50-100ms | 10-30ms |

## Migration Steps

### From Python Backend Docker Setup

If you're currently using the Python backend with Docker:

#### 1. Backup Your Data

```bash
# Backup your existing database
docker-compose exec open-webui sqlite3 /app/backend/data/webui.db ".backup /app/backend/data/backup.db"

# Copy backup out of container
docker cp open-webui:/app/backend/data/backup.db ./backup.db

# Backup uploads
docker cp open-webui:/app/backend/data/uploads ./uploads_backup
```

#### 2. Export Data (if needed)

```bash
# Export users (example)
docker-compose exec open-webui sqlite3 /app/backend/data/webui.db \
  ".mode csv" ".output users.csv" "SELECT * FROM users;"

# Export chats
docker-compose exec open-webui sqlite3 /app/backend/data/webui.db \
  ".mode csv" ".output chats.csv" "SELECT * FROM chat;"
```

#### 3. Stop Old Setup

```bash
# Stop the Python backend setup
docker-compose down

# Optional: Remove old volumes (after backing up!)
# docker volume rm open-webui_data
```

#### 4. Setup New Rust Backend

```bash
# Clone or pull latest code with Rust backend
cd /path/to/open-webui-rust

# Setup environment
./docker-manage.sh setup

# Start new setup
./docker-manage.sh start
```

#### 5. Migrate Data (Manual)

**Option A: Start Fresh**
- Create new admin account
- Re-upload any documents
- Recreate chats (recommended for clean start)

**Option B: Data Migration Script** (if provided)
```bash
# Run migration script (if available)
./migrate-sqlite-to-postgres.sh backup.db
```

#### 6. Verify Migration

```bash
# Check all services are running
./docker-manage.sh health

# Check database has data
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT COUNT(*) FROM users;"

# Test functionality
# - Login
# - Create chat
# - Upload file
```

## New Features with Rust Backend

### 1. Separate Services
- Each component runs in its own container
- Better resource management
- Easier to scale individual components

### 2. PostgreSQL Database
- Better concurrent access
- More reliable for production
- Better querying capabilities
- ACID compliance

### 3. Redis Caching
- Fast in-memory caching
- Shared state across instances
- WebSocket coordination
- Session management

### 4. Improved Performance
- Faster API responses
- Better concurrent handling
- Lower memory usage
- More efficient database queries

### 5. Better Scalability
- Can run multiple backend instances
- Load balancer ready
- Redis-backed state management
- Horizontal scaling support

## Configuration Changes

### Environment Variables

**Python Backend:**
```bash
WEBUI_SECRET_KEY=...
DATA_DIR=/app/backend/data
OPENAI_API_KEY=...
```

**Rust Backend:**
```bash
WEBUI_SECRET_KEY=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ENABLE_REDIS=true
SOCKETIO_BRIDGE_URL=http://...
OPENAI_API_KEY=...
```

### Ports

**Python Backend:**
- 8080 (container) → 3000 (host)

**Rust Backend:**
- PostgreSQL: 5432
- Redis: 6379
- Rust Backend: 8080
- Socket.IO: 8081
- Frontend: 8080 (container) → 3000 (host)

### Volumes

**Python Backend:**
```yaml
volumes:
  - open-webui:/app/backend/data
```

**Rust Backend:**
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - redis_data:/data
  - rust_backend_data:/app/data
  - frontend_data:/app/backend/data
```

## Feature Parity

### Fully Supported ✅
- User authentication & authorization
- Chat creation and management
- File uploads
- Model management
- Prompt management
- Knowledge base (RAG)
- WebSocket/real-time features
- Channels
- API keys
- LDAP authentication

### Coming Soon 🚧
- Some advanced RAG features
- Specific Python-only integrations
- Legacy endpoints

### Not Planned ❌
- SQLite support (use PostgreSQL)

## Troubleshooting Migration

### Issue: Data Not Migrating

**Solution:**
```bash
# Check old data structure
sqlite3 backup.db ".schema users"

# Compare with new structure
docker-compose exec postgres psql -U open_webui -d open_webui -c "\d users"

# May need custom migration script
```

### Issue: Different API Endpoints

**Solution:**
```bash
# Check API documentation
curl http://localhost:8080/api/docs

# Compare with Python backend
# Most endpoints should be compatible
```

### Issue: Performance Seems Slow

**Solution:**
```bash
# Check service health
./docker-manage.sh health

# Check resource usage
docker stats

# Check logs for errors
./docker-manage.sh logs
```

### Issue: WebSocket Not Working

**Solution:**
```bash
# Check Socket.IO bridge
docker-compose logs socketio-bridge

# Verify Redis connection
docker-compose exec redis redis-cli ping

# Check frontend Socket.IO URL configuration
```

## Best Practices

### 1. Start Fresh for Production
- Don't migrate old test data
- Create clean production environment
- Set strong passwords from start

### 2. Use Separate Development Environment
```bash
# Use dev compose for testing
docker-compose -f docker-compose.dev.yaml up -d

# Test Rust backend locally
cd rust-backend && cargo run
```

### 3. Plan Downtime
- Schedule migration during low usage
- Inform users of downtime
- Have rollback plan ready

### 4. Test Thoroughly
- Test all critical features
- Verify data integrity
- Check performance
- Test real-time features

### 5. Monitor After Migration
```bash
# Watch logs
./docker-manage.sh logs -f

# Check health regularly
./docker-manage.sh health

# Monitor resource usage
docker stats
```

## Additional Resources

### Documentation
- **Rust Backend**: `rust-backend/README.md`
- **Docker Setup**: `DOCKER_SETUP.md`
- **Development**: `DOCKER_DEV.md`
- **Quick Start**: `DOCKER_QUICKSTART.md`

### Commands Reference
```bash
# Management
./docker-manage.sh help

# Health checks
./docker-manage.sh health

# Logs
./docker-manage.sh logs [service]

# Backup
./docker-manage.sh backup

# Shell access
./docker-manage.sh shell [service]
```

## Migration Checklist

- [ ] Backup all data from Python backend
- [ ] Export any critical information
- [ ] Stop Python backend services
- [ ] Setup Rust backend environment
- [ ] Start Rust backend services
- [ ] Verify all services are healthy
- [ ] Migrate/recreate user accounts
- [ ] Test authentication
- [ ] Test chat functionality
- [ ] Test file uploads
- [ ] Test real-time features
- [ ] Verify API endpoints work
- [ ] Check performance
- [ ] Setup automated backups
- [ ] Document any custom configurations
- [ ] Monitor for issues

## Understanding the Changes

### Why PostgreSQL?
- Better concurrency
- Production-grade reliability
- ACID compliance
- Better querying
- Industry standard

### Why Redis?
- Fast caching
- Session management
- WebSocket state
- Scalability
- Multi-instance support

### Why Separate Containers?
- Better isolation
- Easier to scale
- Better resource management
- Easier to debug
- More flexible deployment

### Why Socket.IO Bridge?
- Production-ready WebSocket support
- Better compatibility
- Easier scaling
- Redis-backed state
- Proven reliability

## Benefits After Migration

1. **Better Performance**: 2-3x faster API responses
2. **Better Scalability**: Can run multiple instances
3. **Better Reliability**: Production-grade database
4. **Better Caching**: Redis for fast data access
5. **Better Monitoring**: Separate services for better observability
6. **Better Development**: Easier local development with dev compose
7. **Better Deployment**: More flexible deployment options

---

**Need help?** Check `DOCKER_README.md` or run `./docker-manage.sh help`

