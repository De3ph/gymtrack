# GymTrack Frontend — Vercel React Best Practices Remediation Plan

**Source review:** Vercel React Best Practices (69 rules, 8 categories) applied to
`frontend/src/app/` and `frontend/src/components/`.

**Date:** 2026-07-12
**Branch:** `feature/postgresql-migration` (HEAD `585a65a`)
**Estimated total effort:** 4–6 working days for one engineer, broken into
**6 phases** that can be merged independently.

---

## 0. TL;DR — Priorities at a Glance

| # | Phase                                              | Impact      | Effort | Risk     |
|---|----------------------------------------------------|-------------|--------|----------|
| 0 | **Build is currently broken** (8 `framer-motion` imports) | CRITICAL    | 0.5 h  | Build-out |
| 1 | **Waterfalls** — client-detail page, landing page, root RSC split | CRITICAL    | 1.5 d  | Low      |
| 2 | **Bundle size** — dynamic-import charts & calendars, drop heavy imports | CRITICAL    | 1 d    | Low      |
| 3 | **Server-side data** — RSC shells for athlete/trainer pages, hoist `getLatest` to RSC, fix `api/auth/session` dynamic import | HIGH        | 1.5 d  | Medium   |
| 4 | **Re-render hygiene** — `useMemo`-as-effect bug, memoized list rows, filter-bar hook, lazy comments | MEDIUM      | 1 d    | Low      |
| 5 | **Misc cleanups** — query-key dedup, `useEffect` redirects, `js-*` micro-opts, ESLint rules | LOW–MEDIUM  | 0.5 d  | Low      |

> **Merge order is strict:** Phase 0 → 1 → 2 → 3 → 4 → 5.
> Phases 1 and 2 can be parallelised on separate branches; the rest are sequential.

---

## 0. PHASE ZERO — Fix the broken build (do this **first**, 30 minutes)

### Problem

`package.json` only has `"motion": "^12.38.0"` (the lightweight framer-motion
successor), but **8 files still import from `"framer-motion"`**. They are
unbuildable. Locally this is masked by Next's webpack alias fallback; in
production CI it will fail.

### Files

| File | Line | Import |
|---|---|---|
| `frontend/src/components/features/dashboard/DashboardShell.tsx` | 5 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/dashboard/AthleteDashboardContent.tsx` | 14 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/dashboard/TrainerDashboardContent.tsx` | 28 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/landing/LandingConsole.tsx` | 3 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/landing/LandingFeatureGrid.tsx` | 3 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/landing/LandingHero.tsx` | 5 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/landing/LandingProof.tsx` | 5 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |
| `frontend/src/components/features/landing/LandingRolePaths.tsx` | 5 | `import { motion, LazyMotion, domAnimation } from "framer-motion";` |

### Fix (8 edits)

Replace `from "framer-motion"` with `from "motion/react"` in all 8 files.
The API is identical for `motion`, `LazyMotion`, and `domAnimation` between
`framer-motion` >= 11 and `motion` >= 12.

```bash
cd frontend
rg -l "from \"framer-motion\"" src | xargs sed -i "s|from \"framer-motion\"|from \"motion/react\"|g"
pnpm build      # must succeed
pnpm lint       # no new errors
```

### Acceptance

- `pnpm build` succeeds.
- `pnpm lint` shows no new errors.
- Landing page animations still play (visual smoke test).

---

## 1. PHASE ONE — Eliminate waterfalls (1.5 days)

> **Rule refs:** `async-parallel`, `async-defer-await`, `async-api-routes`,
> `server-parallel-fetching`, `server-parallel-nested-fetching`,
> `async-cheap-condition-before-await`.

### 1.1 Fix the 4-call waterfall in `trainer/client/[username]/page.tsx`

**File:** `frontend/src/app/[locale]/(dashboard)/trainer/client/[username]/page.tsx:36-64`

The `queryFn` currently does:
```ts
const details = await relationshipApi.getClientDetails(username);   // BLOCKS 1
const [workoutsResp, mealsResp, measurementsResp, statsResp] = await Promise.all([...])  // then runs
```

**Refactor:** move all 5 fetches into a single `Promise.all`. Net effect: 1 RTT
instead of 2.

```ts
queryFn: async () => {
  const [details, workoutsResp, mealsResp, measurementsResp, statsResp] =
    await Promise.all([
      relationshipApi.getClientDetails(username),
      trainerClientApi.getClientWorkouts(username, { /* filters */ }),
      trainerClientApi.getClientMeals(username, { /* filters */ }),
      trainerClientApi.getClientMeasurements(username, { /* filters */ }),
      trainerClientApi.getClientStats(username),
    ]);
  return {
    athlete: details.athlete,
    stats: details.stats,
    workouts: workoutsResp.workouts,
    meals: mealsResp.meals,
    measurements: measurementsResp.measurements,
    workoutStats: statsResp.workoutStats,
    mealStats: statsResp.mealStats,
  };
}
```

**Impact:** ~1 RTT saved (50–150 ms in dev, 30–80 ms in prod).

### 1.2 Convert `app/[locale]/page.tsx` from "use client" to a Server Component

**File:** `frontend/src/app/[locale]/page.tsx`

**Current:** The landing page is a Client Component that runs
`initializeAuth()` (one HTTP call to `/api/auth/session`, then one to the
Go backend) inside `useEffect`, then redirects in a *second* `useEffect`.
First paint = full loading spinner.

