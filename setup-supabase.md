# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `bloom-services`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"

## Step 2: Get Your Credentials

Once your project is created (takes 2-3 minutes):

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL** (looks like `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Update Environment Variables

Update your `.env.local` file with the correct values:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# OpenAI Configuration (keep existing)
OPENAI_API_KEY=your-openai-api-key-here

# Model Configuration
EMBEDDING_MODEL=text-embedding-3-small
GENERATION_MODEL=gpt-4o-mini

# RAG Configuration
RAG_TOP_K=6
VECTOR_DIM=1536
STORAGE_BUCKET=documents
```

## Step 4: Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **Run** to execute the schema

## Step 5: Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name: `documents`
4. Make it **Public** (for now)
5. Click **Create bucket**

## Step 6: Test Connection

1. Restart your development server: `npm run dev`
2. Visit: `http://localhost:3000/api/test-connection`
3. You should see: `{"success": true, "message": "Supabase connection successful"}`

## Step 7: Switch to Supabase

Once the connection test passes, update the DocumentLibrary to use Supabase:

1. Change the fetch URL from `/api/documents` to `/api/documents-supabase`
2. Test uploading a document
3. Verify it appears in your Supabase database

## Troubleshooting

### Connection Issues

- Verify your Supabase URL is correct
- Check that your API keys are copied correctly
- Ensure your Supabase project is fully created (not still initializing)

### Database Issues

- Make sure you've run the SQL schema
- Check that the `documents` table exists
- Verify RLS policies are set up correctly

### Storage Issues

- Ensure the `documents` bucket exists
- Check bucket permissions
- Verify file upload limits

## Next Steps

Once Supabase is working:

1. Test document uploads
2. Test document retrieval
3. Test search functionality
4. Set up proper authentication
5. Configure RLS policies for security
