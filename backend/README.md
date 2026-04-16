# Backend

This backend is an Express API for WriterZ.

## Responsibilities

- Verify Firebase ID tokens with `firebase-admin`
- Proxy Gemini requests securely from the server
- Optionally perform validated Firestore reads and writes in the future

## Public Documentation Role

This is the public backend README for GitHub. Keep backend setup, commands, deployment notes, and security expectations here. Private troubleshooting logs, schema notes, and AI-agent handoff notes should stay in ignored Markdown files.

## Structure

```text
backend/
├── config/
│   └── firebaseAdmin.js
├── controllers/
│   └── aiController.js
├── middleware/
│   └── authenticate.js
├── routes/
│   └── aiRoutes.js
├── firebase/
│   ├── firestore.rules
│   └── firestore.indexes.json
├── database/
├── scripts/
├── .env.example
├── firebase.json
├── package.json
└── server.js
```

## Local Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=8787
FRONTEND_URL=http://localhost:5173,https://writer-z.vercel.app
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id"}
```

Use a comma-separated `FRONTEND_URL` value if more than one trusted frontend origin needs access.

## Environment Variables

- `PORT`: local-only backend port. Render injects this automatically in production.
- `FRONTEND_URL`: trusted frontend origins for CORS. For this project use `https://writer-z.vercel.app` and keep localhost for development.
- `GEMINI_API_KEY`: server-side Gemini key from Google AI Studio.
  Open https://aistudio.google.com/app/apikey, create a key, then store it only in Render or local `.env`.
- `FIREBASE_SERVICE_ACCOUNT`: Firebase Admin JSON.
  Open Firebase Console -> Project settings -> Service accounts -> Generate new private key.
  Paste the full JSON into Render as one env var value.

## Run

```bash
npm run dev
```

## Deploy

- Render is the current target platform
- Use `npm start`
- Do not manually set `PORT` on Render unless needed for a special case
- Add `FRONTEND_URL`, `GEMINI_API_KEY`, and Firebase service account credentials in environment variables
- Set `FRONTEND_URL` to `https://writer-z.vercel.app`
- UptimeRobot can ping `/health`

## Firebase Scope

Firebase Cloud Functions are no longer used here.

Firebase remains in use for:

- Auth verification
- Firestore rules and data access
