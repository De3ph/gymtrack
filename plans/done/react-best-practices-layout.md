# Vercel React Best Practices Implementation Plan

> Source: Vercel React Best Practices guide (69 rules across 8 categories)
> Status: Proposed
> Created: 2026-08-16

## Context

GymTrack is a two-sided fitness tracking platform (Next.js 16 + React 19 + TypeScript frontend, Go/Gin backend, PostgreSQL). This plan applies Vercel's React Best Practices to optimize the frontend.

## Current State Analysis

### Already Aligned (Good Foundations)

| Area | What's Already Done | Vercel Rule Alignment |
|------|-------------------|----------------------|
| **Auth/Token Management** | In-memory token service, HttpOnly cookie recovery, server-side session encryption | ✅ `server-auth-actions`, `server-no-shared-module-state` |
| **API Client** | Centralized fetch with auth headers, timeout support | ✅ Good base for `server-parallel-fetching` |
| **Route Structure** | `[locale]`, `(auth)`, `(dashboard)` route groups | ✅ Already implemented |
| **State Management** | TanStack React Query + Zustand with proper initialization | ✅ Foundation for `client-swr-dedup`, `rerender-*` rules |
| **Forms** | TanStack Form + Zod validation | ✅ Proper validation schema usage |

### Improvement Areas

#### CRITICAL: Eliminating Waterfalls

1. **`async-parallel`** — Use `Promise.all()` for independent operations:
   - Workout / meals / measurements data fetched in parallel instead of sequentially
   - Dashboard page fetches could run concurrently
2. **`async-defer-await`** — Move `await` into branches where actually used (several API calls await unnecessarily)
3. **`async-api-routes`** — Start promises early, await late in API routes

#### CRITICAL: Bundle Size Optimization

1. **`bundle-dynamic-imports`** — Heavy components (charts, editors, progress-charts) should use `next/dynamic`
2. **`bundle-barrel-imports`** — Verify no barrel file over-imports (check `lib/api` imports)
3. **`bundle-conditional`** — Load modules only when feature is activated

#### HIGH: Server-Side Performance

1. **`server-cache-react`** — Use `React.cache()` for per-request deduplication (trainer profiles, exercise catalog)
2. **`server-no-shared-module-state`** — Verify no module-level mutable request state in RSC/SSR
3. **`server-serialization`** — Minimize JSONB data passed to client components (workouts.exercises, meals.items)
4. **`server-parallel-fetching`** — Restructure nested fetches to parallelize per-item in `Promise.all`

#### MEDIUM-HIGH: Client-Side Data Fetching

1. **`client-swr-dedup`** — Consider SWR-style deduplication (currently using TanStack React Query which has similar, verify configured)
2. **`client-event-listeners`** — Deduplicate global event listeners
3. **`client-localstorage-schema`** — Version and minimize localStorage data (currently token service uses in-memory only — keep this pattern)

#### MEDIUM: Re-render Optimization

1. **`rerender-memo`** — Extract expensive work (charts, tables) into memoized components
2. **`rerender-functional-setstate`** — Use functional `setState` for stable callbacks (authStore, forms)
3. **`rerender-split-combined-hooks`** — Split hooks with independent dependencies (separate workout/meals/measurements queries)
4. **`rerender-use-deferred-value`** — Use `useDeferredValue` for expensive filter/sort operations
5. **`rerender-use-ref-transient-values`** — Use refs for frequent transient values (search inputs, date pickers)
6. **`rerender-derived-state`** — Subscribe to derived booleans, not raw values
7. **`rerender-no-inline-components`** — Don't define components inside components
8. **`rerender-transitions`** — Use `startTransition` for non-urgent updates

#### MEDIUM: Rendering Performance

1. **`rendering-content-visibility`** — Apply to long lists (workout history, measurements, client lists)
2. **`rendering-hoist-jsx`** — Extract static JSX outside components (navbar, footer, static headers)
3. **`rendering-usetransition-loading`** — Use `useTransition` for loading state
4. **`rendering-conditional-render`** — Use ternary, not `&&` for conditionals

#### LOW-MEDIUM: JavaScript Performance

1. **`js-cache-property-access`** — Cache object properties in loops
2. **`js-combine-iterations`** — Combine multiple filter/map into one loop
3. **`js-index-maps`** — Build Map for repeated lookups (e.g. exercise catalog)
4. **`js-early-exit`** — Return early from functions
5. **`js-hoist-regexp`** — Hoist RegExp creation outside loops
6. **`js-length-check-first`** — Check array length before expensive comparison

