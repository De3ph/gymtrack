# Frontend Memory Usage Plan

**Date:** 2026-07-30
**Source:** `frontend/node_modules/next/dist/docs/01-app/02-guides/memory-usage.md`
**Scope:** `@frontend` (Next.js 16.2.4 App Router)
**Runtime:** Build = Turbopack default (Next 16). Dev = webpack (explicit `--webpack`). Checklist is webpack-focused; split analysis accordingly.

## Status: Implemented (2026-08-02). Tasks 1,2,3,4,5,6,8,9 complete. Task 7 (preloadEntriesOnStart) deferred per plan.

## Checklist findings

### 1. Reduce dependencies
- **Gap:** `@next/bundle-analyzer` not installed. No bundle inspection. 137 client components. Heavy deps: `recharts`, `motion`, `embla-carousel-react`, `react-resizable-panels`, `@tanstack/react-table`. `lucide-react` `^0.563.0` barrel imports (Next tree-shakes, verify).
- 26 `.tsx` files over 200 lines. Largest: `sidebar.tsx` (675), `ProfileClient.tsx` (535), `BodyMeasurementForm.tsx` (415), `register/page.tsx` (409), `EditMealDialog.tsx` (390). Big client bundles.

### 2. `experimental.webpackMemoryOptimizations`
- **Gap:** not set in `next.config.ts`. Applies to webpack only. Dev uses `--webpack` → benefits. Build = Turbopack → N/A. Low-risk per doc. Add for dev memory.

### 3. `--experimental-debug-memory-usage`
- **Gap:** not in any script. Compatible with Turbopack build. Add `build:debug` script for one-off profiling. Incompatible with webpack build worker (N/A here, build = turbopack).

### 4. Heap profile / snapshot
- **Gap:** no profiling scripts. Doc: `node --heap-prof node_modules/next/dist/bin/next build`. Add `build:heap` script for Chrome DevTools heap analysis.

### 5. Webpack build worker
- N/A for build (Turbopack). Dev uses webpack but build worker is build-only. No action.

### 6. Webpack cache `Object.freeze({ type: 'memory' })`
- No custom `webpack` config in `next.config.ts`. Applies to webpack builds only. Build = Turbopack → N/A. Skip — would force webpack on build.

### 7. Disable static analysis (`typescript.ignoreBuildErrors`)
- Not set ✓ correct. Keep TS check ON. No action.

### 8. Disable source maps
- No `productionBrowserSourceMaps` / `experimental.serverSourceMaps` in config. Sentry config (`withSentryConfig`) likely enables source maps for stack traces. Disabling saves build memory but breaks Sentry symbolication. **Decision:** keep source maps for Sentry value. Accept memory cost. Disabling is escape hatch if build OOM.

### 9. Edge memory issues
- `proxy.ts` runs on Edge runtime. Module-level `decryptCache` `Map` (line 34) persists across invocations in same edge instance. Unbounded → memory growth. Next 16 ≥ v14.1.3 so base edge bug fixed, but app-level leak remains.
- `session.ts` imports `jose` — edge-compatible ✓.

### 10. Preloading entries (`experimental.preloadEntriesOnStart`)
- Not set → default `true` (preload all page modules at server start). 137 client components = large initial footprint. Consider `false` if startup memory tight. Trade-off: slower first request per route, lower baseline. Doc notes eventual parity if all pages hit. Defer until analyzer shows footprint.

## Extra findings (codebase-level, beyond checklist)

- **Client memoization near-zero:** only 1 file uses `useMemo`/`useCallback`/`React.memo` across 137 client components. Inline objects/functions recreated every render → GC pressure + React Query refetch churn. Hot lists (`WorkoutList` 305, `MealList` 204, `EditWorkoutDialog` 329) likely re-render children unnecessarily.
- `api-client.ts:29` — `console.log('API Request URL:', url)` runs every client request. Not memory leak but noisy + string allocs in dev console. Remove or gate `NODE_ENV`.
- `api-client.ts:47` — `'X-Abbreviate': 'true'` header set only when `AbortController` exists (timeout path). Suspicious conditional. Audit intent.
- `authStore.ts:213` — `window.__TANSTACK_QUERY_CLIENT__` global. Query cache cleared on auth error ✓ but verify `gcTime`/`staleTime` defaults not overridden to retain data indefinitely.
## Agent action plan (ordered by impact)

