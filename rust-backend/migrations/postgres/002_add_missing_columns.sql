-- Add missing columns to tool table
ALTER TABLE tool ADD COLUMN IF NOT EXISTS valves JSONB DEFAULT '{}';

-- Add missing columns to channel table  
ALTER TABLE channel ADD COLUMN IF NOT EXISTS type TEXT;

