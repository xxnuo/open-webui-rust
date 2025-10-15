# Docker 设置检查清单

使用此检查清单验证您的 Docker 设置是否完整且正常工作。

## 安装前检查清单

- [ ] 已安装 Docker 24.0+ 版本（`docker --version`）
- [ ] 已安装 Docker Compose 2.0+ 版本（`docker compose version` 或 `docker-compose --version`）
- [ ] 至少 4GB 可用内存
- [ ] 至少 10GB 可用磁盘空间
- [ ] 端口 3000、8080、8081、5432、6379 未被占用

### 检查端口
```bash
lsof -i :3000  # 应为空
lsof -i :8080  # 应为空
lsof -i :8081  # 应为空
lsof -i :5432  # 应为空
lsof -i :6379  # 应为空
```

## 设置检查清单

- [ ] 已克隆仓库
- [ ] 已将 `env.example` 复制到 `.env`（或运行 `./docker-manage.sh setup`）
- [ ] 已在 `.env` 中生成 `WEBUI_SECRET_KEY`
- [ ] 已在 `.env` 中更改 `POSTGRES_PASSWORD`（生产环境）
- [ ] 已查看并根据需要更新其他环境变量

### 验证环境文件
```bash
# 检查 .env 是否存在
ls -la .env

# 验证 WEBUI_SECRET_KEY 已设置
grep WEBUI_SECRET_KEY .env

# 验证 POSTGRES_PASSWORD 已设置
grep POSTGRES_PASSWORD .env
```

## 首次启动检查清单

- [ ] 配置已验证：`docker-compose config --quiet`
- [ ] 已启动服务：`./docker-manage.sh start` 或 `docker-compose up -d`
- [ ] PostgreSQL 启动成功
- [ ] Redis 启动成功
- [ ] Rust 后端启动成功
- [ ] Socket.IO 桥接启动成功
- [ ] 前端启动成功

### 验证服务
```bash
# 检查所有服务是否运行
docker-compose ps

# 应显示所有 5 个服务为"Up"或"healthy"状态
```

## ✅ 健康检查清单

- [ ] PostgreSQL 健康：`docker-compose exec postgres pg_isready`
- [ ] Redis 健康：`docker-compose exec redis redis-cli ping`
- [ ] Rust 后端健康：`curl http://localhost:8080/health`
- [ ] Socket.IO 健康：`curl http://localhost:8081/health`
- [ ] 前端健康：`curl http://localhost:3000/health`

### 快速健康检查
```bash
# 运行内置健康检查
./docker-manage.sh health

# 所有服务应显示为健康状态
```

## 访问检查清单

- [ ] 前端可访问：http://localhost:3000
- [ ] 可以看到登录/注册页面
- [ ] 已创建第一个管理员账户
- [ ] 成功登录
- [ ] 可以访问仪表板

### 测试端点
```bash
# 前端
curl -I http://localhost:3000

# API
curl -I http://localhost:8080/health

# Socket.IO
curl -I http://localhost:8081/health
```

## 数据库检查清单

- [ ] 数据库迁移成功运行
- [ ] 可以访问 PostgreSQL：`./docker-manage.sh shell postgres`
- [ ] 表已创建（在 psql 中用 `\dt` 检查）
- [ ] 第一个用户账户已创建

### 验证数据库
```bash
# 检查迁移
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT * FROM _sqlx_migrations;"

# 检查表是否存在
docker-compose exec postgres psql -U open_webui -d open_webui -c "\dt"

# 检查用户表
docker-compose exec postgres psql -U open_webui -d open_webui -c "SELECT COUNT(*) FROM users;"
```

## 数据持久化检查清单

- [ ] 卷已创建：`docker volume ls | grep open-webui`
- [ ] PostgreSQL 卷存在：`postgres_data`
- [ ] Redis 卷存在：`redis_data`
- [ ] Rust 后端卷存在：`rust_backend_data`
- [ ] 前端卷存在：`frontend_data`

### 验证卷
```bash
# 列出所有项目卷
docker volume ls | grep open-webui

# 应显示 4 个卷
```

## 日志检查清单

- [ ] 可以查看日志：`./docker-manage.sh logs`
- [ ] PostgreSQL 日志中无关键错误
- [ ] Rust 后端日志中无关键错误
- [ ] Socket.IO 日志中无关键错误
- [ ] 前端日志中无关键错误

### 检查错误
```bash
# 检查所有日志中的错误
docker-compose logs | grep -i error

# 检查特定服务
docker-compose logs rust-backend | grep -i error
```

## 功能检查清单

### 身份验证
- [ ] 可以注册新用户
- [ ] 可以登录
- [ ] 可以登出
- [ ] JWT 令牌工作正常
- [ ] 刷新后会话保持

### API
- [ ] 可以访问受保护的端点
- [ ] 可以创建聊天
- [ ] 可以列出聊天
- [ ] 可以删除聊天
- [ ] API 响应正确

