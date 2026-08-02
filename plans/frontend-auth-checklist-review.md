# Frontend Authentication Checklist Review

**Date:** 2026-07-30
**Source:** `frontend/node_modules/next/dist/docs/01-app/02-guides/authentication.md`
**Scope:** `@frontend` (Next.js 16 App Router) auth flow

## Status: Fixes implemented (2026-08-02). See "Implementation Log" at bottom.

## Checklist structure (from doc)

1. Authentication — capture credentials, verify identity
2. Session Management — track auth state across requests
3. Authorization — decide routes/data access

Doc recommends: auth library (Auth0/Clerk/NextAuth/etc.), Server Actions for forms, JWT/session cookies, DAL with `verifySession()` + React `cache`, Proxy optimistic checks, Server Component role checks, Route Handler auth, `taintUniqueValue` for client-exposed session data.

## Architecture map (current)

Three layers gate dashboard, all read same HttpOnly `session` cookie:

1. **Edge** — `frontend/src/proxy.ts`: `createMiddleware` (next-intl) + decrypt cookie via `cachedDecrypt` (500ms TTL Map) → redirect `/login` if invalid. Role-gate `/admin` → `/dashboard` if not admin. `updateSession` re-encrypts + resets cookie expiry (rolling 7d).
2. **Server** — `frontend/src/lib/dal.ts`: `getSession`/`verifySession`/`verifyAdmin`, all `server-only` + `React.cache`. `serverFetch` forwards `Authorization: Bearer <accessToken>` to Go backend.
3. **Client** — `frontend/src/app/[locale]/(dashboard)/DashboardClientShell.tsx`: `useEffect` → `initializeAuth()` → `GET /api/auth/session` → restore `accessToken` in `tokenService` (in-memory singleton) → `userApi.getCurrentUser()` → set `isAuthenticated`. Auth-gate overlay + 3s countdown redirect when unauth.

Session cookie: JWT (jose `HS256`), `SESSION_SECRET` env, 7d expiry, `httpOnly` + `secure` (prod) + `sameSite: 'lax'` + `path: '/'`. Set via `POST /api/auth/session`, cleared via `DELETE /api/auth/session`.

Token storage: access + refresh tokens in-memory `tokenService` singleton (no localStorage). Recovered from cookie on refresh via route handler.

## Findings vs checklist

### Authentication
- **Deviation:** Login/register use TanStack Form (client) + `authApi.login` (fetch to Go backend), NOT Server Actions + `useActionState`. Doc recommends Server Actions for credential capture. Intentional — auth delegated to Go backend (JWT issuer), frontend is thin client. Accept.
- Login form `onSubmit` → `authStore.login` → `authApi.login` → tokens → `POST /api/auth/session` set cookie → `router.push(ROUTES.DASHBOARD)`. Works.
- Register auto-logins after `authApi.register`. Works but double round-trip (register then login). Minor.

### Session Management
- JWT cookie via jose ✓ matches doc recommendation (Jose listed as session lib).
- `httpOnly` + `secure` + `sameSite: 'lax'` ✓ — matches doc security guidance.
- **Issue:** `sameSite: 'lax'` blocks cross-site POST but allows top-level GET nav. Adequate for this app (no cross-site auth flows). OK.
- **Issue:** Rolling expiry via `updateSession` in proxy on every request — re-encrypts + sets cookie each navigation. Doc shows `updateSession` pattern but warns: "be cautious when doing checks in Layouts as these don't re-render on navigation." Proxy runs every request so fine, but re-encrypt cost on every hit. Minor perf.
- **Issue:** `decryptCache` in `proxy.ts:34` — unbounded `Map<string, {payload, exp}>`, 500ms TTL. No size cap. Long-lived Node process + many distinct cookies → memory growth. Eviction only on TTL miss overwrite. **Gap:** add LRU cap or `Map` size check.
- **Issue:** `session.ts:5` throws at module load if `SESSION_SECRET` missing. Fails fast ✓ but throws during build if env absent. Verify build env has it set.
- **Issue:** Refresh token stored in JWT cookie payload alongside access token. If cookie JWT leaked, attacker gets refresh token too. Doc doesn't mandate separation but best practice is separate refresh-token cookie/path. **Gap:** consider splitting refresh into own cookie with stricter attrs.
- **Issue:** `refreshAccessToken` in `authStore` updates in-memory token + re-POSTs session cookie, but does NOT rotate refresh token. If Go backend issues new refresh token on refresh, it's dropped. Check backend `/api/auth/refresh` response shape.

