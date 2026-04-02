

# Writing Productivity Dashboard

A retro-themed, dark-first writing productivity dashboard with synthwave aesthetics and clean UI.

## Design System
- **Dark mode default**: Deep charcoal (#0a0a0f) with neon purple (#a855f7), cyan (#22d3ee), soft pink (#f472b6) accents
- **Light mode**: Clean white with pastel versions of accent colors
- **Typography**: Monospace (JetBrains Mono via Google Fonts) for headings, Inter for body
- **UI**: Soft glow borders on cards, medium rounded corners, subtle hover animations

## Pages & Routing (Sidebar Navigation)

### 1. Dashboard (Home)
- Dynamic greeting based on time of day
- Today's task summary card (based on day of week)
- Quick stats: tasks completed today, weekly streak counter
- Mini bar chart showing last 7 days of completions
- "Start Today's Session" CTA button

### 2. Daily Tasks
- Day selector (Mon–Sun tabs)
- Pre-defined tasks per day (Character Dev, Emotional Writing, Problem Solving, Fight Scenes, Dialogue, Worldbuilding, Prose Mastery)
- Each task: checkbox, expandable details/prompt section, optional 30-min countdown timer
- Completion percentage bar at top

### 3. Weekly Schedule
- Overview grid showing all 7 days and their tasks
- Visual indicators for completed/pending tasks
- Weekly completion percentage

### 4. Progress Analytics
- Line graph: daily completion rate over time (Recharts)
- Bar chart: tasks completed per category
- GitHub-style weekly heatmap for activity consistency
- Streak tracker: current streak + longest streak display

### 5. Character Lab
- Form to add/edit characters: Name, Desire, Flaw, Contradiction
- Character cards displayed in a grid with glow-border styling
- Edit/delete functionality

### 6. Scene Practice
- Writing textarea with live word counter
- "Generate Prompt" button (random writing prompts from a curated list)
- Save drafts locally, list of saved drafts

### 7. Settings
- Dark/Light theme toggle with smooth animation
- Reset all progress button (with confirmation)
- Data persistence info (localStorage-based)

## State & Persistence
- All data persisted in localStorage (tasks, characters, drafts, streaks, theme preference)
- React context for theme management
- Custom hooks for task tracking, streak calculation

## Tech
- React Router for routing, sidebar with collapsible icon mode
- Recharts for analytics graphs
- Tailwind with custom CSS variables for the retro theme
- Framer-free CSS transitions for page/element animations

