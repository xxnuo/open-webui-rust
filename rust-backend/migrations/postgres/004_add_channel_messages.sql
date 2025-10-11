-- Add channel messages support to message table
-- Python backend uses a single message table for both chat and channel messages

-- Add channel_id column to message table (make it nullable as some messages are for chats)
ALTER TABLE message ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255);

-- Add reply_to_id column for replying to messages
ALTER TABLE message ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR(255);

-- Add parent_id column for thread support
ALTER TABLE message ADD COLUMN IF NOT EXISTS parent_id VARCHAR(255);

-- Add data column for file attachments and other data
ALTER TABLE message ADD COLUMN IF NOT EXISTS data JSONB;

-- Create index on channel_id for faster queries
CREATE INDEX IF NOT EXISTS idx_message_channel_id ON message(channel_id);

-- Create index on parent_id for thread queries
CREATE INDEX IF NOT EXISTS idx_message_parent_id ON message(parent_id);

-- Create message_reaction table for reactions
CREATE TABLE IF NOT EXISTS message_reaction (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_reaction_message_id ON message_reaction(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reaction_user_id ON message_reaction(user_id);

-- Create channel_member table for channel memberships
CREATE TABLE IF NOT EXISTS channel_member (
    id VARCHAR(255) PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES channel(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channel_member_channel_id ON channel_member(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_member_user_id ON channel_member(user_id);

-- Add type column to channel table
ALTER TABLE channel ADD COLUMN IF NOT EXISTS type VARCHAR(50);