**Target:** Server Component that:
1. Reads the session cookie via the `dal.ts` pattern (one `cookies()` call).
2. If logged in → `redirect()` server-side (no client waterfall).
3. If not → renders `<LandingClient />`, a thin client component holding
   the existing `useSearchParams` / `error=auth_required` alert logic.

**Skeleton:**

```tsx
// app/[locale]/page.tsx  (Server Component)
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";          // NEW: see Phase 3.1
import { ROUTES } from "@/lib/routes";
import { LandingClient } from "./LandingClient";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(
      session.role === "trainer"
        ? ROUTES.TRAINER_CLIENTS
        : ROUTES.ATHLETE_WORKOUTS
    );
  }
  return <LandingClient />;
}
```

The existing client logic (auth-error alert, redirect effects) moves to
`LandingClient.tsx`. Visual and functional behaviour unchanged.

**Impact:** zero-spinner first paint for unauthenticated visitors; 0 RTT
redirects (server `redirect()`).

### 1.3 Server-side redirect in `(dashboard)/layout.tsx` — replace `useEffect` redirect

**File:** `frontend/src/app/[locale]/(dashboard)/layout.tsx:24-29`

The layout runs `initializeAuth()` + redirect in `useEffect` on **every**
athlete/trainer page. Middleware (`proxy.ts`) already does the auth check, so
this client work is duplicate. Options:

| Option | Change | Trade-off |
|---|---|---|
| A | Remove the `useEffect` entirely; trust `proxy.ts`. | Cheapest, but loses in-tab SPA navigation cases. |
| B | Replace `useEffect` redirect with a server-side check in the layout using `cookies()` + `getSession()`. | More work, but covers middleware edge cases. |
| C | Keep the layout as a Server Component, do the role-gate there, return a `<DashboardClientShell>` that only does the nav. | Best of both. |

**Recommended:** Option C. The current `DashboardLayout` becomes:

```tsx
// app/[locale]/(dashboard)/layout.tsx  (Server Component)
import { getSession } from "@/lib/dal";
import { redirect } from "next/navigation";
import { DashboardClientShell } from "./DashboardClientShell";

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DashboardClientShell session={session}>{children}</DashboardClientShell>;
}
```

`DashboardClientShell.tsx` is the existing JSX minus the `useEffect` block,
plus the existing `DashboardNav`.

**Impact:** removes 1 RTT and a full client render from every auth-gated page
navigation.

### 1.4 Admin dashboard RSC fetches — no-op

**File:** `frontend/src/app/[locale]/(dashboard)/admin/page.tsx:22-24`

Currently the only server fetch is `getAdminStatsCached()`. No fix needed if
no other data is added. **Skip.**

### 1.5 `users-table-provider.tsx` query guard

**File:** `frontend/src/app/[locale]/(dashboard)/admin/users/_components/users-table-provider.tsx:60-73`

The `useQuery` is already a single fetch. The `enabled: isAuthenticated &&
user?.role === "admin"` guard correctly follows
`async-cheap-condition-before-await`. **No change.**

### 1.6 Remove duplicate dashboard route

**Files:**

- `frontend/src/app/[locale]/(dashboard)/page.tsx` — used by the route group.
- `frontend/src/app/[locale]/dashboard/page.tsx` — duplicate that re-renders
  the same layout+page.

The second file is **dead code**. Delete `app/[locale]/dashboard/page.tsx`
outright and remove the `/dashboard` literal from `ROUTES.DASHBOARD` if not
used elsewhere (`rg ROUTES.DASHBOARD src` — keep if referenced).

---

## 2. PHASE TWO — Bundle size optimisation (1 day)

> **Rule refs:** `bundle-barrel-imports`, `bundle-dynamic-imports`,
> `bundle-defer-third-party`, `bundle-conditional`, `bundle-preload`.

### 2.1 Dynamic-import `recharts` (charts pages) — biggest win

**Files** (eagerly import `recharts` and `@/components/ui/chart`):

- `frontend/src/components/features/body-measurement/BodyMeasurementCharts.tsx`
- `frontend/src/components/features/trainer/ClientProgressCharts.tsx`
- `frontend/src/components/features/trainer/progress-charts/ExerciseBreakdownChart.tsx`
- `frontend/src/components/features/trainer/progress-charts/MealTypeDistributionChart.tsx`
- `frontend/src/components/features/trainer/progress-charts/NutritionTrendsChart.tsx`
- `frontend/src/components/features/trainer/progress-charts/WorkoutVolumeChart.tsx`

`recharts` is ~120 kB gzipped. These components are only used on the
**Charts** tabs and on `trainer/client/[username]` — they are never part
of the initial render of an athlete or trainer page.

**Fix:** wrap each chart component in `next/dynamic`:

```tsx
// BodyMeasurementCharts.tsx
import dynamic from "next/dynamic";
const WeightChart = dynamic(
  () => import("./charts/WeightChart").then(m => m.WeightChart),
  { ssr: false, loading: () => <Skeleton className="h-[240px]" /> }
);
```

Where `<WeightChart>` is the existing inline `<ResponsiveContainer><LineChart>...</LineChart></ResponsiveContainer>` extracted into its own file
(see 2.2). Same pattern for the trainer progress-charts.

### 2.2 Extract chart sub-components from `BodyMeasurementCharts.tsx`

**File:** `frontend/src/components/features/body-measurement/BodyMeasurementCharts.tsx:60-265`

The file is **267 lines** with 3 charts in one function. Split into:

- `BodyMeasurementCharts/index.tsx` (orchestrator + filter + empty state)
- `BodyMeasurementCharts/WeightChart.tsx`
- `BodyMeasurementCharts/BodyFatChart.tsx`
- `BodyMeasurementCharts/PartsChart.tsx`

