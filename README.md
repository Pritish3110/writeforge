# ✍️ WriterZ

> A **cloud-native writing workspace** for creative writers who need more than a blank page.

**Status:** Production Ready | **License:** MIT  
**GitHub:** https://github.com/Pritish3110/WriterZ

---

## 🎯 What is WriterZ?

WriterZ is an integrated suite of tools designed to help writers at every stage of the creative process:

| Feature | Purpose |
|---------|---------|
| 🎭 **Character Lab** | Build rich character profiles with personality, motivations, and contradictions |
| 🔗 **Relationships** | Visualize character dynamics with an interactive graph |
| 🌍 **World Builder** | Document locations, factions, magic systems, and lore |
| 📖 **Plot Builder** | Structure stories using three-act framework (Promise → Progress → Payoff) |
| 📝 **Scene Practice** | Write with AI-powered prompts and track progress |
| ✅ **Daily Tasks** | Structured writing exercises with timers and feedback |
| 📊 **Analytics** | Track word counts, streaks, and writing patterns |
| 🤖 **AI Assistant** | Gemini-powered suggestions (secure backend API) |

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | Fast, modern UI |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent, accessible design |
| **State** | Context API | Global auth, theme, data sync |
| **Backend** | Firebase + Firestore | Real-time database & auth |
| **Functions** | Cloud Functions (Node 20) | Secure API calls, AI integration |
| **Testing** | Vitest + Playwright | Unit & E2E testing |

### Infrastructure

```
┌─────────────────────────────────────┐
│        Frontend (React)              │
│  • React 18 + Vite                  │
│  • TypeScript                       │
│  • Tailwind CSS + shadcn/ui        │
│  • Firebase SDK                    │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│  Firebase    │  │ Cloud        │
│  Auth        │  │ Functions    │
│              │  │              │
└──────────────┘  └────────┬─────┘
       ▲                   │
       └───────┬───────────┘
               ▼
        ┌──────────────┐
        │  Firestore   │
        │  (Real-time) │
        └──────────────┘
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **bun**
- Firebase project (free: https://firebase.google.com)
- Gemini API key (optional, for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/Pritish3110/WriterZ.git
cd WriterZ
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (optional):
```env
# Frontend env overrides (defaults in src/firebase/config.js)
```

### 3. Backend Setup (Optional for AI)

```bash
cd ../backend/functions
npm install
```

Create `backend/functions/.env`:
```env
GEMINI_API_KEY=your_key_here
```

### 4. Run Development Server

```bash
# Terminal 1: Frontend
cd frontend
npm run dev
# → http://localhost:5173

# Terminal 2: Backend (optional)
cd backend
npm run dev:functions
# → Emulator UI: http://localhost:4000
# → Functions: http://localhost:5001
```

---

## 📁 Project Structure

```
WriterZ/
├── README.md
├── .gitignore                       # Security rules
│
├── frontend/                        # React + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # Progress overview
│   │   │   ├── DailyTasks.tsx      # Daily exercises
│   │   │   ├── CharacterLab.tsx    # Character management
│   │   │   ├── CharacterRelationships.tsx
│   │   │   ├── PlotBuilder.tsx     # Story structure
│   │   │   ├── WorldElementDesignerPage.tsx
│   │   │   ├── ScenePractice.tsx   # Freeform writing
│   │   │   ├── CustomTaskBuilder.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── WritingAnalytics.tsx
│   │   │   ├── KnowledgeBase.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   └── UpcomingFeatures.tsx
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── auth/               # Auth flows
│   │   │   ├── ai/                 # AI assistant UI
│   │   │   ├── tasks/              # Task components
│   │   │   └── ...
│   │   ├── contexts/               # Global state
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   ├── BackendSyncContext.tsx
│   │   │   └── AiAssistantContext.tsx
│   │   ├── services/               # API clients
│   │   │   └── backendAiClient.ts  # Calls backend AI
│   │   ├── firebase/               # Firebase config
│   │   ├── ai/                     # AI utilities
│   │   │   ├── modelManager.js     # Backend calls
│   │   │   ├── aiRouter.js         # Intent detection
│   │   │   └── llmService.js
│   │   ├── hooks/                  # Custom hooks
│   │   ├── lib/                    # Utilities
│   │   ├── data/                   # Static data
│   │   └── index.css               # Global styles
│   └── package.json
│
├── backend/
│   ├── functions/                  # Cloud Functions
│   │   ├── src/
│   │   │   └── index.js            # generateText(), healthCheck()
│   │   ├── .env.example
│   │   └── package.json
│   ├── database/                   # Firestore schema
│   ├── firebase/                   # Config & rules
│   │   ├── firestore.rules         # Security rules
│   │   └── firestore.indexes.json
│   ├── firebase.json
│   └── package.json
│
└── sample_frontend/                # Reference (gitignored)
```

---

## 🎮 Pages & Features

### 📊 Dashboard
Real-time progress metrics, writing streaks, weekly activity

### ✅ Daily Tasks
Monday-Sunday structured writing exercises:
- Custom prompts with step-by-step instructions
- Timer-based drills
- Progress tracking
- Category-based filtering

### 🎭 Character Lab
Comprehensive character management:
- Character type & archetype selection
- Personality traits & contradictions
- Story role & motivations
- Extended narrative fields
- Search, filter, pin/reorder characters
- Dedicated reader panel for viewing

### 🔗 Character Relationships
Interactive network visualization:
- Draggable character nodes
- Zoomable/pannable graph
- Relationship types: Ally, Enemy, Mentor, Family, Unknown
- Strength scoring (1-10)
- Evolution timeline

### 📖 Plot Builder
Three-act story structure:
```
Promise      →      Progress     →      Payoff
(Setup)           (Confrontation)      (Resolution)
```
Features:
- Plot point editor with context panel
- Character involvement tracking
- Conflict distribution analysis
- Foreshadowing links
- Desktop/mobile responsive

### 🌍 World Elements
Build and document your universe:
- Locations & geography
- Factions & organizations
- Magic systems & lore
- Theme & tone notes

### ✍️ Scene Practice
Freeform writing environment:
- Smart prompt engine (tone, character, phase filters)
- Live word count tracking
- Draft history with timestamps
- Export to PDF/DOCX
- Auto-generated scene titles

### 📚 Custom Tasks
Create your own exercises:
- Drag-reorderable steps
- Category tagging
- Day assignment
- Save as templates

### 📈 Analytics
Writing insights dashboard:
- Word count trends (chart)
- Session consistency (heatmap)
- Writing streaks
- Category breakdown
- Average session length

### 📝 Writing Analytics
Deep writing analysis:
- Total words written
- Sessions completed
- Words-per-day trends
- Dialogue vs narration ratio
- Repetition detection
- Clarity scoring heuristic
- Average sentence length

### 🧠 Knowledge Base
Personal writing wiki with customizable rules & guidelines

---

## 🔐 Security

### API Key Protection ✅
```
Frontend          Cloud Function          Backend Key
   │                    │                      │
   ├─ prompt + token ──>│─ verify token ──────>│
   │                    │                      │
   │<─ response ────────┤<─ Gemini API ───────┤
   │                    │                      │
