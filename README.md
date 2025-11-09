# Open WebUI with Rust Backend ｜ [简体中文](./README.zh-CN.md)

High‑Performance Rust Implementation of Open WebUI

<p align="center">
   <a href="https://youtu.be/xAPVZR_2nFk" target="_blank" rel="noopener noreferrer">
      <img width="600" src="./img/video-cover.png" alt="Open WebUI Backend in Rust">
   </a>
</p>

## Docker Quick Start

```
git clone https://github.com/knoxchat/open-webui-rust.git && cd open-webui-rust
docker compose up -d
```
> Ensure Docker and Docker Compose are ready

## Overview

The Rust backend is a drop-in replacement for the Python backend, offering:

- **10-50x faster response times** for API endpoints
- **70% lower memory usage** under load
- **Native concurrency** with Tokio's async runtime
- **Type safety** preventing entire classes of runtime errors
- **Zero-copy streaming** for chat completions
- **Production-ready** with comprehensive error handling

## **IMPORTANT‼️** Your sponsorship will accelerate and improve the project development progress:

- **Please Scan the QR Code Below via Alipay or Paypal to Sponsor**
- **Contact us: support@knox.chat**

<p align="center" style="display: flex; align-items: center; justify-content: center; gap: 20px;">
   <img width="246" src="./img/ali.png" alt="Name">
   <img width="229" src="./img/paypal.png" alt="Name">
</p>

## Sponsor List

