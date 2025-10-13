-- Migration 006: Add data column to folder table

-- Add data column to folder table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'folder' AND column_name = 'data'
    ) THEN
        ALTER TABLE folder ADD COLUMN data JSONB;
    END IF;
END $$;

