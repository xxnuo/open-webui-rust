# 迁移指南：Python 到 Rust 后端

本指南帮助用户了解 Python 后端和 Rust 后端 Docker 设置之间的差异。

## 架构比较

### 原始 Python 后端设置

```
┌────────────────────────────────────┐
│    单一容器                         │
├────────────────────────────────────┤
│  - Python (FastAPI)                 │
│  - SvelteKit 前端（已构建）         │
│  - 一体化方法                       │
│  - 端口 8080 → 3000（外部）         │
└────────────────────────────────────┘
```

### 新 Rust 后端设置

```
┌─────────────────────────────────────────────────────────┐
│         多容器架构                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  前端      │  │  Socket.IO   │  │  Rust 后端      │ │
│  │ 容器       │  │  容器        │  │   容器          │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
│                                                          │
│  ┌────────────┐                    ┌─────────────────┐ │
│  │ PostgreSQL │                    │     Redis       │ │
│  │ 容器       │                    │   容器          │ │
│  └────────────┘                    └─────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 关键差异

### 数据库

| 方面 | Python 后端 | Rust 后端 |
|--------|---------------|--------------|
| **数据库** | SQLite（基于文件） | PostgreSQL（服务器） |
| **位置** | 容器内部 | 专用容器 |
| **迁移** | Alembic | SQLx |
| **持久化** | 卷挂载 | 专用卷 |
| **可扩展性** | 单实例 | 多实例就绪 |

### 缓存和会话

| 方面 | Python 后端 | Rust 后端 |
|--------|---------------|--------------|
| **缓存** | 内存中 | Redis |
| **会话** | 内存中 | Redis |
| **WebSocket 状态** | 内存中 | Redis |
| **可扩展性** | 单实例 | 多实例 |

### 实时功能

| 方面 | Python 后端 | Rust 后端 |
|--------|---------------|--------------|
| **WebSocket** | 原生 Python | Socket.IO 桥接 |
| **实现** | python-socketio | 独立容器 |
| **可扩展性** | 有限 | Redis 后端 |
| **语言** | Python | Python（桥接） |

### 性能

| 方面 | Python 后端 | Rust 后端 |
|--------|---------------|--------------|
| **速度** | 良好 | 优秀 |
| **内存** | ~500MB | ~400MB（仅后端） |
| **并发** | asyncio | Tokio（更好） |
| **启动时间** | 10-20秒 | 5-10秒 |
| **请求延迟** | 50-100毫秒 | 10-30毫秒 |

## 迁移步骤

### 从 Python 后端 Docker 设置迁移

如果您目前使用 Python 后端的 Docker：

#### 1. 备份您的数据

```bash
# 备份现有数据库
docker-compose exec open-webui sqlite3 /app/backend/data/webui.db ".backup /app/backend/data/backup.db"

# 从容器复制备份
docker cp open-webui:/app/backend/data/backup.db ./backup.db

# 备份上传文件
docker cp open-webui:/app/backend/data/uploads ./uploads_backup
```

#### 2. 导出数据（如需要）

```bash
# 导出用户（示例）
docker-compose exec open-webui sqlite3 /app/backend/data/webui.db \
  ".mode csv" ".output users.csv" "SELECT * FROM users;"

# 导出聊天
docker-compose exec open-webui sqlite3 /app/backend/data/webui.db \
  ".mode csv" ".output chats.csv" "SELECT * FROM chat;"
```

#### 3. 停止旧设置

```bash
# 停止 Python 后端设置
docker-compose down

# 可选：删除旧卷（备份后！）
# docker volume rm open-webui_data
```

#### 4. 设置新 Rust 后端

```bash
# 克隆或拉取带 Rust 后端的最新代码
cd /path/to/open-webui-rust

# 设置环境
./docker-manage.sh setup

# 启动新设置
./docker-manage.sh start
```

#### 5. 迁移数据（手动）

**选项 A：重新开始**
- 创建新管理员账户
- 重新上传任何文档
- 重新创建聊天（建议用于全新开始）

**选项 B：数据迁移脚本**（如果提供）
```bash
# 运行迁移脚本（如果可用）
./migrate-sqlite-to-postgres.sh backup.db
```

#### 6. 验证迁移

```bash
# 检查所有服务是否运行
./docker-manage.sh health

# 检查数据库是否有数据
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT COUNT(*) FROM users;"

# 测试功能
# - 登录
# - 创建聊天
# - 上传文件
```

## Rust 后端的新功能

### 1. 独立服务
- 每个组件在自己的容器中运行
- 更好的资源管理
- 更容易扩展单个组件

### 2. PostgreSQL 数据库
- 更好的并发访问
- 生产环境更可靠
- 更好的查询能力
- ACID 合规性

### 3. Redis 缓存
- 快速内存缓存
- 跨实例的共享状态
- WebSocket 协调
- 会话管理

### 4. 改进的性能
- 更快的 API 响应
- 更好的并发处理
- 更低的内存使用
- 更高效的数据库查询

### 5. 更好的可扩展性
- 可以运行多个后端实例
- 负载均衡器就绪
- Redis 后端状态管理
- 水平扩展支持

## 配置更改

### 环境变量

**Python 后端：**
```bash
WEBUI_SECRET_KEY=...
DATA_DIR=/app/backend/data
OPENAI_API_KEY=...
```

**Rust 后端：**
```bash
WEBUI_SECRET_KEY=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ENABLE_REDIS=true
SOCKETIO_BRIDGE_URL=http://...
OPENAI_API_KEY=...
```

### 端口

**Python 后端：**
- 8080（容器）→ 3000（主机）

**Rust 后端：**
- PostgreSQL：5432
- Redis：6379
- Rust 后端：8080
- Socket.IO：8081
- 前端：8080（容器）→ 3000（主机）

### 卷

**Python 后端：**
```yaml
volumes:
  - open-webui:/app/backend/data
