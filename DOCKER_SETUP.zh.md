# Open WebUI (Rust 后端) Docker 设置

本指南说明如何使用 Docker Compose 运行带有 Rust 后端的 Open WebUI。

## 架构

Docker Compose 设置包括以下服务：

1. **PostgreSQL** - 用于存储所有应用数据的主数据库
2. **Redis** - 缓存和 WebSocket/Socket.IO 会话管理
3. **Rust 后端** - 主 API 服务器（基于 Actix-web）
4. **Socket.IO 桥接** - 基于 Python 的 Socket.IO 服务器，用于实时功能
5. **前端** - SvelteKit 前端与 Python 后端（向后兼容）

## 前提条件

- Docker 24.0 或更高版本
- Docker Compose 2.0 或更高版本
- 至少 4GB 可用内存
- 10GB 可用磁盘空间

## 快速开始

### 1. 复制环境文件

```bash
cp env.example .env
```

### 2. 配置环境变量

编辑 `.env` 并至少设置：

```bash
# 必需：生成强密钥
WEBUI_SECRET_KEY=$(openssl rand -hex 32)

# 数据库凭据（请更改这些！）
POSTGRES_PASSWORD=your_secure_password

# 可选：OpenAI API 配置
OPENAI_API_KEY=sk-...
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

### 3. 启动所有服务

```bash
docker-compose up -d
```

这将：
- 拉取/构建所有必需的 Docker 镜像
- 创建数据持久化所需的卷
- 按正确顺序启动所有服务
- 自动运行数据库迁移

### 4. 访问应用

- **前端**：http://localhost:3000
- **Rust 后端 API**：http://localhost:8080
- **Socket.IO**：http://localhost:8081

### 5. 创建管理员账户

首次运行时，通过以下地址注册创建管理员账户：
http://localhost:3000/auth

第一个用户将自动成为管理员。

## 服务详情

### PostgreSQL (postgres)

- **端口**：5432（可通过 `POSTGRES_PORT` 配置）
- **数据库**：`open_webui`（可通过 `POSTGRES_DB` 配置）
- **卷**：`postgres_data` - 持久化所有数据库数据
- **健康检查**：确保数据库在其他服务启动前准备就绪

### Redis (redis)

- **端口**：6379（可通过 `REDIS_PORT` 配置）
- **卷**：`redis_data` - 持久化 Redis 数据（启用 AOF）
- **用途**：会话管理、缓存、WebSocket 协调

### Rust 后端 (rust-backend)

- **端口**：8080（可通过 `RUST_PORT` 配置）
- **卷**：`rust_backend_data` - 存储上传和缓存
- **功能**：
  - REST API 端点
  - 数据库迁移（启动时自动运行）
  - 身份验证和授权
  - 文件上传
  - 与 Socket.IO 桥接集成

### Socket.IO 桥接 (socketio-bridge)

- **端口**：8081（可通过 `SOCKETIO_PORT` 配置）
- **技术**：Python 使用 `python-socketio` 和 `aiohttp`
- **用途**：提供生产就绪的 Socket.IO 支持：
  - 实时聊天更新
  - 频道消息
  - 用户在线状态
  - 使用跟踪
  - 协作功能

### 前端 (frontend)

- **端口**：3000（从内部 8080 映射，可通过 `OPEN_WEBUI_PORT` 配置）
- **卷**：`frontend_data` - 存储前端特定数据
- **技术**：SvelteKit + Python 后端（用于 RAG、嵌入等）

## 常用命令

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f rust-backend
docker-compose logs -f socketio-bridge
docker-compose logs -f frontend
```

### 重启服务

```bash
docker-compose restart rust-backend
docker-compose restart socketio-bridge
```

### 停止所有服务

```bash
docker-compose down
```

### 停止并删除卷（⚠️ 删除所有数据）

```bash
docker-compose down -v
```

### 代码更改后重新构建

```bash
# 重新构建特定服务
docker-compose build rust-backend
docker-compose build socketio-bridge

# 重新构建并重启
docker-compose up -d --build rust-backend
```

### 访问服务 shell

