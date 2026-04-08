# WriterZ Frontend Reference

This document is the rebuild guide for the current frontend. It is written so the same interface, structure, interaction model, and client-side logic can be recreated in another codebase without referring back to this repository.

Scope rules for this file:
- Frontend only
- No backend implementation details
- No Supabase details
- No error-troubleshooting material

## 1. Frontend Identity

### Product Name

- Product name: `WriterZ`

### Frontend Personality

- Calm editorial writing workspace
- Minimal and dark-first by default
- Low-noise interface with restrained motion
- A mix of writing-tool seriousness and subtle neon accents
- Cards, dividers, and spacing carry most of the visual structure instead of heavy shadows or decorative chrome

### Core Frontend Goals

- Keep many writing tools inside one shell
- Make navigation stable and predictable
- Keep forms readable and spacious
- Preserve a quiet writing-focused feel rather than a flashy SaaS dashboard feel
- Make dense writing interfaces usable on both desktop and mobile

## 2. Technology And Runtime Shape

### Stack

- Vite 5
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui primitives built on Radix
- Framer Motion
- Recharts
- Vitest
- Playwright config present

### Important Runtime Files

- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/App.css`

### Entry Flow

1. `index.html` loads Google fonts and mounts `#root`.
2. `src/main.tsx` renders `<App />`.
3. `src/App.tsx` mounts providers, router, toast systems, and the intro loading overlay.
4. `AppRoutes` decides whether the user sees auth or the main application shell.

### Provider Order

The provider order matters and should be preserved:

1. `QueryClientProvider`
2. `AuthProvider`
3. `WriteForgeDataProvider`
4. `ThemeProvider`
5. `DeleteConfirmationProvider`
6. `TooltipProvider`
7. `BrowserRouter`

## 3. Source Folder Structure

Use this as the source-oriented rebuild map. Generated output like `dist/` and installed packages are intentionally omitted from the main structure below.

```text
frontend/
  .env
  .env.example
  components.json
  index.html
  package.json
  README.md
  MEMORY.md
  public/
    cursor-pen.png
    cursor-pen-pointer.svg
    cursor-pen.svg
    favicon.ico
    favicon.svg
    placeholder.svg
    robots.txt
    things to edit
  src/
    App.css
    App.tsx
    index.css
    main.tsx
    vite-env.d.ts
    components/
      AppLayout.tsx
      AppSidebar.tsx
      DeleteConfirmationProvider.tsx
      LoadingScreen.tsx
      NavLink.tsx
      auth/
        AuthField.tsx
        PasswordStrengthMeter.tsx
      brand/
        BrandMark.tsx
      illustrations/
        OpenBookIllustration.tsx
      profile/
        InlineStat.tsx
        ProfileStatCard.tsx
        SettingsSection.tsx
      shared/
        AuroraBackdrop.tsx
      taskSharing/
        TaskExportModal.jsx
        TaskImportModal.jsx
        TaskSharingPanel.jsx
        TaskTemplateCard.jsx
      tasks/
        WorldElementDesigner.tsx
      ui/
        ...shadcn-style primitives
    contexts/
      AuthContext.tsx
      ThemeContext.tsx
      WriteForgeDataContext.tsx
    data/
      promptEngine.ts
      tasks.ts
      worldEngine.ts
    hooks/
      useCustomTasks.ts
      useLocalStorage.ts
      use-mobile.tsx
      useTaskTracking.ts
      use-toast.ts
    lib/
      characterRelationships.ts
      customTasks.ts
      identity.ts
      plotBuilder.ts
      promptEngine.ts
      sceneExport.ts
      storageKeys.ts
      taskGenerator.ts
      taskTracking.ts
      utils.ts
      worldElements.ts
      writeforgeStorage.ts
      writingAnalytics.ts
      supabase/
        client.ts
        writeforgeBackend.ts
    pages/
      Analytics.tsx
      AuthPage.tsx
      CharacterLab.tsx
      CharacterRelationships.tsx
      CustomTaskBuilder.tsx
      DailyTasks.tsx
      Dashboard.tsx
      KnowledgeBase.tsx
      NotFound.tsx
      PlotBuilder.tsx
      ScenePractice.tsx
      SettingsPage.tsx
      UpcomingFeatures.tsx
      WeeklySchedule.tsx
      WorldElementDesignerPage.tsx
      WritingAnalytics.tsx
    services/
      writeforgeDataService.ts
      writeforgeEnvironment.ts
    test/
      customTaskBuilder.test.tsx
      example.test.ts
      promptEngine.test.ts
      sceneExport.test.ts
      setup.ts
      taskGenerator.test.ts
      taskTracking.test.ts
      worldElementDesigner.test.tsx
      worldEngine.test.ts
```