```

**Rust 后端：**
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - redis_data:/data
  - rust_backend_data:/app/data
  - frontend_data:/app/backend/data
```

## 功能对等性

### 完全支持 ✅
- 用户身份验证和授权
- 聊天创建和管理
- 文件上传
- 模型管理
- 提示管理
- 知识库（RAG）
- WebSocket/实时功能
- 频道
- API 密钥
- LDAP 身份验证

### 即将推出 🚧
- 一些高级 RAG 功能
- 特定的仅 Python 集成
- 遗留端点

### 不计划 ❌
- SQLite 支持（使用 PostgreSQL）

## 迁移故障排除

### 问题：数据未迁移

**解决方案：**
```bash
# 检查旧数据结构
sqlite3 backup.db ".schema users"

# 与新结构比较
docker-compose exec postgres psql -U open_webui -d open_webui -c "\d users"

# 可能需要自定义迁移脚本
```

### 问题：不同的 API 端点

**解决方案：**
```bash
# 检查 API 文档
curl http://localhost:8080/api/docs

# 与 Python 后端比较
# 大多数端点应该兼容
```

### 问题：性能似乎很慢

**解决方案：**
```bash
# 检查服务健康状态
./docker-manage.sh health

# 检查资源使用情况
docker stats

# 检查日志中的错误
./docker-manage.sh logs
```

### 问题：WebSocket 不工作

**解决方案：**
```bash
# 检查 Socket.IO 桥接
docker-compose logs socketio-bridge

# 验证 Redis 连接
docker-compose exec redis redis-cli ping

# 检查前端 Socket.IO URL 配置
```

## 最佳实践

### 1. 生产环境从头开始
- 不要迁移旧的测试数据
- 创建干净的生产环境
- 从一开始就设置强密码

### 2. 使用独立的开发环境
```bash
# 使用开发 compose 进行测试
docker-compose -f docker-compose.dev.yaml up -d

# 本地测试 Rust 后端
cd rust-backend && cargo run
```

### 3. 计划停机时间
- 在低使用期间安排迁移
- 通知用户停机
- 准备好回滚计划

### 4. 彻底测试
- 测试所有关键功能
- 验证数据完整性
- 检查性能
- 测试实时功能

### 5. 迁移后监控
```bash
# 监视日志
./docker-manage.sh logs -f

# 定期检查健康状态
./docker-manage.sh health

# 监控资源使用情况
docker stats
```

## 其他资源

### 文档
- **Rust 后端**：`rust-backend/README.md`
- **Docker 设置**：`DOCKER_SETUP.zh.md`
- **开发**：`DOCKER_DEV.zh.md`
- **快速入门**：`DOCKER_QUICKSTART.zh.md`

### 命令参考
```bash
# 管理
./docker-manage.sh help

# 健康检查
./docker-manage.sh health

# 日志
./docker-manage.sh logs [service]

# 备份
./docker-manage.sh backup

# Shell 访问
./docker-manage.sh shell [service]
```

## 迁移检查清单

- [ ] 从 Python 后端备份所有数据
- [ ] 导出任何关键信息
- [ ] 停止 Python 后端服务
- [ ] 设置 Rust 后端环境
- [ ] 启动 Rust 后端服务
- [ ] 验证所有服务健康
- [ ] 迁移/重新创建用户账户
- [ ] 测试身份验证
- [ ] 测试聊天功能
- [ ] 测试文件上传
- [ ] 测试实时功能
- [ ] 验证 API 端点工作
- [ ] 检查性能
- [ ] 设置自动备份
- [ ] 记录任何自定义配置
- [ ] 监控问题

## 理解变化

### 为什么选择 PostgreSQL？
- 更好的并发性
- 生产级可靠性
- ACID 合规性
- 更好的查询
- 行业标准

### 为什么选择 Redis？
- 快速缓存
- 会话管理
- WebSocket 状态
- 可扩展性
- 多实例支持

### 为什么使用独立容器？
- 更好的隔离
- 更容易扩展
- 更好的资源管理
- 更容易调试
- 更灵活的部署

### 为什么使用 Socket.IO 桥接？
- 生产就绪的 WebSocket 支持
- 更好的兼容性
- 更容易扩展
- Redis 后端状态
- 经过验证的可靠性

## 迁移后的优势

1. **更好的性能**：API 响应快 2-3 倍
2. **更好的可扩展性**：可以运行多个实例
3. **更好的可靠性**：生产级数据库
4. **更好的缓存**：Redis 用于快速数据访问
5. **更好的监控**：独立服务以提高可观察性
6. **更好的开发**：使用开发 compose 更容易本地开发
7. **更好的部署**：更灵活的部署选项

---

**需要帮助？** 查看 `DOCKER_README.zh.md` 或运行 `./docker-manage.sh help`

