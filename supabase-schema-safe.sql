-- Bloom RAG Database Schema (Safe Version - Handles Existing Objects)
-- Run this in your Supabase SQL Editor

-- Enable vector extension
create extension if not exists vector;

-- Organizations / Workspaces / Members
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key,           -- equals auth.uid()
  email text,
  name text,
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  user_id uuid references users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  role text check (role in ('admin','contributor','reader')) not null,
  primary key (user_id, workspace_id)
);

-- Documents - Create enum type only if it doesn't exist
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'doc_acl') then
    create type doc_acl as enum ('private','workspace','organization','explicit_list');
  end if;
end $$;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  owner_id uuid not null references users(id),
  title text not null,
  storage_path text not null,        -- path in Storage bucket
  acl doc_acl not null default 'workspace',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text default 'ready',        -- ready | processing | uploading | failed
  error text
);

-- Document chunks (vector + metadata)
create table if not exists document_chunks (
  id bigserial primary key,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_no int not null,
  page int,
  section text,
  text text not null,
  embedding vector(1536),  -- text-embedding-3-small dimension
  created_at timestamptz default now()
);

-- Queries + Citations
create table if not exists queries (
  id bigserial primary key,
  user_id uuid not null references users(id),
  workspace_id uuid references workspaces(id) on delete cascade,
  question text not null,
  model text,
  created_at timestamptz default now()
);

create table if not exists query_citations (
  query_id bigint references queries(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  chunk_id bigint references document_chunks(id) on delete cascade
);

-- Share list for explicit access
create table if not exists document_shares (
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (document_id, user_id)
);

-- Search helpers
create index if not exists idx_chunks_doc on document_chunks(document_id);
create index if not exists idx_chunks_vec on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_docs_workspace on documents(workspace_id);

-- RLS - Enable only if not already enabled
do $$ 
begin
  if not exists (select 1 from pg_class where relname = 'organizations' and relrowsecurity = true) then
    alter table organizations enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'workspaces' and relrowsecurity = true) then
    alter table workspaces enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'users' and relrowsecurity = true) then
    alter table users enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'workspace_members' and relrowsecurity = true) then
    alter table workspace_members enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'documents' and relrowsecurity = true) then
    alter table documents enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'document_chunks' and relrowsecurity = true) then
    alter table document_chunks enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'document_shares' and relrowsecurity = true) then
    alter table document_shares enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'queries' and relrowsecurity = true) then
    alter table queries enable row level security;
  end if;
  if not exists (select 1 from pg_class where relname = 'query_citations' and relrowsecurity = true) then
    alter table query_citations enable row level security;
  end if;
end $$;

-- Helper function: user is member of workspace
create or replace function is_member(_workspace uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from workspace_members
    where user_id = auth.uid() and workspace_id = _workspace
  );
$$;

-- Policies - Drop existing policies first, then recreate
drop policy if exists org_public_select on organizations;
drop policy if exists ws_select on workspaces;
drop policy if exists users_self on users;
drop policy if exists wm_select on workspace_members;
drop policy if exists docs_select on documents;
drop policy if exists chunks_select on document_chunks;

create policy org_public_select on organizations for select using (true);
create policy ws_select on workspaces for select using (is_member(id));
create policy users_self on users for select using (id = auth.uid());

create policy wm_select on workspace_members for select using (
  user_id = auth.uid() or is_member(workspace_id)
);

-- Documents: member of workspace AND ACL check
create policy docs_select on documents for select using (
  is_member(workspace_id) and (
    acl = 'workspace' or
    (acl = 'organization' and exists (
      select 1 from workspaces w2
      where w2.organization_id = (select organization_id from workspaces w where w.id = documents.workspace_id)
        and is_member(w2.id)
    )) or
    (acl = 'private' and owner_id = auth.uid()) or
    (acl = 'explicit_list' and exists (
      select 1 from document_shares ds where ds.document_id = documents.id and ds.user_id = auth.uid()
    ))
  )
);

-- Chunks follow parent doc permission
create policy chunks_select on document_chunks for select using (
  exists (select 1 from documents d where d.id = document_chunks.document_id) and
  exists (
    select 1 from documents d where d.id = document_chunks.document_id and (
      is_member(d.workspace_id) and (
        d.acl = 'workspace' or
        (d.acl = 'organization' and exists (
          select 1 from workspaces w2
          where w2.organization_id = (select organization_id from workspaces w where w.id = d.workspace_id)
            and is_member(w2.id)
        )) or
        (d.acl = 'private' and d.owner_id = auth.uid()) or
        (d.acl = 'explicit_list' and exists (
          select 1 from document_shares ds where ds.document_id = d.id and ds.user_id = auth.uid()
        ))
      )
    )
  )
);

-- Optional: Create the RPC Function for better performance
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