## 4. Branding, Title, Favicon, And Visual Assets

### Browser Metadata

From `frontend/index.html`:

- `<html lang="en" class="dark">`
- document title: `WriterZ`
- favicon source: `/favicon.svg`
- meta description: calm writing workspace messaging
- Open Graph and Twitter cards exist

### Fonts

- Primary font: `Inter`
- Monospace utility font: `JetBrains Mono`

Usage rules:
- Body copy uses `Inter`
- Headings also use `Inter`, but with tighter letter spacing
- Labels, telemetry, UI metadata, progress labels, and system-like text often use `JetBrains Mono`

### Logo Mark

Primary mark source:

- `frontend/public/favicon.svg`

Logo description:

- Stylized pen-tool / pen-nib style mark
- Muted gray stroke
- Technical/editorial rather than playful
- Used in browser favicon and in-app brand block

### Brand Component

`src/components/brand/BrandMark.tsx`

- mark container: `h-9 w-9`
- rounded square: `rounded-xl`
- bordered tile: `border border-border bg-card`
- inner image: `/favicon.svg`
- icon size: `h-5 w-5`
- wordmark text: `WriterZ`
- wordmark hidden when sidebar collapses

### Other Public Assets

- `favicon.ico`
  - legacy browser fallback
- `placeholder.svg`
  - generic placeholder asset
- `cursor-pen.png`
- `cursor-pen.svg`
- `cursor-pen-pointer.svg`
  - still present as assets, but custom cursor behavior is no longer active
- `robots.txt`
- `public/things to edit`
  - product backlog / scratchpad, not an execution file

## 5. Global Visual System

### Theme Model

- Default theme is dark
- Only two themes exist: `dark` and `light`
- Theme is persisted in the frontend state layer under `writeforge-theme`

### Color Tokens

The frontend is driven by CSS variables in `src/index.css`.

Key dark-mode values:

- background: `240 5% 7%`
- foreground: `240 8% 92%`
- card: `240 5% 8%`
- card-hover: `240 5% 9.8%`
- secondary: `240 5% 13%`
- muted: `240 5% 12%`
- muted-foreground: `240 5% 64%`
- border: `0 0% 100% / 0.06`
- input: `0 0% 100% / 0.06`
- neon-purple: `252 24% 74%`
- neon-cyan: `196 24% 71%`
- neon-pink: `350 24% 73%`

Key light-mode values:

- background: `30 20% 98%`
- foreground: `240 10% 12%`
- card: `0 0% 100%`
- card-hover: `30 16% 96%`
- secondary: `240 8% 95%`
- muted: `240 8% 96%`
- muted-foreground: `240 6% 45%`
- border: `240 8% 84%`
- neon-purple: `252 22% 46%`
- neon-cyan: `198 26% 42%`
- neon-pink: `350 22% 45%`

### Typography Rules

- Body tracking: `-0.01em`
- Headings tracking: `-0.03em`
- Many eyebrow labels use uppercase mono text with expanded letter spacing
- Chart tooltips and some metrics intentionally use `JetBrains Mono`

### Radius System

- Global CSS radius token: `0.75rem`
- Card radius: `12px`
- Button radius: `10px`
- Input radius: `10px`
- Brand tile radius: `12px`

### Cursor Rules

Current cursor behavior is standard system behavior:

- `body { cursor: default; }`
- buttons, links, summary, role buttons, label-for controls: `cursor: pointer`
- inputs, textareas, selects: `cursor: text`

