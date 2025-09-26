-- Enable pgvector extension for vector similarity search
-- Run this in your Supabase SQL Editor

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if the document_chunks table has the embedding column with correct type
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
AND column_name = 'embedding';

-- If the embedding column doesn't exist or has wrong type, fix it:
-- ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1536);