| Name | Sponsorship Amount | Contributed Files | Privileges |
|------|----------|---------|---------|
| [![Baitian Medical](./img/baitian.png)](https://baitianjituan.com) | ¥5000 | 300 | Dedicated Technical Support |
| 孔祥康 | ¥500 | 30 | Email/IM Service |
| Knox User Anonymous Sponsorship | ¥300 | 18 | Email/IM Service |
| [Bestming](https://www.mingagent.com) | ¥100 | 6 | Email/IM Service |
| HJPING | ¥100 | 6 | Email/IM Service |
| KingZ | ¥50 | 2 | Email Service |
| JimLi | ¥66 | 2 | Email Service |
| shanwu | ¥50 | 2 | Email Service |
| xixi | ¥50 | 2 | Email Service |

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Compatibility](#api-compatibility)
- [Performance](#performance)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## Architecture

### Technology Stack

- **Framework**: Actix-Web 4.x (one of the fastest web frameworks)
- **Runtime**: Tokio (async/await native runtime)
- **Database**: PostgreSQL with SQLx (compile-time checked queries)
- **Caching**: Redis with deadpool connection pooling
- **Authentication**: JWT with jsonwebtoken + Argon2/Bcrypt
- **Serialization**: Serde (zero-copy deserialization)
- **HTTP Client**: Reqwest (async HTTP/2 client)

### Project Structure

```
rust-backend/
├── src/
│   ├── main.rs              # Application entry point
│   ├── config.rs            # Configuration management
│   ├── db.rs                # Database connection pooling
│   ├── error.rs             # Centralized error handling
│   ├── models/              # Data models (25+ entities)
│   │   ├── auth.rs          # User, session, API key models
│   │   ├── chat.rs          # Chat, message models
│   │   ├── model.rs         # AI model configurations
│   │   └── ...              # Channel, file, knowledge, etc.
│   ├── routes/              # HTTP route handlers (25+ modules)
│   │   ├── auth.rs          # Authentication endpoints
│   │   ├── chats.rs         # Chat management
│   │   ├── openai.rs        # OpenAI-compatible API
│   │   └── ...              # Audio, images, tools, etc.
│   ├── services/            # Business logic layer (27+ services)
│   │   ├── chat.rs          # Chat processing service
│   │   ├── auth.rs          # Authentication service
│   │   ├── rag.rs           # RAG (Retrieval) service
│   │   └── ...              # Model, user, file services
│   ├── middleware/          # Request/response middleware
│   │   ├── auth.rs          # JWT authentication
│   │   ├── audit.rs         # Request auditing
│   │   └── rate_limit.rs    # Rate limiting
│   ├── utils/               # Utility functions
│   │   ├── auth.rs          # JWT helpers
│   │   ├── embeddings.rs    # Vector embeddings
│   │   └── chat_completion.rs # Chat utilities
│   ├── socket.rs            # WebSocket/Socket.IO support
│   └── websocket_chat.rs    # Real-time chat streaming
├── migrations/              # Database migrations
│   └── postgres/            # PostgreSQL schema migrations
├── Cargo.toml               # Rust dependencies
└── .env.example             # Environment configuration template
```

## Prerequisites

- **Rust**: 1.75+ (install via [rustup](https://rustup.rs/))
- **PostgreSQL**: 13+ (required)
- **Redis**: 6.0+ (optional, recommended for sessions and caching)
- **Operating System**: Linux, macOS, or Windows

## Installation

### 1. Clone Repository

```bash
cd rust-backend
```

### 2. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb openwebui

# Set database URL
export DATABASE_URL="postgresql://postgres:password@localhost:5432/openwebui"
```

### 4. Install Dependencies

```bash
# Dependencies are automatically managed by Cargo
cargo fetch
```

## Configuration

### Development with Docker Compose

For local development with all services (PostgreSQL, Redis, ChromaDB):

```bash
# Start all development services
docker compose -f docker-compose.dev.yaml up -d

# View logs
docker compose -f docker-compose.dev.yaml logs -f

# Stop services
docker compose -f docker-compose.dev.yaml down

# Stop services and remove volumes (clean slate)
docker compose -f docker-compose.dev.yaml down -v
```

**Services included:**
- **PostgreSQL** (port 5432): Main database
- **Redis** (port 6379): Caching and session management
- **ChromaDB** (port 8000): Vector database for RAG/embeddings
- **pgAdmin** (port 5050): PostgreSQL admin UI (optional, use `--profile tools`)
- **Redis Commander** (port 8082): Redis admin UI (optional, use `--profile tools`)

**Environment variables for docker-compose.dev.yaml:**

Create `.env` file in project root to customize:

```bash
# PostgreSQL
POSTGRES_DB=openwebui
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# ChromaDB
CHROMA_PORT=8000
CHROMA_TELEMETRY=FALSE

# Admin Tools (optional)
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=admin
REDIS_COMMANDER_PORT=8082
```

**Start admin tools:**

```bash
docker compose -f docker-compose.dev.yaml --profile tools up -d
```

### Rust Backend Environment Variables

Create `.env` file in `rust-backend/` directory:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=8080
ENV=development
RUST_LOG=info

# Security (IMPORTANT: Set a fixed key to persist auth tokens across restarts)
WEBUI_SECRET_KEY=your-secret-key-min-32-chars
JWT_EXPIRES_IN=168h

# Database (Required) - Match docker-compose.dev.yaml settings
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openwebui
DATABASE_POOL_SIZE=10
DATABASE_POOL_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=3600

# Redis (Recommended) - Match docker-compose.dev.yaml settings
ENABLE_REDIS=false
REDIS_URL=redis://localhost:6379

# Authentication
ENABLE_SIGNUP=true
ENABLE_LOGIN_FORM=true
ENABLE_API_KEY=true
DEFAULT_USER_ROLE=pending

# OpenAI Configuration (if using OpenAI models)
ENABLE_OPENAI_API=true
OPENAI_API_KEY=sk-your-key
OPENAI_API_BASE_URL=https://api.openai.com/v1

# CORS
CORS_ALLOW_ORIGIN=*

# WebSocket
ENABLE_WEBSOCKET_SUPPORT=true
WEBSOCKET_MANAGER=local

# Features
ENABLE_IMAGE_GENERATION=false
ENABLE_CODE_EXECUTION=false
ENABLE_WEB_SEARCH=false

# Audio (Optional)
TTS_ENGINE=openai
STT_ENGINE=openai

# RAG/Retrieval (Optional) - ChromaDB integration
CHUNK_SIZE=1500
CHUNK_OVERLAP=100
RAG_TOP_K=5

# Storage
UPLOAD_DIR=/app/data/uploads

# Logging
GLOBAL_LOG_LEVEL=INFO
```

**Important Notes:**
- **WEBUI_SECRET_KEY**: Must be set to a fixed value (min 32 characters) to prevent JWT token invalidation on server restart. Use `uuidgen` or generate a secure random string.
- **DATABASE_URL**: Should match the PostgreSQL credentials in `docker-compose.dev.yaml`
- **REDIS_URL**: Should match the Redis port in `docker-compose.dev.yaml`

See `rust-backend/env.example` for complete configuration options.

### Configuration Precedence

1. Environment variables (highest priority)
2. `.env` file
3. Database-stored configuration
4. Default values (lowest priority)

## Running the Server

### Development Mode with Docker Services

**Step 1: Start development services**

```bash
# Start PostgreSQL, Redis, and ChromaDB
docker compose -f docker-compose.dev.yaml up -d

# Verify services are running
docker compose -f docker-compose.dev.yaml ps
```

**Step 2: Configure Rust backend**

```bash
cd rust-backend

# Copy example environment file
cp env.example .env

# Edit .env and set WEBUI_SECRET_KEY to a fixed value
# Example: WEBUI_SECRET_KEY=$(uuidgen | tr '[:upper:]' '[:lower:]')
nano .env
```

**Step 3: Run Rust backend**

```bash
cargo run
```

The server will start at `http://0.0.0.0:8080`

**Benefits of this setup:**
- All dependencies (PostgreSQL, Redis, ChromaDB) run in Docker
- Rust backend runs natively for faster compilation and debugging
- JWT tokens persist across backend restarts (with fixed WEBUI_SECRET_KEY)
- Easy to reset database with `docker compose down -v`

### Production Mode (Optimized)

```bash
cargo run --release
```

### Using the Build Script

```bash
./build.sh          # Builds release binary
./build.sh --dev    # Builds debug binary
./build.sh --run    # Builds and runs
```

### Docker

```bash
docker build -t open-webui-rust .
docker run -p 8080:8080 --env-file .env open-webui-rust
```

### Systemd Service (Linux)

```ini
[Unit]
Description=Open WebUI Rust Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=webui
WorkingDirectory=/opt/open-webui-rust
EnvironmentFile=/opt/open-webui-rust/.env
ExecStart=/opt/open-webui-rust/target/release/open-webui-rust
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

## API Compatibility

The Rust backend maintains **100% API compatibility** with the Python backend for core endpoints:

### Authentication
- `POST /api/v1/auths/signup` - User registration
- `POST /api/v1/auths/signin` - User login
- `POST /api/v1/auths/signout` - User logout
- `POST /api/v1/auths/api_key` - Generate API key

### Chat Completions
- `POST /api/chat/completions` - OpenAI-compatible chat
- `POST /api/v1/chat/completions` - Alternative endpoint
- `POST /openai/v1/chat/completions` - Full OpenAI compatibility
- `WS /api/ws/chat` - WebSocket streaming

### Models
- `GET /api/models` - List available models
- `GET /api/models/base` - List base models
- `POST /api/v1/models` - Create model
- `GET /api/v1/models/:id` - Get model details

### Users
- `GET /api/v1/users` - List users (admin)
- `GET /api/v1/users/:id` - Get user profile
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Files & Knowledge
- `POST /api/v1/files` - Upload file
- `GET /api/v1/files/:id` - Download file
- `POST /api/v1/knowledge` - Create knowledge base
- `GET /api/v1/retrieval/query` - Query knowledge

### Health & Status
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity check
- `GET /api/config` - Frontend configuration
- `GET /api/version` - Backend version

## Performance

### Quick Summary

| Metric | Python (FastAPI) | Rust (Actix-Web) | Improvement |
|--------|------------------|------------------|-------------|
| Login (p50) | 45ms | 3ms | **15x faster** |
| Chat Completion (p50) | 890ms | 35ms* | **25x faster** |
| Model List (p50) | 23ms | 1.2ms | **19x faster** |
| Memory (1000 req) | 450 MB | 85 MB | **5.3x lower** |
| Throughput | 850 req/s | 12,400 req/s | **14.6x higher** |

*Note: Chat completion speed primarily depends on LLM provider. Rust excels at streaming and handling overhead.

## Development

### Prerequisites

```bash
# Install development tools
rustup component add rustfmt clippy

# Install cargo-watch for auto-reload
cargo install cargo-watch
```

### Development Workflow

```bash
# Ensure Docker services are running
docker compose -f docker-compose.dev.yaml up -d

# Auto-reload on file changes
cd rust-backend
cargo watch -x run

# Run tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Format code
cargo fmt

# Lint code
cargo clippy -- -D warnings

# Check without building
cargo check

# View Docker service logs
docker compose -f docker-compose.dev.yaml logs -f postgres
docker compose -f docker-compose.dev.yaml logs -f redis
docker compose -f docker-compose.dev.yaml logs -f chromadb
```

### Code Structure Guidelines

1. **Models** (`src/models/`): Database entities with Serde serialization
2. **Services** (`src/services/`): Business logic, reusable across routes
3. **Routes** (`src/routes/`): HTTP handlers, thin layer calling services
4. **Middleware** (`src/middleware/`): Cross-cutting concerns (auth, logging)
5. **Utils** (`src/utils/`): Helper functions, no business logic

### Adding New Features

1. Add model in `src/models/[feature].rs`
2. Add database migration in `migrations/postgres/`
3. Implement service in `src/services/[feature].rs`
4. Add routes in `src/routes/[feature].rs`
5. Register routes in `src/routes/mod.rs`
6. Add tests

## Testing

### Unit Tests

```bash
cargo test --lib
```

### Integration Tests

```bash
# Set test database
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openwebui_test

# Run integration tests
cargo test --test '*'
```

### Test with Demo Account

```bash
# The backend includes a demo account
# Email: test@test.com
# Password: test1234
```

### Load Testing

```bash
# Install wrk
brew install wrk  # macOS
sudo apt install wrk  # Ubuntu

# Run load test
wrk -t4 -c100 -d30s --latency http://localhost:8080/health
```

## Deployment

### Building for Production

```bash
# Build optimized binary
cargo build --release

# Binary location
./target/release/open-webui-rust

# Strip symbols (reduces size)
strip ./target/release/open-webui-rust
```

### Docker Deployment

```bash
# Multi-stage Docker build
docker build -t open-webui-rust:latest .

# Run with docker-compose
docker-compose up -d
```

### Performance Tuning

```toml
# Cargo.toml - Already optimized
[profile.release]
opt-level = 3           # Maximum optimization
lto = true              # Link-time optimization
codegen-units = 1       # Single codegen unit
strip = true            # Strip symbols
```

### Environment Variables for Production

```bash
# Use production settings
ENV=production
RUST_LOG=warn
ENABLE_REDIS=true

# Increase connection pools
DATABASE_POOL_SIZE=20
REDIS_MAX_CONNECTIONS=30

# Enable compression
ENABLE_COMPRESSION_MIDDLEWARE=true

# Set appropriate CORS
CORS_ALLOW_ORIGIN=https://yourdomain.com
```
