-- Add config table for persistent configuration
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on updated_at for faster queries
CREATE INDEX IF NOT EXISTS idx_config_updated_at ON config(updated_at DESC);