#### LOW: Advanced Patterns

1. **`advanced-effect-event-deps`** — Don't put `useEffectEvent` results in effect deps
2. **`advanced-event-handler-refs`** — Store event handlers in refs
3. **`advanced-init-once`** — Initialize app once per app load
4. **`advanced-use-latest`** — `useLatest` for stable callback refs

---

## Implementation Roadmap

### Phase 1: Critical Waterfall Fixes (Week 1)

- Refactor data fetching to use `Promise.all()` for independent operations
- Move `await` into conditional branches where values are actually used
- Restructure API routes to start promises early

**Purpose:** Eliminate CRITICAL waterfall chains in the most-used paths.

### Phase 2: Bundle Size & Dynamic Imports (Week 2)

- Identify heavy components for `next/dynamic` lazy loading
- Replace barrel imports with direct imports
- Add `bundle-preload` for critical navigation paths

**Purpose:** Reduce initial bundle size and time-to-interactive.

### Phase 3: Server-Side Performance (Weeks 3–4)

- Add `React.cache()` to pure components (trainer profiles, exercise catalog)
- Audit and fix any module-level mutable state
- Optimize JSONB serialization — minimize data passed to client
- Refactor nested fetches to parallelize per-item in `Promise.all`

**Purpose:** Reduce server render CPU, memory, and payload size.

### Phase 4: Re-render & Rendering Optimizations (Weeks 5–6)

- Add `memo()` to components rendering expensive calculations
- Implement `useDeferredValue` for filter/sort operations
- Apply `content-visibility` to long lists
- Use `useTransition` for non-urgent state updates

**Purpose:** Improve client-side interactivity and rendering performance.

### Phase 5: Advanced Patterns & Polish (Week 7)

- Apply advanced effect/event dependency rules
- Optimize JavaScript performance (cache property access, batch DOM changes)
- Review and refactor event handlers per advanced patterns

**Purpose:** Final polish and adherence to remaining rules.

---

## Validation Strategy

- Run existing tests: `cd frontend && pnpm test:run`
- Run E2E: `cd frontend && pnpm test:e2e`
- Verify no regressions in auth flow, workout logging, meal logging, measurements
- Check bundle size before/after with `next build`
- Use React DevTools profiler to measure render counts before/after re-render optimizations
---

## Implementation Status

**Date:** 2026-08-16 · **Branch:** `refactor/react-best-practice/v1`

### Just implemented (this pass)

| Rule | File(s) | Change |
|------|---------|--------|
| `rerender-use-deferred-value` | `ExerciseSelector.tsx` | Search query wrapped in `useDeferredValue` feeding `useDebounce` so the input stays responsive while expensive filtering derives from it |
| `rerender-memo` | `ExerciseSelector.tsx` | Joined `exercises` (muscleGroup + equipment), moved inside `useMemo` with `?? []` fallbacks in the callback so deps are stable query results |
| `rendering-content-visibility` | `ExerciseSelector.tsx` | Added `style={{ contentVisibility: "auto" }}` to each exercise card in the list |
| `rerender-memo` | `exercise-selector/ExerciseFilters.tsx` | Memoized `muscleGroupItems` and `equipmentItems` option arrays |

**Validation:**
- ESLint clean on both files (`npx eslint <files>` → 0 errors, 0 warnings).
- `tsc --noEmit` reports **no** errors in either changed file.
- Unit failures verified **pre-existing**: `MealForm.test.tsx` fails identically (6) with the changes stashed (branch has ~60 pre-existing TS errors in unrelated modules).

### Already done (prior work, see `plans/done/`)

- Waterfall elimination (client-detail page `Promise.all`, RSC shells).
- Bundle-size (dynamic-import charts/calendars, `framer-motion` → `motion/react`).
- Server-side performance (RSC data shells, `api/auth/session` fix).
- Client memoization audit + React Query cache config (bounded `staleTime`/`gcTime`).
- Client component memoization across high-traffic lists.

### Remaining (future work — lower priority)

- Re-render hygiene on remaining list components not yet memoized.
- `js-*` micro-optimizations (loop practice, hoisted RegExp, etc.).
- Advanced patterns (`useEffectEvent`, refs-based handlers).