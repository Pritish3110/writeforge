# WriterZ Frontend

This folder contains the WriterZ React application: the browser UI, Firebase client integration, writing workspace pages, and frontend tests.

## Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI
- Framer Motion
- Recharts
- Vitest
- Playwright config

## Structure

```text
frontend/
├── README.md
├── .env.example
├── index.html
├── package.json
├── public/
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── og-image.png
│   ├── placeholder.svg
│   └── robots.txt
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── components/
    ├── contexts/
    ├── data/
    ├── firebase/
    ├── hooks/
    ├── lib/
    ├── pages/
    ├── services/
    └── test/
```

## Environment

Create a local `.env` or `.env.local` file when needed. These files are ignored by Git.

```env
VITE_API_URL=http://localhost:8787
```

The Firebase browser config lives in `src/firebase/config.js`. Firebase web config values are client identifiers, not server secrets; real authorization is enforced by Firebase Auth and Firestore rules.

## Commands

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
```

## Routes

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
- `/settings`
- `/auth`

## Security Notes

- Do not put Gemini API keys or Firebase Admin service-account JSON in frontend files.
- Only use `VITE_` variables for values that are safe to expose in the browser bundle.
- Keep private implementation notes in ignored Markdown files, not in this public README.
