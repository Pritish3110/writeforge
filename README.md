# WriterZ

WriterZ is a cloud-native writing workspace for fiction planning, drafting, worldbuilding, analytics, and AI-assisted writing.

## Architecture

WriterZ now uses a simple split deployment:

```text
Frontend (Vercel / Vite)
        |
        v
Backend API (Express on Railway or Render)
        |
        v
Firebase Auth + Firestore
```

- The frontend handles UI, Firebase Auth, and user-scoped Firestore sync.
- The backend handles protected Gemini API calls and any future server-side validation.
- Firebase Cloud Functions are no longer used.

## Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Backend: Express, firebase-admin, dotenv, cors
- Auth: Firebase Authentication
- Database: Cloud Firestore
- AI: Google Gemini via backend API only
- Testing: Vitest

## Project Structure

```text
WriterZ/
├── README.md
├── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── firebase/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── services/
│   ├── .env.example
│   └── package.json
└── backend/
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

### 1. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8787
```

The Firebase web config stays in `frontend/src/firebase/config.js`.

### 2. Backend

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

You can also use `FIREBASE_SERVICE_ACCOUNT_PATH` instead of inline JSON if your deploy platform mounts a file.

### 3. Run Locally

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

## Backend API

### Health Check

```http
GET /health
```

### Generate Text

```http
POST /api/generate
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Example request body:

```json
{
  "prompt": "Give me three darker alternate endings for this chapter.",
  "model": "gemini-2.5-flash"
}
```

## Security Model

- Gemini API keys are stored only in backend environment variables.
- The frontend never calls Gemini directly.
- Backend requests require a Firebase ID token.
- The Express backend verifies the token with `firebase-admin`.
- Firestore rules remain user-scoped under `users/{userId}` and subcollections.

## Firestore Model

WriterZ uses split user data instead of a single large snapshot document:

- `users/{userId}`
- `users/{userId}/taskRecords/{id}`
- `users/{userId}/customTasks/{id}`
- `users/{userId}/taskTemplates/{id}`
- `users/{userId}/characters/{id}`
- `users/{userId}/characterRelationships/{id}`
- `users/{userId}/plotPoints/{id}`
- `users/{userId}/drafts/{id}`
- `users/{userId}/worldElements/{id}`
- `users/{userId}/knowledgeBaseSections/{id}`

## Deployment

### Frontend

- Deploy `frontend/` to Vercel
- Set `VITE_API_URL` to your backend URL

### Backend

- Deploy `backend/` to Railway or Render
- Set:
  - `PORT`
  - `FRONTEND_URL`
  - `GEMINI_API_KEY`
  - `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH`
- Start command:

```bash
npm start
```

### Firestore Rules

From `backend/`:

```bash
firebase deploy --only firestore:rules
```

## Important Notes

- Firebase Cloud Functions have been removed from the active architecture.
- Firebase Auth and Firestore are still part of the production stack.
- The Firebase browser config is public client config, not a server secret.
- If any Gemini key was ever committed in the past, rotate it in Google AI Studio or Google Cloud.

## Development Checks

Useful commands:

```bash
cd frontend && npm run test
cd frontend && npm run build
cd frontend && npm run lint
cd backend && node --check server.js
```
