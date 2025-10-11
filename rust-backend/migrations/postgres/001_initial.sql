-- PostgreSQL Initial Schema
-- User table
CREATE TABLE IF NOT EXISTS "user" (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    profile_image_url TEXT NOT NULL,
    bio TEXT,
    gender VARCHAR(50),
    date_of_birth DATE,
    info JSONB,
    settings JSONB,
    api_key VARCHAR(255) UNIQUE,
    oauth_sub TEXT UNIQUE,
    last_active_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_api_key ON "user"(api_key);

-- Auth table
CREATE TABLE IF NOT EXISTS auth (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_email ON auth(email);

-- Chat table
CREATE TABLE IF NOT EXISTS chat (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    chat JSONB NOT NULL,
    folder_id VARCHAR(255),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    share_id VARCHAR(255) UNIQUE,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_share_id ON chat(share_id);

-- Message table
CREATE TABLE IF NOT EXISTS message (
    id VARCHAR(255) PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    model VARCHAR(255),
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chat(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_chat_id ON message(chat_id);

-- Model table
CREATE TABLE IF NOT EXISTS model (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    base_model_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    params JSONB NOT NULL,
    meta JSONB,
    access_control JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_model_user_id ON model(user_id);

-- Prompt table
CREATE TABLE IF NOT EXISTS prompt (
    command VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    access_control JSONB,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prompt_user_id ON prompt(user_id);

-- Tool table
CREATE TABLE IF NOT EXISTS tool (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    specs JSONB NOT NULL,
    meta JSONB,
    access_control JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_user_id ON tool(user_id);

-- Function table
CREATE TABLE IF NOT EXISTS function (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    meta JSONB,
    valves JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_function_user_id ON function(user_id);

-- File table
CREATE TABLE IF NOT EXISTS file (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_user_id ON file(user_id);

-- Folder table
CREATE TABLE IF NOT EXISTS folder (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(255),
    is_expanded BOOLEAN DEFAULT FALSE,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folder(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folder_user_id ON folder(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_parent_id ON folder(parent_id);

-- Knowledge table
CREATE TABLE IF NOT EXISTS knowledge (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB,
    meta JSONB,
    access_control JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON knowledge(user_id);

-- Memory table
CREATE TABLE IF NOT EXISTS memory (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);

-- Note table
CREATE TABLE IF NOT EXISTS note (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    data JSONB,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_user_id ON note(user_id);

-- Group table
CREATE TABLE IF NOT EXISTS "group" (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB,
    user_ids JSONB,
    meta JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_user_id ON "group"(user_id);

-- Channel table
CREATE TABLE IF NOT EXISTS channel (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id VARCHAR(255) NOT NULL,
    data JSONB,
    meta JSONB,
    access_control JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channel_user_id ON channel(user_id);

-- Tag table
CREATE TABLE IF NOT EXISTS tag (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    data JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tag_user_id ON tag(user_id);
