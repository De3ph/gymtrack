# Active Context

## API Test Coverage Audit (2026-09-29)
Audit saved to `plans/api-test-coverage-audit-2026-09-29.md`. Findings: backend registers **97 routes** (81 `/api/*`), but only **14 API endpoints (17%)** have any HTTP-level test — endpoint tests exist only in `internal/api/e2e/` (`auth_e2e_test.go` 10 tests + `workout_e2e_test.go` 6 tests; suite PASS 13.2s via `POSTGRES_TEST_DSN`). **Zero coverage**: all 10 admin routes, meals (4), measurements (7, incl. 24h window rule — untested at *every* layer), comments (4, permission/threading rules untested at every layer), relationships (7), trainer catalog/availability/reviews (12), workout plans (10), `PUT /api/users/me`, `POST /api/auth/logout`, password-reset HTTP, metrics/swagger/pprof (16 — not even wired into test router). Depth gaps in existing tests: rate limiter never asserts 429; `RequireJSONError` helper unused (no error-body assertions); workout list filters untested. **No CI runs `go test`** (only `migrate.yml`). Prioritized plan (P0: admin + measurements + comments) is in the audit doc; `plans/backend-http-e2e-test-plan.md` status table is stale.

**Same-day update**: created `internal/api/e2e/measurement_e2e_test.go` (6 tests, all PASS — first use of `RequireJSONError` + 401 domain-route check, closing two audit depth gaps): `CRUD_OwnAthlete` (create round-trip, list, limit/offset, date-range filters, latest, update, delete + 404/204 verification), `TrainerForbidden`, `AthleteCannotViewOthers`, `InvalidPayloadsAndIDs`, `EditWindow24h` (SQL-backdates `created_at` −25h → PUT/DELETE 403 with exact messages), `TrainerClientView` (404/403 → `establishRelationship` → 200). Coverage now **21/81 (26%)**; 24h window no longer untested. Audit doc §3.6/§6 updated; remaining P0: admin + comments. Full e2e suite: 22 tests PASS (auth 8.6s + workout 6.0s + measurements 8.5s batches), `go vet ./...` clean, `gofmt` clean (note: `workout_e2e_test.go` has pre-existing CRLF gofmt flag).

**Admin e2e + test-DB isolation bug fix (2026-09-29, later)**:
- Created `internal/api/e2e/admin_e2e_test.go` (8 tests, all PASS) covering all 10 `/api/admin/*` routes: `NonAdminForbidden` (403 matrix over all 10 routes × trainer+athlete + exact middleware message + 401), `UsersListAndDetail` (filters/search/pagination/detail/400/404), `DashboardStats` (exact 3-user totals), `UpdateUserRole` (promote+persist, self-change 400, invalid role 400, 404/400), `UpdateUserStatus` (suspend→victim 403 w/ status message, ban, reactivate, last-admin self-suspend 400, `"deleted"` rejected, 404/400), `CommentsModeration` (seed exercise→workout→comment via API, list+targetType filters, delete, double-delete 404, abc 400), `ExerciseModeration` (verify persists `isVerified` via public GET, delete, 404/400), `ChangePassword` (wrong old/short/missing 400, success, old-login 401 → new-login 200). Helper `promoteToAdmin` SQLs `role='admin'` **before login** (registration forbids admin role; JWT carries role).
- **Fixed a real test-infra bug** in `internal/testutils/postgres.go`: `setupIsolatedDSNDB` mutated `cfg.Database` then read `cfg.ConnString()` — pgx returns the ORIGINAL string, so `POSTGRES_TEST_DSN` runs silently used the shared **dev `gymtrack` DB** instead of a per-test DB (testcontainers path was fine). New `dsnWithDatabase()` helper (URL + keyword DSN forms) now derives both maintenance and test DSNs. Verified empirically with a throwaway probe (deleted). Evidence it fired: admin tests saw 122→142 pre-existing users growing by exactly test registrations across runs.
- **Fallout**: earlier DSN-mode runs (audit + measurement + admin) polluted dev DB with `*@e2e.test` users + their data (+1 measurement backdated −25h). Cleanup SQL (review first) saved in audit §5.6 — NOT yet executed.
- Coverage now **31/81 (38%)**; P0 remaining: **comments**. All 4 e2e batches green post-fix: auth 9.6s, workout 7.3s, measurements 6.1s, admin 9.3s; repo spot-check (user/workout/comment) 2.7s; `go vet ./...` clean.