### Authorization
- **DAL pattern ✓** — `verifySession`/`verifyAdmin` in `dal.ts`, `server-only`, `React.cache` per-request dedupe. Exactly matches doc.
- **Server Component role check ✓** — admin pages call `verifyAdmin()` inside `cache()`'d data fetchers (`getAdminStats`, `getAdminUsers`, `getAdminUserDetail`). Role enforced at data source, not just layout. Matches doc: "majority of security checks should be performed as close as possible to your data source."
- **Layout auth check** — `(dashboard)/layout.tsx` calls `getSession()` → `redirect('/login')`. Doc warns layouts don't re-render on nav (Partial Rendering). Here fine because proxy already gates every request before layout. Belt + suspenders. OK.
- **Proxy role gate ✓** — `/admin/*` requires `payload.role === 'admin'` else redirect `/dashboard`. Matches doc "optimistic checks with Proxy."
- **Gap: athlete/trainer route role gates missing in proxy.** `proxy.ts` only gates `/admin`. Athlete routes (`/athlete/*`) and trainer routes (`/trainer/*`) NOT role-gated at edge. Server-side: pages are `"use client"` (no `verifySession`/role check in page component) → rely on client `DashboardClientShell` + Go backend 403. Doc wants checks close to data source. Client pages fetch via React Query → Go backend enforces role via JWT middleware. Acceptable but **gap vs checklist**: no server-side role gate for `/athlete/*`, `/trainer/*`. Backend is last line of defense.
- **Gap: trainer `clients/page.tsx` has client-side role check** (`if user.role !== 'trainer'` → redirect). Client-only, bypassable. Backend enforces. Doc says don't rely on client checks alone. OK because backend gates, but note.

### Data Access Layer
- **DAL ✓** — `dal.ts` exactly mirrors doc pattern: `server-only`, `cookies()`, `decrypt`, `cache()`, `verifySession` returns `{isAuth, userId, role, accessToken}`.
- **DTO pattern** — not used. `getAdminUserDetail` returns full `AdminUserListItem` from backend. Backend already strips password hash. Low risk but doc recommends DTO for field-level exposure control. Skip unless backend leaks sensitive fields.
- **`serverFetch` ✓** — forwards Bearer token, `cache: 'no-store'`, layers `unstable_cache` above. Correct.
- **Gap:** `getLatestBodyMeasurementCached` / `getTrainerProfileCached` / `getWorkoutPlanCached` use `unstable_cache` with `verifySession` inside — session read at cache-miss time only. On cache HIT, `verifySession` NOT called → no auth check for that request. Doc: "for static routes that share data between users, data fetched at build time... use Proxy to protect." These caches per-user-keyed? No — key arrays are `['latest-body-measurement']` etc, NOT keyed by userId. **Bug:** cached data from user A could be served to user B if cache key lacks userId. **Verify:** does `unstable_cache` namespace by request? No — cross-request by default. **CRITICAL: cache keys must include userId or session identifier, otherwise data leaks between users.**

