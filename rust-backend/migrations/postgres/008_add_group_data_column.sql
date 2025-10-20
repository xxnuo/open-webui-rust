-- Add missing data column to group table
ALTER TABLE "group" ADD COLUMN IF NOT EXISTS data JSONB;

