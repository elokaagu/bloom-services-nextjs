# Bloom RAG Setup Guide

This guide will help you set up the Bloom RAG (Retrieval-Augmented Generation) system with Supabase and OpenAI.

## 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE   # server-only

# OpenAI Configuration
OPENAI_API_KEY=YOUR_OPENAI_KEY                         # or ANTHROPIC_API_KEY

# Model Configuration
EMBEDDING_MODEL=text-embedding-3-small                 # adjust dim below if needed
GENERATION_MODEL=gpt-4o-mini                           # pick your LLM

# RAG Configuration
RAG_TOP_K=6
VECTOR_DIM=1536                                        # match embedding model dim
STORAGE_BUCKET=documents
```

## 2. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API keys from the project settings

### Run the SQL Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Run the SQL schema provided in the main guide (replace `%VECTOR_DIM%` with `1536`)
3. Create a Storage bucket named `documents`

### Optional: Create the RPC Function

Run this SQL in the Supabase SQL Editor for better performance:

```sql
create or replace function match_chunks(
  p_workspace_id uuid,
  p_query_embedding vector,
  p_match_count int default 6
)
returns table(id bigint, document_id uuid, text text, similarity float) language sql stable as $$
  select dc.id, dc.document_id, dc.text,
         1 - (dc.embedding <=> p_query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.workspace_id = p_workspace_id
  order by dc.embedding <=> p_query_embedding
  limit p_match_count
$$;
```

## 3. OpenAI Setup

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it to your `.env.local` file

## 4. Test the System

1. Start your development server: `npm run dev`
2. Navigate to `/app` and go to the Document Library
3. Upload a PDF or DOCX file
4. Wait for processing to complete
5. Go to the Chat section and ask questions about your documents

## 5. Features

- **Document Upload**: Supports PDF, DOCX, PPTX, TXT, XLSX files
- **Automatic Processing**: Files are parsed, chunked, and embedded automatically
- **RAG Chat**: Ask questions and get answers with citations
- **Access Control**: Built-in workspace and document-level permissions
- **Real-time Status**: Track upload and processing progress

## 6. Troubleshooting

- Make sure all environment variables are set correctly
- Check that the Supabase project has the vector extension enabled
- Verify the Storage bucket exists and has proper permissions
- Check the browser console and server logs for any errors

## 7. Next Steps

- Implement proper authentication with Supabase Auth
- Add more file type support (images with OCR)
- Implement document management UI
- Add user and workspace management
- Set up proper error handling and logging
