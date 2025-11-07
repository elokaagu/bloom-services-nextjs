## Bloom RAG Platform Tech Stack

### 1. Overview
- **Architecture**: Full-stack Next.js 15 application using the App Router. Client UI and serverless API routes run on Vercel, while persistent data and storage live in Supabase. Retrieval-Augmented Generation (RAG) combines OpenAI embeddings with Supabase Postgres vector search.
- **Key Components**: Next.js frontend, Supabase database + storage, OpenAI API, custom ingestion pipeline, Supabase-authenticated document workspace, and stateful chat UX.

### 2. Frontend
- **Framework**: `next@15.x` with React 18 and TypeScript for strongly-typed UI development (`app/`, `src/components/`).
- **Styling & UI**: Tailwind CSS (`tailwind.config.ts`, `app/globals.css`), Shadcn UI primitives backed by Radix UI, `lucide-react` icons, and custom Bloom branding assets in `public/`.
- **State & Data Fetching**: Local React state and hooks, `@tanstack/react-query` for async queries, and context-based auth state in `src/contexts/AuthContext.tsx`. Chat history persists via `localStorage` (see `src/components/chat/ChatInterface.tsx`).
- **Routing**: App Router (`app/`) for page composition and nested layouts. `/app` hosts the authenticated workspace experience, `/` is the marketing landing page.
- **Forms & Validation**: `react-hook-form`, `zod`, and `@hookform/resolvers` for input handling in flows like `SignInModal` and document forms.

### 3. Backend & APIs
- **Runtime**: Next.js API routes under `app/api/`, executed as serverless functions on Vercel. Routes cover file ingestion (`upload`, `process-*`), document access (`documents/*`), RAG chat (`simple-chat`), and operational diagnostics.
- **Document Ingestion**: Uploads store originals in Supabase Storage and metadata in Postgres (`app/api/upload/route.ts`). Processing uses utilities in `src/lib/chunk-creation.ts`, `advanced-pdf-processor.ts`, and related routes to extract text, convert formats, and generate embeddings.
- **File Processing Libraries**: `pdf-parse`, `pdfjs-dist`, `pdf2pic`, `canvas`, `sharp`, `mammoth` (DOCX), and `tesseract.js` (OCR) support a wide variety of document types.
- **Server Utilities**: `src/lib/supabase-client.ts` and `src/lib/supabase.ts` provide SSR-safe client/admin access. Custom SQL scripts in the repo (`add-missing-columns.sql`, `add-match-chunks-function.sql`, etc.) migrate the database as needed.

### 4. Data Layer
- **Database**: Supabase Postgres stores users, workspaces, documents, chunks, and chat metadata. Embeddings reside in the `document_chunks.embedding` column with the `vector` type.
- **Storage**: Supabase Storage buckets keep raw uploads; metadata fields (`storage_path`, `storage_url`, `file_size`, `file_type`) track assets.
- **RPC & Functions**: `match_chunks` SQL function enables efficient vector similarity (`app/api/simple-chat/route.ts`). Additional SQL helpers add columns, enable pgvector, and clean sample data.
- **Migrations & Schema**: SQL scripts in the repo document schema evolution. `supabase-schema.sql` and `supabase-schema-safe.sql` snapshot the current structure. Run scripts via Supabase SQL editor or CLI.

### 5. AI & RAG Layer
- **LLM Provider**: `openai` SDK interacts with OpenAI APIs. Default models: `text-embedding-3-small` for vectorization and `gpt-4o-mini` for generation (configurable via environment variables).
- **Vector Search**: Primary path uses Supabase RPC (`match_chunks`). Fallback computes cosine similarity in-process when RPC is unavailable.
- **Citation Handling**: `app/api/simple-chat/route.ts` enriches responses with robust citation metadata (document IDs, titles, snippets) consumed by the chat UI (`ChatInterface`).
- **Chunk Lifecycle**: `src/lib/chunk-creation.ts` orchestrates preprocessing, embedding generation, and chunk persistence. Multiple debug routes under `app/api/` help operate the pipeline.

### 6. Authentication & Authorization
- **Auth Provider**: Supabase email/password authentication. `src/components/auth/SignInModal.tsx` calls Supabase Auth REST endpoints directly, including enriched user metadata (first/last name).
- **Session State**: `AuthProvider` in `src/contexts/AuthContext.tsx` syncs session details to `localStorage`, exposing `login/logout` hooks app-wide. `/app` routes are wrapped with this provider in `app/app/layout.tsx`.
- **UI Integration**: Components such as `AppSidebar` reflect the logged-in user and trigger logout. Landing page CTA opens the Supabase-backed sign-in modal.

### 7. Deployment & Operations
- **Hosting**: Vercel builds and deploys the Next.js project. Build logs in the conversation highlight configuration warnings resolved via `next.config.js` adjustments.
- **CI/CD**: GitHub repository with protected branches; `.env` values managed separately (never committed). Build scripts run `next build` and linting.
- **Environment Variables**: Supabase URL and keys, OpenAI credentials, and model overrides. Client-accessible values use the `NEXT_PUBLIC_` prefix. `env-example.txt` documents required variables.
- **Diagnostics**: Numerous API routes under `app/api/debug-*` aid operational troubleshooting (storage, embeddings, ingestion health, etc.). Console logging within routes traces RAG steps end-to-end.

### 8. Tooling & Developer Experience
- **TypeScript-first**: Strict configuration via `tsconfig.json` and ESLint/TypeScript ESLint setup (`eslint.config.js`).
- **Styling Workflow**: Tailwind CSS with `tailwind-merge` and `class-variance-authority` for composable class management.
- **Component Library**: `src/components/ui/` contains generated Shadcn components shared across pages. Layout and page modules live in `src/components/pages/`.
- **Documentation & Scripts**: Existing guides (`README.md`, `RAG_SETUP.md`, `setup-supabase.md`) describe environment setup, ingestion steps, and RAG debugging. This document complements them with a stack-level view.

### 9. Key Integrations Summary
- **Frontend**: Next.js App Router, React, TypeScript, Tailwind, Shadcn UI, React Query, local storage persistence.
- **Backend**: Next.js API routes, document ingestion utilities, Supabase client wrappers.
- **Data**: Supabase Postgres + Storage, pgvector, SQL migrations, RPC functions.
- **AI**: OpenAI embeddings + chat completions, similarity search, citation plumbing.
- **Auth**: Supabase email/password, custom modal, context-based session state.
- **Ops**: Vercel deployments, ESLint/TypeScript tooling, environment management via `.env.local`.

This stack enables Bloom’s RAG workspace to ingest diverse documents, persist structured knowledge, and deliver citation-backed answers through a polished web experience.