Then each can be `dynamic()`-imported in 2.1.

### 2.3 Dynamic-import `react-day-picker` on calendar tabs

**Files:**

- `frontend/src/components/features/workout/WorkoutCalendar.tsx`
- `frontend/src/components/features/meal/MealCalendar.tsx`
- `frontend/src/components/features/dashboard/CombinedTrainingCalendar.tsx`

All three import `@/components/ui/calendar` (which re-exports
`react-day-picker`). They are shown as the third tab in their pages
and the default tab in `CombinedTrainingCalendar`.

**Fix:** convert each into a thin wrapper + inner `dynamic(..., { ssr: false })`:

```tsx
// WorkoutCalendar.tsx
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
// ... other imports that don't pull recharts/calendar

const CalendarGrid = dynamic(
  () => import("./CalendarGrid").then(m => m.CalendarGrid),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
);
```

Where `CalendarGrid.tsx` is the JSX that imports the `Calendar` UI primitive.

**Important:** keep the data-fetching `useQuery` in the outer component so
the request fires immediately on tab switch, not after the dynamic chunk
arrives. (Rule: `async-suspense-boundaries`.)

### 2.4 Lazy-load `CommentThread` in workout/meal cards

**Files:**

- `frontend/src/components/features/workout/WorkoutList.tsx:34`
- `frontend/src/components/features/meal/MealCard.tsx:23`

The comments tree (CommentThread → CommentList → CommentItem + CommentForm)
is ~5 kB. It only matters when the user clicks the comments toggle.

**Fix:** replace the eager import with:

```tsx
// MealCard.tsx
import dynamic from "next/dynamic";
const CommentThread = dynamic(
  () => import("@/components/features/comments/CommentThread")
        .then(m => m.CommentThread),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full" /> }
);
```

**Impact:** ~5 kB removed from the initial meal/workout list bundle.

### 2.5 Avoid barrel imports from `@/components/ui`

Audit with:

```bash
rg "from \"@/components/ui\"" frontend/src
```

The shadcn-style `index.ts` barrel means `import { Button } from "@/components/ui"`
loads the *whole* barrel. Switch the heavy consumers to deep imports:

```bash
# Replace
import { Button, Card, Skeleton, Spinner } from "@/components/ui"
# With
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
```

Run this on the **top 10 most-imported barrel files** (run
`rg -c "from \"@/components/ui\"" frontend/src` to rank). After change,
re-verify build & lint.

### 2.6 Move `Providers` window global to lazy initialisation

**File:** `frontend/src/app/[locale]/providers.tsx:28-30`

```ts
// CURRENT
useEffect(() => {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}, [queryClient]);
```

Move the assignment to the `useState` initializer:

```ts
const [queryClient] = useState(() => {
  const client = new QueryClient({ /* ... */ });
  if (typeof window !== "undefined") {
    window.__TANSTACK_QUERY_CLIENT__ = client;
  }
  return client;
});
```

**Impact:** negligible runtime, but removes a render and the `useEffect` import.

---

## 3. PHASE THREE — Server-side performance (1.5 days)

> **Rule refs:** `server-auth-actions`, `server-cache-react`,
> `server-cache-lru`, `server-dedup-props`, `server-hoist-static-io`,
> `server-parallel-fetching`, `server-serialization`.

### 3.1 Add `getSession` to `dal.ts`

**File:** `frontend/src/lib/dal.ts:16-39`

Add a non-redirecting variant of `verifySession` that returns `null` when
not authenticated, so Server Components can branch without throwing:

```ts
// New: read-only session lookup (does not redirect).
export const getSession = cache(async () => {
  const payload = await getSessionPayload();
  if (!payload?.userId) return null;
  return {
    userId: payload.userId,
    role: payload.role,
    accessToken: payload.accessToken,
  };
});
```

**Consumers:** `app/[locale]/page.tsx` (Phase 1.2), `(dashboard)/layout.tsx`
(Phase 1.3), any future RSC shell that needs the user.

### 3.2 Add `getLatestBodyMeasurementCached` & hoist to RSC

**File:** `frontend/src/app/[locale]/(dashboard)/athlete/measurements/page.tsx:33-37`

Currently the page is a Client Component that fires a
`bodyMeasurementApi.getLatest()` `useQuery` *just to render a single
"Latest" card*. That's 1 RTT on every visit to the page.

**Fix:**

1. Add to `dal.ts`:
   ```ts
   export const getLatestBodyMeasurementCached = unstable_cache(
     async (): Promise<BodyMeasurement | null> => {
       const session = await verifySession();
       return serverFetch<BodyMeasurement | null>(
         "/body-measurements/latest",
         session.accessToken,
       );
     },
     ["latest-body-measurement"],
     { revalidate: 30, tags: ["body-measurements", "latest-body-measurement"] }
   );
   ```
2. Convert `athlete/measurements/page.tsx` to a Server Component shell
   that fetches the latest, then hands it to a `<MeasurementsClient latest={...} />`.

### 3.3 Trim `getAdminUsers` initial fetch from 500 to 25

**File:** `frontend/src/app/[locale]/(dashboard)/admin/users/page.tsx:22`

```ts
const initialData = await getAdminUsers({ limit: 500 });
```

This serialises up to 500 user records into RSC props even though the
client table paginates at 25. The client already has filters and pagination
via `UsersTableClient`. Drop the limit to **25** and pass the rest to client-side
fetching. If filters change, the client refetches anyway.

