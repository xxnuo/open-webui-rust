# Docker 开发指南

本指南适用于使用 Rust 后端开发 Open WebUI 的开发者。它说明了如何使用 Docker 作为基础设施（PostgreSQL、Redis、Socket.IO），同时在本地运行 Rust 后端和前端以实现更快的开发。

## 开发架构

**推荐的开发设置：**
- PostgreSQL：Docker ✅
- Redis：Docker ✅
- Socket.IO 桥接：Docker ✅
- Rust 后端：本地（使用 `cargo run` 快速迭代）⚡
- 前端：本地（用于 HMR/热重载）⚡

## 快速开始

### 1. 仅启动基础设施

```bash
# 仅启动 PostgreSQL、Redis 和 Socket.IO
docker-compose -f docker-compose.dev.yaml up -d
```

这将启动：
- PostgreSQL 在端口 5432
- Redis 在端口 6379
- Socket.IO 桥接在端口 8081

### 2. 设置本地开发环境

创建或更新 `.env`：
```bash
# 数据库（指向 Docker）
DATABASE_URL=postgresql://open_webui:open_webui_password@localhost:5432/open_webui

# Redis（指向 Docker）
REDIS_URL=redis://localhost:6379
ENABLE_REDIS=true

# Socket.IO（指向 Docker）
SOCKETIO_BRIDGE_URL=http://localhost:8081

# 服务器
HOST=0.0.0.0
PORT=8080
RUST_LOG=debug
GLOBAL_LOG_LEVEL=debug

# 身份验证
WEBUI_SECRET_KEY=your_secret_key_here
JWT_EXPIRES_IN=30d
ENABLE_SIGNUP=true
```

### 3. 本地运行 Rust 后端

```bash
cd rust-backend

# 加载环境变量
source ../.env  # 或使用 direnv

# 使用自动重载运行
cargo watch -x run

# 或正常运行
cargo run
```

### 4. 本地运行前端

```bash
# 在项目根目录
npm install
npm run dev
```

访问：
- 前端：http://localhost:5173（带 HMR 的 Vite 开发服务器）
- 后端 API：http://localhost:8080
- Socket.IO：http://localhost:8081

## 开发工具

### 使用管理工具启动

```bash
# 启动基础设施 + pgAdmin + Redis Commander
docker-compose -f docker-compose.dev.yaml --profile tools up -d
```

访问：
- **pgAdmin**：http://localhost:5050
  - 邮箱：`admin@admin.com`
  - 密码：`admin`
  
- **Redis Commander**：http://localhost:8082
  - 用户：`admin`
  - 密码：`admin`

### 配置 pgAdmin

1. 打开 http://localhost:5050
2. 添加服务器：
   - 名称：`Open WebUI Dev`
   - 主机：`postgres`（或从主机访问时使用 `localhost`）
   - 端口：`5432`
   - 数据库：`open_webui`
   - 用户名：`open_webui`
   - 密码：`open_webui_password`

## 开发工作流程

### 典型开发周期

1. **启动基础设施**：
   ```bash
   docker-compose -f docker-compose.dev.yaml up -d
   ```

2. **在编辑器中进行代码更改**

3. **Rust 后端自动重载**（如果使用 `cargo watch`）

4. **前端 HMR** 即时更新

5. **在 http://localhost:5173 测试更改**

### 使用迁移

```bash
# 运行迁移（Rust 后端启动时自动执行）
cd rust-backend
DATABASE_URL=postgresql://open_webui:open_webui_password@localhost:5432/open_webui cargo run

# 或使用 sqlx 手动运行
sqlx migrate run --database-url postgresql://open_webui:open_webui_password@localhost:5432/open_webui
```

### 重置数据库

```bash
# 删除并重新创建
docker-compose -f docker-compose.dev.yaml down postgres
docker volume rm open-webui-rust_postgres_data_dev
docker-compose -f docker-compose.dev.yaml up -d postgres

# 启动 Rust 后端时迁移将自动运行
```

### 查看日志

```bash
# 所有基础设施
docker-compose -f docker-compose.dev.yaml logs -f

# 特定服务
docker-compose -f docker-compose.dev.yaml logs -f socketio-bridge

# Rust 后端（如果在本地运行）
# 日志出现在运行 `cargo run` 的终端中

# 前端（如果在本地运行）
# 日志出现在运行 `npm run dev` 的终端中
```

## 测试

### 使用演示账户测试

Rust 后端在首次运行时创建测试账户：
- 邮箱：`test@test.com`
- 密码：`test1234`

### 集成测试

```bash
cd rust-backend

# 运行测试（使用测试数据库）
cargo test

# 运行特定测试
cargo test test_auth

# 带输出运行
cargo test -- --nocapture
```

## 数据库管理

### 访问 PostgreSQL CLI

```bash
# 通过 Docker
docker-compose -f docker-compose.dev.yaml exec postgres psql -U open_webui -d open_webui

# 或从主机（如果已安装 psql）
psql postgresql://open_webui:open_webui_password@localhost:5432/open_webui
```

### 有用的 SQL 命令

