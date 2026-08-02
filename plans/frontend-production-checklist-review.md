# Frontend Production Checklist Review

**Date:** 2026-07-30
**Source:** `frontend/node_modules/next/dist/docs/01-app/02-guides/production-checklist.md`
**Scope:** `@frontend` (Next.js 16 App Router)

## Status: Analysis complete. No edits applied. Awaiting act-mode go-ahead.

## Automatic optimizations (defaults)

- Server Components default ✓. But most pages `"use client"` → SPA-like, heavy client JS. Dashboard layout is Server Component (calls `getSession`→`cookies`) → whole `(dashboard)` tree forced dynamic. Intentional (auth-gated), accept.
- Code-split / prefetch / prerender: defaults, no override.

## Routing & rendering

- Layouts ✓ (`[locale]`, `(auth)`, `(dashboard)`).
- Error handling: `global-error.tsx` ✓ exists. **Gap:** no route-level `error.tsx` anywhere, no `not-found.tsx` (404). Checklist wants catch-all errors + 404. `global-error.tsx` renders bare `<NextError statusCode={0} />` — no i18n, no recovery UI, not accessible.
- `<Link>`: default prefetch ✓.
- Request-time APIs: `cookies()` in dashboard layout + `searchParams` in home → dynamic. Intentional, wrapped usage OK.

## Data fetching & caching

- DAL `dal.ts` is `server-only` ✓, `React.cache` per-request dedupe ✓, `unstable_cache` + `revalidate` + tags ✓. Good pattern.
- Route Handler `/api/auth/session` ✓. DAL calls Go backend direct (not route handler from RSC) ✓ correct.
- **Gap:** no `loading.tsx` anywhere. Streaming only via `<Suspense>` in 3 admin pages. Rest of app blocks on client React Query.
- `serverFetch` uses `cache: 'no-store'` then layers `unstable_cache` ✓ correct.

## UI & accessibility

- Forms: TanStack Form + Zod client-side, mutations via React Query → Go API. **Deviation:** checklist recommends Server Actions for form submit + server validation. This app is client-form architecture. Intentional (JWT + Go backend), accept but note.
- Global 404: **missing**.
- Font Module ✓ (`Inter`, `Geist_Mono` via `next/font/google`).
- `<Image>`: used in `ImageWithFallback` + `TrainerAvatar`, **but both set `unoptimized` AND `next.config` sets `images.unoptimized: true` globally** → image optimization fully disabled. Checklist wants optimization. If external (Unsplash) domains, configure `images.remotePatterns` instead and drop `unoptimized`.
- `<Script>`: theme script inline in `<head>` (FOUC prevention) — acceptable, not third-party.
- ESLint ✓: `eslint-config-next/core-web-vitals` + `typescript` (includes `jsx-a11y`).

## Security

- Tainting: not used (low-risk, tokens in encrypted JWT cookie).
- Server Actions: N/A. Auth via `proxy.ts` (middleware gate) + DAL `verifySession`/`verifyAdmin`. DAL is `server-only` ✓, admin pages enforce role inside DAL functions ✓ — matches checklist "don't rely on proxy/layout/page checks alone."
- **Gap:** no CSP. `proxy.ts` sets cookies + redirects only, no security headers (`Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`).
- Rate limiting: none frontend (backend job).
- Env vars: `.gitignore` has `.env*` ✓. `NEXT_PUBLIC_` prefix correct (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`) ✓. `SESSION_SECRET` server-only, throws if missing ✓.

## Metadata & SEO

- **Gap:** metadata only in `[locale]/layout.tsx` (static title/desc). No per-page `metadata`/`generateMetadata`. No OG images, no `sitemap.ts`, no `robots.ts`. Landing is public → should have metadata. Auth-gated routes low priority.

## Type safety

- TS `strict` ✓, Next plugin ✓.

## Before production

- Lighthouse: not run (plan mode).
- **Gap:** `useReportWebVitals` not used → no Core Web Vitals reporting (Sentry has perf traces but no CWV hook).
- **Gap:** `@next/bundle-analyzer` not installed → no bundle inspection.

## Extra issues found (not in checklist)

- `api-client.ts:29` — `console.log('API Request URL:', url)` debug log left in prod client code. Leaks endpoints, noisy console. Remove or gate `NODE_ENV === 'development'`.
- `api-client.ts:47` — `'X-Abbreviate': 'true'` header added only when `AbortController` exists (i.e. when `timeout` set). Suspicious conditional, likely leftover. Verify intent.
- `proxy.ts:34` — in-memory `decryptCache` `Map` unbounded, no size cap. Long-running Node instance → memory creep. Minor.
- `global-error.tsx` — no i18n, no recovery button. Upgrade for accessibility/UX.

## Priority fixes

1. Add `not-found.tsx` (404) + route-level `error.tsx` for dashboard groups.
2. Remove `console.log` in `api-client.ts`; audit `X-Abbreviate` header.
3. Add CSP + security headers in `proxy.ts` response.
4. Re-enable `<Image>` optimization: drop global `images.unoptimized`, set `images.remotePatterns` for Unsplash, remove per-image `unoptimized`.
5. Add `loading.tsx` to dashboard routes for streaming.
6. Landing page `metadata` + `opengraph-image`.
7. Install `@next/bundle-analyzer`, add `useReportWebVitals` → Sentry.
8. Bound `decryptCache` size (LRU or cap).