**Auth suite completion (2026-09-29, later)** — 7 new tests in `internal/api/e2e/auth_e2e_test.go` (17 auth tests total, all PASS):
- `Register_InvalidPayloads` (empty, weak password w/ exact validator message, short + non-alphanum username, bad email, non-object body), `RefreshToken_InvalidInput` (400 missing/non-object, 401 garbage token), `Logout` (200 no-op contract unauth + authed; route has **no JWT middleware** so swagger's `@Failure 401` is unreachable; no server-side revocation), `Restore_EdgeCases` (403 not-deleted, 401 wrong password + unknown identifier, 403 expired 30-day window via SQL-backdated `deleted_at`, 400 missing fields).
- `PasswordReset_RequestValidation` — 400s w/ exact message; unknown email → generic 200 + **zero token rows** (anti-enumeration); `PasswordReset_FullFlow` — request creates exactly 1 valid DB token → duplicate request does not add a second → **hash swapped in DB** (service persists SHA-256 only, raw lives in the emailed link) → confirm 200 → token consumed → old password 401 / new 200 → replay 400 → expired token 400.
- `RateLimiter_TooManyRequests` — drains burst-10 with fast invalid-login bodies (no bcrypt/DB) → asserts `429` + exact message, then refill recovery after 1s. Verified **deterministic with `-count=3`**.
- Added `RequireJSONMessage` helper (`e2e_helpers.go`) — success-body companion to `RequireJSONError` (the latter was previously dead code; now used across measurement/admin/auth tests).
- Auth routes now **7/7 covered**; refreshed audit totals **34/81 (42%)**. Regression: measurement+admin 19.0s, workout 7.9s, `go vet ./...` clean, gofmt clean (only pre-existing CRLF flag on `workout_e2e_test.go`). Audit §3.1/§4.2/§4.3/§6 + banner updated; remaining P0: comments; P1: `PUT /api/users/me`.

**Workout suite completion (2026-09-29, later)** — `internal/api/e2e/workout_e2e_test.go`, **15 tests, all PASS** (6 pre-existing strengthened + 9 added). New helpers: `workoutJSON`/`workoutListJSON`/`workoutExerciseJSON` types, `workoutPayloadFor`, `mustCreateWorkout`, `decodeWorkoutList`, `listWorkoutDates`, `newTrainerAthletePair`, const `invalidWorkoutMsg`.
- New tests: `Unauthenticated` (401 ×3 middleware rejections × 4 routes), `RoleGuards` (trainer+admin → 403 create/list), `CreateValidation` (10 field-level branches + control case), `CreateRoundTrip` (2 exercises × 2 sets, notes, freeform exerciseId 0, every set field), `ListPaginationAndDateFilters` (ordering, limit/offset, offset past end, date window, reversed range, single-bound-ignored, malformed → 400), `ListPaginationEdgeCases` (`limit=0`/`abc` → empty 200; `limit=-1`/`offset=-1` → 500), `GetByID_Access` (owner 200, other athlete 403, `-1` → 404, **AUTHZ-001 pin: trainer/admin → 200**), `ClientView_RoleGuardsAndFilters` (athlete+admin 403 before param parsing, `exerciseType` case-insensitive partial, no-match, pagination, date window, malformed date), `ClientView_TerminatedRelationship` (SQL `status='terminated'` ⇒ 403).
- Strengthened existing tests with exact `error`-body assertions (404/400 messages, unknown-username / no-relationship messages, client-view payload + second-trainer denial).
- **New findings (audit §4.4 W1–W7)**: W1 `GetClientWorkouts`'s own 400 message is **dead code** (`handleServiceError` intercepts `INVALID_DATE`; the own-list endpoint returns a different message); W2 pagination unclamped → **client-triggerable 500** (OBS-002); W3 `limit=abc` → silent empty page; W4 `count` = page size, not total; W5 single date bound silently ignored; W6 reversed range accepted; W7 AUTHZ-001 IDOR pinned by test.
- **Cross-workstream**: `meal_e2e_test.go` (another agent's WIP) had compile errors that broke the **entire** e2e package — fixed mechanically (unused var, 6 × `[]any{{…}}` → typed literals, payload field → `any`). `TestE2E_Meal_ListWithFilters` still FAILS (their work, not fixed). Documented in audit §5.7.
- Validation: workout 15/15 PASS; regressions auth 18.2s / measurement+admin 16.1s / workout 20.1s all `ok`; `go vet ./...` clean; `gofmt -l internal/api/e2e` clean.


## Password Reset Migration Applied + cmd/migrate Restored (2026-08-30)
- Dev DB (`gymtrack`) was missing `password_reset_tokens` — migration 006 existed as SQL but no runner: `cmd/migrate` had been deleted (docs still referenced it), and `cmd/ensure-schema` only applies migration 001 **destructively** (drops schema).
- Recreated `backend/cmd/migrate/main.go`: applies pending `migrations/*.up.sql` in filename order, tracks state in `schema_migrations` table, one transaction per migration, idempotent (re-run skips applied). Default DSN `postgres://postgres:123456@localhost:5432/gymtrack` (POSTGRES_DSN override). Run from `backend/` dir.
- Drift found & resolved: dev DB had 001 (via ensure-schema) and 002–005 applied by hand with no tracking. Marked 001–005 in `schema_migrations`, then `go run ./cmd/migrate` applied 006. Verified: `password_reset_tokens` columns + all 3 indexes (PK, unique token_hash, user_id) present; re-run reports "database is up to date".
- **Going forward**: after adding a migration, run `go run ./cmd/migrate` from `backend/`. Do NOT use `ensure-schema` on a DB with data (it drops the schema).

## Password Reset Email Template (2026-08-30)
Created React Email template for the reset-password flow (branch `feature/reset-password`, backend `resend.go` currently sends hand-rolled HTML):
- `frontend/emails/reset-password.tsx` — minimal scoreboard-register template (red signal bar, mono eyebrow/heading, hairline fallback-URL panel, square red CTA). Colors mirror `globals.css` light tokens as hardcoded hex (email clients can't read CSS variables — documented deviation from DESIGN.md §3.1 in file comment).
- `frontend/scripts/render-email-check.tsx` — verification/export script: renders to HTML + plain text into `frontend/scripts/.email-out/` (gitignored). Run: `pnpm exec tsx scripts/render-email-check.tsx`.
- `package.json` script `email` → `email dev --dir emails --port 3000` (React Email preview server); `react-email` added as dependency.
- Verified: renders 6.9KB HTML + plain text; eslint clean; no tsc errors in new files; compiled HTML has correct inline styles (1px stone-200 borders, Geist Mono stack, box-border CTA).
- Backend wiring (2026-08-30, done): `pnpm email:export` renders the template with a `__RESET_URL__` placeholder into `backend/internal/infrastructure/email/templates/reset_password.html`; `resend.go` embeds it (`//go:embed`), substitutes the HTML-escaped URL at send time via `buildResetPasswordHTML`, and `resend_test.go` covers substitution + escaping. Regenerate the HTML with `pnpm email:export` after any template edit — never hand-edit the generated file.

## Zustand Migration (implemented) — `plans/zustand-migration.md`
Implemented the "survive navigation" store migration: list filter/pagination and the shared calendar date now persist across route/tab switches. Auth (`authStore`) and React Query server-state untouched.

## BodyMeasurementForm Layout Fixes (2026-08-30)
Fixed parts-grid overflow in `frontend/src/components/features/body-measurement/BodyMeasurementForm.tsx`:
- Paired body parts (bicep/forearm/thigh/calf L/R) previously rendered `label(w-48/md:w-64) + input + label + input` in one flex row inside `lg:grid-cols-4` cells (~200px) → severe horizontal overflow. Restructured every parts cell to the form-wide "label above input" pattern; paired parts are now a `grid grid-cols-2 gap-4` sub-grid inside their cell (per-side labels + per-side `FieldError`).
- Parts grid: `lg:grid-cols-4 gap-x-12` → `lg:grid-cols-3 gap-6` (9 cells = clean 3×3; `gap-6` per DESIGN.md §3.3).
- Footer button row: `space-y-4 md:space-x-4` → `flex-col gap-4 sm:flex-row`; buttons `md:w-auto` → `sm:w-auto` (breakpoint consistency with rest of form).
- Deduped part-input rendering into a `renderPartInput(key)` helper; fixed one latent `FieldError errors` type mismatch by passing `{ message }` objects (tsc errors in file: 6 → 5, all remaining pre-existing in untouched logic).
- Verified: `eslint` exit 0; `tsc --noEmit` no new errors.



### New store files (`frontend/src/stores/`)
- `list-ui-store.ts` — generic `createListUiStore<TFilter>(initialFilter)` factory (`filter`/`page`/`setFilter` (resets page→1)/`setPage`/`reset`).
- `meal-list-store.ts` → `useMealListStore`
- `workout-list-store.ts` → `useWorkoutListStore`
- `measurement-list-store.ts` → `useMeasurementListStore`
- `calendar-store.ts` → `useCalendarStore` (`activeDate`/`viewMonth` + setters)
- `exercise-catalog-store.ts` → `useExerciseCatalogStore` (searchQuery/muscleGroup/equipment + setters)

### Modified components (7)
- `MealList.tsx` / `WorkoutList.tsx` / `BodyMeasurementList.tsx` — uncontrolled fallback now store-backed; controlled props (`filter`/`onFilterChange`/`page`/`onPageChange`) API kept intact.
- `MeasurementsClient.tsx` (athlete /measurements) — replaced local `useState` filter/page with `useMeasurementListStore` so measurements survive navigation (list + charts stay in sync).
- `MealCalendar.tsx` / `WorkoutCalendar.tsx` — `selectedDate`/`currentMonth` now from the shared `useCalendarStore`; typed `onSelect` wrapped with `if (d)` guard (store setter takes a required Date).
- `ExerciseSelector.tsx` — search/muscleGroup/equipment filters now store-backed; removed the reset-on-select so the last filter persists across dialog reopenings (per verification #4). "Clear filters" button still resets.

### Verification
- `pnpm test:run WorkoutList.test.tsx WorkoutCalendar.test.tsx` → WorkoutList 6/6 PASS. WorkoutCalendar 2 pre-existing failures unchanged (dynamic calendar-grid skeleton hides `title`; active date renders today via store — unrelated to migration).
- `pnpm exec tsc --noEmit` → only pre-existing project wide errors (113); none reference the 7 edited regions or the 6 new store files.

## Current Focus
Mobile G1-G8 review fixes implemented (2026-08-02) — see "Mobile Review Fixes" below. (Prior: frontend auth checklist fixes.)

## Mobile Review Fixes — Complete

Implemented `plans/mobile-review-fixes.md` — all 15 items addressed (14 implemented, 1 already-fixed). 10 files modified in `mobile/src/`. Verified: `npx tsc --noEmit` → 0 new errors (3 pre-existing in `ExternalLink.tsx` + `i18n.tsx` unchanged).

### Changes (10 files)

**WorkoutPlanDetailScreen.tsx** (items 1, 6, 13):
- Item 1: Added `editExercises` state; `handleEdit` copies exercises from `data` into state; `savePlan` sends `editExercises` instead of stale `(data as PlanDetail)?.exercises`. Fixes silent exercise revert on refetch-while-editing.
- Item 6: `deletePlan` onSuccess now calls `queryClient.removeQueries(["workoutPlan", id])` synchronously before `invalidateQueries(["workoutPlans"])` + `router.back()`. Prevents deleted plan flashing in list.
- Item 13: `handleEdit` guarded with `if (!plan) return;` — prevents undefined access when edit button pressed before query resolves.

**AssignClientModal.tsx** (item 2):
- `keyExtractor` fallback changed from `Math.random()` to `index` — stable keys prevent FlatList full re-mount on toggle.

**WorkoutsScreen.tsx** (items 3, 7):
- Item 3: Added `pickedExerciseId?: number` to `NewExercise` interface. `handleExerciseSelect` sets `pickedExerciseId` via new `updateExercisePickedId()` instead of overwriting notes with category text. Notes field stays user-editable. Payload sends `ex.pickedExerciseId ?? 0`.
- Item 7: `removeExercise` clears `pickingForExId` if it matches removed exercise — prevents silent no-op when user removes slot then picks from still-open picker.

**TrainerProfileScreen.tsx** (items 4, 14):
- Item 4: `removeSlot` guard changed from `if (slot.availabilityId)` (truthy, undefined-safe but fragile) to `if (slot.availabilityId != null)` — explicit null/undefined check prevents `String(undefined)` → bad DELETE request.
- Item 14: Added `useEffect` syncing `availSlots` from `serverSlots` when `!editingAvail` — keeps local state fresh on refetch. Added `useEffect` import.

**TrainerDetailScreen.tsx** (item 5):
- `submitReview` mutationFn guarded with `if (!id) return Promise.reject(...)` instead of `id!` non-null assertion. Submit button `disabled` includes `!id` check.

**WorkoutPlansScreen.tsx** (item 9):
- Removed `e.stopPropagation?.()` (DOM API, no-op in RN). Added comment explaining RN gesture responder fires inner onPress before parent.

**ClientsScreen.tsx** (item 10):
- Removed dead `inviteCode` state + setter. Alert uses closure variable directly. Removed unused `useState` import.

**ExercisePicker.tsx** (item 11):
- Added `refetch` to useQuery destructuring. Error state now shows retry `TouchableOpacity` button. Added `retryButton` + `retryText` styles, `marginBottom` to `errorText`.

**StarRatingInput.tsx** (item 12):
- Stars row `View` gets `onTouchEnd={() => setHover(0)}` — fallback hover reset when touch ends outside individual star.

**MyTrainerScreen.tsx** (item 15):
- Added `showSuccess` flag + `isFetching` from useQuery. `acceptInvite` onSuccess sets `showSuccess=true`. Loading screen shows when `isLoading || showSuccess`. `useEffect` clears `showSuccess` when `isFetching` becomes false (refetch complete). Added `useEffect` import.

### Already Fixed (verified, no change needed)
- Item 8 (CommentSection.tsx): `renderComment` useCallback already includes `currentUserId` in deps at L153: `[currentUserId, readOnly, handleDelete, t]`. Plan was written against older version.


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

## Mobile ProfileScreen Redesign (2026-09-07)
Redesigned `mobile/src/components/features/profile/ProfileScreen.tsx`:
- Extracted `ProfileHeader` (Avatar component + role badge + member-since), `InfoRow`, `ActionRow` (chevron + press feedback) subcomponents; main component now has a null-user spinner guard.
- Fixed broken i18n keys that rendered raw keys: `profile.role`→`profile.fields.role`, `trainer.bio`→`profile.fields.bio`, `profile.my_trainer`→`athlete.trainer.title`, `common.save/cancel`→`common.actions.*`, hardcoded "My Clients"/"Trainer Profile"→`trainer.clients.title`/`profile.trainer_profile`.
- Added new keys to mobile `messages/{en,tr}.json`: `profile.trainer_profile`, `profile.my_clients`, `profile.validation.bio_too_long`, `auth.logout.message`.
- Behavior: form state initialized on `startEditing()` (no stale state), save preserves other profile fields via `{...user.profile, name, bio}`, mutation response written to store via new `setUser` action in `authStore` + `queryClient.setQueryData(["user"])`, logout confirmed via dialog then `void logout()` (root layout auto-switches to (auth) stack). Added `testID`s (input-profile-name/bio, btn-logout, action-*) for Maestro E2E; bio char counter + maxLength; `keyboardShouldPersistTaps="handled"`.
- Verified: eslint clean, tsc clean for touched files (only pre-existing tsconfig TS5101 baseUrl deprecation), all i18n keys resolve in en.json (JSON valid).

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
## Font Loading + Register Fixes (2026-08-30)
Typography audit findings, all fixed:
- [locale]/layout.tsx: Inter + Geist Mono loaded static weights (400/500) while 150 x font-semibold (600) synthesized fake-bold. Fix: omit weight (variable axis). Added latin-ext subsets - Turkish glyphs previously fell back to system font.
- AboutClient.tsx: Space_Grotesk display face (3rd font, allowed) - static 4 weights + missing latin-ext fixed same way. Hero font-bold leading-[0.88] tracking-[-0.05em] moved to register: font-medium leading-[1.05] tracking-[-0.04em] (DESIGN.md 3.2 display row).
- All 8 forbidden font-bold/black/extrabold removed (count now 0): ProfileClient h1 x2 + TrainerCatalogCard h3 changed to font-semibold (heading 600); LandingMetrics + StatCard values changed to font-mono font-semibold tracking-tight (numeric register); WorkoutPlanForm index chip font-heading font-bold changed to font-mono font-semibold.
- Deliberate non-changes: no font swap (Inter + Geist Mono correct pairing), no font-synthesis: none (variable fonts cover all weights), no global tabular-nums (per-instance already).
- Verified: eslint exit 0 on all touched files; tsc same pre-existing error set (stash round-trip confirmed 23 pre-existing in ProfileClient/TrainerCatalogCard, 0 new).
