# WriteForge

WriteForge is a dark, neon-accented writing dashboard for structured creative practice. It combines daily writing drills, progress tracking, a character system, a lightweight knowledge base, and freeform scene drafting in a single local-first React app.

## Stack

- Vite 5
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix primitives
- Framer Motion
- Recharts for analytics
- localStorage for persistence
- Vitest and Playwright config present for testing

## Run Commands

```bash
npm install
npm run dev
npm run build
npm run test
```

## Product Overview

WriteForge is organized around a weekly writing-training loop:

- `Dashboard` shows today’s progress, streak, and seven-day activity.
- `Daily Tasks` contains the main training system with day-specific drills and timers.
- `Weekly Schedule` gives a week-at-a-glance progress view.
- `Analytics` summarizes streaks, categories, charts, and a simple activity heatmap.
- `Writing Analytics` analyzes saved writing sessions for word trends, consistency, and style heuristics.
- `Knowledge Base` acts like a small personal writing wiki.
- `Character Lab` stores, edits, reads, filters, pins, and reorders structured character profiles.
- `Character Relationships` visualizes cast dynamics with an interactive relationship graph.
- `Plot Builder` structures story beats into Promise, Progress, and Payoff with a board-plus-context workflow.
- `Scene Practice` is a freeform writing area with prompts, saved drafts, and export tools.
- `Custom Task Builder` lets users create, preview, save, duplicate, edit, and assign their own exercises to the week.
- `Settings` toggles theme and resets core progress data.
- `Upcoming Features` is a smaller roadmap screen that now excludes already shipped features.

## Current Key Features

### Daily Tasks

- Fully custom Monday-Sunday training data lives in `src/data/tasks.ts`.
- Every task has:
  - `prompt`
  - `steps`
  - `durationMinutes`
  - `importantRules`
  - `writingPrinciples`
  - `review`
- Monday-Sunday have already been rewritten into unique task logic with a strict training flow.
- Saturday tasks also contain optional `knowledgeTemplate` metadata for future writing-wiki expansion.
- Task cards use collapsible sections and smooth shared dropdown animation.
- User-created custom tasks assigned to a day now appear alongside the built-in Daily Tasks flow.

### Custom Task Builder

- Main route: `/custom-task-builder`
- Users can create custom writing drills with:
  - title
  - category
  - duration
  - prompt
  - drag-reorderable steps
  - toggleable important-rule bullets
  - day assignment
  - template flag
- Task cards support:
  - edit
  - duplicate
  - delete
  - preview mode
  - category color tagging
- An `Improve Prompt` button exists as an AI-assist placeholder with mock rewrite logic.
- Custom tasks are stored locally and feed into:
  - `Daily Tasks`
  - `Weekly Schedule`
  - dashboard totals
  - analytics category stats

### Character Lab

- Characters support:
  - required `Character Type`
  - structured narrative fields
  - dynamic personality trait blocks
  - dynamic contradiction blocks
  - theme split into lie-based and truth-based fields
- Default seeded characters:
  - `Kael`
  - `luna`
- `Kael` contains exact preloaded character architecture content.
- `luna` is currently a second seeded card that duplicates Kael’s full content for multi-card testing.
- Character cards now support:
  - search
  - type filtering
  - pin/unpin
  - move-to-top
  - drag-to-reorder via grip handle
  - separate edit action
  - separate read/view mode
- Full character viewing is no longer tied to edit mode.
- Multiple characters are handled with a dedicated reader panel below the card grid instead of inline expansion inside the grid.
- Reader subsections are collapsible and default closed.

### Character Relationships

- Main route: `/character-relationships`
- Uses Character Lab data as graph nodes and local relationship records as edges.
- Includes:
  - draggable character nodes
  - zoomable relationship graph
  - click-to-view mini profile
  - relationship type color coding
  - add relationship form
  - strength slider
  - timeline/evolution entries
- Supported relationship types:
  - `Ally`
  - `Enemy`
  - `Mentor`
  - `Family`
  - `Unknown`

### Plot Builder

- Main route: `/plot-builder`
- Uses a three-column board:
  - `Promise`
  - `Progress`
  - `Payoff`
- Uses a wider board plus contextual detail panel flow instead of a stacked planning form.
- Plot points support:
  - title
  - description
  - characters involved
  - stakes
  - conflict level
  - linked scenes
  - foreshadowing links
- Editing flow includes:
  - create from the page header or a phase column
  - click a plot card to open its detail editor
  - edit in the right-side context panel on desktop or a drawer on mobile
- Current stability note:
  - the page is running in a safe mode while the route is being stabilized
  - drag-and-drop reordering is temporarily paused
- Context panel surfaces:
  - conflict distribution
  - character usage
  - foreshadowing overview
  - full selected-beat editor

### Character Data Shape

Character data is stored in browser storage and normalized into this structure:

```ts
type Character = {
  id: string;
  name: string;
  type: "Main Character" | "Side Character" | "Activity Character" | "";
  logline: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
  truth: string;
  designing_principle: string;
  moral_problem: string;
  worthy_cause: string;
  personality_traits: Array<{
    title: string;
    description: string;
  }>;
  theme: {
    lie_based: string;
    truth_based: string;
  };
  contradictions: Array<{
    left: string;
    right: string;
    description: string;
  }>;
  pinned: boolean;
  order: number;
};
```

### Knowledge Base

- Local editable rule cards with accordion behavior.
- Default sections include:
  - core writing rules
  - scene rules
  - pyramid of abstraction
  - emotion rules
  - dialogue rules

### Scene Practice