### 实时功能（Socket.IO）
- [ ] Socket.IO 连接已建立
- [ ] 可以在聊天中发送消息
- [ ] 实时更新工作正常
- [ ] 频道工作正常（如果启用）
- [ ] 用户在线状态工作正常

### 文件上传
- [ ] 可以上传文件
- [ ] 文件存储在卷中
- [ ] 可以检索上传的文件

## 高级检查清单

### 备份和恢复
- [ ] 可以创建备份：`./docker-manage.sh backup`
- [ ] 备份文件已在 `backups/` 目录中创建
- [ ] 可以从备份恢复：`./docker-manage.sh restore <file>`

### 服务管理
- [ ] 可以重启服务：`./docker-manage.sh restart`
- [ ] 可以查看服务状态：`./docker-manage.sh status`
- [ ] 可以重新构建服务：`./docker-manage.sh rebuild`
- [ ] 可以访问服务 shell：`./docker-manage.sh shell <service>`

### 监控
- [ ] 可以检查健康状态：`./docker-manage.sh health`
- [ ] 可以查看资源使用情况：`docker stats`
- [ ] 日志可访问且可读

## 安全检查清单（生产环境）

- [ ] 已将 `WEBUI_SECRET_KEY` 从默认值更改
- [ ] 已将 `POSTGRES_PASSWORD` 从默认值更改
- [ ] 已查看并配置 CORS 设置
- [ ] 已设置 HTTPS（反向代理）
- [ ] 已配置防火墙规则
- [ ] 如不需要，已禁用注册（`ENABLE_SIGNUP=false`）
- [ ] 已设置定期备份
- [ ] 已查看并限制暴露的端口

## 性能检查清单

- [ ] 服务在预期时间内启动（< 2 分钟）
- [ ] API 响应快速（< 500ms）
- [ ] 无内存泄漏（使用 `docker stats` 检查）
- [ ] 数据库查询快速
- [ ] Redis 缓存工作正常

### 监控资源
```bash
# 监视资源使用情况
docker stats

# 检查容器大小
docker-compose images
```

## 故障排除检查清单

如果有问题：

- [ ] 已检查日志：`./docker-manage.sh logs`
- [ ] 已验证所有服务正在运行：`docker-compose ps`
- [ ] 已检查健康状态：`./docker-manage.sh health`
- [ ] 已验证环境变量：`docker-compose config`
- [ ] 已检查端口冲突：`lsof -i :<port>`
- [ ] 已查看文档：`DOCKER_SETUP.zh.md`
- [ ] 已尝试重启服务：`./docker-manage.sh restart`

### 常见问题

**服务无法启动：**
```bash
# 检查端口冲突
./docker-manage.sh stop
lsof -i :3000 :8080 :8081 :5432 :6379

# 查看日志
docker-compose logs
```

**数据库连接问题：**
```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 测试连接
docker-compose exec postgres pg_isready -U open_webui
```

**磁盘空间不足：**
```bash
# 清理未使用的 Docker 资源
docker system prune -a

# 检查磁盘使用情况
df -h
docker system df
```

## 最终验证

运行这些命令以确保一切正常：

```bash
# 1. 检查所有服务是否运行
docker-compose ps

# 2. 检查健康状态
./docker-manage.sh health

# 3. 测试 API
curl http://localhost:8080/health

# 4. 测试 Socket.IO
curl http://localhost:8081/health

# 5. 测试前端
curl http://localhost:3000

# 6. 查看日志（应无错误）
docker-compose logs --tail=50

# 7. 检查资源使用情况
docker stats --no-stream
```

## 成功标准

如果满足以下条件，您的设置就成功了：

✅ 所有服务显示为"Up"或"healthy"状态  
✅ 所有健康检查通过  
✅ 前端可在 http://localhost:3000 访问  
✅ 可以创建并登录用户账户  
✅ 可以创建和查看聊天  
✅ 实时功能工作正常  
✅ 日志中无关键错误  
✅ 可以创建备份  

## 恭喜！

如果您已检查所有这些项目，您的 Docker 设置就完成并正常工作了！

### 后续步骤

1. **开发**：阅读 `DOCKER_DEV.zh.md` 了解本地开发工作流程
2. **生产**：阅读 `DOCKER_SETUP.zh.md` 了解生产部署
3. **自定义**：编辑 `.env` 以启用/禁用功能
4. **备份**：使用 cron 设置自动备份

### 快速参考

```bash
# 日常使用
./docker-manage.sh start      # 启动服务
./docker-manage.sh stop       # 停止服务
./docker-manage.sh logs       # 查看日志
./docker-manage.sh health     # 检查健康状态
./docker-manage.sh backup     # 创建备份

# 需要帮助？
./docker-manage.sh help       # 显示所有命令
```

---

**需要帮助？** 查看 `DOCKER_README.zh.md` 以获取详细指南的导航。