### Task 1 — Install + wire bundle analyzer
- Add `@next/bundle-analyzer` devDep. Add `analyze` script (`ANALYZE=true next build`). Conditional webpack analyzer wrapper in `next.config.ts`.
- Acceptance: `pnpm analyze` opens analyzer report.

### Task 2 — Enable `webpackMemoryOptimizations` for dev
- Add `experimental: { webpackMemoryOptimizations: true }` to `next.config.ts`. Dev-only effect (build = Turbopack).
- Acceptance: `pnpm dev` runs, lower peak memory vs before.

### Task 3 — Bound `decryptCache` Map in `proxy.ts`
- Add max-size eviction (e.g. 1000 entries, FIFO/LRU). Prevents edge memory growth.
- Acceptance: Map never exceeds cap; eviction tested.

### Task 4 — Add memory profiling scripts
- `build:debug` → `next build --experimental-debug-memory-usage`
- `build:heap` → `node --heap-prof node_modules/next/dist/bin/next build`
- Acceptance: scripts exist, run without error.

### Task 5 — Gate/remove `console.log` in `api-client.ts`
- Remove line 29 or wrap `if (process.env.NODE_ENV !== 'production')`. Audit `X-Abbreviate` header line 47.
- Acceptance: no console log in prod bundle.

### Task 6 — Client memoization audit (high-traffic lists)
- Add `useMemo`/`useCallback` to `WorkoutList`, `MealList`, `EditWorkoutDialog`, `BodyMeasurementCharts`, `CombinedTrainingCalendar`. Wrap derived arrays/objects + handlers. `React.memo` on list item children.
- Acceptance: reduced re-renders (verify with React DevTools profiler).

### Task 7 — Evaluate `preloadEntriesOnStart: false`
- Only if startup OOM observed. Add flag, measure baseline vs disabled. Defer until Task 1 analyzer shows footprint.

### Task 8 — Source map decision
- Document decision: keep source maps for Sentry symbolication. No config change. Note in plan that disabling is escape hatch if build OOM.

### Task 9 — React Query cache config audit
- Verify `gcTime`/`staleTime` defaults not overridden to retain data indefinitely. Check `QueryClient` instantiation.
- Acceptance: no unbounded query cache.

## What's correct (keep)

- TS strict check ON ✓ (no `ignoreBuildErrors`).
- `session.ts` edge-compatible (jose) ✓.
- Next 16 ≥ v14.1.3 → base edge memory bug fixed ✓.
- Build = Turbopack → webpack-specific memory issues N/A for production builds.

## Decision Log

### 2026-07-30 — Source maps kept for Sentry symbolication

- **Decision:** Source maps are KEPT (no `productionBrowserSourceMaps: false` or `experimental.serverSourceMaps: false` added to `next.config.ts`).
- **Rationale:** `withSentryConfig` from `@sentry/nextjs` enables source maps so that error stack traces can be symbolicated and attributed to original source locations. Disabling source maps would save build-time memory but would degrade Sentry's ability to provide actionable error reports.
- **Trade-off accepted:** The memory cost of generating and processing source maps during build is accepted in exchange for production observability value.
- **Escape hatch:** If build OOM (out-of-memory) errors occur during the Turbopack build, disabling source maps is the documented escape hatch. Set `productionBrowserSourceMaps: false` (and/or `experimental.serverSourceMaps: false`) in the `nextConfig` object as a temporary measure to reduce build memory pressure, then re-enable once the OOM root cause is resolved.
- **No config change required at this time.**
