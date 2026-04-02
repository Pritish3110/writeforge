# WriteForge Memory

This file is a quick handoff reference for future chats. It is intentionally shorter and more operational than `README.md`.

## Project Identity

- Project name: `WriteForge`
- Stack: Vite + React + TypeScript + Tailwind + shadcn/ui
- Style constraint: preserve the existing dark theme, neon glow accents, spacing rhythm, and card system
- User strongly prefers functionality improvements without visual redesign

## App Routes

- `/` -> Dashboard
- `/daily-tasks` -> Daily Tasks
- `/weekly-schedule` -> Weekly Schedule
- `/analytics` -> Analytics
- `/writing-analytics` -> Writing Analytics
- `/knowledge-base` -> Knowledge Base
- `/character-lab` -> Character Lab
- `/character-relationships` -> Character Relationships
- `/plot-builder` -> Plot Builder
- `/scene-practice` -> Scene Practice
- `/custom-task-builder` -> Custom Task Builder
- `/settings` -> Settings
- `/upcoming` -> Upcoming Features

## Important Current Customizations

### Daily Tasks

- `src/data/tasks.ts` has been fully rewritten Monday-Sunday.
- Every task now has unique:
  - prompt
  - steps
  - important rules
  - writing principles
  - review section
- Monday-Sunday timing/content was custom-tuned by day.
- Saturday includes optional `knowledgeTemplate` metadata for future wiki expansion.
- `src/pages/DailyTasks.tsx` renders task-specific content directly and no longer depends on shared generic rule fallbacks.
- `Daily Tasks` now also includes user-created custom tasks assigned to the selected day.

### Writing Analytics

- Main file: `src/pages/WritingAnalytics.tsx`
- Shared analysis helper: `src/lib/writingAnalytics.ts`
- Powered by `writeforge-drafts` from Scene Practice.
- Includes:
  - total words written
  - sessions completed
  - estimated average session length
  - words-per-day chart
  - consistency heatmap
  - streak tracking
  - average sentence length
  - dialogue vs narration ratio
  - word cloud
  - repetition detection
  - clarity score
  - over-description detection
  - action density
- Page is organized into three tabs:
  - `Overview`
  - `Style Analysis`
  - `Progress`

### Custom Task Builder

- Main file: `src/pages/CustomTaskBuilder.tsx`
- Shared storage/model helpers:
  - `src/hooks/useCustomTasks.ts`
  - `src/lib/customTasks.ts`
- Users can create custom writing drills with:
  - title
  - category
  - duration
  - prompt
  - reorderable steps
  - toggleable important-rule bullets
  - day assignment
  - template flag
- Task cards support:
  - edit
  - duplicate
  - delete
  - preview mode
  - category color tags
- `Improve Prompt` is currently placeholder/mock logic only.
- Custom tasks feed into:
  - `Daily Tasks`
  - `Weekly Schedule`
  - dashboard totals
  - analytics category stats

### Character Lab

- Main file: `src/pages/CharacterLab.tsx`
- Character form supports:
  - required `Character Type`
  - structured additional information
  - dynamic traits
  - dynamic contradictions
  - theme split into lie/truth fields
- Default seeded characters:
  - `Kael`
  - `luna`
- `luna` intentionally duplicates Kael’s full content to test multiple-card behavior.
- Kael’s seeded content was requested to remain word-for-word.
- Character Lab now has:
  - search
  - type filtering
  - separate reader mode
  - pin/unpin
  - move-to-top
  - drag reorder
- Full profile is shown in a dedicated reader panel below the card grid.
- Reader subsections are collapsible and currently default closed.
- Old inline grid-expansion behavior was replaced because it became awkward with multiple cards.

### Character Relationships

- Main file: `src/pages/CharacterRelationships.tsx`
- Shared relationship helper: `src/lib/characterRelationships.ts`
- Uses Character Lab characters as graph nodes and stored relationships as graph edges.
- Supports:
  - draggable nodes
  - zoom controls
  - click-to-view mini profile
  - color-coded relationship types
  - relationship strength slider
  - timeline/evolution entries
