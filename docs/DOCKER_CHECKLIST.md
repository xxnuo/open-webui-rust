# Docker Setup Checklist

Use this checklist to verify your Docker setup is complete and working correctly.

## Pre-Installation Checklist

- [ ] Docker version 24.0+ installed (`docker --version`)
- [ ] Docker Compose 2.0+ installed (`docker compose version` or `docker-compose --version`)
- [ ] At least 4GB RAM available
- [ ] At least 10GB free disk space
- [ ] Ports 3000, 8080, 8081, 5432, 6379 are not in use

### Check Ports
```bash
lsof -i :3000  # Should be empty
lsof -i :8080  # Should be empty
lsof -i :8081  # Should be empty
lsof -i :5432  # Should be empty
lsof -i :6379  # Should be empty
```

## Setup Checklist

- [ ] Cloned repository
- [ ] Copied `env.example` to `.env` (or ran `./docker-manage.sh setup`)
- [ ] Generated `WEBUI_SECRET_KEY` in `.env`
- [ ] Changed `POSTGRES_PASSWORD` in `.env` (for production)
- [ ] Reviewed and updated other environment variables as needed

### Verify Environment File
```bash
# Check .env exists
ls -la .env

# Verify WEBUI_SECRET_KEY is set
grep WEBUI_SECRET_KEY .env

# Verify POSTGRES_PASSWORD is set
grep POSTGRES_PASSWORD .env
```

## First Start Checklist

- [ ] Configuration validated: `docker-compose config --quiet`
- [ ] Started services: `./docker-manage.sh start` or `docker-compose up -d`
- [ ] PostgreSQL started successfully
- [ ] Redis started successfully
- [ ] Rust backend started successfully
- [ ] Socket.IO bridge started successfully
- [ ] Frontend started successfully

### Verify Services
```bash
# Check all services are running
docker-compose ps

# Should show all 5 services as "Up" or "healthy"
```

## ✅ Health Check Checklist

- [ ] PostgreSQL health: `docker-compose exec postgres pg_isready`
- [ ] Redis health: `docker-compose exec redis redis-cli ping`
- [ ] Rust backend health: `curl http://localhost:8080/health`
- [ ] Socket.IO health: `curl http://localhost:8081/health`
- [ ] Frontend health: `curl http://localhost:3000/health`

### Quick Health Check
```bash
# Run built-in health check
./docker-manage.sh health

# All services should show as healthy
```

## Access Checklist

- [ ] Frontend accessible: http://localhost:3000
- [ ] Can see login/signup page
- [ ] Created first admin account
- [ ] Successfully logged in
- [ ] Can access dashboard

### Test Endpoints
```bash
# Frontend
curl -I http://localhost:3000

# API
curl -I http://localhost:8080/health

# Socket.IO
curl -I http://localhost:8081/health
```

## Database Checklist

- [ ] Database migrations ran successfully
- [ ] Can access PostgreSQL: `./docker-manage.sh shell postgres`
- [ ] Tables created (check with `\dt` in psql)
- [ ] First user account created

### Verify Database
```bash
# Check migrations
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT * FROM _sqlx_migrations;"

# Check tables exist
docker-compose exec postgres psql -U open_webui -d open_webui -c "\dt"

# Check users table
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT COUNT(*) FROM users;"
```

## Data Persistence Checklist

- [ ] Volumes created: `docker volume ls | grep open-webui`
- [ ] PostgreSQL volume exists: `postgres_data`
- [ ] Redis volume exists: `redis_data`
- [ ] Rust backend volume exists: `rust_backend_data`
- [ ] Frontend volume exists: `frontend_data`

### Verify Volumes
```bash
# List all project volumes
docker volume ls | grep open-webui

# Should show 4 volumes
```

## Logs Checklist

- [ ] Can view logs: `./docker-manage.sh logs`
- [ ] No critical errors in PostgreSQL logs
- [ ] No critical errors in Rust backend logs
- [ ] No critical errors in Socket.IO logs
- [ ] No critical errors in frontend logs

### Check for Errors
```bash
# Check all logs for errors
docker-compose logs | grep -i error

# Check specific service
docker-compose logs rust-backend | grep -i error
```

## Functionality Checklist

### Authentication
- [ ] Can sign up new user
- [ ] Can log in
- [ ] Can log out
- [ ] JWT tokens working
- [ ] Session persists on refresh

