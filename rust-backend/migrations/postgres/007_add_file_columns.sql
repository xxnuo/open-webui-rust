-- Migration 007: Add missing columns to file table

-- Add data column to file table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file' AND column_name = 'data'
    ) THEN
        ALTER TABLE file ADD COLUMN data JSONB;
    END IF;
END $$;

-- Add access_control column to file table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file' AND column_name = 'access_control'
    ) THEN
        ALTER TABLE file ADD COLUMN access_control JSONB;
    END IF;
END $$;

-- Add hash column to file table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file' AND column_name = 'hash'
    ) THEN
        ALTER TABLE file ADD COLUMN hash VARCHAR(255);
    END IF;
END $$;