```ts
const initialData = await getAdminUsers({ limit: 25 });
```

**Impact:** smaller RSC payload, faster TTFB on `/admin/users`.

### 3.4 Convert `trainer/profile/page.tsx` to RSC shell

**File:** `frontend/src/app/[locale]/(dashboard)/trainer/profile/page.tsx`

Currently a Client Component that fires
`trainerCatalogApi.getMyProfile()` on mount. Hoist to RSC:

```tsx
// trainer/profile/page.tsx  (Server Component)
import { getTrainerProfileCached } from "@/lib/dal";
import { TrainerProfileClient } from "./TrainerProfileClient";

export default async function TrainerProfilePage() {
  const profile = await getTrainerProfileCached();
  return <TrainerProfileClient initialProfile={profile} />;
}
```

Add `getTrainerProfileCached` to `dal.ts` with `unstable_cache` (5 min
revalidate, tagged for mutation invalidation).

### 3.5 Convert `trainer/workout-plans/[id]/page.tsx` to RSC shell

Same pattern. Fetch `plan` and `assignments` server-side, pass to
`<TrainerWorkoutPlanDetailClient plan={...} assignments={...} />`. Saves 2 RTTs.

### 3.6 Convert `athlete/workouts/page.tsx` plan prefill to RSC

**File:** `frontend/src/app/[locale]/(dashboard)/athlete/workouts/page.tsx:56-60`

Currently the client reads `?planId=` and fires a `useQuery` for the plan
just to seed the form. Hoist the param read to a Server Component, fetch
the plan via `dal`, and pass to a client wrapper.

### 3.7 Hoist static I/O — already done

`Inter(...)` in `app/[locale]/layout.tsx:9`, `landing-variants.ts`,
`routes.ts`, `constants.ts` are all module-scoped. **No change.**

### 3.8 Fix broken dynamic import in `/api/auth/session/route.ts`

**File:** `frontend/src/app/api/auth/session/route.ts:12`

```ts
// CURRENT (anti-pattern)
const cookieStore = await import("next/headers").then((m) => m.cookies())
```

This hides a sync import behind a dynamic import — pointless and confuses
Next's bundler. Replace with:

```ts
// AFTER
import { cookies } from "next/headers"
// ...
const cookieStore = await cookies()
```

**Impact:** trivial, but the rule is clear: don't dynamic-import what you
need synchronously.

### 3.9 Cache session decrypt in `proxy.ts`

**File:** `frontend/src/proxy.ts:30-66`

`decrypt()` is called on every navigation. Wrap it in an in-memory LRU
keyed by cookie value with a TTL of 5 s:

```ts
// proxy.ts
const decryptCache = new Map<string, { payload: SessionPayload; exp: number }>();
const DECRYPT_TTL_MS = 5_000;

async function cachedDecrypt(cookie: string) {
  const hit = decryptCache.get(cookie);
  if (hit && hit.exp > Date.now()) return hit.payload;
  const payload = await decrypt(cookie);
  if (payload) {
    decryptCache.set(cookie, { payload, exp: Date.now() + DECRYPT_TTL_MS });
  }
  return payload;
}
```

**Caveat:** don't over-cache — a stale session could outlive a logout. 5 s
is a good compromise.

---

## 4. PHASE FOUR — Re-render hygiene (1 day) ✅ COMPLETED

> **Rule refs:** `rerender-defer-reads`, `rerender-memo`,
> `rerender-memo-with-default-value`, `rerender-dependencies`,
> `rerender-derived-state`, `rerender-derived-state-no-effect`,
> `rerender-functional-setstate`, `rerender-lazy-state-init`,
> `rerender-simple-expression-in-memo`, `rerender-split-combined-hooks`,
> `rerender-move-effect-to-event`, `rerender-transitions`,
> `rerender-use-deferred-value`, `rerender-use-ref-transient-values`,
> `rerender-no-inline-components`.

### 4.1 Fix `useMemo`-as-effect bug in `ExerciseSetInput` & `PlanSetInput` ✅

**Status:** Already implemented — both components already use `useEffect` (not `useMemo`), with stable-equality checks to prevent render loops.

### 4.2 Memoize list rows to prevent whole-list re-renders ✅

**Files:**

