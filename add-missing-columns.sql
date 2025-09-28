-- Add missing columns to documents table
-- Run this in your Supabase SQL Editor

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS file_type text,
ADD COLUMN IF NOT EXISTS storage_url text;

-- Update the table comment
COMMENT ON COLUMN documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN documents.file_type IS 'MIME type of the file';
COMMENT ON COLUMN documents.storage_url IS 'Public URL to access the file';
