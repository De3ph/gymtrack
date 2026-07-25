# Auth Flow — Login/Logout Bug Review & Fix Plan

## TL;DR

> **Quick Summary**: After logout, navigating to `/tr/dashboard` (or any dashboard route) shows the user as still logged in. Root cause: `DashboardClientShell.handleLogout` calls `authStore.logout()` (which fires `DELETE /api/auth/session` as fire-and-forget) and then immediately does `window.location.href = loginUrl`. The hard navigation aborts the in-flight DELETE, so the HttpOnly `session` cookie is **never deleted**. All three auth gates (edge `proxy.ts`, server `(dashboard)/layout.tsx`, client `initializeAuth`) then read the surviving cookie and re-admit the user.
>
> **Deliverables**:
> - `authStore.logout` becomes truly async and awaits cookie deletion (with `keepalive` belt-and-suspenders)
> - `handleLogout` awaits `logout()` before hard-navigating
> - `handleAuthError` gets the same await-before-redirect treatment
> - Backend logout called *before* tokens are cleared (so a future blocklist works)
> - `proxy.ts` decrypt-cache footgun documented/hardened
> - Unit test updated for the new async logout contract
>
> **Estimated Effort**: Short
> **Critical Path**: Fix A → Fix B → Fix E (test) → manual QA

---

## Context

### Original Request
> auth flow broken. after logout, when navigating to /tr/dashboard page shows user logged in. review login-logout flow. detect bugs and suggest fixes

This document is the **plan only** — no implementation yet.

### How the flow works today

**Login** (`frontend/src/stores/authStore.ts`):
`authApi.login` → store tokens in memory (`tokenService`) → `POST /api/auth/session` sets the encrypted `session` HttpOnly cookie (7d) → `router.push('/dashboard')`.

**Session recovery** — three layers gate dashboard access, **all reading the same HttpOnly cookie**:
1. **Edge** — `frontend/src/proxy.ts`: decrypts cookie (with a 5s in-memory `decryptCache`); redirects to `/login` if absent/invalid. Role-gates `/admin`.
2. **Server** — `frontend/src/app/[locale]/(dashboard)/layout.tsx`: `getSession()` (from `frontend/src/lib/dal.ts`) decrypts the cookie via React.cache; `redirect('/login')` if absent.
3. **Client** — `frontend/src/app/[locale]/(dashboard)/DashboardClientShell.tsx`: `useEffect` runs `initializeAuth()` → `GET /api/auth/session` → restores `accessToken` in memory → `userApi.getCurrentUser()` → sets `isAuthenticated: true`. Also shows an auth-gate overlay + countdown redirect when `!isAuthenticated`.

**Logout** (`DashboardClientShell.handleLogout` → `authStore.logout`):
```ts
const handleLogout = useCallback(() => {
  logout();                      // NOT awaited
  window.location.href = loginUrl; // hard navigation IMMEDIATELY
}, [logout, loginUrl]);

logout: () => {
  tokenService.remove()
  set({ user: null, token: null, isAuthenticated: false, isLoading: true, isInitialized: false })
  fetch(SESSION_API, { method: 'DELETE' }).catch(() => {})  // fire-and-forget
  authApi.logout().catch(() => {})                            // fire-and-forget
}
```

Backend `POST /api/auth/logout` (`backend/internal/api/handlers/auth_handler.go:216`) is currently a **no-op** — returns `200` without validating or blacklisting anything. So the **only** thing that actually ends the session is `DELETE /api/auth/session` deleting the cookie.

