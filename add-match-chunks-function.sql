-- Add the match_chunks RPC function for vector similarity search
-- Run this in your Supabase SQL Editor

-- Create the RPC function for efficient vector search
CREATE OR REPLACE FUNCTION match_chunks(
  p_workspace_id uuid,
  p_query_embedding vector(1536),
  p_match_count int DEFAULT 6
)
RETURNS TABLE(
  id bigint, 
  document_id uuid, 
  text text, 
  similarity float
) 
LANGUAGE sql 
STABLE 
AS $$
  SELECT 
    dc.id, 
    dc.document_id, 
    dc.text,
    1 - (dc.embedding <=> p_query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.workspace_id = p_workspace_id
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- Add comment
COMMENT ON FUNCTION match_chunks IS 'Efficient vector similarity search for document chunks within a workspace';
