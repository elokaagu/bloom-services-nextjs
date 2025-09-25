-- Clear all documents from the Document Library
-- Run this in your Supabase SQL Editor

-- Delete all document chunks first (due to foreign key constraints)
DELETE FROM document_chunks;

-- Delete all documents
DELETE FROM documents;

-- Optional: Reset the document ID sequence (if you want to start fresh)
-- ALTER SEQUENCE documents_id_seq RESTART WITH 1;

-- Verify the documents are cleared
SELECT COUNT(*) as document_count FROM documents;
SELECT COUNT(*) as chunk_count FROM document_chunks;
