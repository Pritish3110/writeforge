# Backend

This backend is an Express API for WriterZ.

## Responsibilities

- Verify Firebase ID tokens with `firebase-admin`
- Proxy Gemini requests securely from the server
- Optionally perform validated Firestore reads and writes in the future

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
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id"}
```

## Run

```bash
npm run dev
```

## Deploy

- Railway or Render are the intended free-tier-friendly targets
- Use `npm start`
- Set `PORT` from the platform
- Add `FRONTEND_URL`, `GEMINI_API_KEY`, and Firebase service account credentials in environment variables

## Firebase Scope

Firebase Cloud Functions are no longer used here.

Firebase remains in use for:

- Auth verification
- Firestore rules and data access
