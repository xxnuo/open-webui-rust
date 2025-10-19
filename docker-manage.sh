#!/bin/bash

# Open WebUI Docker Management Script
# Provides convenient commands for managing the Docker Compose setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name
PROJECT_NAME="open-webui-rust"

# Helper functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Get docker compose command (handles both docker-compose and docker compose)
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            info "Creating .env file from env.example..."
            cp env.example .env
            
            # Generate secret key
            if command -v openssl &> /dev/null; then
                SECRET_KEY=$(openssl rand -hex 32)
                # Update WEBUI_SECRET_KEY in .env
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/WEBUI_SECRET_KEY=.*/WEBUI_SECRET_KEY=$SECRET_KEY/" .env
                else
                    sed -i "s/WEBUI_SECRET_KEY=.*/WEBUI_SECRET_KEY=$SECRET_KEY/" .env
                fi
                success "Generated WEBUI_SECRET_KEY"
            else
                warning "OpenSSL not found. Please set WEBUI_SECRET_KEY in .env manually."
            fi
            
            warning "Please review and update .env file with your configuration."
            warning "Especially set POSTGRES_PASSWORD and other sensitive values."
        else
            error "env.example not found. Cannot create .env file."
            exit 1
        fi
    else
        info ".env file already exists."
    fi
}

# Start services
start() {
    COMPOSE_CMD=$(get_compose_cmd)
    info "Starting all services..."
    $COMPOSE_CMD up -d
    success "Services started. Use '$0 logs' to view logs."
    info "Access the application at http://localhost:${OPEN_WEBUI_PORT:-3000}"
}

# Stop services
stop() {
    COMPOSE_CMD=$(get_compose_cmd)
    info "Stopping all services..."
    $COMPOSE_CMD down
    success "Services stopped."
}

# Restart services
restart() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -z "$1" ]; then
        info "Restarting all services..."
        $COMPOSE_CMD restart
        success "All services restarted."
    else
        info "Restarting $1..."
        $COMPOSE_CMD restart "$1"
        success "$1 restarted."
    fi
}

# View logs
logs() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -z "$1" ]; then
        $COMPOSE_CMD logs -f
    else
        $COMPOSE_CMD logs -f "$1"
    fi
}

# Show status
status() {
    COMPOSE_CMD=$(get_compose_cmd)
    $COMPOSE_CMD ps
}

# Rebuild services
rebuild() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -z "$1" ]; then
        info "Rebuilding all services..."
        $COMPOSE_CMD build --no-cache
        success "All services rebuilt."
    else
        info "Rebuilding $1..."
        $COMPOSE_CMD build --no-cache "$1"
        success "$1 rebuilt."
    fi
}

# Clean up (remove volumes)
clean() {
    COMPOSE_CMD=$(get_compose_cmd)
    warning "This will stop all services and remove all volumes (data will be lost)!"
    read -p "Are you sure? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Cleaning up..."
        $COMPOSE_CMD down -v
        docker system prune -f
        success "Cleanup complete."
    else
        info "Cleanup cancelled."
    fi
}

# Backup database
backup() {
    COMPOSE_CMD=$(get_compose_cmd)
    BACKUP_DIR="./backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    info "Creating database backup..."
    $COMPOSE_CMD exec -T postgres pg_dump -U "${POSTGRES_USER:-open_webui}" "${POSTGRES_DB:-open_webui}" > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    success "Database backup created: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    info "Creating uploads backup..."
    docker run --rm \
        -v "${PROJECT_NAME}_rust_backend_data:/data" \
        -v "$(pwd)/$BACKUP_DIR:/backup" \
        alpine tar czf "/backup/uploads_backup_$TIMESTAMP.tar.gz" -C /data .
    success "Uploads backup created: $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
}

# Restore database
restore() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -z "$1" ]; then
        error "Please specify backup file: $0 restore <backup_file.sql>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        error "Backup file not found: $1"
        exit 1
    fi
    
    warning "This will restore the database from $1"
    read -p "Are you sure? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Restoring database..."
        cat "$1" | $COMPOSE_CMD exec -T postgres psql -U "${POSTGRES_USER:-open_webui}" "${POSTGRES_DB:-open_webui}"
        success "Database restored from $1"
    else
        info "Restore cancelled."
    fi
}

