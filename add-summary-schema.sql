[-- Add summary fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ;
