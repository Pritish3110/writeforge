# WriterZ Backend

This directory contains the backend schema and Supabase-related backend assets for WriterZ.

For the full backend reference, read:

- `../backend.md`

For the frontend rebuild spec, read:

- `../frontend.md`

For the current issue log, read:

- `../errors.md`

## Quick Commands

### Backend

```bash
cd backend
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

If the frontend is pointed at a hosted Supabase project, you do not need to run a separate local backend server.

## What Lives Here

- `supabase/schema.sql`
  - tables
  - indexes
  - RLS policies
  - helper SQL functions
  - snapshot sync RPC
  - one-time migration RPC
- `supabase/email-templates/confirm-email.html`
  - custom confirmation email template

## Apply The Schema

Choose one:

1. Supabase Dashboard
   - open SQL editor
   - paste `backend/supabase/schema.sql`
   - run it

2. Supabase CLI

```bash
cd backend
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

## Current Backend Integration Notes

- frontend env uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- auth state is centralized in `frontend/src/contexts/AuthContext.tsx`
- the frontend uses a singleton Supabase client
- session restoration is logged and guarded
- protected backend reads and writes now require a valid session before they run

## Backend Guarantees

- every table is user-scoped
- RLS protects own-row access
- original frontend IDs are preserved
- migration is one-time and guarded
- snapshot writes are transactional
- local-only scene-reference state stays out of the durable backend snapshot
