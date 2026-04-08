# WriterZ Backend Reference

> Historical note: this document captures a prior Supabase-based backend direction. The active backend scaffold for the current codebase now lives under `backend/` and `backend/firebase/` as the Firebase/Firestore implementation starting point.

This document is the backend and Supabase reference for the current project. It covers the hosted backend model, schema, policies, RPC functions, integration flow, environment requirements, and the latest backend-facing implementation details.

## 1. Backend Summary

WriterZ does not use a custom Express, Fastify, or Nest server in this repository.

The backend is made of:

- Supabase Auth
- Supabase Postgres
- SQL schema and Row Level Security policies
- SQL helper functions
- two SQL RPCs for snapshot sync and one-time migration
- a custom email confirmation template

The frontend talks directly to the hosted Supabase project.

## 2. Backend Folder Structure

```text
backend/
  README.md
  supabase/
    schema.sql
    email-templates/
      confirm-email.html
```

Important meaning:

- `backend/supabase/schema.sql`
  - the entire database schema
  - indexes
  - RLS policies
  - helper SQL functions
  - sync RPC
  - migration RPC
- `backend/supabase/email-templates/confirm-email.html`
  - custom email confirmation template used by Supabase Auth

## 3. Backend Architecture

### Hosted Service Model

The backend relies on a hosted Supabase project that provides:

- user authentication
- auth session handling
- database access
- REST access to tables
- RPC access to stored functions

There is no separate Node backend process to run locally when the frontend already points to a hosted Supabase instance.

### Data Ownership Model

The backend stores all durable user data by `user_id`.

Key design rules:

- every dataset is user-scoped
- original frontend IDs are preserved
- the backend can replace browser storage as the durable source of truth
- one-time migration must never overwrite an already-populated backend

## 4. Environment And Frontend Integration Inputs

The frontend is currently configured to talk to Supabase using:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Important current implementation details:

- the frontend no longer uses `VITE_SUPABASE_PROJECT_ID`
- the frontend no longer uses `VITE_SUPABASE_PUBLISHABLE_KEY`
- the shared client is created from URL + anon key only

## 5. Current Supabase Client Implementation

Frontend integration file:

- `frontend/src/lib/supabase/client.ts`

Current behavior:

- exports a singleton `supabase` client
- reads env from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- logs:
  - `SUPABASE URL:`
  - `SUPABASE KEY:`
  - `SUPABASE CLIENT:`
  - `SESSION:`
- uses a dedicated auth storage key: `writerz-auth`
- enables:
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: true`
- uses a custom `auth.lock` implementation that runs the callback directly

That custom lock is important because it intentionally bypasses browser LockManager behavior that was interfering with session restoration.

## 6. Centralized Auth Architecture

Frontend auth source of truth:

- `frontend/src/contexts/AuthContext.tsx`

Current auth architecture:

- centralized `AuthContext`
- single user state for the app
- single loading state for the app
- single place for sign in, sign up, sign out, profile update, password update, and email resend
- auth restore on mount
- `onAuthStateChange` subscription
- explicit `refreshUser()`

State exposed:

- `user`
- `loading`
- `pendingAuthAction`
- derived fields like display name, avatar, bio, email, verification state

Actions exposed:

- `setUser`
- `refreshUser`
- `signIn`
- `signUp`
- `signOut`
- `updateProfile`
- `changePassword`
- `resendVerificationEmail`

Important implementation notes:

- `console.log("USER TEST:", data, error)` runs on user refresh
- `console.log("USER:", user)` logs after login, profile update, and logout
- `SIGN OUT ERROR:` and `UPDATE ERROR:` are logged on failure
- auth restore failures log `Failed to restore auth session`

## 7. Backend-Aware Data Context

Frontend integration file:

- `frontend/src/contexts/WriteForgeDataContext.tsx`

This context sits on top of `AuthContext` and owns the application data snapshot.

Responsibilities:

- data bootstrap after auth
- deciding whether the app is in local mode or Supabase mode
- scheduling sync after client-side changes
- resetting signed-out state
- exposing storage helpers to the app

Status values:

- `booting`
- `ready`
- `syncing`
- `migrating`
- `error`

Important latest behavior:

- this context now consumes centralized auth instead of implementing auth itself
- sign-in, sign-out, sign-up, and profile update are wrappers around `AuthContext`
- backend calls are blocked until a valid auth session exists

## 8. Database Schema Overview

Schema file:

- `backend/supabase/schema.sql`

Tables:

1. `public.users`
2. `public.user_settings`
3. `public.tasks`
4. `public.custom_tasks`
5. `public.task_templates`
6. `public.characters`
7. `public.character_relationships`
8. `public.plot_points`
9. `public.drafts`
10. `public.world_elements`
11. `public.knowledge_base_sections`

## 9. Table Definitions

### `public.users`

Columns:

- `id uuid primary key references auth.users (id) on delete cascade`
- `created_at timestamptz`
- `updated_at timestamptz`

Purpose:

- mirrors authenticated users into public app space
- creates a user anchor for the rest of the application tables

### `public.user_settings`

Columns:

- `user_id uuid primary key references public.users (id) on delete cascade`
- `theme text`
- `character_seed_version integer`
- `backend_enabled boolean not null default true`
- `migrated boolean not null default false`
- `migration_version integer not null default 0`
- `migration_completed_at timestamptz`
- `last_snapshot_synced_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Purpose:

- stores per-user app settings and migration metadata

### `public.tasks`

Columns:

- `user_id uuid`
- `task_id text`
- `week_key date`
- `completed boolean`
- `completed_on date`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, task_id, week_key)`

Purpose:

- stores task completion by week

### `public.custom_tasks`

Columns:

- `user_id uuid`
- `original_id text`
- `title text`
- `category text`
- `duration_minutes integer`
- `prompt text`
- `steps jsonb`
- `important_rules jsonb`
- `assigned_day text`
- `saved_as_template boolean`
- `position_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

### `public.task_templates`

Columns:

- `user_id uuid`
- `original_id text`
- `name text`
- `tasks jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

### `public.characters`

Columns:

- `user_id uuid`
- `original_id text`
- `name text`
- `character_type text`
- `logline text`
- `ghost text`
- `lie text`
- `want text`
- `need text`
- `truth text`
- `designing_principle text`
- `moral_problem text`
- `worthy_cause text`
- `personality_traits jsonb`
- `theme jsonb`
- `contradictions jsonb`
- `pinned boolean`
- `position_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

### `public.character_relationships`

Columns:

- `user_id uuid`
- `original_id text`
- `character_a_original_id text`
- `character_b_original_id text`
- `relationship_type text`
- `description text`
- `strength integer`
- `timeline jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

Foreign key rules:

- `(user_id, character_a_original_id)` -> `public.characters`
- `(user_id, character_b_original_id)` -> `public.characters`

Purpose:

- stores graph edges between characters while preserving original frontend IDs

### `public.plot_points`

Columns:

- `user_id uuid`
- `original_id text`
- `phase text`
- `title text`
- `description text`
- `character_ids text[]`
- `scene_ids text[]`
- `stakes text`
- `conflict_level integer`
- `foreshadowing_ids text[]`
- `position_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

Check constraint:

- `phase in ('Promise', 'Progress', 'Payoff')`

### `public.drafts`

Columns:

- `user_id uuid`
- `original_id text`
- `title text`
- `draft_type text`
- `content text`
- `word_count integer`
- `created_at timestamptz`
- `updated_at timestamptz`
- `saved_at timestamptz`

Primary key:

- `(user_id, original_id)`

### `public.world_elements`

Columns:

- `user_id uuid`
- `original_id text`
- `category text`
- `element text`
- `title text`
- `content jsonb`
- `prompt text`
- `breakdown jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

### `public.knowledge_base_sections`

Columns:

- `user_id uuid`
- `original_id text`
- `title text`
- `items jsonb`
- `position_order integer`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(user_id, original_id)`

## 10. Indexes

Schema indexes:

- `tasks_user_week_idx` on `(user_id, week_key desc)`
- `custom_tasks_user_order_idx` on `(user_id, position_order asc)`
- `task_templates_user_name_idx` on `(user_id, name asc)`
- `characters_user_order_idx` on `(user_id, pinned desc, position_order asc)`
- `character_relationships_user_updated_idx` on `(user_id, updated_at desc)`
- `plot_points_user_phase_idx` on `(user_id, phase, position_order asc)`
- `drafts_user_updated_idx` on `(user_id, updated_at desc)`
- `world_elements_user_updated_idx` on `(user_id, updated_at desc)`
- `knowledge_base_user_order_idx` on `(user_id, position_order asc)`

## 11. Row Level Security

RLS is enabled on all application tables:

- `public.users`
- `public.user_settings`
- `public.tasks`
- `public.custom_tasks`
- `public.task_templates`
- `public.characters`
- `public.character_relationships`
- `public.plot_points`
- `public.drafts`
- `public.world_elements`
- `public.knowledge_base_sections`

Each table has a matching own-row policy using `auth.uid()`.

Pattern:

- `using (auth.uid() = user_id)` or `using (auth.uid() = id)` for `public.users`
- `with check (auth.uid() = user_id)` or `with check (auth.uid() = id)`

Effect:

- authenticated users can only read and write their own rows

## 12. Helper SQL Functions

Defined in `schema.sql`:

### `public.writeforge_array(value jsonb)`

Purpose:

- guarantees a JSONB array
- returns `[]` when the incoming value is not an array

### `public.writeforge_object(value jsonb)`

Purpose:

- guarantees a JSONB object
- returns `{}` when the incoming value is not an object

### `public.writeforge_extract_text_array(value jsonb)`

Purpose:

- converts a JSONB array into `text[]`
- used for arrays like `characterIds`, `sceneIds`, and `foreshadowingIds`

### `public.writeforge_has_remote_data(target_user_id uuid)`

Purpose:

- detects whether the backend already contains meaningful data for a user

Checks:

- `user_settings` data
- tasks
- custom tasks
- task templates
- characters
- relationships
- plot points
- drafts
- world elements
- knowledge-base sections

This function is important because the migration RPC must refuse to migrate into an already-populated backend.

## 13. Snapshot Sync RPC

Function:

- `public.apply_writeforge_snapshot(snapshot_payload jsonb, snapshot_version integer default 1)`

Purpose:

- writes the complete frontend snapshot into the backend inside a transaction

Important mechanics:

- requires `auth.uid()`
- acquires `pg_advisory_xact_lock(hashtext(actor_id::text))`
- upserts `public.users`
- upserts `public.user_settings`
- deletes rows not present in the new snapshot
- upserts all rows that are present in the new snapshot
- preserves existing `created_at` for existing rows where appropriate
- updates `updated_at` conditionally for some domains

Domains handled by this RPC:

- theme and character seed version in `user_settings`
- tasks
- custom tasks
- task templates
- characters
- character relationships
- plot points
- drafts
- world elements
- knowledge base sections

Return payload:

- `applied: true`
- `snapshot_version`
- `user_id`
- `synced_at`

## 14. One-Time Migration RPC

Function:

- `public.migrate_writeforge_snapshot(snapshot_payload jsonb, snapshot_version integer default 1)`

Purpose:

- one-time migration from existing client data into an empty backend

Flow:

1. require authenticated user
2. advisory lock on that user
3. ensure `public.users` row exists
4. ensure `public.user_settings` row exists
5. check whether backend already has data via `writeforge_has_remote_data`
6. check whether `user_settings.migrated` is already true
7. skip if backend already has data
8. skip if already migrated
9. call `apply_writeforge_snapshot`
10. mark `migrated = true`
11. set `migration_version`
12. set `migration_completed_at`
13. set `last_snapshot_synced_at`

Possible outcomes:

- migrated successfully
- skipped because backend not empty
- skipped because already migrated

## 15. RPC Grants

Authenticated users are allowed to execute:

- `public.apply_writeforge_snapshot(jsonb, integer)`
- `public.migrate_writeforge_snapshot(jsonb, integer)`

Grant statements live at the bottom of `schema.sql`.

## 16. Frontend Backend Access Layer

Primary file:

- `frontend/src/lib/supabase/writeforgeBackend.ts`

Responsibilities:

- user fetch
- snapshot load
- snapshot apply
- migration RPC calls
- row normalization into frontend-friendly shapes