# Shell access
shell() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -z "$1" ]; then
        error "Please specify service: $0 shell <service_name>"
        info "Available services: postgres, redis, rust-backend, frontend"
        exit 1
    fi
    
    info "Opening shell in $1..."
    if [ "$1" == "postgres" ]; then
        $COMPOSE_CMD exec "$1" psql -U "${POSTGRES_USER:-open_webui}" "${POSTGRES_DB:-open_webui}"
    else
        $COMPOSE_CMD exec "$1" sh
    fi
}

# Health check
health() {
    COMPOSE_CMD=$(get_compose_cmd)
    info "Checking service health..."
    echo ""
    
    # Check each service
    for service in postgres redis rust-backend frontend; do
        STATUS=$($COMPOSE_CMD ps -q "$service" 2>/dev/null)
        if [ -z "$STATUS" ]; then
            error "$service: Not running"
        else
            HEALTH=$($COMPOSE_CMD ps "$service" | grep -o "healthy\|unhealthy\|starting" || echo "unknown")
            if [ "$HEALTH" == "healthy" ]; then
                success "$service: Healthy"
            elif [ "$HEALTH" == "starting" ]; then
                warning "$service: Starting..."
            else
                warning "$service: $HEALTH"
            fi
        fi
    done
    echo ""
    
    # Check URLs
    info "Checking endpoints..."
    if curl -s http://localhost:${RUST_PORT:-8080}/health > /dev/null 2>&1; then
        success "Rust Backend API (+ Socket.IO): http://localhost:${RUST_PORT:-8080}"
    else
        error "Rust Backend API: Not responding"
    fi
    
    if curl -s http://localhost:${OPEN_WEBUI_PORT:-3000}/health > /dev/null 2>&1; then
        success "Frontend: http://localhost:${OPEN_WEBUI_PORT:-3000}"
    else
        error "Frontend: Not responding"
    fi
}

# Show help
show_help() {
    cat << EOF
${GREEN}Open WebUI Docker Management Script${NC}

${YELLOW}Usage:${NC}
  $0 <command> [options]

${YELLOW}Commands:${NC}
  ${BLUE}setup${NC}           Setup .env file from env.example
  ${BLUE}start${NC}           Start all services
  ${BLUE}stop${NC}            Stop all services
  ${BLUE}restart [service]${NC}  Restart all services or a specific service
  ${BLUE}logs [service]${NC}     View logs (all or specific service)
  ${BLUE}status${NC}          Show service status
  ${BLUE}rebuild [service]${NC}  Rebuild all services or a specific service
  ${BLUE}clean${NC}           Stop services and remove all volumes (⚠️  destructive)
  ${BLUE}backup${NC}          Backup database and uploads
  ${BLUE}restore <file>${NC}  Restore database from backup file
  ${BLUE}shell <service>${NC}    Open shell in a service container
  ${BLUE}health${NC}          Check health of all services
  ${BLUE}help${NC}            Show this help message

${YELLOW}Services:${NC}
  - postgres          PostgreSQL database
  - redis             Redis cache
  - rust-backend      Rust API server (with native Socket.IO)
  - frontend          SvelteKit frontend

${YELLOW}Examples:${NC}
  $0 setup                    # Setup environment file
  $0 start                    # Start all services
  $0 logs rust-backend        # View Rust backend logs
  $0 restart rust-backend     # Restart Rust backend
  $0 shell postgres           # Open PostgreSQL shell
  $0 backup                   # Backup database and files
  $0 health                   # Check service health

EOF
}

# Main script
check_dependencies

case "$1" in
    setup)
        setup_env
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart "$2"
        ;;
    logs)
        logs "$2"
        ;;
    status)
        status
        ;;
    rebuild)
        rebuild "$2"
        ;;
    clean)
        clean
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    shell)
        shell "$2"
        ;;
    health)
        health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