No custom cursor overlay should be reintroduced if the goal is to match the current UI.

### Motion Rules

Motion is limited and functional:

- intro loading overlay fade and scale animation
- accordion / collapsible transitions
- sidebar/context panel subtle expansion
- hover state border/background changes
- active button scale `0.98`
- no heavy parallax or ornamental page transitions

## 6. Layout System

### App Shell

Defined by `src/components/AppLayout.tsx`.

Structure:

- full-height flex shell
- left sidebar
- right content column
- slim top header with sidebar trigger
- scrollable main content area

Important layout values:

- root: `min-h-screen flex w-full`
- header height: `h-12`
- header padding: `px-4`
- main content padding: `p-6`
- main column: `flex-1 flex flex-col min-w-0`

### Sidebar

Defined by `src/components/AppSidebar.tsx`.

Behavior:

- collapsible to icon-only mode
- navigation grouped under `Navigation`
- brand at top
- account/status block and sign-out at bottom when authenticated
- theme toggle at bottom

Navigation order:

1. Dashboard
2. Daily Tasks
3. Weekly Schedule
4. Analytics
5. Writing Analytics
6. Knowledge Base
7. Character Lab
8. Character Relationships
9. Plot Builder
10. Scene Practice
11. World Element Designer
12. Custom Task Builder
13. Upcoming Features
14. Profile

Bottom UI:

- signed-in badge card when auth is active
- sign-out button
- theme toggle

### Shared Content Width Rhythm

The app avoids full-bleed pages for most writing tools.

Common width caps:

- `max-w-3xl`
- `max-w-4xl`
- `max-w-5xl`
- `max-w-6xl`

This keeps text-based workflows readable and prevents dashboards from feeling too stretched.

## 7. Shared UI Primitive Defaults

### Cards

Defined in `src/components/ui/card.tsx`.

- radius: `12px`
- border only, no default shadow
- hover behavior: border and background shift
- standard header padding: `p-5`
- standard content padding: `p-5 pt-0`
- standard footer padding: `p-5 pt-0`

### Buttons

Defined in `src/components/ui/button.tsx`.

- default height: `44px`
- radius: `10px`
- horizontal padding: `px-4`
- text size: `14px`
- active scale: `0.98`
- transition duration: `150ms`

Variants:

- `default`
- `destructive`
- `outline`
- `secondary`
- `ghost`
- `link`

Sizes:

- `default`
- `sm`
- `lg`
- `icon`

### Inputs

Defined in `src/components/ui/input.tsx`.

- height: `44px`
- radius: `10px`
- padding: `px-3 py-2`
- transparent background
- subtle border only

### Utility Surface Classes

From `src/index.css`:

- `.glow-card`
  - mostly hover polish, not an actual glow effect anymore
- `.glow-border`
  - standardized subtle border hover treatment
- `.font-mono-heading`
- `.text-neon-purple`
- `.text-neon-cyan`
- `.text-neon-pink`

## 8. Intro Loading Screen

Defined in `src/components/LoadingScreen.tsx`.

### Behavior

- full-screen fixed overlay
- displayed at app startup
- total visible duration: `2000ms`
- fade-out duration: `300ms`
- uses `AnimatePresence`

### Layout

- centered vertically and horizontally
- background uses `bg-background`
- text centered
- padding: `px-6`

### Mark

- custom SVG, not the favicon
- outlined hexagon
- `WZ` text centered inside
- stroke uses foreground alpha
- icon size responds to screen aspect ratio

### Subtitle

- text: `Loading WriterZ...`
- uppercase mono styling
- pulsing opacity loop until completion

### Important Rebuild Rule

Do not replace this with a generic spinner if the goal is parity with the current frontend. The current intro is a centered, restrained editorial mark animation.

## 9. Auth Screen Visual Spec

Defined primarily in `src/pages/AuthPage.tsx`.

### Layout

- split-screen desktop layout
- single-column stack on smaller screens
- built on `AuroraBackdrop`

Grid:

- desktop columns: `1.08fr / 0.92fr`

Left section padding:

- mobile: `px-6 py-8`
- small: `sm:px-10 sm:py-10`
- large: `lg:px-14 lg:py-14`

Right section padding:

- mobile: `px-6 py-10`
- small: `sm:px-10`
- large: `lg:px-14`

### Backdrop

`src/components/shared/AuroraBackdrop.tsx`

Layers:

- subtle top radial glow
- low-opacity 36px grid
- low-opacity dotted texture

This is one of the few decorative backgrounds in the frontend.

### Left Column Content

- brand mark at top
- editorial product copy
- large `WriterZ` heading
- OpenBook illustration card
- three editorial notes:
  - Safe migration
  - Synced workspace
  - Controlled fallback

### Right Column Content

- centered auth card
- login / signup toggle flow
- validation inline
- stronger loading state copy than a typical auth form

### Auth Loading State

Separate screen copy exists for:

- session check
- sign in
- sign up
- sync
- migration

## 10. Route Map

Current route set from `src/App.tsx`:

- `/` -> `Dashboard`
- `/daily-tasks` -> `DailyTasks`
- `/weekly-schedule` -> `WeeklySchedule`
- `/analytics` -> `Analytics`
- `/writing-analytics` -> `WritingAnalytics`
- `/knowledge-base` -> `KnowledgeBase`
- `/character-lab` -> `CharacterLab`
- `/character-relationships` -> `CharacterRelationships`
- `/plot-builder` -> `PlotBuilder`
- `/scene-practice` -> `ScenePractice`
- `/world-elements` -> `WorldElementDesignerPage`
- `/custom-task-builder` -> `CustomTaskBuilder`
- `/upcoming` -> `UpcomingFeatures`
- `/settings` -> `SettingsPage`
- `/auth` -> `AuthPage`
- `*` -> `NotFound`

## 11. Page-By-Page Frontend Spec

### Dashboard

File:

- `src/pages/Dashboard.tsx`

Layout:

- wrapper: `mx-auto max-w-4xl space-y-8`

Top block:

- greeting line: `Good morning/afternoon/evening, {username}`
- title: `Dashboard`
- day line: `Today is {dayName} - let's make it count.`

Username fallback:

1. `user.user_metadata.display_name`
2. email prefix before `@`
3. `"Writer"`

Main blocks:

- three summary cards:
  - Today
  - Streak
  - This Week
- one 7-day bar chart card
- one full-width CTA button

Important details:

- CTA text: `Start Today's Session ->`
- uses icons `CheckCircle2`, `Flame`, `Zap`
- chart uses subdued UI with mono tooltip styling

### Daily Tasks

File:

- `src/pages/DailyTasks.tsx`

Layout:

- wrapper: `max-w-3xl mx-auto space-y-6`

Main behaviors:

- day picker buttons for Monday through Sunday
- selected day can differ from the current day
- progress summary at top
- task cards are collapsible
- each card includes:
  - checkbox
  - title
  - category
  - optional custom/template badges
  - embedded timer
  - prompt panel
  - nested rules and steps accordion
  - review accordion

Task timer behavior:

- per-card
- start/pause
- reset
- minute:second mono display

Data source rules:

- built-in daily tasks come from `src/data/tasks.ts`
- user-created custom tasks are merged into the selected day

### Weekly Schedule

File:

- `src/pages/WeeklySchedule.tsx`

Layout:

- wrapper: `max-w-4xl mx-auto space-y-6`

Blocks:

- three summary cards:
  - completed this week
  - current streak
  - longest streak
- weekly progress bar
- day cards for the current week

Each day card:

- shows day name
- shows `completed/total`
- lists tasks with completed or incomplete icon

### Analytics

File:

- `src/pages/Analytics.tsx`

Layout:

- wrapper: `max-w-4xl mx-auto space-y-6`

Blocks:

- streak summary cards
- line chart for 7-day completion rate
- category bar chart
- 28-day activity heatmap

Visual notes:

- neon accents are strongest here
- charts stay minimal and card-contained
- tooltips use mono font

### Writing Analytics

File:

- `src/pages/WritingAnalytics.tsx`