- Relationship types:
  - `Ally`
  - `Enemy`
  - `Mentor`
  - `Family`
  - `Unknown`

### Plot Builder

- Main file: `src/pages/PlotBuilder.tsx`
- Shared plot helper: `src/lib/plotBuilder.ts`
- Uses a board with three columns:
  - `Promise`
  - `Progress`
  - `Payoff`
- The page now uses a board-plus-context-panel workflow instead of a stacked editor layout.
- Plot points can include:
  - title
  - description
  - characters involved
  - stakes
  - conflict level
  - linked scenes
  - foreshadowing links
- The current safe editing flow is:
  - create from the header or a phase column
  - click a card to edit it
  - use the right-side panel on desktop or drawer on mobile
- Important current note:
  - drag-and-drop is temporarily disabled while the route is being stabilized
  - there is a temporary `console.log("Plot Builder Mounted")` debug log in the page
- Context panel includes:
  - conflict distribution
  - character usage
  - foreshadowing overview
  - full beat editor

### Scene Practice

- Main file: `src/pages/ScenePractice.tsx`
- Shared export helper: `src/lib/sceneExport.ts`
- Supports:
  - prompt generation
  - local draft saving
  - live word count
  - export to PDF
  - export to Google Docs-ready `.docx`

### Branding / Shell

- `index.html` title is `WriteForge`
- Favicon uses `public/favicon.svg` based on the PenTool logo
- `public/favicon.ico` was intentionally not overwritten
- Startup loading overlay now lives in `src/components/LoadingScreen.tsx` and is mounted from `src/App.tsx`
- Loading screen now uses a centered neon hexagon SVG with `WF`
- Avoid reintroducing top-left logo travel or wide-screen position-jump animation

### Upcoming Features

- `src/pages/UpcomingFeatures.tsx` should only list genuinely unshipped roadmap items.
- Cards for shipped features like Writing Analytics and Scene export were removed and should stay removed unless the feature regresses.

### Animations

- Shared collapsible animation was smoothed earlier
- Existing dropdown/collapsible behavior should stay ease-in-out and visually consistent
- Avoid adding abrupt snap-open interactions

## Local Storage Keys

- `writeforge-theme`
- `writeforge-tasks`
- `writeforge-characters`
- `writeforge-character-seed-version`
- `writeforge-character-relationships`
- `writeforge-plot-builder`
- `writeforge-drafts`
- `writeforge-knowledge-base`
- `writeforge-custom-tasks`

## Reset Behavior

`src/pages/SettingsPage.tsx` currently clears:

- tasks
- characters
- character seed version
- character relationships
- plot builder
- custom tasks
- drafts

It does not currently clear:

- theme
- knowledge base

## Files To Check First For Future Work

- `src/pages/CharacterLab.tsx`
- `src/data/tasks.ts`
- `src/pages/CustomTaskBuilder.tsx`
- `src/pages/CharacterRelationships.tsx`
- `src/pages/PlotBuilder.tsx`
- `src/pages/WritingAnalytics.tsx`
- `src/hooks/useCustomTasks.ts`
- `src/lib/customTasks.ts`
- `src/lib/characterRelationships.ts`
- `src/lib/plotBuilder.ts`
- `src/lib/writingAnalytics.ts`
- `src/pages/DailyTasks.tsx`
- `src/hooks/useTaskTracking.ts`
- `src/pages/SettingsPage.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/LoadingScreen.tsx`
- `tailwind.config.ts`
- `index.html`

## Practical Notes For Future Chats

- The user is very sensitive to UI drift.
- Match newly added controls to the current card/glow system instead of inventing a new visual pattern.
- Prefer extending logic and structure, not redesigning layouts.
- Character Lab is now both a form system and a readable reference system.
- If a future task touches Kael, preserve the exact seeded wording unless the user explicitly asks to rewrite the content.

## Verification Status

- `npm run build` succeeds after the latest Plot Builder stabilization and route cleanup.
- `npm run test` succeeds.
- There is still a non-blocking Vite chunk-size warning.
