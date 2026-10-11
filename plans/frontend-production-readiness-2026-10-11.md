# GymTrack Frontend — Production Readiness Plan

**Date:** 2026-10-11
**Scope:** `frontend/` (Next.js 16 App Router, React 19, React Query v5, Zustand, next-intl, Sentry, PWA)

Overall: codebase is in decent shape (clean architecture, DAL with `'use cache'`, Sentry wired, service worker correctly excludes personalized pages). The gaps are concentrated in build gating, security headers, auth hardening, and data-fetching performance.

---

## 🔴 Critical / Blockers

### 1. `typescript.ignoreBuildErrors: true` in `next.config.ts`
Production builds skip type checking entirely — every type regression ships silently.
**Action:** Remove the flag, fix resulting errors, make `tsc --noEmit` a CI gate if builds are memory-constrained.

### 2. No security headers
`next.config.ts` sets no `headers()`. Add:
- `Strict-Transport-Security` (HTTPS only)
- `Content-Security-Policy` — needs nonce-based script-src because of the inline theme script in `src/app/[locale]/layout.tsx` and Next's inline scripts
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`, `Permissions-Policy`

### 3. `NEXT_PUBLIC_API_URL` silently falls back to `http://localhost:8080/api`
Found in `src/lib/api/api-client.ts`, `src/app/api/auth/session/route.ts`, `src/lib/dal.ts`. If unset in prod, the app points at localhost instead of failing.
**Action:** single validated env module that throws at startup when unset.

### 4. Sentry production config verification
- `tunnelRoute: "/monitoring"` excluded in middleware matcher ✅ (already done)
- Confirm `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (CI-only) set in prod
- Confirm `widenClientFileUpload` source-map upload works in CI

---

## 🟠 Auth & Session

### 5. Proxy role gates are optimistic (by design) — remaining hardening
`src/proxy.ts` trusts the role in the session cookie; `POST /api/auth/session` verifies against the backend ✅. Remaining:
- 7-day rolling session, no idle timeout or revocation — stolen cookie valid 7 days even after password change. Consider session versioning or shortening lifetime.
- `updateSession` re-signs the JWT on **every** matched request. Throttle re-issue (e.g., only when >50% of life used).

### 6. Token refresh has no deduplication
Concurrent 401s can each trigger `authStore.refreshAccessToken()`.
**Action:** single-flight refresh promise in the store.

### 7. No automatic 401 → refresh → retry in `api-client.ts`
Expired access tokens surface as errors until `handleAuthError` logs the user **out** via `window.location.href = ROUTES.LOGIN`.
**Action:** intercept 401 once → attempt refresh → retry request → only then force logout.

### 8. Hard navigation on auth error
Full reload drops React Query cache/state. Use router push + `queryClient.clear()`.

---

## 🟡 Data Fetching / Performance

### 9. No React Query hydration
Zero usage of `dehydrate` / `HydrationBoundary` / `prefetchQuery`. Every dashboard page renders a spinner then fetches client-side, despite `dal.ts` having `'use cache'` getters.
**Action:** RSC prefetch + hydration boundary — biggest perceived-performance win available.

### 10. Audit inline queries in pages
- Stable `queryKey` structure
- `placeholderData` for pagination (lists flash empty on page change)
- Consistent error states

### 11. Error handling standardization
`retry: 1` with no backoff; ~15 scattered `console.error` + toast sites. Funnel all mutation errors through `src/lib/error-handler.ts`.

### 12. `console.error` in production code should report to Sentry
AuthStore, forms, dialogs — currently only unhandled exceptions reach Sentry.
**Action:** `Sentry.captureException` in handled error paths.

---

## 🟡 SEO / Discoverability (public pages)

### 13. No `robots.ts` / `sitemap.ts`
Add robots with `disallow: /athlete, /trainer, /admin, /api, /monitoring` and a sitemap for `/`, `/about`, `/login`, `/register`.

### 14. Minimal metadata
Only root layout + about page. Add `title.template: '%s | GymTrack'`, OG images, per-page titles where public-facing.

---

## 🟠 PWA / Service Worker

### 15. Hand-maintained `public/sw.js` with manual `CACHE_VERSION`
Easy to forget to bump. Generate at build time or version from build ID.

### 16. Verify PWA assets exist
`PRECACHE_URLS` references `/offline.html`, `/icons/icon-192.png`, `/icons/icon-512.png`. `cache.addAll` fails atomically — if any 404s, the SW never installs. Manifest also references `icon-maskable-*` icons. Verify all exist; test install on iOS Safari.

---

## 🟡 Reliability / Observability

### 17. Sentry privacy decision
Replay integration records sessions; fitness/health data is sensitive (GDPR/KVKK given `tr` locale). Decide on `sendDefaultPii`, masking config, and document it.

### 18. Frontend health check
Add `/api/health` route that verifies backend reachability for prod monitoring.

### 19. Document build memory flags
`enablePrerenderSourceMaps: false`, `webpackBuildWorker`, `preloadEntriesOnStart: false` are OOM workarounds — ensure CI notes prevent accidental removal.

---

## Minor (won't block, clean up before prod)

20. Verify `/login` redirects away when already authenticated (loop prevention).
21. `proxy.ts` detects locale via regex `^[a-z]{2}$` — use `routing.locales` list so adding a locale breaks loudly.
22. Run `pnpm analyze`; ensure heavy libs (`recharts`, `@tanstack/react-table`, `motion`, `embla-carousel`) are behind `next/dynamic`.
23. CI gates before deploy: `pnpm validate:i18n`, `pnpm lint`, `pnpm test:run`, `tsc --noEmit`.

---

## Suggested Order

| Phase | Items | Est. effort |
|-------|-------|-------------|
| 1 | #1 type gate, #2 security headers, #3 env validation | half a day |
| 2 | #5–#8 auth hardening (refresh dedupe, 401 retry, router logout) | 1–2 days |
| 3 | #9 RSC prefetch/hydration on hottest pages (workouts, meals, measurements) | 1–2 days |
| 4 | #12 Sentry on handled errors, #17 replay/privacy decision | half a day |
| 5 | #13/#14 SEO basics | half a day |
| 6 | #15/#16 PWA verification on real devices | half a day |
| 7 | #23 CI gates | half a day |

---

## Files Reviewed

- `frontend/package.json`, `frontend/next.config.ts`
- `frontend/src/proxy.ts` (middleware: auth guard + i18n)
- `frontend/src/lib/session.ts`, `frontend/src/lib/dal.ts`, `frontend/src/lib/token-service.ts`
- `frontend/src/lib/api/api-client.ts`
- `frontend/src/stores/authStore.ts`
- `frontend/src/app/api/auth/session/route.ts`
- `frontend/src/app/[locale]/layout.tsx`, `frontend/src/app/[locale]/providers.tsx`
- `frontend/src/app/[locale]/(dashboard)/layout.tsx`
- `frontend/src/instrumentation-client.ts`
- `frontend/public/sw.js`, `frontend/src/app/manifest.ts`
- Grep sweeps: console.* usage, query hydration patterns, metadata exports, error boundaries