```bash
# Rust 后端
docker-compose exec rust-backend sh

# PostgreSQL
docker-compose exec postgres psql -U open_webui -d open_webui
```

## 数据库迁移

数据库迁移在 Rust 后端启动时自动运行。它们位于：

```
rust-backend/migrations/postgres/
├── 001_initial.sql
├── 002_add_missing_columns.sql
├── 003_add_config_table.sql
├── 004_add_channel_messages.sql
└── 005_add_note_feedback_tables.sql
```

### 手动迁移管理

如果需要手动运行迁移：

```bash
# 访问 Rust 后端容器
docker-compose exec rust-backend sh

# 迁移会自动运行，但您可以通过 PostgreSQL 检查状态
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT * FROM _sqlx_migrations;"
```

## 卷管理

所有数据都持久化在 Docker 卷中：

- `postgres_data` - PostgreSQL 数据库
- `redis_data` - Redis 缓存和会话数据
- `rust_backend_data` - 上传的文件、缓存
- `frontend_data` - 前端特定数据（嵌入、模型）

### 备份卷

```bash
# 备份 PostgreSQL
docker-compose exec postgres pg_dump -U open_webui open_webui > backup.sql

# 备份上传的文件
docker run --rm -v open-webui-rust_rust_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### 恢复卷

```bash
# 恢复 PostgreSQL
cat backup.sql | docker-compose exec -T postgres psql -U open_webui open_webui

# 恢复上传的文件
docker run --rm -v open-webui-rust_rust_backend_data:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## 故障排除

### 服务启动失败

检查日志：
```bash
docker-compose logs
```

确保所需端口未被占用：
```bash
# 检查端口是否可用
lsof -i :3000  # 前端
lsof -i :8080  # Rust 后端
lsof -i :8081  # Socket.IO
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

### 数据库连接问题

检查 PostgreSQL 是否运行：
```bash
docker-compose ps postgres
docker-compose logs postgres
```

测试连接：
```bash
docker-compose exec postgres pg_isready -U open_webui
```

### 迁移错误

查看迁移状态：
```bash
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT * FROM _sqlx_migrations ORDER BY version;"
```

### Socket.IO 不工作

检查桥接是否运行：
```bash
docker-compose ps socketio-bridge
docker-compose logs socketio-bridge
```

测试健康端点：
```bash
curl http://localhost:8081/health
```

### 重置所有内容

完全重置（⚠️ 删除所有数据）：

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d
```

## 生产部署

生产部署时：

1. **更改默认密码**：
   - `POSTGRES_PASSWORD`
   - `WEBUI_SECRET_KEY`

2. **配置 SSL/TLS**：
   - 使用反向代理（nginx、Traefik、Caddy）
   - 获取 SSL 证书（Let's Encrypt）

3. **调整资源限制**：
   ```yaml
   rust-backend:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
   ```

4. **设置监控**：
   - 使用 Prometheus 进行指标监控
   - 配置日志聚合（ELK、Loki）

5. **启用备份**：
   - 自动 PostgreSQL 备份
   - 卷快照

6. **安全加固**：
   - 以非 root 用户运行容器
   - 启用 SELinux/AppArmor
   - 使用密钥管理（Docker Secrets、Vault）

## 环境变量参考

有关配置选项的完整列表，请参见 `env.example`。

关键变量：

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | - | PostgreSQL 密码（必需） |
| `WEBUI_SECRET_KEY` | - | JWT 签名密钥（必需） |
| `RUST_PORT` | 8080 | Rust 后端端口 |
| `SOCKETIO_PORT` | 8081 | Socket.IO 桥接端口 |
| `OPEN_WEBUI_PORT` | 3000 | 前端端口 |
| `ENABLE_REDIS` | true | 启用 Redis 缓存 |
| `ENABLE_SIGNUP` | true | 允许用户注册 |
| `ENABLE_CHANNELS` | true | 启用频道功能 |
| `OPENAI_API_KEY` | - | OpenAI API 密钥 |

## 支持

如有问题或疑问：
- 检查日志：`docker-compose logs -f`
- 查看配置：`docker-compose config`
- GitHub Issues：[knoxchat/open-webui-rust](https://github.com/knoxchat/open-webui-rust)

