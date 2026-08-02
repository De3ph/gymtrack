# Active Context

## Current Focus
Frontend auth checklist fixes implemented (2026-08-02) — see "Frontend Auth Checklist Fixes" below. (Prior: frontend memory-usage plan complete via 4-agent team; Task 7 deferred.)

## Frontend Auth Checklist Fixes — Complete
Implemented `plans/frontend-auth-checklist-review.md` priority fixes #1-#6 (#7 skipped). Verified: `authStore.test.ts` 10/10; no new tsc errors (single `authStore.ts:125` error is pre-existing `UserResponse` vs `User` mismatch — confirmed via `git stash`); LoginPage/RegisterPage failures unchanged pre-existing.

### Changes (6 files)
- **session.ts**: added `REFRESH_COOKIE_NAME='refresh_token'`; removed `refreshToken` from `SessionPayload` (so session JWT leak no longer exposes refresh token); export both cookie names.
- **session/route.ts** (fix #2 HIGH): POST verifies `accessToken` via Go backend `GET /users/me`, uses **backend-returned** `userId`+`role` (ignores client-provided) → prevents XSS role forgery in cookie. Sets separate `refresh_token` cookie (fix #5). GET returns `refreshToken` from refresh cookie. DELETE clears both. Added `BACKEND_URL`.
- **authApi.ts** (fix #6 LOW): refresh response type now `{ message, accessToken, refreshToken?: string }`.
- **proxy.ts** (fix #4 MEDIUM): added `isAthleteRoute`/`isTrainerRoute` + role gates (`/athlete/*`→athlete, `/trainer/*`→trainer, else redirect `/dashboard`). Rolls refresh cookie alongside session.
- **authStore.ts**: login/refresh POST body drops `userId`/`role` (server derives from backend); `initializeAuth` restores **both** tokens via `setTokens` (also fixes pre-existing gap: refresh token never restored after page refresh); `refreshAccessToken` handles optional rotation (`effectiveRefreshToken = newRefreshToken || refreshToken`).
- **authStore.test.ts**: GET mock includes `refreshToken`; added `getRefreshToken()` assertion.

### Fix status
- #1 CRITICAL (dal.ts cache keys): ALREADY RESOLVED by `cd3eb0b` refactor (`unstable_cache`→`'use cache'`; accessToken in cache key = user isolation). No change.
- #3 MEDIUM (decryptCache bound): ALREADY DONE (`DECRYPT_CACHE_MAX=1000` FIFO). No change.
- #7 LOW (DTO admin): SKIPPED (backend UserResponse excludes password hash).

### Deviation note
Fix #5 used `sameSite:'lax'` + `path:'/'` (not `strict` + `/api/auth/refresh`) — strict breaks cross-site nav refresh; restricted path incompatible with client-side refresh-to-Go-backend. Primary goal (refresh not in session JWT) achieved.

## Frontend Memory Usage Plan — Complete

Implemented `plans/frontend-memory-usage-plan.md` with a 4-agent team (config/edge/api/memo engineers, parallel, disjoint files).

### Changes
- **next.config.ts**: `withBundleAnalyzer` (outermost wrapper, `enabled: process.env.ANALYZE === 'true'`), `experimental.webpackMemoryOptimizations: true`, source-map-kept-for-Sentry comment.
- **package.json**: added devDeps `@next/bundle-analyzer ^16.2.12` + `cross-env ^10.1.0`; scripts `analyze` (`cross-env ANALYZE=true next build`), `build:debug` (`next build --experimental-debug-memory-usage`), `build:heap` (`node --heap-prof ... next build`). NOTE: original `ANALYZE=true` prefix fails on Windows cmd.exe — `cross-env` required for cross-platform.
- **proxy.ts**: bounded `decryptCache` Map to `DECRYPT_CACHE_MAX=1000` with FIFO eviction (`decryptCacheOrder` queue). 500ms TTL unchanged. Prevents edge memory growth.
- **api-client.ts**: `console.log` confirmed already removed; `X-Abbreviate` header REMOVED (backend only allow-lists in CORS, no handler reads it — dead header coupled to timeout path). Documented.
- **providers.tsx**: QueryClient config verified bounded (`staleTime` 5min, `gcTime` 10min, `retry` 1); `window.__TANSTACK_QUERY_CLIENT__.clear()` called on auth error. No unbounded cache.
- **EditWorkoutDialog.tsx**: `useMemo` for `defaultValues` + schema, `useCallback` for `handleSubmit`.
- **BodyMeasurementCharts.tsx**: `useMemo` for `raw`/`sorted`/`chartData`/`availableParts` (moved before early return for rules-of-hooks), `useCallback` for `handleFilterChange`.
- **CombinedTrainingCalendar.tsx**: `useCallback` for `handleToday` (other `useMemo`s were pre-existing).
- **Plan file**: appended Decision Log (source maps kept for Sentry).

### Verification (definitive)
- **Stash test**: reverted the 3 edited component files to pre-agent versions and ran `tsc --noEmit` — the SAME 5 type errors appeared. Proves all 5 errors are PRE-EXISTING (optional domain fields `weight?`/`workoutId?`/`mealId?`), NOT introduced by memoization.
- `EditWorkoutDialog.test.tsx` (edited file) passes 4/4. `WorkoutList.test.tsx` 6/6.
- `proxy.ts`, `api-client.ts`, `next.config.ts`: zero type errors.
- Pre-existing test failures (MealList/MealForm/WorkoutForm/WorkoutCalendar/DailyNutritionSummary) are in UNedited files — `git diff --stat` empty for those.

### Deferred
- **Task 7** (`experimental.preloadEntriesOnStart: false`): defer until Task 1 analyzer shows startup footprint.


# Active Context

## Current Focus
Frontend memory plan Task 6 (client memoization audit) complete. See "Task 6 — Client memoization audit" below. Mobile G8 (Exercise catalog picker) complete. ALL 8 remaining features DONE.


## Task 6 — Client memoization audit (high-traffic lists)

Plan: `plans/frontend-memory-usage-plan.md` Task 6. Scope = AUDIT+ADD to 3 files, VERIFY 2 files.

### Files Modified (ADD)
- `frontend/src/components/features/body-measurement/BodyMeasurementCharts.tsx`: Memoized the recharts dataset chain so charts don't re-process identical data on unrelated re-renders. `raw` → useMemo([propMeasurements, data]); `sorted` → useMemo([raw]); `chartData` → useMemo<ChartDataPoint[]>([sorted]); `availableParts` → useMemo([chartData]); `handleFilterChange` → useCallback([onFilterChange]). **Critical:** restructured so all hooks run BEFORE the loading/empty early-returns (rules-of-hooks safe). Behavior preserved.
- `frontend/src/components/features/dashboard/CombinedTrainingCalendar.tsx`: Already well-memoized (monthRange, workouts, meals, workoutDates, mealDates, selectedEvents all in useMemo). Added `handleToday` → useCallback([]) (only inline handler passed to a child Button).
- `frontend/src/components/features/workout/EditWorkoutDialog.tsx`: `defaultValues` → useMemo([workout]) (useForm only consumes on mount; workout changes handled by reset effect). `handleSubmit` → useCallback([form]). Validation schema was already memo'd. Note: children (ExerciseSelector, ExerciseSetInput, Button) are NOT memo'd, so handler stabilization ROI is limited; extracting the exercise Card (inline in `.map`) is risky due to the TanStack form.Field render-prop/array API and was deferred.

### Verification Results (VERIFY — no changes made)
- `MealList.tsx` ✅ — uses memo'd `MealCard` (`export const MealCard = memo(...)`). **Gap noted (NOT fixed — out of verify scope):** MealList passes unstable inline props to memo'd MealCard — `canEdit` (function, recreated each render), `onEdit` (`handleEditClick`), `onDelete` (`deleteMeal`). `React.memo`'s shallow compare sees a new `canEdit` reference every render → MealCard re-renders every time → the memo is partially defeated. Wrapping `canEdit`/`handleEditClick`/`handleFilterChange`/`handlePageChange` in useCallback would restore MealCard's memo effectiveness. Flagged for follow-up.
- `WorkoutList.tsx` ❌ **DISCREPANCY:** The prior-pass plan (`plans/done/vercel-react-perf-fixes.md` §4.2) and this file's "Phase 4" note claim `WorkoutCard.tsx` was extracted (memo'd) and `WorkoutList` now uses `<WorkoutCard>`. **This is FALSE in the current code:** `frontend/src/components/features/workout/WorkoutCard.tsx` does NOT exist (confirmed via directory listing), and `WorkoutList.tsx` still renders `<Card>` inline inside `workouts.map` (lines ~181-272). The extraction was reverted or never landed. Not re-done here (scoped as "verify, don't redo"; extracting would need a `WorkoutCard.tsx` sibling following the `MealCard.tsx` precedent — flagged for follow-up).

### Verification
- `pnpm exec tsc --noEmit`: 0 errors in the 3 edited files (BodyMeasurementCharts, CombinedTrainingCalendar, EditWorkoutDialog). Pre-existing TS errors elsewhere are unrelated.
- `pnpm exec vitest run src/test/components/workout/EditWorkoutDialog.test.tsx src/test/components/workout/WorkoutList.test.tsx`: 2 files, 10/10 tests PASS.
- ESLint on the 3 edited files: the one warning I introduced (BodyMeasurementCharts `raw` logical expr in useMemo dep) was fixed by wrapping `raw` in its own useMemo. Remaining 4 lint problems are PRE-EXISTING (CombinedTrainingCalendar `_props` unused; EditWorkoutDialog unused imports `Field`/`WorkoutExercise`; EditWorkoutDialog:110 `set-state-in-effect` on the untouched useEffect) — none introduced by this task.
- Pre-existing test failures (WorkoutForm, MealForm, MealList, DailyNutritionSummary) were confirmed IDENTICAL with my changes stashed vs applied — my changes introduced 0 new failures.

## Completed Feature Tracking

| # | Feature | Files | Status |
|---|---------|-------|--------|
| G1 | Workout/Meal/Measurement edit/delete | 3 | ✅ |
| G2 | Comments UI + detail screens | 5 | ✅ |
| G3 | Submit trainer review | 2 | ✅ |
| G4 | Workout plan edit/delete | 2 | ✅ |
| G5 | Workout plan assignment | 3 | ✅ |
| G6 | Trainer availability CRUD | 1 | ✅ |
| G7 | Invitation codes | 2 | ✅ |
| G8 | Exercise catalog picker | 2 | ✅ |

**Total**: 8 features, 20 files (11 new, 9 modified). 0 new TypeScript errors across all work.

## Mobile G8 — Exercise Catalog Picker — Complete

### Files Created
- `mobile/src/components/features/workout/ExercisePicker.tsx`:
  - Reusable modal component with props: `visible`, `onClose`, `onSelect`.
  - Fetches exercises via `exerciseApi.getAll()` (staleTime 5min, only when visible).
  - Client-side search filter: `TextInput` with `clearButtonMode="while-editing"`, filters by name + category.
  - `FlatList` with exercise rows: name (bold) + category (gray, capitalized) + `>` chevron.
  - Tap: calls `onSelect(exercise)` + `onClose()`.
  - Loading spinner, error message, empty state ("No exercises found").
  - Header: "Close" left, "Exercise Catalog" center title.
  - Styles: `flex`, `header`, `closeBtn`, `closeText`, `title`, `searchInput`, `listContent`, `exerciseRow`, `exerciseInfo`, `exerciseName`, `exerciseCategory`, `chevron`, `center`, `errorText`, `emptyText`.

### Files Modified
- `mobile/src/components/features/workout/WorkoutsScreen.tsx`:
  - Added import: `ExercisePicker`.
  - State: `pickerVisible`, `pickingForExId` (which exercise slot is being filled).
  - Handler: `openPickerFor(exId)` sets `pickingForExId` + opens picker.
  - Handler: `handleExerciseSelect(exercise)` — when exercise picked, sets name via `updateExerciseName(pickingForExId, exercise.name)`. If exercise has `category`, appends `"Category: {category}"` to exercise notes.
  - Replaced single `TextInput` for exercise name with `nameRow`: `TextInput` (flex:1) + "Browse" button (blue `#2563eb`, `#fff` text).
  - `ExercisePicker` rendered at component root, outside workout create/edit `Modal`.
  - Styles: `nameRow` (flex row, gap 8), `nameInput` (flex:1), `browseButton`, `browseText`.

### Key Decisions
- Backend `GET /api/exercises` returns raw `Exercise[]` array (not wrapped in `{ exercises: [...] }`).
- Exercise model: `{ exerciseId, name, category, muscleGroupId, equipmentId, instructions }`.
- "Browse" button next to free-text input preserves both workflows: tap Browse to pick from catalog, or type custom name directly.
- On pick, exercise category auto-appended to notes field (non-destructive — user can edit/clear).
- `exerciseApi.getAll()` fetches once, cached 5 minutes. No per-keystroke API calls (client-side filter).
- Picker closes on select — single-tap workflow.

### Verification
- `npx tsc --noEmit` in `mobile/`: 0 errors in new/modified files. 3 pre-existing errors unchanged.

## ALL MOBILE REMAINING FEATURES COMPLETE
All 8 gaps from `mobile-remaining-features.md` are now implemented. Mobile app is feature-complete against web frontend (minus admin routes). Ready for integration testing against live backend.






## Phase 4 — Completed Changes

### Files Created
- `frontend/src/components/features/workout/WorkoutCard.tsx` — Extracted memo'd WorkoutCard component from inline rendering in WorkoutList.tsx. Uses `React.memo`, wraps CommentThread with `dynamic` import.

### Files Modified
- `frontend/src/components/features/workout/WorkoutList.tsx` — Removed unused imports (lucide-react icons, Card components, TARGET_TYPES). Replaced inline Card rendering with `<WorkoutCard>` component with stable callbacks.
- `frontend/src/components/features/comments/CommentList.tsx` — Added reference-equality micro-cache to `buildTree` function to avoid re-building the comment tree when the same array reference is passed.

### Already Implemented (verified)
- **4.1**: `ExerciseSetInput`/`PlanSetInput` already use `useEffect` (not `useMemo`)
- **4.3**: `useDeferredFilter` hook exists and is used by all 3 filter bars
- **4.4**: `CommentList` uses `useCallback` for event handlers
- **4.5**: `TrainerClientsPage` already uses `useDeferredValue` + `useMemo`
- **4.8**: `WorkoutsClient.tsx` has clean `useState("log")` (no ternary)
- **4.10**: `ClientRow` already extracted in `TrainerDashboardContent`
- Many list components already memo'd: `MealCard`, `ClientCard`, `BodyMeasurementListItem`, `WorkoutPlanCard`, `TodayClientRow`

### Pending Minor Items
- `CoachingRequestsList.tsx`: Extract inline Card into memo'd `CoachingRequestRow`
- `WorkoutCard.tsx` line 100 formatting (minor)

## Bug Fixes

### Logout Redirect Fix
- **Problem**: `authStore.logout()` cleared the session cookie and in-memory tokens but never redirected the user to the login page. After logout, the user remained on the dashboard with an empty/blank state.
- **Fix** (`frontend/src/stores/authStore.ts`):
  1. Removed the wrapping `finally` block — the session cookie delete is now independent from token cleanup.
  2. Added best-effort backend logout call (`authApi.logout()`) to invalidate the refresh token server-side.
  3. **Added redirect**: `window.location.href = ROUTES.LOGIN` — a hard redirect (full page reload) so the middleware (`proxy.ts`) detects the cleared session cookie and the auth store re-initialises cleanly.

## Next Steps
Proceed to Phase 5 (Misc cleanups & ESLint) when ready.

## Mobile E2E — Phase 1 Complete

### Installed
- Maestro CLI 2.7.0 at `C:\maestro\bin\maestro.bat`
- Java 25 (Temurin) — prerequisite satisfied
- Added to User PATH permanently

### Files Created
- `.maestro/maestro.yaml` — shared env config (appId, credentials, base URL)
- `.maestro/README.md` — usage docs
- `.maestro/auth/` — 8 auth flow YAML files (login x4, register x3, session-restore x1)
- `mobile/package.json` — added 5 npm scripts (`e2e:local`, `e2e:ci`, `e2e:auth`, `e2e:athlete`, `e2e:trainer`)

### Known Issue
TextInputs in LoginScreen/RegisterScreen lack `testID` props. Maestro taps label text to focus inputs. Consider adding `testID` for reliability.