- `frontend/src/components/features/workout/WorkoutList.tsx` — ✅ Extracted inline Card rendering into `WorkoutCard` (new file, memo'd with `React.memo`). `WorkoutList` now uses `<WorkoutCard>` with stable callback props.
- `frontend/src/components/features/meal/MealList.tsx` — ✅ `MealCard` already memo'd.
- `frontend/src/components/features/body-measurement/BodyMeasurementList.tsx` — ✅ `BodyMeasurementListItem` already memo'd.
- `frontend/src/components/features/trainer/CoachRequestsList.tsx` — ⬜ **Not yet done** (inline Card rendering in `.map()` — extract `CoachingRequestRow` and memo).
- `frontend/src/components/features/comments/CommentList.tsx` (recursive) — ✅ `CommentNodeRow` is memo'd.
- `frontend/src/components/features/trainer/ClientCard.tsx` — ✅ Already memo'd.
- `frontend/src/components/features/workout-plan/WorkoutPlanCard.tsx` — ✅ Already memo'd.
- `frontend/src/components/features/trainer/TodayClientList.tsx` — ✅ `TodayClientRow` already memo'd.
- `frontend/src/lib/memo.ts` — ✅ `memoComponent` helper already exists.

### 4.3 Lift the `useState` + `useEffect` filter-bar pattern into a hook ✅

**Status:** `useDeferredFilter` hook already exists at `frontend/src/lib/hooks/use-deferred-filter.ts`. All three filter bars (`WorkoutFilterBar`, `MealFilterBar`, `BodyMeasurementFilterBar`) already use it.

### 4.4 Stabilise `CommentList` callbacks to stop whole-tree re-renders ✅

**Status:** `CommentList` already wraps `onStartReply` and `onCancelReply` in `useCallback`. `CommentNodeRow` is memo'd with `React.memo`.

### 4.5 Wrap lists in `useTransition` for filter changes ✅

**File:** `frontend/src/components/features/trainer/clients/page.tsx`

**Status:** Already uses `useDeferredValue` + `useMemo` for client-side search filtering.

### 4.6 `useDeferredValue` for the workouts/meals tabs ✅

**Status:** Filter values are already deferred via the `useDeferredFilter` hook in the filter bar components. The lists use the applied (non-pending) filter values for data fetching, naturally preventing stale renders.

### 4.7 Replace `useState`-then-`useEffect` for `pending` in filter bars with `useDeferredValue` ✅

**Status:** Already done via 4.3 hook implementation.

### 4.8 `useState` lazy init for `workoutId` default ✅

**Status:** `WorkoutsClient.tsx` already uses clean `useState("log")` — no ternary was present.

### 4.9 Stabilise `buildTree` in `CommentList` ✅

**Status:** `buildTree` now includes a reference-equality micro-cache: if the same `comments` array is passed (which it is, via `useMemo`), the function returns the cached result instead of re-building the entire tree.

### 4.10 Stop recreating inline components ✅

**Status:** 
- `TrainerDashboardContent.tsx` — `ClientRow` already extracted as a named component (not inline). ✅
- `WorkoutList.tsx` — Inline Card rendering extracted into `WorkoutCard`. ✅

### Outstanding items (low priority / tooling limitation)

- `CoachingRequestsList.tsx`: Extract inline `<Card>` rendering into a memo'd `CoachingRequestRow` component. Currently the 14-line Card block is inside `.map()`.
- `WorkoutCard.tsx` formatting: line 100 has minor alignment issue (closing `)` on same line as template literal).
- Update `MealCard.tsx`/`WorkoutCard.tsx` to use `AlertDialog` instead of `window.confirm` for delete confirmations (deferred to Phase 5).

Same pattern for `WorkoutList`, `MealList`, `BodyMeasurementList` — defer
the `search` and `filter` values so typing in the search box doesn't
freeze the table.

### 4.7 Replace `useState`-then-`useEffect` for `pending` in filter bars with `useDeferredValue` (no manual sync)

Once 4.3's hook exists, drop the manual `useEffect(() => setPending(filter))` —
just use `useDeferredValue(filter)` and bind inputs to it directly.

### 4.8 `useState` lazy init for `workoutId` default

**File:** `frontend/src/app/[locale]/(dashboard)/athlete/workouts/page.tsx:53`

`useState(planId ? "log" : "log")` is a no-op ternary. **Delete** the ternary.

### 4.9 Stabilise `buildTree` in `CommentList`

**File:** `frontend/src/components/features/comments/CommentList.tsx:26-47`

`buildTree` is a pure function and is called inside `useMemo([comments])`
already — **OK** — but it constructs new `Map` and arrays every time. Add
a `buildTreeByParent` micro-cache to avoid re-walking when comments
unchanged. Negligible but follows `js-cache-function-results`.

### 4.10 Stop recreating inline components

**Files:**

- `frontend/src/components/features/workout/WorkoutList.tsx` — inline `TodayClientRow`? No, but the `Card`-wrapped `div` with `onClick` is inline.
- `frontend/src/components/features/dashboard/TrainerDashboardContent.tsx:91-108` — inline `motion.div` + `button` for each client row.

**Fix:** extract `<ClientRow client onView={...} />` and `React.memo` it.

---

## 5. PHASE FIVE — Misc cleanups & ESLint (0.5 day)

> **Rule refs:** `client-swr-dedup`, `client-event-listeners`,
> `client-passive-event-listeners`, `client-localstorage-schema`,
> `js-batch-dom-css`, `js-index-maps`, `js-cache-property-access`,
> `js-cache-function-results`, `js-cache-storage`, `js-combine-iterations`,
> `js-length-check-first`, `js-early-exit`, `js-hoist-regexp`,
> `js-min-max-loop`, `js-set-map-lookups`, `js-tosorted-immutable`,
> `js-flatmap-filter`, `js-request-idle-callback`,
> `advanced-effect-event-deps`, `advanced-event-handler-refs`,
> `advanced-init-once`, `advanced-use-latest`,
> `rendering-animate-svg-wrapper`, `rendering-content-visibility`,
> `rendering-hoist-jsx`, `rendering-svg-precision`,
> `rendering-hydration-no-flicker`, `rendering-hydration-suppress-warning`,
> `rendering-activity`, `rendering-conditional-render`,
> `rendering-usetransition-loading`, `rendering-resource-hints`,
> `rendering-script-defer-async`.

### 5.1 Remove `localStorage` read in `trainer-profile-page` client

**File:** `frontend/src/app/[locale]/(dashboard)/athlete/trainers/[id]/page.tsx:46-59`

```ts
// CURRENT
const userStr = localStorage.getItem("user");
if (userStr) { ... setCurrentUserId(user.userId || user.id); }
refreshData().finally(() => setLoading(false));
```

User identity lives in the Zustand `useAuthStore` — read it from there:

```ts
const currentUserId = useAuthStore((s) => s.user?.userId?.toString() ?? "");
```

This removes the hydration risk and the extra render.

### 5.2 Unify `myTrainer` / `dashboard-my-trainer` query keys

**Files:**

- `frontend/src/components/features/dashboard/AthleteDashboardContent.tsx:60` uses `["dashboard-my-trainer"]`
- `frontend/src/components/features/athlete/MyTrainerButton.tsx:17` and `frontend/src/app/[locale]/(dashboard)/profile/page.tsx:31` use `["myTrainer"]`

Pick **one** canonical key (`["myTrainer"]`) and remove the duplicate.
**Rule:** `client-swr-dedup`.

### 5.3 Drop `withTiming` no-op wrapper

**File:** `frontend/src/components/features/meal/DailyNutritionSummary.tsx:23`

```ts
queryFn: () => withTiming("daily-meals-fetch", () => mealApi.getByDate(...))
```

If `withTiming` doesn't actually push to a real observability backend
(grep to confirm — `rg "withTiming" src/lib/performance.ts`), delete the
wrapper and the helper module.

### 5.4 Fix `AvailabilityCard` `findIndex` O(n) per slot

**File:** `frontend/src/components/features/trainer/AvailabilityCard.tsx:105-108`

```ts
{daySlots.map((slot) => {
  const actualIndex = availability.findIndex((s) => s === slot);
  ...
})}
```

For every slot we do an `O(n)` lookup. Build a `Map<slot, index>` once
outside the loop. **Rule:** `js-set-map-lookups` / `js-index-maps`.

```ts
const indexBySlot = new Map(availability.map((s, i) => [s, i]));
// ... indexBySlot.get(slot) inside the map
```

### 5.5 `TrainerDashboardContent` — single-pass filter+sort

**File:** `frontend/src/components/features/dashboard/TrainerDashboardContent.tsx:43-45`

```ts
const todayFocusClients = clients
  .filter((c) => c.relationship.status === "active")
  .sort((a, b) => dayjs(b.relationship.createdAt).valueOf() - dayjs(a.relationship.createdAt).valueOf());
```

Combine: do the sort first by `createdAt` desc, then `.find` the active
prefix (or single-pass with a tuple). Wrap in `useMemo([clients])`. **Rule:**
`js-min-max-loop`.

### 5.6 Cache dayjs parsing in filter bars

**Files:** `WorkoutFilterBar.tsx`, `MealFilterBar.tsx`, `BodyMeasurementFilterBar.tsx`

`dayjs(e.target.value).startOf("day").toISOString()` is called on every
keystroke. Cache by string key in a `useRef(new Map())` per bar. Minor
but follows `js-cache-function-results`.

### 5.7 Hoist static `regex`es

**Files:**

- `frontend/src/app/[locale]/(auth)/login/page.tsx:73,77` — `/^[\S]+@[\S]+\.[\S]+$/` and `/^[a-zA-Z0-9]{3,30}$/` are inside `onChange` callbacks. Hoist to module scope.
- `frontend/src/components/features/athlete/AcceptInvitationDialog.tsx:69,74` — `/^[a-zA-Z0-9]{3,30}$/` etc. — hoist.

**Rule:** `js-hoist-regexp`.

### 5.8 `useEffect` for transient values → ref

**File:** `frontend/src/app/[locale]/(dashboard)/athlete/measurements/page.tsx:31-53`

`justSubmittedRef` is correctly a `useRef` ✓. But the `useEffect` that
watches `activeTab` could use `useDeferredValue(activeTab)` and a derived
state instead. **Rule:** `rerender-use-ref-transient-values`.

### 5.9 ESLint config: enable the relevant rules

**File:** `frontend/eslint.config.mjs`

Add or enable:
- `react-hooks/exhaustive-deps` (catches 4.1 bug if `useMemo` becomes `useEffect`)
- `react-hooks/rules-of-hooks`
- `@next/next/no-img-element` (use `next/image`)
- `react/jsx-key`
- A custom rule banning `from "framer-motion"` (covered by tsc/find in Phase 0)

If not already on, add `eslint-plugin-react-compiler` (or
`eslint-plugin-react-hooks` with `exhaustive-deps: error`).

### 5.10 Replace `window.confirm` with shadcn `AlertDialog`

**Files:**

- `frontend/src/components/features/comments/CommentItem.tsx:134` — `confirm(t("item.delete_confirm"))`
- `frontend/src/components/features/meal/MealCard.tsx:84` — `confirm(t("card.confirm_delete"))`

These are jank in the browser. Replace with the existing
`AlertDialog` primitive. (Cosmetic but standard in this codebase.)

### 5.11 `useEffectEvent` for the menu `onClick` (future React 19 idiom)

Not strictly needed in v19 yet, but `advanced-event-handler-refs` applies
to several forms. Apply the `useRef(handler)` pattern in:
- `CommentList.tsx`'s `onStartReply`
- `WorkoutList.tsx`'s `handleRowClick`

### 5.12 Drop `withTiming`, `TRAINER_CLIENTS` re-route, and other dead code

```bash
rg "withTiming" src/lib
rg "TODO" src/components
```

Mark stale TODOs as resolved; remove `withTiming` and its tests.

---

## 6. Acceptance Checklist (per phase)

Each phase must pass **all** of the following before merge:

| Check | Command |
|---|---|
| Build succeeds | `pnpm build` |
| Lint clean | `pnpm lint` |
| Unit tests pass | `pnpm test:run` |
| E2E tests pass (at least the smoke) | `pnpm test:e2e` |
| Bundle size delta reported | `pnpm build` + check `out/` |
| Manual smoke: landing page first paint | Local dev |
| Manual smoke: athlete dashboard loads < 1 s | Local dev with throttled 3G |
| Manual smoke: admin users list (25 users) | Local dev |
| Manual smoke: workout detail comments expand | Local dev |

Add a brief note to the PR description with `pnpm dev` verification
screenshots for: landing page, athlete dashboard, workout list with
comment expanded, body measurement charts, admin users table.

---

## 7. Risk Register

| Risk | Mitigation |
|---|---|
| Phase 0 build break goes unnoticed if `framer-motion` is added to `node_modules` later | Add `eslint-plugin-import` rule banning the path; add CI check `rg "framer-motion" frontend/src` (must be empty) |
| Phase 1 RSC split breaks session-cookie flow | Run E2E login/logout flow before merge; check `proxy.ts` cookie re-encrypt still works |
| Phase 2 dynamic imports cause layout shift | Add `<Skeleton />` placeholders with same height as chart; verify CLS=0 |
| Phase 3 `getSession` cache invalidation | Bump cache key on logout via `revalidateTag("session")` |
| Phase 4 `memo` over-memoisation wastes memory | Profile before & after with React DevTools; only memo rows > 50 items |
| Phase 5 removing `withTiming` breaks a hidden telemetry expectation | `rg "withTiming"` — confirm zero hits in production code paths |

---

## 8. Out of Scope (record in ADR)

- `next/image` migration (orthogonal, separate plan).
- Full App Router migration of `trainers/[id]/page.tsx`'s PUT review form.
- Replacing the entire in-memory `useAuthStore` with cookie-based session
  (requires backend changes).
- Migrating `axios` fetch to native `fetch` in `lib/api/api-client.ts`.
- Real user-monitoring / RUM integration (deferred until after these
  perf wins are merged).

---

## 9. Suggested Branch / PR Strategy

| PR | Title | Phase | Approx LOC |
|---|---|---|---|
| `#perf-0-build` | fix(build): migrate `framer-motion` imports to `motion/react` | 0 | ~10 |
| `#perf-1-waterfalls` | perf(rsc): split landing + dashboard layouts, parallelise client fetch | 1.1, 1.2, 1.3 | ~150 |
| `#perf-1b-deadroute` | chore: remove duplicate dashboard route | 1.6 | ~20 |
| `#perf-2-bundle` | perf(bundle): dynamic-import charts/calendars/comments, drop barrel imports | 2.1–2.5 | ~200 |
| `#perf-2b-providers` | refactor(providers): lazy window global | 2.6 | ~10 |
| `#perf-3-rsc` | perf(rsc): hoist fetches to Server Components | 3.1–3.6 | ~250 |
| `#perf-3b-api` | fix(api): replace dynamic import with sync `cookies()` | 3.8 | ~5 |
| `#perf-3c-proxy` | perf(middleware): cache session decrypt | 3.9 | ~20 |
| `#perf-4-rerender` | perf(rerender): fix `useMemo`-as-effect, memo list rows, filter hook | 4.1–4.10 | ~300 |
| `#perf-5-misc` | chore: dedup query keys, ESLint, regex hoist, micro-opts | 5.1–5.12 | ~150 |

Total estimated PR churn: ~1,100 lines added/removed across 10 PRs.

---

## 10. Estimated Calendar

| Week | PRs |
|---|---|
| Day 1 (4 h) | Phase 0 + Phase 1.6 + Phase 1.1 (the four-call fix) |
| Day 2 (full) | Phase 1.2, 1.3 (RSC split) |
| Day 3 (full) | Phase 2.1–2.4 (dynamic imports) |
| Day 4 (half) | Phase 2.5–2.6 + Phase 3.1, 3.8 |
| Day 5 (full) | Phase 3.2–3.6 (RSC shells) |
| Day 6 (full) | Phase 4 (re-render hygiene) |
| Day 7 (half) | Phase 5 + final review |

Buffer for review cycles and CI fixes: +2 days.

---

## Appendix A — File-by-File Edit Manifest

```
M  frontend/src/app/[locale]/page.tsx                            (1.2)
A  frontend/src/app/[locale]/LandingClient.tsx                  (1.2)
M  frontend/src/app/[locale]/(dashboard)/layout.tsx             (1.3)
A  frontend/src/app/[locale]/(dashboard)/DashboardClientShell.tsx (1.3)
D  frontend/src/app/[locale]/dashboard/page.tsx                 (1.6)

M  frontend/src/app/[locale]/(dashboard)/trainer/client/[username]/page.tsx (1.1)
M  frontend/src/app/[locale]/(dashboard)/athlete/measurements/page.tsx   (3.2)
M  frontend/src/app/[locale]/(dashboard)/trainer/profile/page.tsx        (3.4)
M  frontend/src/app/[locale]/(dashboard)/trainer/workout-plans/[id]/page.tsx (3.5)
M  frontend/src/app/[locale]/(dashboard)/athlete/workouts/page.tsx       (3.6)
M  frontend/src/app/[locale]/(dashboard)/admin/users/page.tsx            (3.3)
M  frontend/src/app/api/auth/session/route.ts                              (3.8)

M  frontend/src/proxy.ts                                                    (3.9)

M  frontend/src/lib/dal.ts                                                  (3.1, 3.2, 3.4, 3.5)
A  frontend/src/lib/hooks/use-deferred-filter.ts                            (4.3)
A  frontend/src/lib/memo.ts                                                 (4.2)
M  frontend/src/lib/animations.ts                                           (no change; module-scoped ✓)

M  frontend/src/components/features/dashboard/DashboardShell.tsx            (0)
M  frontend/src/components/features/dashboard/AthleteDashboardContent.tsx   (0, 5.2)
M  frontend/src/components/features/dashboard/TrainerDashboardContent.tsx   (0, 4.10, 5.5)
M  frontend/src/components/features/dashboard/CombinedTrainingCalendar.tsx (2.3)

M  frontend/src/components/features/landing/LandingConsole.tsx              (0)
M  frontend/src/components/features/landing/LandingFeatureGrid.tsx          (0)
M  frontend/src/components/features/landing/LandingHero.tsx                 (0)
M  frontend/src/components/features/landing/LandingProof.tsx                (0)
M  frontend/src/components/features/landing/LandingRolePaths.tsx            (0)

M  frontend/src/components/features/body-measurement/BodyMeasurementCharts.tsx (2.1, 2.2)
A  frontend/src/components/features/body-measurement/BodyMeasurementCharts/WeightChart.tsx
A  frontend/src/components/features/body-measurement/BodyMeasurementCharts/BodyFatChart.tsx
A  frontend/src/components/features/body-measurement/BodyMeasurementCharts/PartsChart.tsx
M  frontend/src/components/features/body-measurement/BodyMeasurementFilterBar.tsx (4.3)
M  frontend/src/components/features/body-measurement/BodyMeasurementList.tsx (4.2)

M  frontend/src/components/features/workout/WorkoutForm.tsx                  (no change unless hooked into 4.3)
M  frontend/src/components/features/workout/ExerciseSetInput.tsx              (4.1)
M  frontend/src/components/features/workout/WorkoutFilterBar.tsx             (4.3)
M  frontend/src/components/features/workout/WorkoutList.tsx                  (2.4, 4.2, 4.6)
M  frontend/src/components/features/workout/WorkoutCalendar.tsx             (2.3)
A  frontend/src/components/features/workout/CalendarGrid.tsx

M  frontend/src/components/features/meal/MealForm.tsx                        (no change unless hooked into 4.3)
M  frontend/src/components/features/meal/MealCard.tsx                        (2.4, 4.2)
M  frontend/src/components/features/meal/MealFilterBar.tsx                   (4.3)
M  frontend/src/components/features/meal/MealList.tsx                        (4.2, 4.6)
M  frontend/src/components/features/meal/MealCalendar.tsx                    (2.3)
A  frontend/src/components/features/meal/CalendarGrid.tsx

M  frontend/src/components/features/workout-plan/PlanSetInput.tsx            (4.1)
M  frontend/src/components/features/workout-plan/WorkoutPlanList.tsx         (4.2)
M  frontend/src/components/features/workout-plan/WorkoutPlanForm.tsx        (no change)
M  frontend/src/components/features/workout-plan/WorkoutPlanCard.tsx        (4.2)

M  frontend/src/components/features/trainer/AvailabilityCard.tsx             (5.4)
M  frontend/src/components/features/trainer/clients/.../page.tsx             (1.6, 4.5)
M  frontend/src/components/features/trainer/ClientCard.tsx                  (4.2)
M  frontend/src/components/features/trainer/ClientOverview.tsx              (no change)
M  frontend/src/components/features/trainer/ClientProgressCharts.tsx        (2.1)
M  frontend/src/components/features/trainer/TodayClientList.tsx              (4.2)
M  frontend/src/components/features/trainer/progress-charts/*.tsx            (2.1)

M  frontend/src/components/features/comments/CommentList.tsx                 (4.4)
M  frontend/src/components/features/comments/CommentForm.tsx                 (no change)
M  frontend/src/components/features/comments/CommentItem.tsx                 (5.10)
M  frontend/src/components/features/comments/CommentThread.tsx               (no change)

M  frontend/src/components/features/coaching/CoachingRequestsList.tsx        (4.2)
M  frontend/src/components/features/coaching/CoachingRequestDialog.tsx       (no change)

M  frontend/src/components/features/athlete/MyTrainerButton.tsx              (5.2)
M  frontend/src/components/features/athlete/AcceptInvitationDialog.tsx       (5.7)
M  frontend/src/components/features/athlete/trainers/[id]/page.tsx           (5.1)

M  frontend/src/components/features/reviews/CreateReviewDialog.tsx           (no change)
M  frontend/src/components/features/reviews/ReviewActions.tsx                (no change)

M  frontend/src/app/[locale]/providers.tsx                                   (2.6)
M  frontend/src/app/[locale]/(auth)/login/page.tsx                           (5.7)
M  frontend/src/app/[locale]/(auth)/register/page.tsx                        (5.7)
M  eslint.config.mjs                                                          (5.9)
```

Roughly **~45 files modified, 6 files added, 1 file deleted**, total
~1,100 LOC churn.

---

## Appendix B — `framer-motion` Removal Verification (CI hook)

Add to `frontend/scripts/check-no-framer-motion.mjs`:

```js
import { execSync } from "node:child_process";
const out = execSync("rg -l \"from \\\"framer-motion\\\"\" src || true", { encoding: "utf8" });
if (out.trim().length > 0) {
  console.error("ERROR: the following files still import from \"framer-motion\":\n" + out);
  process.exit(1);
}
console.log("OK: no framer-motion imports.");
```

Wire into `package.json`:
```json
"scripts": {
  "lint:no-framer-motion": "node scripts/check-no-framer-motion.mjs"
}
```

Add the script to the pre-merge CI check.