### API
- [ ] Can access protected endpoints
- [ ] Can create chat
- [ ] Can list chats
- [ ] Can delete chat
- [ ] API responds correctly

### Real-time Features (Socket.IO)
- [ ] Socket.IO connection established
- [ ] Can send messages in chat
- [ ] Real-time updates working
- [ ] Channels working (if enabled)
- [ ] User presence working

### File Upload
- [ ] Can upload files
- [ ] Files stored in volume
- [ ] Can retrieve uploaded files

## Advanced Checklist

### Backup & Restore
- [ ] Can create backup: `./docker-manage.sh backup`
- [ ] Backup files created in `backups/` directory
- [ ] Can restore from backup: `./docker-manage.sh restore <file>`

### Service Management
- [ ] Can restart services: `./docker-manage.sh restart`
- [ ] Can view service status: `./docker-manage.sh status`
- [ ] Can rebuild services: `./docker-manage.sh rebuild`
- [ ] Can access service shells: `./docker-manage.sh shell <service>`

### Monitoring
- [ ] Can check health: `./docker-manage.sh health`
- [ ] Can view resource usage: `docker stats`
- [ ] Logs are accessible and readable

## Security Checklist (Production)

- [ ] Changed `WEBUI_SECRET_KEY` from default
- [ ] Changed `POSTGRES_PASSWORD` from default
- [ ] Reviewed and configured CORS settings
- [ ] Set up HTTPS (reverse proxy)
- [ ] Configured firewall rules
- [ ] Disabled signup if not needed (`ENABLE_SIGNUP=false`)
- [ ] Set up regular backups
- [ ] Reviewed and limited exposed ports

## Performance Checklist

- [ ] Services start within expected time (< 2 minutes)
- [ ] API responds quickly (< 500ms)
- [ ] No memory leaks (check with `docker stats`)
- [ ] Database queries are fast
- [ ] Redis caching working

### Monitor Resources
```bash
# Watch resource usage
docker stats

# Check container sizes
docker-compose images
```

## Troubleshooting Checklist

If something isn't working:

- [ ] Checked logs: `./docker-manage.sh logs`
- [ ] Verified all services are running: `docker-compose ps`
- [ ] Checked health: `./docker-manage.sh health`
- [ ] Verified environment variables: `docker-compose config`
- [ ] Checked port conflicts: `lsof -i :<port>`
- [ ] Reviewed documentation: `DOCKER_SETUP.md`
- [ ] Tried restarting services: `./docker-manage.sh restart`

### Common Issues

**Services won't start:**
```bash
# Check for port conflicts
./docker-manage.sh stop
lsof -i :3000 :8080 :8081 :5432 :6379

# View logs
docker-compose logs
```

**Database connection issues:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U open_webui
```

**Out of disk space:**
```bash
# Clean up unused Docker resources
docker system prune -a

# Check disk usage
df -h
docker system df
```

## Final Verification

Run these commands to ensure everything is working:

```bash
# 1. Check all services are up
docker-compose ps

# 2. Check health
./docker-manage.sh health

# 3. Test API
curl http://localhost:8080/health

# 4. Test Socket.IO
curl http://localhost:8081/health

# 5. Test frontend
curl http://localhost:3000

# 6. View logs (should have no errors)
docker-compose logs --tail=50

# 7. Check resource usage
docker stats --no-stream
```

## Success Criteria

Your setup is successful if:

✅ All services show as "Up" or "healthy"  
✅ All health checks pass  
✅ Frontend accessible at http://localhost:3000  
✅ Can create and log in to user account  
✅ Can create and view chats  
✅ Real-time features working  
✅ No critical errors in logs  
✅ Backups can be created  

## Congratulations!

If you've checked all these items, your Docker setup is complete and working correctly!

### Next Steps

1. **Development**: Read `DOCKER_DEV.md` for local development workflow
2. **Production**: Read `DOCKER_SETUP.md` for production deployment
3. **Customization**: Edit `.env` to enable/disable features
4. **Backups**: Set up automated backups with cron

### Quick Reference

```bash
# Daily usage
./docker-manage.sh start      # Start services
./docker-manage.sh stop       # Stop services
./docker-manage.sh logs       # View logs
./docker-manage.sh health     # Check health
./docker-manage.sh backup     # Create backup

# Need help?
./docker-manage.sh help       # Show all commands
```

---

**Need help?** Check `DOCKER_README.md` for navigation to detailed guides.

