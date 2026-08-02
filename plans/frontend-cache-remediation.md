# Frontend Cache Remediation Plan

**Scope:** `frontend/` — fix `unstable_cache` bugs in `src/lib/dal.ts`, then migrate to Next.js 16 Cache Components (`use cache` + `cacheLife`).

**Reference doc:** `frontend/node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`

**Branch:** `refactor/cache-remediation` (sister to backend cache remediation already in this branch).

**Selected approach:** Phase 1 (security fix in place) + Phase 2 (enable `cacheComponents`, migrate to `use cache`).

---

## Review findings

The literal migration doc (route segment configs → Cache Components) found **nothing to remove**: no `export const dynamic|revalidate|fetchCache|runtime` anywhere in `src/app/**`. But the scan exposed real problems in the actual cache layer, `src/lib/dal.ts`:

### Bugs (security + correctness)

1. **Cookies read inside cache scope.** All 5 `unstable_cache` functions call `verifySession()`/`verifyAdmin()` → `cookies()` *inside* the cached function. Both `unstable_cache` and `use cache` docs forbid accessing `cookies()`/`headers()` inside a cache scope — supported pattern is to read runtime data outside and pass values in as arguments.

2. **Cross-user cache leak (keyParts omit userId).** Cache keys lack the user identity, so cached results bleed between users within the TTL window:
   - `getLatestBodyMeasurementCached` — key `['latest-body-measurement']` → user A's latest measurement served to user B within 30s. **Security.**
   - `getTrainerProfileCached` — key `['trainer-profile']` → cross-trainer leak. **Security.**
   - `getWorkoutPlanCached(planId)` / `getWorkoutPlanAssignmentsCached(planId)` — key has `planId` but no `userId` → any authenticated user gets the cached plan within 60s, bypassing authorization. **Security.**
   - `getAdminStatsCached` — admin stats are global, lower risk, but still cookies-in-scope.

3. **Tags declared, never invalidated.** Tags (`'admin-stats'`, `'trainer-profile'`, `'body-measurements'`, `'workout-plans'`, etc.) are set but there are zero `revalidateTag`/`revalidatePath` calls in `src`. Cache only refreshes on TTL. Editing a trainer profile leaves stale data up to 5 min. Dead tagging.

4. **`any` returns.** 4 of 5 cached functions return `Promise<any>` with `eslint-disable-next-line @typescript-eslint/no-explicit-any`. Type hole.

5. **Dead code.** `getAdminStats` (the non-cached `React.cache` variant) is unused — only `getAdminStatsCached` is called.

6. **Stray debug log.** `src/lib/api/api-client.ts:29` — `console.log('API Request URL:', url)` fires on every client request. Noise.

7. **Bundler inconsistency.** `next dev --webpack` opts out of Turbopack (Next 16 default); `next build` has no flag → builds on Turbopack. `--webpack` was likely added for Sentry/next-intl webpack config injection. Needs verification that Cache Components works under webpack, else drop `--webpack` and migrate to Turbopack.

### Consumers (5 server pages use cached functions)

- `src/app/[locale]/(dashboard)/admin/page.tsx` → `getAdminStatsCached`
- `src/app/[locale]/(dashboard)/athlete/measurements/page.tsx` → `getLatestBodyMeasurementCached`
- `src/app/[locale]/(dashboard)/trainer/profile/page.tsx` → `getTrainerProfileCached`
- `src/app/[locale]/(dashboard)/athlete/workouts/page.tsx` → `getWorkoutPlanCached`
- `src/app/[locale]/(dashboard)/trainer/workout-plans/[id]/page.tsx` → `getWorkoutPlanCached` + `getWorkoutPlanAssignmentsCached`

All must update when `dal.ts` cached-function signatures change.

---

## Plan

### Step 0 — Verification gate (read-only, blocks Phase 2)