- Generates prompts from `WRITING_PROMPTS` in `src/data/tasks.ts`.
- Tracks live word count.
- Saves drafts locally with timestamp and word count.
- Exports the current writing session as:
  - PDF
  - Google Docs-ready `.docx`

### Analytics and Tracking

- Task completion records are stored by date and task id.
- Dashboard and analytics derive:
  - today completion
  - weekly totals
  - streaks
  - category stats
  - seven-day chart data
  - simple 28-day heatmap

### Writing Analytics

- Main route: `/writing-analytics`
- Powered by saved drafts from `Scene Practice` local storage.
- Includes:
  - total words written
  - sessions completed
  - estimated average session length
  - words-per-day chart
  - session consistency heatmap
  - writing streak tracking
  - average sentence length
  - dialogue vs narration ratio
  - most-used words cloud
  - repetition detection
  - clarity score heuristic
  - over-description detection
  - action density
- Tab layout:
  - `Overview`
  - `Style Analysis`
  - `Progress`

### Theme and Branding

- Title is `WriteForge`.
- Favicon uses the PenTool logo via `public/favicon.svg`.
- Dark and light themes are supported through `ThemeContext`.
- App startup includes a centered Framer Motion loading screen built around a neon hexagon SVG with `WF`.
- The visual system intentionally stays consistent across pages:
  - dark surfaces
  - purple/cyan/pink neon accents
  - glow borders
  - mono labels
  - card-based layout

## Folder Structure

```text
retroflow-writer/
├── index.html
├── package.json
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── postcss.config.js
├── vitest.config.ts
├── playwright.config.ts
├── README.md
├── MEMORY.md
├── public/
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── App.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── NavLink.tsx
│   │   └── ui/
│   │       ├── shadcn/Radix primitives used across the app
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── collapsible.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── select.tsx
│   │       ├── sidebar.tsx
│   │       ├── textarea.tsx
│   │       └── many additional generated primitives
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── data/
│   │   └── tasks.ts
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   ├── useCustomTasks.ts
│   │   ├── useTaskTracking.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── characterRelationships.ts
│   │   ├── plotBuilder.ts
│   │   ├── writingAnalytics.ts
│   │   ├── customTasks.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Analytics.tsx
│   │   ├── CharacterLab.tsx
│   │   ├── CharacterRelationships.tsx
│   │   ├── CustomTaskBuilder.tsx
│   │   ├── DailyTasks.tsx
│   │   ├── Dashboard.tsx
│   │   ├── KnowledgeBase.tsx
│   │   ├── NotFound.tsx
│   │   ├── PlotBuilder.tsx
│   │   ├── ScenePractice.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── UpcomingFeatures.tsx
│   │   ├── WeeklySchedule.tsx
│   │   └── WritingAnalytics.tsx
│   └── test/
│       ├── example.test.ts
│       └── setup.ts
├── bun.lock
├── bun.lockb
└── playwright-fixture.ts
```

## Important Files

### App Shell

- `src/main.tsx`
  - React entrypoint.
- `src/App.tsx`
  - Route registration.
- `src/components/AppLayout.tsx`
  - Sidebar + page frame.
- `src/components/AppSidebar.tsx`
  - Main navigation and theme toggle.

### Data and Logic

- `src/data/tasks.ts`
  - central daily task definitions
  - day list
  - writing prompts
  - future wiki metadata on selected tasks
- `src/hooks/useLocalStorage.ts`
  - generic localStorage hook
- `src/hooks/useTaskTracking.ts`
  - task completion, streak, weekly stats, category stats

### Page-Level Features

- `src/pages/Dashboard.tsx`
  - progress overview and charts
- `src/pages/DailyTasks.tsx`
  - daily training UI, collapsibles, timers, completion state
- `src/pages/CharacterLab.tsx`
  - structured character CRUD and reader system
- `src/pages/CharacterRelationships.tsx`
  - interactive character graph and relationship management
- `src/pages/PlotBuilder.tsx`
  - Promise → Progress → Payoff board and plot-point form
- `src/pages/KnowledgeBase.tsx`
  - editable writing wiki cards
- `src/pages/ScenePractice.tsx`
  - freeform drafting and saved scenes
- `src/pages/WritingAnalytics.tsx`
  - draft-driven writing insight dashboard
- `src/pages/SettingsPage.tsx`
  - theme and reset behavior
- `src/lib/writingAnalytics.ts`
  - word trends, streaks, and style-analysis heuristics

## Persistence Model

The app is intentionally local-first. Current storage keys include:

- `writeforge-theme`
- `writeforge-tasks`
- `writeforge-characters`
- `writeforge-character-seed-version`
- `writeforge-character-relationships`
- `writeforge-plot-builder`
- `writeforge-drafts`
- `writeforge-knowledge-base`
- `writeforge-custom-tasks`

Reset behavior currently clears:

- tasks
- characters
- character seed version
- drafts

Theme and knowledge-base content currently persist unless explicitly removed.

## Design Constraints

This app has a strong continuity requirement. Most recent changes were made under these rules:

- keep the existing dark + neon glow theme
- do not redesign page structure unless behavior requires it
- preserve spacing, typography, and card language
- match newly added UI to the existing system

That is especially important in:

- `DailyTasks`
- `CharacterLab`

## Testing / Verification Notes

- `npm run build` currently succeeds.
- Vite still emits a non-blocking chunk-size warning for the main JS bundle.
- `Browserslist` also warns that `caniuse-lite` is old, but this does not block builds.

## Suggested Next Areas

- Character relationships and cross-links
- Wiki storage for worldbuilding systems
- Export/import for local data
- Better chunk splitting for bundle size
- Stronger automated tests around localStorage-heavy pages
