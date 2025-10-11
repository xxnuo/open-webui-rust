-- Migration 005: Add missing note access_control column and create feedback table

-- Add access_control to note table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'note' AND column_name = 'access_control'
    ) THEN
        ALTER TABLE note ADD COLUMN access_control JSONB;
    END IF;
END $$;

-- Drop content column from note table if it exists (not used in Python backend)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'note' AND column_name = 'content'
    ) THEN
        ALTER TABLE note DROP COLUMN content;
    END IF;
END $$;

-- Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    type VARCHAR(255) NOT NULL,
    data JSONB,
    meta JSONB,
    snapshot JSONB,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);

