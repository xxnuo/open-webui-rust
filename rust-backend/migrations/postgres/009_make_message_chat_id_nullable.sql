-- Make chat_id nullable to support channel messages
-- Channel messages have channel_id but not chat_id
ALTER TABLE message ALTER COLUMN chat_id DROP NOT NULL;

-- Also make role nullable since channel messages don't always have a role
ALTER TABLE message ALTER COLUMN role DROP NOT NULL;