Important latest implementation detail:

- session presence is enforced before protected backend calls

Specifically, the frontend now calls `requireSupabaseSession(client)` before:

- user fetch
- remote snapshot load
- snapshot apply
- migration

That prevents requests from firing without a valid access token.

## 17. Bootstrap And Sync Services

Primary service:

- `frontend/src/services/writeforgeDataService.ts`

Responsibilities:

- bootstrap the signed-in user state
- decide local mode vs Supabase mode
- decide whether one-time migration is allowed
- retry critical backend operations
- load snapshot from backend
- merge frontend snapshot with remote snapshot

Important implementation detail:

- critical operations are wrapped in `withRetries`
- retry delay grows per attempt

## 18. Environment Rules

Runtime environment logic lives in:

- `frontend/src/services/writeforgeEnvironment.ts`

Important rules:

- localhost never auto-migrates browser data into the backend
- production runtime can migrate only if:
  - backend is empty
  - user has not already migrated
  - the client actually has migratable data

Effect:

- local development is safer
- production onboarding can adopt existing local data once

## 19. Storage And Snapshot Keys Used By The Backend

Defined in:

- `frontend/src/lib/storageKeys.ts`

Migratable keys:

- `writeforge-theme`
- `writeforge-tasks`
- `writeforge-custom-tasks`
- `taskTemplates`
- `writeforge-characters`
- `writeforge-character-seed-version`
- `writeforge-character-relationships`
- `writeforge-plot-builder`
- `writeforge-drafts`
- `writeforge-world-elements`
- `writeforge-knowledge-base`

Local-only key:

- `writeforge-scene-practice-world-element`

The local-only key is intentionally excluded from the backend snapshot.

## 20. Email Confirmation Template

File:

- `backend/supabase/email-templates/confirm-email.html`

Current characteristics:

- light editorial style
- neutral off-white background
- centered 560px email card
- top wordmark `WriterZ`
- headline: `Confirm your email`
- body copy: `Your workspace is ready.`
- CTA button: `Confirm Email`
- fallback plain URL shown below

This template should be installed in Supabase email settings if email confirmation is required.

## 21. Latest Backend-Related Implementation Changes

The latest codebase already includes these backend-facing updates:

- centralized auth state in `AuthContext`
- singleton Supabase client
- anon-key env usage
- session debug logging
- storage key changed to `writerz-auth`
- custom auth lock to bypass problematic browser lock behavior
- data requests gated behind verified session presence
- sign-out and profile update flows refresh frontend state properly
- dashboard username now reads current user metadata fallback correctly

## 22. Important Backend Files To Read First

For someone new to the backend, read these in order:

1. `backend/supabase/schema.sql`
2. `backend/README.md`
3. `backend/supabase/email-templates/confirm-email.html`
4. `frontend/src/lib/supabase/client.ts`
5. `frontend/src/contexts/AuthContext.tsx`
6. `frontend/src/lib/supabase/writeforgeBackend.ts`
7. `frontend/src/services/writeforgeDataService.ts`
8. `frontend/src/contexts/WriteForgeDataContext.tsx`

## 23. Backend Guarantees

The current backend design aims to preserve these guarantees:

- every user only sees their own data
- frontend original IDs survive migration and sync
- migration is one-time and guarded
- backend writes are transactional
- local-only scene-reference state does not pollute the durable snapshot
- session-gated requests do not fire before auth is ready

## 24. Backend Recreation Checklist

If recreating this backend in another project, keep these pieces together:

1. Supabase Auth project
2. Postgres schema with all current tables
3. RLS policies on every table
4. helper JSON normalization SQL functions
5. `apply_writeforge_snapshot` RPC
6. `migrate_writeforge_snapshot` RPC
7. confirmation email template
8. singleton client on the frontend
9. centralized auth context on the frontend
10. session gating before protected REST and RPC calls

## 25. Final Backend Note

The backend is not just a table dump. The important design choice is the combination of:

- user-scoped rows
- strict RLS
- frontend ID preservation
- transactional snapshot writes
- one-time guarded migration
- centralized frontend auth state
- session-aware backend access

That combination is what makes the current WriterZ backend model work.
