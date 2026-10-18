# GymTrack Frontend — Production Readiness Plan

**Date:** 2026-10-11
**Scope:** `frontend/` (Next.js 16 App Router, React 19, React Query v5, Zustand, next-intl, Sentry, PWA)

Overall: codebase is in decent shape (clean architecture, DAL with `'use cache'`, Sentry wired, service worker correctly excludes personalized pages). The gaps are concentrated in build gating, security headers, auth hardening, and data-fetching performance.

---

## 🔴 Critical / Blockers

### 1. `typescript.ignoreBuildErrors: true` in `next.config.ts`
Production builds skip type checking entirely — every type regression ships silently.
**Action:** Remove the flag, fix resulting errors, make `tsc --noEmit` a CI gate if builds are memory-constrained.

### 2. ✅ No security headers — DONE
`next.config.ts` now sets `headers()` on `/:path*` with: `Strict-Transport-Security` (prod only), `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`.
Note: CSP uses `'unsafe-inline'` for `script-src` instead of nonce — deliberate tradeoff (nonce would force dynamic rendering on every route, breaking static prerender + PWA), documented in the config.

### 3. ✅ `NEXT_PUBLIC_API_URL` silently falls back to `http://localhost:8080/api` — DONE
New single validated env module `src/lib/env.ts` throws at startup in production when unset (dev keeps localhost fallback for zero-config `pnpm dev`). `api-client.ts`, `src/app/api/auth/session/route.ts`, `src/lib/dal.ts` all import from it now. Also validates `NEXT_PUBLIC_SITE_URL`.

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

### 6. ✅ Token refresh has no deduplication — DONE
Concurrent 401s could each trigger `authStore.refreshAccessToken()`. Now single-flight: module-level `refreshInFlight` promise in `authStore.ts` shared by all concurrent callers, cleared on settle so next expiry starts fresh. Tests: dedup (3 concurrent callers → 1 network refresh) + re-refresh after settle.

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

### 15. ✅ Hand-maintained `public/sw.js` with manual `CACHE_VERSION` — DONE
`CACHE_VERSION` is now stamped automatically: `scripts/stamp-sw-version.mjs` writes a content hash (sha256/16) of `sw.js` (version line normalized → idempotent) + every `PRECACHE_URLS` file + `src/app/manifest.ts` into `public/sw.js`. Wired into every build path (`build`, `build:debug`, `build:heap`, `build:inspect`, `analyze`); manual: `pnpm stamp:sw`. No git/`.next/BUILD_ID` dependency (works in Docker where `.git` is dockerignored).

### 16. ✅ Verify PWA assets exist — DONE (device check still manual)
`scripts/pwa-assets.mjs` resolves `PRECACHE_URLS` (incl. `OFFLINE_URL` identifier) + manifest icon `src`s and checks every file exists non-empty; `/manifest.webmanifest` treated as generated route (verifies `src/app/manifest.ts`). Gates: stamp script fails the build before `next build` (so `cache.addAll` can never 404) + Vitest `src/test/pwa/pwa-assets.test.ts` (assets, PNG signatures, absolute paths, stamped-version format). iOS Safari install test remains a manual pre-deploy step.

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
| 1 | #1 type gate, ~~#2 security headers~~ ✅, ~~#3 env validation~~ ✅ | half a day |
| 2 | #5–#8 auth hardening (refresh dedupe, 401 retry, router logout) | 1–2 days |
| 3 | #9 RSC prefetch/hydration on hottest pages (workouts, meals, measurements) | 1–2 days |
| 4 | #12 Sentry on handled errors, #17 replay/privacy decision | half a day |
| 5 | #13/#14 SEO basics | half a day |
| 6 | ~~#15/#16 PWA verification~~ ✅ — iOS Safari device check still manual | half a day |
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
