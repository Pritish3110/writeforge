# Firebase Backend Scaffold

This folder is the starting backend workspace for the current writing app.

The frontend is now located in `../frontend/`.

## Structure

```text
backend/
  README.md
  database/
    users.json
    taskRecords.json
    customTasks.json
    taskTemplates.json
    characters.json
    characterRelationships.json
    plotPoints.json
    drafts.json
    worldElements.json
    knowledgeBaseSections.json
  firebase/
    schema.md
    firestore.rules
    firestore.indexes.json
  scripts/
    seed-firestore.mjs
```

## Firestore Design

The app is user-scoped, so the backend is designed around:

- `users/{userId}`
- `users/{userId}/taskRecords/{taskRecordId}`
- `users/{userId}/customTasks/{customTaskId}`
- `users/{userId}/taskTemplates/{templateId}`
- `users/{userId}/characters/{characterId}`
- `users/{userId}/characterRelationships/{relationshipId}`
- `users/{userId}/plotPoints/{plotPointId}`
- `users/{userId}/drafts/{draftId}`
- `users/{userId}/worldElements/{worldElementId}`
- `users/{userId}/knowledgeBaseSections/{sectionId}`

This keeps security rules simple and matches the actual query shape of the current app: almost everything is loaded per signed-in user.

## Notes

- The local-only key `writeforge-scene-practice-world-element` is intentionally not modeled as a backend collection.
- `users` stores profile and settings fields together to avoid an unnecessary extra lookup.
- The JSON files under `database/` act as a mock Firestore snapshot and can be used by the seed script later.
- `firebase/schema.md` is the source of truth for the first Firestore model.

## Local Run

Install backend dependencies:

```bash
cd backend
npm install
```

Start the local Firebase backend:

```bash
npm run dev
```

Seed the running Firestore emulator in a second terminal:

```bash
cd backend
npm run seed:local
```

Emulator ports:

- Firestore: `127.0.0.1:8081`
- Auth: `127.0.0.1:9099`
- Emulator UI: `127.0.0.1:4000`

## No-Install Mock Backend

If package install or Firebase emulator setup is blocked, you can still run a local backend immediately:

```bash
cd backend
npm run dev:mock
```

Mock backend port:

- API: `127.0.0.1:8787`

Useful mock routes:

- `GET /health`
- `GET /api/collections`
- `GET /api/collections/users`
- `GET /api/snapshot/user_demo_001`

## Next Frontend Step

After this scaffold, the next integration step is:

1. add Firebase config in `frontend/src/`
2. add auth context
3. add a shared workspace data layer
4. swap localStorage reads/writes over one domain at a time