```

- **Gemini API key** stored ONLY on backend
- **Frontend never sees** sensitive keys
- **Cloud Functions validate** auth before processing
- **All `.env` files** in `.gitignore`

### Data Privacy ✅
- Per-user Firestore collections
- Security rules enforce user isolation
- Firebase Auth for user identity
- Automatic cleanup on account deletion

---

## 🛠️ Available Commands

### Frontend

```bash
npm run dev              # Start dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview build
npm run lint             # Run ESLint
npm run test             # Run tests
npm run test:watch       # Watch mode
```

### Backend

```bash
npm run dev              # Full Firebase emulator
npm run dev:functions    # Functions + auth only
npm run seed:local       # Populate emulator data
npm run functions:deploy # Deploy to production
npm run functions:logs   # View production logs
```

---

## 🚀 Deployment

### Frontend

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend Functions

```bash
cd backend/functions

# Set secret (production)
firebase functions:secrets:set GEMINI_API_KEY

# Deploy
firebase deploy --only functions
```

---

## 🤖 AI Integration

WriterZ uses **Google Gemini API** through secure Cloud Functions:

```typescript
import { callBackendAI } from "@/services/backendAiClient";

// Call AI via backend function
const response = await callBackendAI({
  prompt: "Help me develop this character...",
  model: "models/gemini-2.5-flash",
  generationConfig: {
    maxOutputTokens: 400,
    temperature: 0.8
  }
});

console.log(response.text); // AI response
```

**Security Flow:**
1. Frontend sends prompt + auth token
2. Cloud Function verifies token with Firebase Auth
3. Function calls Gemini API with secure backend key
4. Response returned to authenticated user

✅ No API keys exposed to frontend!

---

## 🧪 Testing

```bash
# Unit tests
cd frontend
npm run test

# E2E tests
npx playwright test

# View report
npx playwright show-report
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **AI unavailable** | Ensure backend running: `npm run dev:functions` |
| **Firebase error** | Check `frontend/src/firebase/config.js` has valid credentials |
| **Emulator fails** | Clear: `rm -rf .firebase-data && npm run dev` |
| **Build fails** | Clear cache: `rm -rf node_modules && npm install` |
| **Port already in use** | Change port in `vite.config.ts` or firebase emulator config |

---

## 📚 Documentation

- **Setup Guide**: This README
- **Component Library**: `frontend/src/components/`
- **Cloud Functions**: `backend/functions/src/index.js`
- **Firestore Rules**: `backend/firebase/firestore.rules`
- **Data Schema**: `backend/database/`

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes & test thoroughly
4. Commit: `git commit -m "Add feature description"`
5. Push: `git push origin feature/your-feature`
6. Open Pull Request

---

## 📖 License

MIT License - see LICENSE file for details

---

## 💬 Support & Feedback

- 🐛 **Found a bug?** [Open an issue](https://github.com/Pritish3110/WriterZ/issues)
- 💡 **Have an idea?** [Start a discussion](https://github.com/Pritish3110/WriterZ/discussions)
- 📖 **Need help?** Check troubleshooting section above
- 🔐 **Security issue?** Please email instead of opening public issue

---

## 🙏 Built With

| Tool | Purpose |
|------|---------|
| [React](https://react.dev) | UI framework |
| [Firebase](https://firebase.google.com) | Backend & auth |
| [Vite](https://vitejs.dev) | Build tool |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [shadcn/ui](https://ui.shadcn.com) | Component library |
| [Google Gemini](https://ai.google.dev) | AI assistance |

---

<div align="center">

**Built with ❤️ for writers**

*Your story starts here.* ✨

[✍️ Get Started](#-quick-start) · [📖 Learn More](#-features--pages) · [🐛 Report Bug](https://github.com/Pritish3110/WriterZ/issues) · [💡 Suggest Feature](https://github.com/Pritish3110/WriterZ/discussions)

</div>