Layout:

- empty state: `max-w-4xl`
- populated state: `max-w-6xl`

Entry states:

- empty state with CTA to Scene Practice
- populated state with tabs

Tabs:

- `Overview`
- `Style Analysis`
- `Progress`

Metrics and analysis include:

- total words written
- sessions completed
- average session length
- words per day
- current and longest streak
- dialogue vs narration ratio
- consistency heatmap
- average sentence length
- repetition indicators
- clarity score
- top words cloud
- action density and other style heuristics

### Knowledge Base

File:

- `src/pages/KnowledgeBase.tsx`

Layout:

- wrapper: `max-w-3xl mx-auto space-y-6`

Structure:

- accordion of editable sections
- default seeded sections for writing principles
- each section can:
  - expand
  - edit title
  - edit notes
  - delete
- add-new-section button spans full width

Editing behavior:

- line-based bullet storage
- one textarea line per item when editing

### Character Lab

File:

- `src/pages/CharacterLab.tsx`

Role:

- structured character creation, editing, ordering, filtering, and reading

Seeded defaults:

- `Kael`
- `luna`

Character data shape includes:

- `name`
- `type`
- `logline`
- `ghost`
- `lie`
- `want`
- `need`
- `truth`
- `designing_principle`
- `moral_problem`
- `worthy_cause`
- `personality_traits[]`
- `theme.lie_based`
- `theme.truth_based`
- `contradictions[]`
- `pinned`
- `order`

UI behavior:

- search
- type filter
- create character
- edit character
- delete character
- pin/unpin
- move to top
- drag reorder
- separate read panel below the grid
- collapsible subsections inside the profile reader

### Character Relationships

File:

- `src/pages/CharacterRelationships.tsx`

Role:

- visual graph of character relationships

Graph characteristics:

- SVG graph surface
- default circular layout
- draggable nodes
- zoom control
- selectable character detail panel

Relationship form supports:

- character A
- character B
- relationship type
- description
- strength
- timeline entries

Relationship types:

- `Ally`
- `Enemy`
- `Mentor`
- `Family`
- `Unknown`

Tone labels by strength:

- `Fragile`
- `Developing`
- `Strong`
- `Core`

### Plot Builder

File:

- `src/pages/PlotBuilder.tsx`

Role:

- three-phase board for story structure plus a context/editor panel

Phases:

- `Promise`
- `Progress`
- `Payoff`

Layout pattern:

- board view
- context sidebar on desktop
- drawer on mobile

Key editing data:

- phase
- title
- description
- character links
- scene links
- stakes
- conflict level
- foreshadowing links

Important UX details:

- heavily guided workflow
- accordion sections inside the editor
- summary mode vs draft mode in sidebar
- visual badges use mono metadata styling
- drag state exists, but editing is centered around selecting a beat and using the side panel

### Scene Practice

File:

- `src/pages/ScenePractice.tsx`

Role:

- long-form writing area with prompt generation, draft persistence, and export

Scene types:

- `Main Story Scene`
- `Side Scene`
- `Cool Scene`
- `Activity Scene`

Capabilities:

- freeform text editor
- prompt generation
- tone selection
- story phase selection
- character selection
- surprise mode
- draft save/update
- draft grouping by scene type
- export dialog
- PDF export
- `.docx` export for Google Docs-friendly workflows

Important frontend-only interaction:

- world element references can be handed into Scene Practice through a local-only storage bridge
- this lets worldbuilding send a scene seed into the writing editor without changing the scene page layout

### World Element Designer

Files:

- `src/pages/WorldElementDesignerPage.tsx`
- `src/components/tasks/WorldElementDesigner.tsx`

Role:

- structured worldbuilding tool

Top-level page:

- wrapper: `max-w-4xl mx-auto space-y-6`
- includes an error boundary

Designer behavior:

- category picker
- element picker
- title auto-suggestion
- prompt generation
- prompt lock toggle
- five guided writing sections
- completion progress
- save and edit existing records
- delete existing records
- grouped history by category and element

World sections:

1. Core Concept
2. Mechanics
3. Impact
4. Trade-offs
5. Story Use

