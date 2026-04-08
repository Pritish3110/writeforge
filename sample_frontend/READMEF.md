# WriterZ Frontend

This directory contains the WriterZ frontend application.

For the full rebuild-level frontend spec, read:

- `../frontend.md`

For backend and integration details, read:

- `../backend.md`

For the active issue log, read:

- `../errors.md`

For the short handoff notes, read:

- `MEMORY.md`

## Quick Commands

```bash
cd frontend
npm install
npm run dev
npm run build
npm run test
npm run lint
```

## Stack

- Vite 5
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix
- Framer Motion
- Recharts
- Vitest

## Frontend Identity

- product name: `WriterZ`
- default tone: calm, editorial, dark-first
- primary fonts: `Inter` and `JetBrains Mono`
- favicon and in-app mark: `public/favicon.svg`
- startup loading screen: centered `WZ` hexagon animation

## Important Source Files

- `src/App.tsx`
  - provider stack, router, auth gating, loading overlay
- `src/index.css`
  - theme tokens, cursor rules, typography, utility classes
- `src/components/AppLayout.tsx`
  - shell layout
- `src/components/AppSidebar.tsx`
  - navigation, account block, theme toggle
- `src/pages/AuthPage.tsx`
  - auth screen and auth loading state
- `src/contexts/AuthContext.tsx`
  - centralized auth state
- `src/contexts/WriteForgeDataContext.tsx`
  - centralized app snapshot/state layer
- `src/lib/storageKeys.ts`
  - storage keys and snapshot shape
- `src/data/tasks.ts`
  - built-in daily writing drills

## Route Map

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

## Current Frontend Architecture

- `AuthContext` is the single source of auth truth.
- `WriteForgeDataContext` sits above the feature pages and exposes snapshot reads and writes.
- `ThemeContext` controls `dark` and `light`.
- `DeleteConfirmationProvider` standardizes destructive confirmations.
- the shell uses a collapsible sidebar and a narrow top header
- the app now uses the default system cursor again

## Testing

Tests live in `src/test/` and cover:

- task tracking
- task generation
- prompt engine
- world engine
- world element designer
- scene export
- custom task builder

## Practical Reading Order

If you are new to the frontend, open these in order:

1. `src/App.tsx`
2. `src/index.css`
3. `src/contexts/AuthContext.tsx`
4. `src/contexts/WriteForgeDataContext.tsx`
5. `src/pages/AuthPage.tsx`
6. `src/pages/Dashboard.tsx`
7. `src/pages/PlotBuilder.tsx`
8. `src/pages/ScenePractice.tsx`
9. `src/components/tasks/WorldElementDesigner.tsx`
10. `src/pages/SettingsPage.tsx`
