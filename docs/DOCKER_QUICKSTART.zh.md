# Docker 快速入门指南

## 3分钟快速开始

### 前提条件
- 已安装 Docker 和 Docker Compose
- 至少 4GB 可用内存
- 10GB 可用磁盘空间

### 步骤 1：克隆并导航
```bash
cd open-webui-rust
```

### 步骤 2：设置环境
```bash
./docker-manage.sh setup
```

这将：
- 从模板创建 `.env` 文件
- 生成安全的 `WEBUI_SECRET_KEY`
- 设置默认配置

### 步骤 3：启动所有服务
```bash
./docker-manage.sh start
```

或手动：
```bash
docker-compose up -d
```

### 步骤 4：访问应用
在浏览器中打开 http://localhost:3000 并创建您的管理员账户！

---

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                   浏览器（端口 3000）                    │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
        ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│   前端       │          │  Socket.IO       │
│  (SvelteKit  │◄────────►│  桥接            │
│  + Python)   │          │  (Python)        │
│  端口 8080   │          │  端口 8081       │
└──────┬───────┘          └────────┬─────────┘
       │                           │
       │         ┌─────────────────┘
       │         │
       ▼         ▼
┌─────────────────────┐
│   Rust 后端         │
│   (Actix-web)       │
│   端口 8080         │
└──────┬──────┬───────┘
       │      │
       ▼      ▼
┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │
│端口 5432 │  │端口 6379 │
└──────────┘  └──────────┘
```

---

## 常用命令

### 服务管理

```bash
# 查看所有服务状态
./docker-manage.sh status

# 查看日志（所有服务）
./docker-manage.sh logs

# 查看日志（特定服务）
./docker-manage.sh logs rust-backend

# 重启服务
./docker-manage.sh restart socketio-bridge

# 检查所有服务健康状态
./docker-manage.sh health
```

### 开发工作流程

```bash
# Rust 后端代码更改后
./docker-manage.sh rebuild rust-backend
docker-compose up -d rust-backend

# Socket.IO 桥接代码更改后
./docker-manage.sh rebuild socketio-bridge
docker-compose up -d socketio-bridge

# 前端代码更改后
./docker-manage.sh rebuild frontend
docker-compose up -d frontend
```

### 数据库操作

```bash
# 访问 PostgreSQL
./docker-manage.sh shell postgres

# 查看表
docker-compose exec postgres psql -U open_webui -d open_webui -c "\dt"

# 备份数据库
./docker-manage.sh backup

# 恢复数据库
./docker-manage.sh restore backups/db_backup_20250101_120000.sql
```

---

## 服务详情

### Rust 后端
- **URL**：http://localhost:8080
- **API 文档**：http://localhost:8080/api/docs（如果启用）
- **健康检查**：http://localhost:8080/health

### Socket.IO 桥接
- **URL**：http://localhost:8081
- **健康检查**：http://localhost:8081/health
- **WebSocket**：ws://localhost:8081/socket.io

### 前端
- **URL**：http://localhost:3000
- **健康检查**：http://localhost:3000/health

### PostgreSQL
- **端口**：5432
- **数据库**：`open_webui`
- **用户**：`open_webui`
- **密码**：在 `.env` 中设置

### Redis
- **端口**：6379
- **用途**：缓存、会话管理、WebSocket 协调

---

## 故障排除

### 服务无法启动

```bash
# 检查哪些端口正在使用
lsof -i :3000  # 前端
lsof -i :8080  # Rust 后端
lsof -i :8081  # Socket.IO
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# 查看详细日志
docker-compose logs
```

### 数据库连接问题

```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 检查 PostgreSQL 日志
docker-compose logs postgres

# 测试连接
docker-compose exec postgres pg_isready -U open_webui
```

### 重置所有内容

```bash
# ⚠️ 这将删除所有数据！
./docker-manage.sh clean
./docker-manage.sh start
```

### 查看实时日志

```bash
# 所有服务
docker-compose logs -f

# 多个特定服务
docker-compose logs -f rust-backend socketio-bridge
```

---

## 配置

### 环境变量

`.env` 中的关键变量：

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | - | 数据库密码（**请更改！**） |
| `WEBUI_SECRET_KEY` | 自动生成 | JWT 签名密钥 |
| `OPEN_WEBUI_PORT` | 3000 | 前端端口 |
| `RUST_PORT` | 8080 | Rust 后端端口 |
| `SOCKETIO_PORT` | 8081 | Socket.IO 端口 |
| `ENABLE_SIGNUP` | true | 允许新用户注册 |
| `ENABLE_REDIS` | true | 使用 Redis 缓存 |

### 自定义端口

编辑 `.env`：
```bash
OPEN_WEBUI_PORT=3001
RUST_PORT=8090
SOCKETIO_PORT=8091
```

然后重启：
```bash
docker-compose down
docker-compose up -d
```

---

## 数据持久化

所有数据都存储在 Docker 卷中：

```bash
# 列出卷
docker volume ls | grep open-webui

# 检查卷
docker volume inspect open-webui-rust_postgres_data

# 备份卷
./docker-manage.sh backup
```

卷：
- `postgres_data` - 所有数据库数据
- `redis_data` - Redis 持久化
- `rust_backend_data` - 上传的文件、缓存
- `frontend_data` - 模型、嵌入等

---

## 生产部署

1. **更改所有密码**：
   ```bash
   POSTGRES_PASSWORD=<强密码>
   WEBUI_SECRET_KEY=$(openssl rand -hex 32)
   ```

2. **使用反向代理**（nginx、Traefik、Caddy）：
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

3. **启用备份**：
   ```bash
   # 添加到 crontab
   0 2 * * * /path/to/docker-manage.sh backup
   ```

4. **监控日志**：
   ```bash
   docker-compose logs -f > logs/app.log 2>&1
   ```

---

## 获取帮助

- **首先检查日志**：`./docker-manage.sh logs`
- **检查服务健康状态**：`./docker-manage.sh health`
- **查看完整文档**：参见 `DOCKER_SETUP.zh.md`
- **GitHub Issues**：https://github.com/knoxchat/open-webui-rust

---

## 其他资源

- 完整 Docker 设置指南：`DOCKER_SETUP.zh.md`
- Rust 后端开发：`rust-backend/README.md`
- 前端开发：主 `README.md`

---

**祝编码愉快！🎉**