Important UX detail:

- can send a world element reference into Scene Practice

### Custom Task Builder

File:

- `src/pages/CustomTaskBuilder.tsx`

Role:

- create and maintain user-authored writing drills

Capabilities:

- create new task
- edit existing task
- duplicate
- delete
- preview before saving
- reorder steps
- toggle important rules
- assign category
- assign duration
- assign day
- mark as template
- generate a draft task suggestion
- task sharing panel

Preview card includes:

- title
- category badge
- template badge
- assigned day
- session length card
- prompt block
- step-by-step block
- important rules block

### Settings / Profile

File:

- `src/pages/SettingsPage.tsx`

Role:

- account and workspace control center

Main sections:

- profile summary
- edit profile dialog
- password change dialog
- email verification controls
- theme controls
- workspace/sync status
- manual migration status surfaces
- reset workspace data
- sign out

Notable frontend details:

- avatar upload is supported from the UI
- avatar image is compressed into a client-side data URL flow with a small size expectation
- profile display uses initials fallback
- destructive flows go through the shared delete confirmation provider

### Upcoming Features

File:

- `src/pages/UpcomingFeatures.tsx`

Layout:

- wrapper: `max-w-5xl mx-auto space-y-6`
- responsive grid of roadmap cards

Current cards:

- AI Writing Coach
- Daily Prompt Generator
- Writing Streak Rewards
- Task Sharing
- Mood-Based Suggestions
- Voice-to-Text Mode
- Distraction-Free Focus
- Theme Thread Map

### NotFound

File:

- `src/pages/NotFound.tsx`

Purpose:

- fallback route for unknown paths

## 12. Frontend State Architecture

This section intentionally covers only client-side state responsibilities.

### AuthContext

File:

- `src/contexts/AuthContext.tsx`

Role:

- central source of auth state for the frontend

State exposed:

- `user`
- `loading`
- `pendingAuthAction`
- derived identity values like display name, bio, avatar, email, verification status

Actions exposed:

- `signIn`
- `signUp`
- `signOut`
- `refreshUser`
- `updateProfile`
- `changePassword`
- `resendVerificationEmail`
- `setUser`

Important rebuild rule:

- components should consume `useAuth()` instead of each component creating its own auth restore logic

### WriteForgeDataContext

File:

- `src/contexts/WriteForgeDataContext.tsx`

Role:

- owns the frontend snapshot of app data
- mediates storage reads and writes
- exposes booting, syncing, migrating, and ready statuses
- provides the frontend-friendly `getItem`, `setItem`, `removeItem`, and reset helpers

This is the main client-side data context for features like tasks, drafts, world elements, plot points, characters, and knowledge sections.

### ThemeContext

File:

- `src/contexts/ThemeContext.tsx`

Role:

- stores `dark` or `light`
- toggles the root html class

### Delete Confirmation Provider

File:

- `src/components/DeleteConfirmationProvider.tsx`

Role:

- standardizes destructive confirmation dialogs across pages

## 13. Frontend Storage Model

### Core Keys

Defined in `src/lib/storageKeys.ts`.

Important keys:

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
- `writeforge-scene-practice-world-element`

### Local-Only Bridge Key

- `writeforge-scene-practice-world-element`

This key is important because it powers the World Element Designer -> Scene Practice handoff without becoming part of the main migratable snapshot.

### Rebuild Rule

If recreating the frontend elsewhere, preserve both:

- the core snapshot keys
- the local-only scene-reference bridge key

## 14. Frontend Domain Libraries

### `src/data/tasks.ts`

- canonical built-in daily task definitions
- highly customized Monday-Sunday writing drills

### `src/lib/taskTracking.ts`

- completion logic
- streak calculations
- weekly and rolling history helpers

### `src/lib/customTasks.ts`

- task types and normalization for user-generated drills

### `src/lib/taskGenerator.ts`

- mock/implied generation helper for task suggestion workflows

### `src/lib/plotBuilder.ts`

- plot point normalization
- phase assignment
- scene and character normalization for plot editing

### `src/data/promptEngine.ts`

