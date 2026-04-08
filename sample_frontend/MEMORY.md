# WriterZ Memory

This file is the short operational handoff. It is intentionally smaller than `../frontend.md` and `../backend.md`.

## Read These First

- frontend deep spec: `../frontend.md`
- backend deep spec: `../backend.md`
- active issue log: `../errors.md`
- this quick handoff: `MEMORY.md`

## Project Identity

- project name: `WriterZ`
- frontend stack: Vite + React + TypeScript + Tailwind + shadcn/ui
- default theme: dark
- overall UI direction: calm editorial workspace, not a flashy dashboard
- custom cursor behavior is gone; normal system cursor is the current behavior

## Frontend Entry And Shell

- `src/main.tsx` renders `<App />`
- `src/App.tsx` mounts the provider stack, router, toasts, and intro loading screen
- provider order:
  1. `QueryClientProvider`
  2. `AuthProvider`
  3. `WriteForgeDataProvider`
  4. `ThemeProvider`
  5. `DeleteConfirmationProvider`
  6. `TooltipProvider`
  7. `BrowserRouter`
- `AppLayout` provides the sidebar + top bar shell
- `AppSidebar` contains the full route list, account status card, sign-out button, and theme toggle

## Auth State Truth

- auth is now centralized in `src/contexts/AuthContext.tsx`
- `useAuth()` is the canonical way to read the signed-in user
- auth provider owns:
  - `user`
  - `loading`
  - `pendingAuthAction`
  - `setUser`
  - `refreshUser`
  - `signIn`
  - `signUp`
  - `signOut`
  - `updateProfile`
  - `changePassword`
  - `resendVerificationEmail`
- auth restore runs on mount
- auth provider subscribes to `onAuthStateChange`
- profile updates refresh the user immediately after success
- sign-out clears frontend auth state and the shell redirects back to `/auth`

## Data State Truth

- app data is centralized in `src/contexts/WriteForgeDataContext.tsx`
- this context consumes `AuthContext`
- it owns app snapshot reads and writes for tasks, custom tasks, characters, relationships, plot points, drafts, world elements, knowledge-base sections, and theme
- important status values:
  - `booting`
  - `ready`
  - `syncing`
  - `migrating`
  - `error`
- signed-out cleanup keeps theme and clears active workspace data

## Important Current Auth / Backend Notes

- frontend env uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- shared client lives in `src/lib/supabase/client.ts`
- dedicated auth storage key: `writerz-auth`
- session logging exists:
  - `SUPABASE URL:`
  - `SUPABASE KEY:`
  - `SUPABASE CLIENT:`
  - `SESSION:`
  - `USER TEST:`
  - `USER:`
- backend-facing reads and writes are gated behind a required session

## Branding / Visual Truths

- `index.html` title is `WriterZ`
- favicon is `public/favicon.svg`
- in-app brand mark also uses `public/favicon.svg`
- startup loading overlay is `src/components/LoadingScreen.tsx`
- loading screen uses a centered hexagon with `WZ`
- the current visual system depends on:
  - restrained card borders
  - `Inter` + `JetBrains Mono`
  - subtle neon accent colors
  - constrained page widths
  - generous but consistent spacing

## App Routes

- `/`
- `/daily-tasks`
- `/weekly-schedule`
- `/analytics`
- `/writing-analytics`
- `/knowledge-base`
- `/character-lab`
- `/character-relationships`
- `/plot-builder`
- `/scene-practice`
- `/world-elements`
- `/custom-task-builder`
- `/upcoming`
- `/settings`
- `/auth`

## Important Feature Notes

### Daily Tasks

- built-in tasks live in `src/data/tasks.ts`
- tasks are heavily customized per day
- custom tasks assigned to a day are merged into the daily flow
- task cards include timer, collapsible rules, and review sections

### Writing Analytics

- powered by saved scene drafts
- helper lives in `src/lib/writingAnalytics.ts`
- tabs:
  - `Overview`
  - `Style Analysis`
  - `Progress`

### Character Lab

- structured narrative character model
- seeded defaults remain:
  - `Kael`
  - `luna`
- reader panel is separate from editing

### Character Relationships

- graph-based relationship view
- draggable nodes
- zoom
- relationship strength + timeline entries

### Plot Builder

- three phases:
  - `Promise`
  - `Progress`
  - `Payoff`
- board plus side-panel workflow
- mobile uses a drawer for the editor/context view
- old memory note about a `Plot Builder Mounted` debug log is stale and should not be carried forward

### Scene Practice

- freeform scene editor
- prompt generation
- saved drafts
- export to PDF and `.docx`
- receives world element references through the local-only handoff key

### World Element Designer

- guided worldbuilding editor
- category and element driven
- can hand a world element into Scene Practice
- still logs `World engine mounted` in development

### Settings

- profile edit dialog
- password change dialog
- verification resend
- theme toggle
- workspace reset
- sign-out

## Storage Keys To Remember

Defined in `src/lib/storageKeys.ts`.

Main keys:

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

Local-only bridge key:

- `writeforge-scene-practice-world-element`

## Current Debug Mindset

- do not bypass `AuthContext`
- do not create a second Supabase client
- do not remove session gating from backend-facing helpers
- use `../errors.md` as the source of truth for the active auth/session issue

## Best Quick Re-Orientation Order

1. `src/App.tsx`
2. `src/contexts/AuthContext.tsx`
3. `src/contexts/WriteForgeDataContext.tsx`
4. `src/index.css`
5. `src/pages/AuthPage.tsx`
6. `src/pages/Dashboard.tsx`
7. `src/pages/SettingsPage.tsx`
8. `src/pages/PlotBuilder.tsx`
9. `src/pages/ScenePractice.tsx`
10. `src/components/tasks/WorldElementDesigner.tsx`