### Key files
- `frontend/src/stores/authStore.ts` — `login`, `logout`, `initializeAuth`, `handleAuthError`, `refreshAccessToken`
- `frontend/src/app/[locale]/(dashboard)/DashboardClientShell.tsx` — client auth gate + `handleLogout`
- `frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx` — role dashboard (has a correct `handleAuthFail` reference pattern)
- `frontend/src/app/[locale]/(dashboard)/layout.tsx` — server-side `getSession()` gate
- `frontend/src/app/api/auth/session/route.ts` — `GET`/`POST`/`DELETE` session cookie handlers
- `frontend/src/lib/dal.ts` — `getSession` / `verifySession` / `verifyAdmin` (server-only, React.cache'd)
- `frontend/src/lib/session.ts` — `encrypt`/`decrypt`/`updateSession`, `SESSION_COOKIE_NAME`
- `frontend/src/proxy.ts` — edge middleware: i18n + auth guard + 5s `decryptCache` + `updateSession` cookie refresh
- `frontend/src/lib/token-service.ts` — in-memory token singleton
- `frontend/src/lib/api/api-client.ts` — attaches `Authorization: Bearer <accessToken>` from `tokenService`
- `frontend/src/lib/api/authApi.ts` — `login`/`register`/`refreshToken`/`logout`
- `frontend/src/components/layout/dashboard-nav.tsx` + `MobileNav.tsx` — logout buttons (call `onLogout`)
- `backend/internal/api/handlers/auth_handler.go` — `Logout` is a no-op
- `frontend/src/test/stores/authStore.test.ts` — existing unit tests

---

## Bugs Detected

### 🐛 Bug #1 (PRIMARY — reproduces the exact symptom): cookie-deleting DELETE is cancelled by the hard navigation
`handleLogout` calls `logout()` then immediately sets `window.location.href`. `logout()` fires `DELETE /api/auth/session` as **fire-and-forget** (no `await`, no `keepalive`). The hard navigation unloads the document and **aborts in-flight fetches**, so the `DELETE` never reaches the server → the `session` HttpOnly cookie is **never deleted**.

Now when the user navigates to `/tr/dashboard`:
- `proxy.ts` sees the cookie (or its 5s `decryptCache` hit) → allows access, no redirect.
- `(dashboard)/layout.tsx` `getSession()` → cookie valid → does **not** redirect → renders the shell.
- `DashboardClientShell.initializeAuth()` → `GET /api/auth/session` returns the `accessToken` → fetches user → `isAuthenticated: true` → **dashboard renders fully logged in.**

This is precisely the reported behavior. (Note: `memory-bank/activeContext.md` "Logout Redirect Fix" that added `window.location.href = ROUTES.LOGIN` is what introduced this race — the redirect now runs *before* the cookie is cleared.)

> Reference for the correct pattern (already in the codebase): `dashboard/page.tsx` `handleAuthFail` does it right — `fetch(DELETE).finally(() => window.location.href = loginUrl)` (awaits via `.finally`). The logout path just doesn't.

### 🐛 Bug #2 (contributing): `logout()` lies about being a `Promise<void>`
The interface declares `logout: () => Promise<void>`, but the impl is synchronous and returns `undefined`. Callers *can't* await cleanup even if they wanted to — which is why `handleLogout` doesn't.

### 🐛 Bug #3 (contributing / latent security): backend logout called *after* tokens are cleared
`tokenService.remove()` runs before `authApi.logout()`. `api-client` attaches `tokenService.getAuthHeader()` as `Authorization`, so the backend logout ships **with no auth header** and can't blacklist the token. Today the backend is a no-op so it's harmless, but the moment token blocklisting is added, logout won't invalidate the server-side token. Order should be reversed.

### 🐛 Bug #4 (minor / flash): `proxy.ts` `decryptCache` not invalidated on logout
The 5s in-memory cache (`cachedDecrypt`) keeps a decrypted payload for up to 5s after the cookie is deleted. Post-logout navigation within that window passes the edge guard using stale data (the server `getSession()` still catches it and redirects, so you get an extra redirect/flash rather than "logged in"). It's a correctness footgun in mutable middleware state used for auth decisions.

### 🐛 Bug #5 (same class as #1): `handleAuthError` repeats the fire-and-forget-DELETE-then-navigate race
On a 401 it does `fetch(SESSION_API, { method: 'DELETE' }).catch(() => {})` (fire-and-forget) then `window.location.href = ROUTES.LOGIN`. Same abort-on-navigation race; the cookie may survive, causing a load → recover → 401 → clear cycle (a flash) on next visit.

### 🐛 Bug #6 (minor): `isInitialized: false` on logout is semantically wrong
Resetting it to `false` makes any still-mounted `DashboardClientShell` re-run `initializeAuth()`. Combined with a surviving cookie this re-arms the recovery path. It should stay `true` so the auth gate can render immediately without another network round-trip.

---

## Proposed Fixes (file-by-file)

### Fix A — `authStore.logout` becomes async and awaits cookie deletion (fixes #1, #2, #3, #6)
**File**: `frontend/src/stores/authStore.ts`
```ts
logout: async () => {
  // 1. Invalidate server-side FIRST, while the access token is still in memory
  //    (api-client reads tokenService for the Authorization header).
  try {
    await authApi.logout()
  } catch { /* best-effort */ }

  // 2. Clear in-memory tokens
  tokenService.remove()

  // 3. Delete the HttpOnly session cookie — AWAIT so the browser actually
  //    deletes it before the caller navigates away.
  try {
    await fetch(SESSION_API, { method: 'DELETE', keepalive: true })
  } catch { /* best-effort */ }

  // 4. Reset client state. Keep isInitialized: true so the auth gate can
  //    render immediately instead of re-running initializeAuth().
  set({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
  })
}
```
- Interface stays `logout: () => Promise<void>` — now it's truthful.
- `keepalive: true` is belt-and-suspenders: even if a future caller navigates without awaiting, the DELETE still completes.

### Fix B — `handleLogout` awaits `logout()` before navigating (fixes #1)
**File**: `frontend/src/app/[locale]/(dashboard)/DashboardClientShell.tsx`
```tsx
const handleLogout = useCallback(async () => {
  await logout();                  // cookie is now actually deleted
  window.location.href = loginUrl; // safe to hard-navigate for a clean slate
}, [logout, loginUrl]);
```
- `onLogout: () => void` prop in `dashboard-nav.tsx` / `MobileNav.tsx` stays compatible (an async fn is assignable to `() => void`).

### Fix C — apply the same await-before-redirect in `handleAuthError` (fixes #5)
**File**: `frontend/src/stores/authStore.ts` — in the 401 branch:
```ts
// await the DELETE (or rely on keepalive) before navigating
try {
  await fetch(SESSION_API, { method: 'DELETE', keepalive: true })
} catch { /* best-effort */ }

if (typeof window !== 'undefined') {
  if (window.__TANSTACK_QUERY_CLIENT__) {
    window.__TANSTACK_QUERY_CLIENT__.clear()
  }
  window.location.href = ROUTES.LOGIN
}
```

### Fix D — harden `proxy.ts` decrypt cache (fixes #4, optional)
**File**: `frontend/src/proxy.ts` — either:
- Drop the cache for the auth-gate path, **or**
- Lower the TTL sharply (e.g. `500ms`) since the server `getSession()` is the authoritative check anyway, **or**
- At minimum, document that this cache can serve stale auth for 5s after logout (comment only).

Recommended: lower `DECRYPT_TTL_MS` from `5_000` to `500`. The edge guard is a fast path; the server gate remains the source of truth.

### Fix E — update the existing test (fixes #1, #2, #6 contract)
**File**: `frontend/src/test/stores/authStore.test.ts` — the "should logout and clear auth state" test:
- Change `logout()` to `await logout()` (it's now a real Promise).
- Assert `isLoading: false` and `isInitialized: true` (was `isLoading: true`).
- Optionally assert the DELETE `/api/auth/session` handler was hit (MSW handler already registered in `beforeEach`).

---

## Work Objectives

### Core Objective
Make logout actually invalidate the session: the HttpOnly `session` cookie must be deleted server-side before the client navigates away, and the client auth gates must not re-admit a logged-out user from a stale cookie/cache.

### Concrete Deliverables
- `frontend/src/stores/authStore.ts`: async `logout` (await authApi.logout → tokenService.remove → await DELETE cookie → reset state with `isInitialized: true`); `handleAuthError` awaits/keepalives DELETE before redirect.
- `frontend/src/app/[locale]/(dashboard)/DashboardClientShell.tsx`: `handleLogout` awaits `logout()` then navigates.
- `frontend/src/proxy.ts`: lower `DECRYPT_TTL_MS` to `500` (or drop cache for auth path) + clarifying comment.
- `frontend/src/test/stores/authStore.test.ts`: `await logout()` and updated assertions.
- Memory-bank update: replace the "Logout Redirect Fix" note in `activeContext.md` with the corrected approach.

### Out of Scope (noted for later)
- Backend token blocklisting (`auth_handler.go` `Logout` is still a no-op). Fix A's ordering just makes a future blocklist work correctly.
- Consolidating the three auth gates into one (architectural, separate plan).
- `router.push` vs `window.location.href` consistency across the app.

---

## Validation Plan

1. **Unit tests**: `cd frontend && pnpm test -- authStore` — pass with updated assertions.
2. **Manual E2E**:
   - `cd frontend && pnpm dev` + `cd backend && go run cmd/server/main.go`
   - Log in → click Logout → paste `http://localhost:3000/tr/dashboard` in the same tab → **must redirect to login** (not show dashboard).
   - DevTools → Application → Cookies → `session` is gone immediately after logout.
   - Re-login still works end-to-end.
3. **Race check**: log out and immediately navigate to a protected route within 1s → must still redirect to login (proves the DELETE completed).
4. **Edge cache**: with Fix D applied, confirm no 5s stale-admit window post-logout.

---

## Risk / Rollback

- **Risk**: Slightly slower perceived logout (waits for one DELETE round-trip). Mitigated by `keepalive` and the fact it's a local route.
- **Rollback**: Revert `handleLogout` to sync and remove `keepalive` — but that reintroduces Bug #1. Prefer keeping the fix.
- **Compat**: `onLogout: () => void` props remain valid (async fn assignable to `() => void`). No consumer signature changes.

---