Confirm `cacheComponents: true` works under `next dev --webpack` + `@sentry/nextjs@10.65` + `next-intl@4.11`.

- Fetch Sentry + next-intl compatibility docs.
- Check whether Sentry `withSentryConfig` injects a webpack config (would force `--webpack` or fail Turbopack build).
- If incompatible: sub-step = drop `--webpack`, migrate to Turbopack (no custom webpack config exists in `next.config.ts`, so low effort; Sentry is the risk).

Go/no-go recorded before touching cache code.

### Phase 1 — Fix `unstable_cache` bugs in place (no flag, low risk)

Aligns with `01-app/02-guides/caching-without-cache-components.md`.

1. **`src/lib/dal.ts`** — move session read *outside* the cache scope. New signatures take `accessToken` (+ `userId`/`planId`) as args so the args become part of the cache key, killing the cross-user leak:
   - `getLatestBodyMeasurementCached(accessToken, userId)` — keyParts `['latest-body-measurement', userId]`
   - `getTrainerProfileCached(accessToken, userId)` — keyParts `['trainer-profile', userId]`
   - `getWorkoutPlanCached(accessToken, planId)` — keyParts `['workout-plan', planId]`
   - `getWorkoutPlanAssignmentsCached(accessToken, planId)` — keyParts `['workout-plan-assignments', planId]`
   - `getAdminStatsCached(accessToken)` — keyParts `['admin-stats']`
2. **Update the 5 consumer pages** to `await verifySession()`/`verifyAdmin()` first (already done in most), then pass `accessToken` (and `userId`) into the cached function.
3. **Add `revalidateTag` busting at mutation sites** (locate via api modules + React Query mutations):
   - Trainer profile update → `'trainer-profile'`
   - Workout plan create/update/delete + assign → `'workout-plans'`
   - Body measurement create/update/delete → `'body-measurements'`, `'latest-body-measurement'`
   - Admin user role change → `'admin-stats'`
   - Delivery: server actions or route-handler revalidation (decision point during implementation).
4. **Type the `any` returns** (`WorkoutPlan`, `TrainerProfile`, `BodyMeasurement | null`, assignment list). Remove `eslint-disable`.
5. **Remove dead `getAdminStats`** (unused non-cached variant) or wire it as a preload variant.
6. **Remove `console.log('API Request URL:', url)`** at `api-client.ts:29`.

### Phase 2 — Enable Cache Components + migrate to `use cache`

Runs after Step 0 is green.

7. `next.config.ts` → `cacheComponents: true`. Resolve bundler per Step 0.
8. **`dal.ts`** — replace each `unstable_cache(...)` with a `'use cache'` async function + `cacheLife` + `cacheTag`. Map TTLs: `30s` → `cacheLife('seconds')`, `60s` → `'minutes'`, `300s` → `'minutes'`/custom profile. Session stays outside, passed as args (already done in Phase 1).
9. **Audit all pages/layouts/routes** for runtime access (`cookies()`, `headers()`, `searchParams`, `requestLocale`) — must sit outside `use cache` scopes; wrap dynamic holes in `<Suspense>`. Admin page already streams; verify the rest.
10. **PPR / `<Activity>` behavior check** — dialogs, forms, filter bars must keep state across back-nav; rerun e2e.

### Phase 3 — Validate

11. `pnpm build` (Turbopack) clean + `pnpm dev` smoke.
12. `pnpm test:run` + `pnpm test:e2e` (auth, measurements, trainer profile, workout-plan detail).
13. Manual two-user check: no cross-user data inside the TTL window.
14. Confirm `revalidateTag` busts on mutation (edit profile → immediate refresh).

---

## Risk

- **Phase 2** changes the rendering model (PPR static shell + streaming). Higher blast radius than Phase 1.
- **Phase 1 alone** ships the security fix; **Phase 2** is reversible by removing the flag.
- **Sentry + next-intl + Turbopack** compatibility is the main external unknown — gated by Step 0.