- scene prompt generation
- tones
- story phases

### `src/data/worldEngine.ts`

- worldbuilding categories, elements, labels, prompt generation

### `src/lib/worldElements.ts`

- world element record normalization
- content counting
- title suggestions
- scene handoff storage

### `src/lib/writingAnalytics.ts`

- derived writing metrics from stored drafts

### `src/lib/sceneExport.ts`

- PDF and `.docx` scene export

### `src/lib/identity.ts`

- email validation
- display-name fallback
- avatar/bio extraction
- initials generation
- password strength scoring
- date formatting

## 15. UX Patterns That Must Be Preserved

If recreating the frontend elsewhere, these are non-trivial behavior rules that shape how the app feels:

- Dark mode is the default first impression.
- Sidebar order should remain stable.
- The intro loading overlay appears before the shell settles.
- Most pages use constrained max-width wrappers instead of edge-to-edge layouts.
- Cards are subtle, with hover polish but no heavy shadows.
- Mono labels are used for metadata, counters, timelines, and instructional eyebrows.
- Neon colors are accents, not the main background system.
- Writing-heavy flows use nested disclosure patterns instead of dumping all fields at once.
- Delete flows should always use a confirmation dialog.
- The dashboard greeting must be personalized.
- The system cursor should remain standard.
- The auth screen should feel editorial, not corporate.
- The worldbuilding -> scene-writing handoff should remain in place.

## 16. Important Padding And Spacing References

These are the most reusable spacing values that define the frontend feel:

- App main content: `p-6`
- App header horizontal padding: `px-4`
- Sidebar top and bottom sections: `p-4`
- Standard card padding: `p-5`
- Dashboard vertical rhythm: `space-y-8`
- Most page wrappers: `space-y-6`
- Auth left panel large-screen padding: `lg:px-14 lg:py-14`
- Auth right panel large-screen padding: `lg:px-14`
- Loading screen text wrapper: `px-6`
- Small action buttons often shrink to `h-7 w-7`
- Default input/button height: `h-11`

## 17. Testing And Quality Surface

Current frontend tests cover:

- task generation
- prompt engine
- world engine
- task tracking
- world element designer
- scene export
- custom task builder
- baseline example behavior

Test folder:

- `frontend/src/test`

## 18. Rebuild Priorities

If recreating this frontend from scratch in a new codebase, preserve the following in order:

1. Global shell and route map
2. Theme tokens, typography, card/button/input styling, and spacing rhythm
3. Sidebar behavior and brand treatment
4. Loading overlay
5. Auth screen split layout and aurora backdrop
6. Shared contexts for auth, theme, and app data
7. Storage keys and domain data shapes
8. Page-by-page workflows
9. Scene export and world-to-scene handoff
10. Tests for task logic, writing analytics helpers, and world/prompt engines

## 19. Files To Read First In A Fresh Clone

If someone new needs to understand the frontend quickly, start here:

1. `frontend/src/App.tsx`
2. `frontend/src/index.css`
3. `frontend/src/components/AppLayout.tsx`
4. `frontend/src/components/AppSidebar.tsx`
5. `frontend/src/pages/AuthPage.tsx`
6. `frontend/src/pages/Dashboard.tsx`
7. `frontend/src/contexts/AuthContext.tsx`
8. `frontend/src/contexts/WriteForgeDataContext.tsx`
9. `frontend/src/lib/storageKeys.ts`
10. `frontend/src/data/tasks.ts`
11. `frontend/src/pages/PlotBuilder.tsx`
12. `frontend/src/pages/ScenePractice.tsx`
13. `frontend/src/components/tasks/WorldElementDesigner.tsx`
14. `frontend/src/pages/SettingsPage.tsx`

## 20. Final Rebuild Note

The frontend is not just a collection of pages. Its identity comes from the combination of:

- restrained editorial styling
- stable shell navigation
- mono metadata accents
- low-drama motion
- card-based writing workflows
- deliberate width constraints
- reusable client-side state providers

If those elements are preserved together, the rebuilt frontend will feel like WriterZ rather than a generic React dashboard.
