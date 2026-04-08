# WriterZ Error Log

This file documents the main error currently affecting this codebase, the evidence gathered so far, the implementation changes already made, and the remaining verification steps.

The goal of this file is accuracy. It records what has been observed and what has been changed. It does not pretend the issue is fully resolved unless that has been confirmed in a real browser session.

## 1. Main Active Issue

The current issue is an auth/session-related connectivity failure that shows up in the browser while using the app.

Affected user-visible behaviors:

- sign out fails intermittently or completely
- profile update fails
- authenticated username does not appear reliably
- some authenticated data requests fail

## 2. Observed Symptoms

Symptoms reported and investigated during the current debugging cycle:

- `NetworkError when attempting to fetch resource`
- `Failed to fetch`
- `ERR_CONNECTION_RESET`
- `ERR_CONNECTION_CLOSED`
- `ERR_HTTP2_PROTOCOL_ERROR`
- `Auth session missing`
- `Failed to restore auth session`

Failing request families mentioned in the investigation:

- `/auth/v1/user`
- `/auth/v1/logout`
- `/rest/v1/...`

User-facing effects tied to those failures:

- logout request does not complete
- profile metadata update does not stick
- `getUser()` returns `null` or cannot refresh reliably
- dashboard greeting falls back or cannot reflect the live user

## 3. Current Best-Supported Diagnosis

The strongest current diagnosis is:

- browser auth session persistence is being lost, corrupted, or not restored consistently
- some protected requests are being attempted before a valid session token is available
- browser-side auth storage and locking behavior contributed to unstable session restoration

What this means in practice:

- requests that require a valid session token can reach the browser network layer in a bad state
- once that happens, auth and REST flows appear broken even though the project URL and base client configuration may be correct

## 4. What Has Been Ruled Out

The debugging work already ruled out several common causes.

### Confirmed Not The Primary Problem

- missing frontend `.env`
- wrong frontend env variable names
- wrong Supabase URL format
- use of publishable key instead of anon key in the current client
- missing singleton client
- missing centralized auth context

### Also Investigated

- obvious React auth effect loops
- multiple frontend client instances

Important nuance:

- a possible `Maximum update depth exceeded` hypothesis was investigated
- the current auth architecture does not contain the simple `useEffect(() => getUser())` every-render loop pattern that was suspected
- that means an obvious auth rerender loop is not confirmed by the current source

## 5. Code-Level Changes Already Applied

The codebase has already been updated substantially during this debugging cycle.

### Auth State Refactor

Implemented:

- centralized `AuthContext`
- single `user` state
- single `loading` state
- auth restore on mount
- `onAuthStateChange` subscription
- shared auth actions

Files:

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/App.tsx`
- `frontend/src/contexts/WriteForgeDataContext.tsx`

### Frontend Auth Usage Cleanup

Implemented:

- components now read auth through `useAuth()`
- component-level direct auth restoration logic was removed from the main UI flow

### Username Display Fix

Implemented:

- dashboard greeting now uses:
  - `user.user_metadata.display_name`
  - email prefix fallback
  - `"Writer"` fallback

File:

- `frontend/src/pages/Dashboard.tsx`

### Sign-Out Flow Fix

Implemented:

- sign-out centralized in `AuthContext`
- logout clears frontend user state
- auth redirect remains enforced in the app shell

Files:

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/AppLayout.tsx`

### Profile Update Fix

Implemented:

- profile update uses centralized auth action
- user is refreshed after update
- frontend state is updated immediately after successful refresh

### Cursor Reset

Implemented:

- custom cursor behavior removed
- normal system cursor restored

File:

- `frontend/src/index.css`

### Environment And Client Fixes

Implemented:

- frontend env switched to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- client initialization now uses the anon key
- outdated project-id / publishable-key client wiring removed

Files:

- `frontend/.env`
- `frontend/src/lib/supabase/client.ts`
- `frontend/src/vite-env.d.ts`

### Session Persistence Hardening

Implemented:

- dedicated auth storage key: `writerz-auth`
- custom auth lock callback to bypass problematic browser lock behavior

File:

- `frontend/src/lib/supabase/client.ts`

### Session Gating For Protected Backend Calls

Implemented:

- protected backend calls now require a valid session first
- the frontend fails fast with `Auth session missing` instead of blindly attempting protected requests

Files:

- `frontend/src/lib/supabase/client.ts`
- `frontend/src/lib/supabase/writeforgeBackend.ts`

### Debug Logging Added

Current logs in the codebase include:

- `SUPABASE URL:`
- `SUPABASE KEY:`
- `SUPABASE CLIENT:`
- `SESSION:`
- `USER TEST:`
- `USER:`
- `SIGN OUT ERROR:`
- `UPDATE ERROR:`
- `Failed to restore auth session`

## 6. Evidence Collected So Far

### Confirmed Working

- the frontend env file is in the expected location
- the current env names are correct
- the singleton client exists
- the build/test setup is healthy
- the project URL is reachable from terminal-side checks

### Confirmed Problem Surface

- the remaining failures happen in real browser-backed auth flows
- the error pattern is consistent with missing or unreliably restored auth session state
- the failures affect auth-required actions rather than basic app boot alone

## 7. Why The Symptoms Cluster Together

All of the visible symptoms line up if the session is not available at the moment a protected call is made.

If session restore fails or the token is not attached in time:

- logout fails because it depends on the authenticated client state
- profile update fails because it requires a valid user session
- username refresh fails because `getUser()` cannot return the current authenticated user reliably
- protected data requests fail because they need auth headers

## 8. Remaining Verification Steps

The remaining highest-signal checks are browser-only checks.

These still need to be confirmed in the user's live browser session:

1. After a fresh login, inspect `SESSION:` in the browser console.
2. Confirm the `writerz-auth` key exists in Local Storage.
3. Inspect a failing `/auth/v1/user`, `/auth/v1/logout`, or `/rest/v1/...` request in DevTools.
4. Verify whether the request includes:
   - `Authorization: Bearer ...`
   - `apikey: ...`
5. Check whether the failing request is:
   - sent and rejected
   - not sent at all
   - started and reset by the browser

## 9. Safe Recovery Steps Already Recommended

The least destructive reset flow for the current codebase is:

```js
Object.keys(localStorage)
  .filter((k) => k.includes("sb-ergvixwzjdsqnmnqnpkz") || k.includes("writerz-auth"))
  .forEach((k) => localStorage.removeItem(k));
sessionStorage.clear();
```

Then:

1. hard refresh
2. log in again
3. inspect `SESSION:` and `USER TEST:`
4. verify `writerz-auth` is recreated
5. retest profile update and logout

This targeted reset is safer than `localStorage.clear()` because the app also stores real workspace state in local storage.

## 10. Important Notes For Future Debugging

- Do not reintroduce component-level auth restoration logic.
- Do not create multiple Supabase clients.
- Do not bypass the centralized `AuthContext`.
- Do not remove the current session-gating layer in `writeforgeBackend.ts`.
- Do not assume a terminal-side health check proves browser-side auth is healthy.
- Do not treat an unconfirmed root-cause theory as resolved unless the real browser flow succeeds.

## 11. Current Status

Current status of the issue:

- major architecture problems were fixed
- auth state is centralized
- client configuration is corrected
- protected backend calls are gated behind session checks
- session persistence has been hardened
- the remaining uncertainty is browser-session restoration and token attachment during real interactive use

## 12. Practical Definition Of Resolved

This issue should only be considered resolved when all of the following are true in a real browser session:

- `SESSION:` shows a non-null session after login
- dashboard greeting shows the authenticated username correctly
- profile update completes and reflects immediately
- logout completes and returns the app to `/auth`
- no browser `ERR_CONNECTION_RESET`, `ERR_CONNECTION_CLOSED`, or `Failed to fetch` occurs during normal authenticated actions

Until those checks pass in a real session, this error should be treated as improved and narrowed down, but not fully closed.