### Route Handlers
- `/api/auth/session` GET/POST/DELETE ✓ — matches doc Route Handler auth pattern (reads cookie server-side).
- **Gap:** GET handler returns `accessToken` in JSON body to client. Intentional (client needs token for Bearer header to Go backend). But doc recommends `taintUniqueValue` for client-exposed sensitive data. Access token in JSON response = exposed to client JS by design. Accept given architecture (Go backend is token issuer, Next is passthrough).
- **Gap:** POST handler accepts `accessToken`/`refreshToken`/`userId`/`role` from request body and trusts them. No verification caller actually authenticated — any client JS can POST arbitrary tokens + userId + role to set session cookie. **Security risk:** if XSS achieved, attacker can forge session cookie with arbitrary role. Mitigation: tokens are real Go-backend JWTs so backend rejects forged ones, but `role` in cookie is trusted by proxy for route gating. **Gap:** verify role against Go backend `/api/users/me` before setting cookie, or drop role from cookie and read server-side on each request.

### Context Providers
- Not used for auth. Zustand `authStore` (client) + DAL (server). Correct — doc says context only works in Client Components.

---

## Implementation Log (2026-08-02)

All actionable fixes implemented and validated. No new type errors; `authStore.test.ts` 10/10 pass; pre-existing test/type failures unchanged (confirmed via `git stash` comparison).

### Fix #1 (CRITICAL) — dal.ts cache keys: ALREADY RESOLVED, no change needed
Commit `cd3eb0b` (same day) refactored `dal.ts` from `unstable_cache` → `'use cache'` directive. Per Next.js `use-cache.md` (line 78-85), a cache entry's key includes "Serializable arguments — Props or function arguments." All four cached functions now take the user-specific `accessToken` as an argument, so it IS part of the cache key → user A and user B (different tokens) get different cache entries → no cross-user leak. `getLatestBodyMeasurementCached` / `getTrainerProfileCached` additionally include `userId`. The original `unstable_cache` static-key bug described in this review no longer exists. Left as-is to avoid regression.

### Fix #2 (HIGH) — POST /api/auth/session no longer trusts client `role`
**`frontend/src/app/api/auth/session/route.ts`**: POST handler now verifies the `accessToken` against the Go backend (`GET /users/me`) and uses the **backend-returned** `userId` + `role` (authoritative) to build the session cookie — the client-provided `userId`/`role` are ignored entirely. Returns 401 if the token is rejected by the backend, 502 on network failure. This prevents an XSS-compromised client from forging an arbitrary role in the session cookie (which the proxy trusts for route gating).
**`frontend/src/stores/authStore.ts`**: `login` and `refreshAccessToken` POST only `{ accessToken, refreshToken }` (dropped `userId`/`role` — the server now derives them).

### Fix #3 (MEDIUM) — decryptCache bounded: ALREADY DONE, no change needed
`frontend/src/proxy.ts` already has `DECRYPT_CACHE_MAX = 1000` with FIFO eviction (`decryptCacheOrder` queue). Implemented earlier the same day as part of the memory-usage plan.

### Fix #4 (MEDIUM) — athlete/trainer role gates added in proxy
**`frontend/src/proxy.ts`**: added `isAthleteRoute()` + `isTrainerRoute()` (mirroring `isAdminRoute` with locale-prefix stripping) and optimistic role gates: `/athlete/*` requires `role === 'athlete'`, `/trainer/*` requires `role === 'trainer'` (else redirect to `/dashboard`, which itself role-routes). The server DAL (`verifySession`/`verifyAdmin`) and Go backend remain the authoritative enforcers; this closes the gap where athlete/trainer routes had no edge-level role check.

### Fix #5 (LOW) — refresh token split into a dedicated cookie
**`frontend/src/lib/session.ts`**: added `REFRESH_COOKIE_NAME = 'refresh_token'`; removed `refreshToken` from `SessionPayload` (and thus from the session JWT) so a leak of the session cookie no longer exposes the long-lived refresh token.
**`frontend/src/app/api/auth/session/route.ts`**: POST sets a separate HttpOnly `refresh_token` cookie (Secure in prod, SameSite=lax, Path=/); GET returns `refreshToken` read from that cookie; DELETE clears both cookies.
**`frontend/src/proxy.ts`**: rolls the refresh-token cookie alongside the session on each request (preserves the rolling-session behaviour).
**`frontend/src/stores/authStore.ts`**: `initializeAuth` now restores **both** tokens to the in-memory `tokenService` via `setTokens(accessToken, refreshToken)` — this also fixes a pre-existing gap where the refresh token was never restored after a page refresh.
> Deviation from checklist: used `sameSite: 'lax'` + `path: '/'` instead of the suggested `sameSite: 'strict'` + `Path: /api/auth/refresh`. `strict` would prevent the refresh cookie from being sent on cross-site top-level navigation, breaking refresh-after-external-link; the restricted `Path` is incompatible with the client-side refresh architecture (refresh goes directly to the Go backend, not a Next.js route). `lax` + separate cookie still achieves the primary goal (refresh token not bundled in the session JWT).

