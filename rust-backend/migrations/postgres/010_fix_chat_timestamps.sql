-- Migration to fix timestamps from nanoseconds to seconds
-- This migration converts any timestamps that are in nanoseconds (> year 2200 in seconds)
-- to seconds for consistency with the Python backend
-- 
-- Tables using SECONDS: chat, user, tool, prompt, model, memory, knowledge, group, function, folder, file, feedback, auth
-- Tables using NANOSECONDS: message, channel, note (these should NOT be modified)
-- 
-- Nanosecond timestamps are 19 digits, second timestamps are 10 digits
-- If timestamp > 10000000000 (Sat Nov 20 2286 in seconds), it's in nanoseconds

-- Fix chat table
UPDATE chat 
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE chat 
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix user table
UPDATE "user"
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE "user"
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

UPDATE "user"
SET last_active_at = last_active_at / 1000000000
WHERE last_active_at > 10000000000;

-- Fix tool table
UPDATE tool
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE tool
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix prompt table (uses 'timestamp' field, not created_at/updated_at)
UPDATE prompt
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE prompt
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix model table
UPDATE model
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE model
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix memory table
UPDATE memory
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE memory
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix knowledge table
UPDATE knowledge
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE knowledge
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix group table
UPDATE "group"
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE "group"
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix function table
UPDATE function
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE function
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix folder table
UPDATE folder
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE folder
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix file table
UPDATE file
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE file
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix feedback table
UPDATE feedback
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

UPDATE feedback
SET updated_at = updated_at / 1000000000
WHERE updated_at > 10000000000;

-- Fix auth table
UPDATE auth
SET created_at = created_at / 1000000000
WHERE created_at > 10000000000;

-- NOTE: message, channel, and note tables should use nanoseconds and are NOT modified

-- Create indexes if they don't exist for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_updated_at ON chat(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat(created_at DESC);