```sql
-- 列出所有表
\dt

-- 描述表
\d users

-- 查看迁移
SELECT * FROM _sqlx_migrations;

-- 统计用户
SELECT COUNT(*) FROM users;

-- 查看最近的聊天
SELECT id, title, created_at FROM chat ORDER BY created_at DESC LIMIT 10;
```

### 开发中的备份和恢复

```bash
# 备份
docker-compose -f docker-compose.dev.yaml exec -T postgres pg_dump -U open_webui open_webui > dev_backup.sql

# 恢复
cat dev_backup.sql | docker-compose -f docker-compose.dev.yaml exec -T postgres psql -U open_webui open_webui
```

## 调试

### 使用 LLDB/GDB 调试 Rust 后端

```bash
cd rust-backend

# 使用调试符号构建
cargo build

# 使用调试器运行
rust-lldb target/debug/open-webui-rust
# 或
rust-gdb target/debug/open-webui-rust
```

### 使用 VS Code 调试

创建 `.vscode/launch.json`：
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

### 启用详细日志

```bash
# Rust 后端
RUST_LOG=trace cargo run

# 或特定模块
RUST_LOG=open_webui_rust::routes=debug,sqlx=debug cargo run

# Socket.IO 桥接
docker-compose -f docker-compose.dev.yaml logs -f socketio-bridge
```

### 检查服务健康

```bash
# PostgreSQL
docker-compose -f docker-compose.dev.yaml exec postgres pg_isready

# Redis
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping

# Socket.IO
curl http://localhost:8081/health

# Rust 后端（如果运行）
curl http://localhost:8080/health
```

## 性能提示

### 使用 `cargo-watch` 实现自动重载

```bash
# 安装
cargo install cargo-watch

# 使用 watch 运行
cd rust-backend
cargo watch -x run

# 重载时清除屏幕
cargo watch -c -x run

# 监视特定文件
cargo watch -w src -x run
```

### 加快 Rust 编译

添加到 `~/.cargo/config.toml`：
```toml
[build]
jobs = 8  # 调整为您的 CPU 核心数

[profile.dev]
# 更快的链接
split-debuginfo = "unpacked"

[target.x86_64-apple-darwin]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]  # 使用 LLD 链接器
```

### 优化前端开发服务器

在 `vite.config.ts` 中：
```typescript
export default defineConfig({
  server: {
    hmr: {
      overlay: false  // 如果烦人可禁用错误覆盖
    },
    watch: {
      ignored: ['**/target/**', '**/node_modules/**']
    }
  }
});
```

## 使用身份验证

### 获取 JWT 令牌进行测试

```bash
# 登录
curl -X POST http://localhost:8080/api/v1/auths/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# 从响应中复制令牌
TOKEN="eyJ..."

# 在请求中使用令牌
curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 测试 API 端点

```bash
# 健康检查
curl http://localhost:8080/health

# 获取模型（需认证）
curl http://localhost:8080/api/models \
  -H "Authorization: Bearer $TOKEN"

# 创建聊天（需认证）
curl -X POST http://localhost:8080/api/v1/chats/new \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat":{"title":"Test Chat"}}'
```

## 使用 Socket.IO

### 测试 Socket.IO 连接

使用浏览器控制台：
```javascript
// 连接
const socket = io('http://localhost:8081');

// 身份验证
socket.emit('user-join', {
  auth: { token: 'your-jwt-token' }
});

// 监听事件
socket.on('chat-events', (data) => {
  console.log('Chat event:', data);
});
```

### 监控 Socket.IO 事件

```bash
# 查看 Socket.IO 桥接日志
docker-compose -f docker-compose.dev.yaml logs -f socketio-bridge

# 您将看到：
# - 连接事件
# - 身份验证尝试
# - 消息广播
```

## 常见问题

### 端口已被占用

```bash
# 查找占用端口的进程
lsof -i :8080

# 终止进程
kill -9 <PID>
```

### 数据库连接被拒绝

```bash
# 检查 PostgreSQL 是否运行
docker-compose -f docker-compose.dev.yaml ps postgres

# 检查日志
docker-compose -f docker-compose.dev.yaml logs postgres

# 如需要则重启
docker-compose -f docker-compose.dev.yaml restart postgres
```

### Redis 连接问题

```bash
# 测试 Redis
docker-compose -f docker-compose.dev.yaml exec redis redis-cli ping

# 应返回：PONG
```

### Rust 编译错误

```bash
# 清理构建
cd rust-backend
cargo clean
cargo build

# 更新依赖
cargo update
```

## 最佳实践

1. **始终先启动基础设施**：`docker-compose -f docker-compose.dev.yaml up -d`
2. **使用 `cargo watch`** 实现 Rust 后端自动重载
3. **保持迁移同步**：拉取更改后运行后端
4. **使用环境变量**：永远不要硬编码凭据
5. **使用演示账户测试**：使用 `test@test.com` / `test1234`
6. **监控日志**：保持显示日志的终端可见
7. **使用 pgAdmin/Redis Commander**：开发期间检查数据

## 生产测试

在本地测试类似生产的环境：

```bash
# 使用包含所有服务的完整 docker-compose
docker-compose up -d

# 访问 http://localhost:3000（而非 5173）
```

这将在 Docker 中构建并运行所有内容，更接近生产设置。

---