### Fix #6 (LOW) — refresh-token rotation handled defensively
**`frontend/src/lib/api/authApi.ts`**: refresh response type extended with `refreshToken?: string`.
**`frontend/src/stores/authStore.ts`**: `refreshAccessToken` now reads an optional `newRefreshToken` from the refresh response and uses `effectiveRefreshToken = newRefreshToken || refreshToken`. The current Go backend (`RefreshToken` handler) returns only `{ message, accessToken }` (no rotation — confirmed in `auth_handler.go`), so the old token is reused. If the backend adds rotation later, the frontend will automatically pick up the new token.

### Fix #7 (LOW) — DTO for admin user detail: SKIPPED
Backend `UserResponse` (built in `auth_handler.go:142-151`) explicitly excludes the password hash. The checklist itself says "Skip unless backend leaks sensitive fields." No change.

### Files changed
- `frontend/src/lib/session.ts` — `REFRESH_COOKIE_NAME`, `SessionPayload` sans `refreshToken`, export.
- `frontend/src/app/api/auth/session/route.ts` — backend role verification (POST), refresh cookie (POST/GET/DELETE).
- `frontend/src/lib/api/authApi.ts` — optional `refreshToken` in refresh response type.
- `frontend/src/proxy.ts` — athlete/trainer route gates + refresh-cookie rolling.
- `frontend/src/stores/authStore.ts` — drop client `role`/`userId` from POST; restore both tokens on init; defensive rotation.
- `frontend/src/test/stores/authStore.test.ts` — GET mock includes `refreshToken`; assertion for refresh-token restoration.


### `taintUniqueValue` / `taintObjectReference`
- Not used. Access token intentionally exposed to client (needed for Bearer header). Low risk per architecture. Skip.

## Priority fixes

1. **CRITICAL** — `unstable_cache` keys in `dal.ts` (`getLatestBodyMeasurementCached`, `getTrainerProfileCached`, `getWorkoutPlanCached`, `getWorkoutPlanAssignmentsCached`) lack userId in key → cross-user data leak risk. Add userId to cache key arrays.
2. **HIGH** — `POST /api/auth/session` trusts `role` from client body. Verify role against Go backend before setting cookie, or remove role from cookie + read server-side.
3. **MEDIUM** — Bound `decryptCache` Map in `proxy.ts` (LRU cap, e.g. 1000 entries).
4. **MEDIUM** — Add server-side role gate for `/athlete/*` and `/trainer/*` (proxy or page-level `verifySession` + role check). Currently client-only.
5. **LOW** — Split refresh token into separate cookie with stricter attrs (`Path: /api/auth/refresh`, `sameSite: 'strict'`).
6. **LOW** — Verify `refreshAccessToken` handles refresh-token rotation if Go backend issues new refresh token.
7. **LOW** — Consider DTO layer for admin user detail if backend ever exposes sensitive fields.

## What's correct (keep)

- DAL `server-only` + `React.cache` + `verifySession`/`verifyAdmin` — textbook match to doc.
- HttpOnly + secure + sameSite cookie attrs ✓.
- In-memory token storage (no localStorage XSS surface) ✓.
- Proxy optimistic auth + role gate for `/admin` ✓.
- Three-layer defense (edge/server/client) on same cookie ✓.
- `serverFetch` Bearer forwarding + `no-store` + `unstable_cache` layering ✓.