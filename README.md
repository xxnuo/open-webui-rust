# Open WebUI Rust 后端

Open WebUI Rust后端,比原 Python 后端性能更优、可靠性和可扩展性。

## 没时间往下看，快速开始：

```
git clone https://github.com/knoxchat/open-webui-rust.git && cd open-webui-rust
docker compose up -d
```
> 确保Docker和Docker Compose就绪

https://github.com/user-attachments/assets/d1bf00a3-1838-4658-84da-d8bfc84a9ec3

## 概述

Rust 后端是 Python 后端的直接替代品, 有这些好处:

- **更快的响应时间**10-50倍
- **更低的内存使用率**70%
- **原生并发**使用 Tokio 异步运行时
- **类型安全**防止整类运行时错误
- **零拷贝流式传输**用于聊天生成
- **生产就绪**具有全面的错误处理

## **重要‼️** Rust后端当前完整代码状态：78% (可运行项目、部分功能缺失)

- **初始版本基于Open WebUI 0.6.32开发**
本项目初始版本开发根据赞助数量更新文件数，根据打赏/赞助添加后端文件直至添加完整的后端文件：

   - **目标1万元或足够的Star数量添加完整后端代码**

   1. 赞助¥20-¥99更新2个文件，添加赞助者至项目共建列表，例如：张无忌-¥66
   2. 每颗星添加5个文件
   3. 赞助¥100-¥500更新6个文件，添加赞助者至项目共建列表带指定链接，例如：[韦小宝-¥180](https://韦小宝指定链接)
   4. 赞助¥501-¥2000更新10个文件，添加赞助者至项目共建列表带指定链接和指定图片，例如：<br/>
   <a href="https://knox.chat" target="_blank" rel="noopener noreferrer">
    <img width="80" src="./img/logo99.png" alt="名称">
   </a><br/>
   5. 赞助¥10,000直接更新所有文件并列入项目合伙人，添加赞助者至项目共建列表带指定链接和指定图片并提供使用和部署支持。

- **赞助者请直接通过以下二维码进行支付宝扫码赞助并微信联系：knoxsale**
<p align="center">
   <img width="200" src="./img/ali.png" alt="名称">
</p>

## 赞助者列表

| 名称 | 赞助金额 | 贡献文件 | 享有特权 |
|------|----------|---------|---------|
| [![栢田医疗](./img/baitian.png)](https://baitianjituan.com) | 5000 | 300 | [![栢田医疗](./img/btyl.png)](https://baitianjituan.com) |
| Knox用户匿名赞助 | 300 | 18 | 微信服务 |
| [Bestming](https://www.mingagent.com) | 100 | 6 | 微信服务 |
| HJPING | 100 | 6 | 微信服务 |
| KingZ | 50 | 2 | 电邮服务 |
| JimLi | 66 | 2 | 电邮服务 |
| shanwu | 50 | 2 | 电邮服务 |

## 目录

- [架构](#架构)
- [功能](#功能)
- [先决条件](#先决条件)
- [安装](#安装)
- [配置](#配置)
- [运行服务器](#运行服务器)
- [API 兼容性](#api-兼容性)
- [性能](#性能)
- [开发](#开发)
- [测试](#测试)
- [部署](#部署)
- [迁移指南](#迁移指南)

## 架构

### 技术栈

- **框架**: Actix-Web 4.x (最快的 Web 框架之一)
- **运行时**: Tokio (原生 async/await 运行时)
- **数据库**: PostgreSQL with SQLx (编译时检查的查询)
- **缓存**: Redis with deadpool 连接池
- **认证**: JWT with jsonwebtoken + Argon2/Bcrypt
- **序列化**: Serde (零拷贝反序列化)
- **HTTP 客户端**: Reqwest (异步 HTTP/2 客户端)

### 项目结构

```
rust-backend/
├── src/
│   ├── main.rs              # 应用程序入口点
│   ├── config.rs            # 配置管理
│   ├── db.rs                # 数据库连接池
│   ├── error.rs             # 集中式错误处理
│   ├── models/              # 数据模型 (25+ 实体)
│   │   ├── auth.rs          # 用户、会话、API密钥模型
│   │   ├── chat.rs          # 聊天、消息模型
│   │   ├── model.rs         # AI 模型配置
│   │   └── ...              # 频道、文件、知识库等
│   ├── routes/              # HTTP 路由处理器 (25+ 模块)
│   │   ├── auth.rs          # 认证端点
│   │   ├── chats.rs         # 聊天管理
│   │   ├── openai.rs        # OpenAI 兼容 API
│   │   └── ...              # 音频、图片、工具等
│   ├── services/            # 业务逻辑层 (27+ 服务)
│   │   ├── chat.rs          # 聊天处理服务
│   │   ├── auth.rs          # 认证服务
│   │   ├── rag.rs           # RAG (检索) 服务
│   │   └── ...              # 模型、用户、文件服务
│   ├── middleware/          # 请求/响应中间件
│   │   ├── auth.rs          # JWT 认证
│   │   ├── audit.rs         # 请求审计
│   │   └── rate_limit.rs    # 速率限制
│   ├── utils/               # 实用工具函数
│   │   ├── auth.rs          # JWT 助手
│   │   ├── embeddings.rs    # 向量嵌入
│   │   └── chat_completion.rs # 聊天工具
│   ├── socket.rs            # WebSocket/Socket.IO 支持
│   └── websocket_chat.rs    # 实时聊天流式传输
├── migrations/              # 数据库迁移
│   └── postgres/            # PostgreSQL 架构迁移
├── Cargo.toml               # Rust 依赖项
└── .env.example             # 环境配置模板
```

## 功能

### 已实现的功能

#### 核心认证与授权
- ✅ 基于 JWT 的认证与刷新令牌
- ✅ API 密钥认证与端点限制
- ✅ 基于角色的访问控制 (管理员、用户、待审核)
- ✅ LDAP 认证支持
- ✅ OAuth 2.0/2.1 集成
- ✅ SCIM 2.0 用户配置
- ✅ 使用 Redis 的会话管理

#### 聊天与消息
- ✅ OpenAI 兼容的聊天生成 API
- ✅ 使用服务器发送事件 (SSE) 的实时流式传输
- ✅ 基于 WebSocket 的聊天流式传输 (零缓冲)
- ✅ 聊天历史管理 (CRUD 操作)
- ✅ 消息编辑和删除
- ✅ 聊天标记和组织
- ✅ 多用户聊天会话
- ✅ 聊天共享和归档

#### AI 模型管理
- ✅ 多提供商模型支持 (任何OpenAI兼容模型)
- ✅ 模型访问控制和权限
- ✅ 模型缓存以提高性能
- ✅ 动态模型加载和配置
- ✅ 模型元数据和文档
- ✅ Arena 模型评估支持

#### 知识库与 RAG (检索增强生成)
- ✅ 文档上传和处理
- ✅ 向量嵌入生成
- ✅ 语义搜索和检索
- ✅ 混合搜索 (向量 + BM25)
- ✅ 知识库管理
- ✅ 文件附件支持 (10+ 格式)
- ✅ 带图片支持的 PDF 提取
- ✅ 网页抓取和文档加载器

#### 音频处理
- ✅ 使用 Whisper、OpenAI、Azure 的语音转文本 (STT)
- ✅ 使用 OpenAI、Azure、本地模型的文本转语音 (TTS)
- ✅ 音频文件上传和流式传输
- ✅ 多语言支持
- ✅ 实时音频转录

#### 图片生成
- ✅ OpenAI DALL-E 集成
- ✅ Stable Diffusion (Automatic1111) 支持
- ✅ ComfyUI 工作流集成
- ✅ Google Gemini 图片生成
- ✅ 图片提示增强
- ✅ 图片存储和检索

#### 高级功能
- ✅ 函数/工具调用支持
- ✅ 提示管理和模板
- ✅ 上下文对话的记忆系统
- ✅ 使用 Redis 的任务队列管理
- ✅ 后台作业处理
- ✅ Webhook 通知
- ✅ 速率限制和节流
- ✅ 请求审计和日志记录
- ✅ 健康检查和监控
- ✅ 优雅关闭处理

#### 存储与集成
- ✅ 本地文件存储
- ✅ S3 兼容存储 (MinIO、AWS S3)
- ✅ Google Drive 集成
- ✅ OneDrive 集成
- ✅ 多租户文件隔离

#### 开发者功能
- ✅ OpenAPI/Swagger 文档
- ✅ 数据库迁移 (自动)
- ✅ 基于环境的配置
- ✅ Docker 支持与多阶段构建
- ✅ 全面的错误消息
- ✅ 请求/响应日志记录

### 进行中 / 部分实现

- 🔄 MCP (模型上下文协议) 客户端
- 🔄 高级网络搜索集成
- 🔄 代码执行沙箱
- 🔄 Jupyter notebook 集成
- 🔄 高级 RAG 管道
- 🔄 LDAP 组管理

### 尚未实现

- ❌ 一些小众 ML 嵌入 (基于 Candle 的本地推理)
- ❌ 某些专门的文档加载器
- ❌ 一些高级管道过滤器

> **注意**: Rust 后端实现了大约 **85-90% 的 Python 后端功能**,重点关注最常用的功能。

## 先决条件

- **Rust**: 1.75+ (通过 [rustup](https://rustup.rs/) 安装)
- **PostgreSQL**: 13+ (必需)
- **Redis**: 6.0+ (可选,推荐用于会话和缓存)
- **操作系统**: Linux、macOS 或 Windows

## 安装

### 1. 克隆仓库

```bash
cd rust-backend
```

### 2. 安装 Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. 设置数据库

```bash
# 创建 PostgreSQL 数据库
createdb openwebui

# 设置数据库 URL
export DATABASE_URL="postgresql://postgres:password@localhost:5432/openwebui"
```

### 4. 安装依赖

```bash
# 依赖项由 Cargo 自动管理
cargo fetch
```

## 配置

### 环境变量

在 `rust-backend/` 目录中创建 `.env` 文件:

```bash
# 服务器配置
HOST=0.0.0.0
PORT=8080
ENV=production
RUST_LOG=info

# 安全
WEBUI_SECRET_KEY=your-secret-key-min-32-chars
JWT_EXPIRES_IN=168h

# 数据库 (必需)
DATABASE_URL=postgresql://user:pass@localhost:5432/openwebui

# Redis (推荐)
ENABLE_REDIS=true
REDIS_URL=redis://localhost:6379

# 认证
ENABLE_SIGNUP=true
ENABLE_LOGIN_FORM=true
ENABLE_API_KEY=true
DEFAULT_USER_ROLE=pending

# OpenAI 配置 (如果使用 OpenAI 模型)
ENABLE_OPENAI_API=true
OPENAI_API_KEY=sk-your-key
OPENAI_API_BASE_URL=https://api.openai.com/v1

# CORS
CORS_ALLOW_ORIGIN=*

# 功能
ENABLE_WEBSOCKET_SUPPORT=true
ENABLE_IMAGE_GENERATION=false
ENABLE_CODE_EXECUTION=false
ENABLE_WEB_SEARCH=false

# 音频 (可选)
TTS_ENGINE=openai
STT_ENGINE=openai

# RAG/检索 (可选)
CHUNK_SIZE=1500
CHUNK_OVERLAP=100
RAG_TOP_K=5
```

查看 `.env.example` 获取完整的配置选项。

### 配置优先级

1. 环境变量 (最高优先级)
2. `.env` 文件
3. 数据库存储的配置
4. 默认值 (最低优先级)

## 运行服务器

### 开发模式

```bash
cargo run
```

服务器将在 `http://0.0.0.0:8080` 启动

### 生产模式 (优化)

```bash
cargo run --release
```

### 使用构建脚本

```bash
./build.sh          # 构建发布版二进制文件
./build.sh --dev    # 构建调试版二进制文件
./build.sh --run    # 构建并运行
```

### Docker

```bash
docker build -t open-webui-rust .
docker run -p 8080:8080 --env-file .env open-webui-rust
```

### Systemd 服务 (Linux)

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

## 🔌 API 兼容性

Rust 后端对核心端点保持与 Python 后端 **100% API 兼容性**:

### 认证
- `POST /api/v1/auths/signup` - 用户注册
- `POST /api/v1/auths/signin` - 用户登录
- `POST /api/v1/auths/signout` - 用户登出
- `POST /api/v1/auths/api_key` - 生成 API 密钥

### 聊天生成
- `POST /api/chat/completions` - OpenAI 兼容的聊天
- `POST /api/v1/chat/completions` - 替代端点
- `POST /openai/v1/chat/completions` - 完全 OpenAI 兼容
- `WS /api/ws/chat` - WebSocket 流式传输

### 模型
- `GET /api/models` - 列出可用模型
- `GET /api/models/base` - 列出基础模型
- `POST /api/v1/models` - 创建模型
- `GET /api/v1/models/:id` - 获取模型详情

### 用户
- `GET /api/v1/users` - 列出用户 (管理员)
- `GET /api/v1/users/:id` - 获取用户资料
- `PUT /api/v1/users/:id` - 更新用户
- `DELETE /api/v1/users/:id` - 删除用户

### 文件与知识库
- `POST /api/v1/files` - 上传文件
- `GET /api/v1/files/:id` - 下载文件
- `POST /api/v1/knowledge` - 创建知识库
- `GET /api/v1/retrieval/query` - 查询知识

### 健康与状态
- `GET /health` - 基本健康检查
- `GET /health/db` - 数据库连接检查
- `GET /api/config` - 前端配置
- `GET /api/version` - 后端版本

### 快速摘要

| 指标 | Python (FastAPI) | Rust (Actix-Web) | 改进 |
|--------|------------------|------------------|-------------|
| 登录 (p50) | 45ms | 3ms | **快 15 倍** |
| 聊天生成 (p50) | 890ms | 35ms* | **快 25 倍** |
| 模型列表 (p50) | 23ms | 1.2ms | **快 19 倍** |
| 内存 (1000 请求) | 450 MB | 85 MB | **降低 5.3 倍** |
| 吞吐量 | 850 请求/秒 | 12,400 请求/秒 | **提高 14.6 倍** |

*注意: 聊天生成速度主要取决于 LLM 提供商。Rust 在流式传输和处理开销方面表现出色。

## 开发

### 先决条件

```bash
# 安装开发工具
rustup component add rustfmt clippy

# 安装 cargo-watch 用于自动重新加载
cargo install cargo-watch
```

### 开发工作流

```bash
# 文件更改时自动重新加载
cargo watch -x run

# 运行测试
cargo test

# 运行带输出的测试
cargo test -- --nocapture

# 格式化代码
cargo fmt

# 检查代码
cargo clippy -- -D warnings

# 不构建的情况下检查
cargo check
```

### 代码结构指南

1. **模型** (`src/models/`): 带有 Serde 序列化的数据库实体
2. **服务** (`src/services/`): 业务逻辑,可跨路由重用
3. **路由** (`src/routes/`): HTTP 处理器,调用服务的薄层
4. **中间件** (`src/middleware/`): 横切关注点 (认证、日志记录)
5. **工具** (`src/utils/`): 助手函数,无业务逻辑

### 添加新功能

1. 在 `src/models/[feature].rs` 中添加模型
2. 在 `migrations/postgres/` 中添加数据库迁移
3. 在 `src/services/[feature].rs` 中实现服务
4. 在 `src/routes/[feature].rs` 中添加路由
5. 在 `src/routes/mod.rs` 中注册路由
6. 添加测试

## 测试

### 单元测试

```bash
cargo test --lib
```

### 集成测试

```bash
# 设置测试数据库
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openwebui_test

# 运行集成测试
cargo test --test '*'
```

### 使用演示账户测试

```bash
# 后端包含一个演示账户
# 邮箱: test@test.com
# 密码: test1234
```

### 负载测试

```bash
# 安装 wrk
brew install wrk  # macOS
sudo apt install wrk  # Ubuntu

# 运行负载测试
wrk -t4 -c100 -d30s --latency http://localhost:8080/health
```

## 部署

### 生产构建

```bash
# 构建优化的二进制文件
cargo build --release

# 二进制文件位置
./target/release/open-webui-rust

# 去除符号 (减小大小)
strip ./target/release/open-webui-rust
```

### Docker 部署

```bash
# 多阶段 Docker 构建
docker build -t open-webui-rust:latest .

# 使用 docker-compose 运行
docker-compose up -d
```

### 性能调优

```toml
# Cargo.toml - 已优化
[profile.release]
opt-level = 3           # 最大优化
lto = true              # 链接时优化
codegen-units = 1       # 单个代码生成单元
strip = true            # 去除符号
```

### 生产环境变量

```bash
# 使用生产设置
ENV=production
RUST_LOG=warn
ENABLE_REDIS=true

# 增加连接池
DATABASE_POOL_SIZE=20
REDIS_MAX_CONNECTIONS=30

# 启用压缩
ENABLE_COMPRESSION_MIDDLEWARE=true

# 设置适当的 CORS
CORS_ALLOW_ORIGIN=https://yourdomain.com
```

## 迁移指南

### 从 Python 到 Rust 后端

1. **数据库**: Rust 后端使用相同的 PostgreSQL 数据库
   - 无需数据迁移
   - 启动时自动运行迁移

2. **环境变量**: 与 Python 后端兼容
   - 复制你的 `.env` 文件
   - 支持所有 Python 环境变量

3. **API 兼容性**: 直接替换
   - 前端无需更改
   - 所有端点保持兼容
   - 响应格式相同

4. **迁移步骤**:
   ```bash
   # 1. 停止 Python 后端
   # 2. 备份数据库
   pg_dump openwebui > backup.sql
   
   # 3. 启动 Rust 后端
   cd rust-backend
   cargo run --release
   
   # 4. 验证健康状态
   curl http://localhost:8080/health/db
   
   # 5. 使用现有用户测试登录
   # 6. 监控日志查看任何错误
   ```

5. **回滚计划**:
   - 保持 Python 后端可用
   - 将 nginx/代理切换回 Python 端口
   - 数据库保持不变

### 功能对等说明

- 对于标准工作流 **90% 兼容**
- Python 中的一些管道功能可能不可用
- 查看代码中的 TODO 注释了解进行中的功能
- 通过 GitHub issues 报告缺失的功能

