# Backend API Test Coverage Audit

> **Date**: 2026-09-29
> **Scope**: Every route registered by the Go/Gin backend (`backend/internal/api/routes/*`), checked against all existing tests in `backend/`.
> **Method**: Enumerated all route registrations (source of truth = route files, cross-checked against `internal/app/module.go`), inventoried every `*_test.go`, mapped tests → endpoints, assessed assertion depth of existing endpoint tests, and **executed the e2e suite** to confirm current status.
> **Execution**: `POSTGRES_TEST_DSN=... go test -count=1 -timeout 300s ./internal/api/e2e/` → **`ok gymtrack-backend/internal/api/e2e 13.163s` (PASS, 16 tests)**.
>
> **⚠️ Update (2026-09-29, same day)**: `measurement_e2e_test.go` (6 tests) + `admin_e2e_test.go` (8 tests) + **auth-suite completion (7 new tests in `auth_e2e_test.go`)** added, all PASS. All 7 measurement routes, all 10 admin routes, and **all 7 auth routes** are now covered — including the 24h window, the admin 403 matrix, `logout`, the full `password-reset` request→confirm flow, restore failure branches, and the **rate-limit 429**. Refreshed totals: **34 / 81 API endpoints with HTTP tests (42%)**, untested 63 / 97. P0 items "measurements" and "admin" are **done ✅**; remaining P0: comments.
>
> **⚠️ Update 2 (2026-09-29, workout suite)**: `workout_e2e_test.go` completed — **15 tests** (6 strengthened + 9 added), all PASS. All 4 workout routes now fully covered (auth 401 matrix, trainer/admin role guards, field-level validation, JSONB round-trip, list pagination + date filters, client-view role guard + `exerciseType` filter + terminated relationship, AUTHZ-001 pinned, pagination warts pinned). Endpoint total unchanged (workouts were already counted as ✅/⚠️), but **every ⚠️ gap in §3.4 is closed**. New process finding: `meals` WIP file `meal_e2e_test.go` did not compile (§5.7).
>
> **⚠️ Infra bug found & fixed (2026-09-29)**: `testutils/postgres.go` — `setupIsolatedDSNDB` mutated `cfg.Database` then read `cfg.ConnString()`, but pgx returns the **original** connection string, so every `POSTGRES_TEST_DSN` run actually used the shared maintenance DB (dev `gymtrack`) instead of a per-test DB. Fixed via new `dsnWithDatabase()` helper (URL + keyword forms). Consequence: past DSN-mode runs polluted the dev DB with `*@e2e.test` test users/data — see §5.6. The testcontainers path was never affected.

> **⚠️ Update 3 (2026-09-30, meal suite)**: `meal_e2e_test.go` completed — **10 tests**, all PASS, closing §5.7 (compile errors + the failing `TestE2E_Meal_ListWithFilters` both fixed). All 4 meal routes now covered: JSONB round-trip, 8 invalid-payload branches with exact `error` bodies, cross-athlete 403 + list isolation, trainer → 403, relationship-gated client view (404 unknown username / 403 no relationship / 403 athlete role guard / 200 after handshake incl. the `mealType` filter), a 401 matrix across all 4 routes, malformed token, `date` + `limit/offset` filtering, and both invalid-date 400 messages (YYYY-MM-DD + RFC3339-range). Refreshed totals: **38 / 81 API endpoints with HTTP tests (47%)**, untested 59 / 97. P1 item "meals" **done ✅**. Suite run: `go test -count=1 -timeout 300s ./internal/api/e2e/` → **ok, 62.5s (56 tests)**.
>
> **⚠️ Update 4 (2026-09-30, comment suite)**: `comment_e2e_test.go` added — **9 tests**, all PASS (`go test -count=1 -timeout 300s ./internal/api/e2e/ -run 'TestE2E_Comment'` → ok, 11.1s). All 4 comment routes now covered — this closes the **last P0** item. Coverage: create/list round-trip on workout **and** meal targets; permission matrix (cross-athlete 403, trainer without/with/**terminated** relationship, **admin → 403**); 8 create-validation branches with exact `error` bodies incl. the content boundary (2000 accepted / 2001 → 400); GET query validation (missing params / non-numeric targetId / bad targetType / target 404); threading (reply 201 with `parentCommentId`, missing parent 400, cross-target parent 400, permission-before-parent-check); author-only PUT (content + `editedAt`, non-author 403 **before** body validation, `abc` → 400, `999999` → 404) and DELETE (200 `{"message":"Comment deleted"}`, double-delete 404); 4-route 401 matrix across all three middleware rejection paths. Refreshed totals: **42 / 81 API endpoints with HTTP tests (52%)**, untested 55 / 97. New findings pinned as C1–C4 (§4.5).
>
> **⚠️ Known-failing, unrelated (2026-09-30) — RESOLVED in Update 5**: the then-untracked WIP `relationship_e2e_test.go` (7 tests — §3.8) made the **full-suite** run red: `TestE2E_Relationship_ClientView_AccessFailures` expects `404` for `GET /api/relationships/client/<unknown>` but gets **500**, because `GetClientDetails` checks `err != nil` before the `athlete == nil` branch while `PostgresUserRepository.GetUserByUsername` returns `(nil, domainerrors.ErrNotFound)` for unknown usernames — the 404 branch is unreachable. Not caused by the comment suite; `-run 'TestE2E_Comment'` is green. **Fixed 2026-09-30 — see Update 5.**
>
> **⚠️ Update 5 (2026-09-30, relationship suite + 2 handler bug fixes)**: `relationship_e2e_test.go` completed — **8 tests**, all PASS; `-run 'TestE2E_Relationship'` → `ok, 12.5s`, and the **full suite is green again** (`go test -count=1 -timeout 300s ./internal/api/e2e/` → **ok, 112.2s, 73 tests**). All 7 relationship routes now covered: invite→accept full loop (code shape `^[0-9a-f]{8}$`, ~7-day expiry, `invitations.status='used'`, `relationships.status='active'`, `profile.trainerAssignment`), my-clients (2 clients + usernames), client detail + stats (this-week counters, volume 484, exercise breakdown, meal averages, consistency), accept failure matrix (3 validation + 3 binding + unknown/used/expired codes + already-has-trainer), role guards (trainer-only × athlete+admin, athlete-only × trainer+admin), client-view 404/403 matrix incl. terminated, terminate (400/404/403 + post-termination state + re-terminate 200 pin), `pendingInvitations` (new test), and a 7-route 401 matrix.
> **Two production bugs fixed** (found by the suite, both one-line-plus-comment):
> 1. `GetClientDetails` **and** `GetClientStats` mapped an unknown username to **500** instead of **404** — `GetUserByUsername` returns `(nil, domainerrors.ErrNotFound)`, so the pre-existing `athlete == nil` → 404 branch was unreachable. Now `if err != nil && !errors.Is(err, domainerrors.ErrNotFound)`.
> 2. `GetMyTrainer` reported `activeTrainer` for **any** row returned by `GetByAthleteID` — so a **terminated** (or pending) relationship still showed the ex-trainer as the active one. Now guarded by `activeRelationship.IsActive()`, matching `GetClientDetails`/`GetClientStats`.
> **⚠️ Update 6 (2026-10-01, coaching-request suite)**: `coach_e2e_test.go` added — **8 tests**, all PASS (`-run 'TestE2E_Coach'` → ok, 12.4s). All 5 coaching-request routes now covered: create (201 payload, optional message, 4 binding branches → 400, unknown trainer → 404, non-trainer target → 400, duplicate → 409, trainer/admin → 403); /my (empty `[]` state, athlete sent + trainer received views with athlete/trainer enrichment); /pending (trainer-scoped pending-only view, athlete+admin → 403); accept (200 + active relationship + `trainerAssignment` + DB `accepted` + /pending drain, double-accept → 409, non-owner → 403, athlete-already-has-trainer → 409); reject (200, re-reject/reject-after-reject conflicts, non-owner → 403); ID validation (`abc` → 400, `999999` → 404); role-guard-before-parsing; and a 5-route 401 matrix. **No handler changes** — new findings pinned as H1–H2 (§4.7).
> Refreshed totals: **54 / 81 API endpoints with HTTP tests (67%)**, untested 43 / 97. P1 item "coaching" **done ✅**; remaining P1: `PUT /api/users/me`.

---

## 1. TL;DR

| Metric | Value |
|--------|-------|
| Total registered routes | **97** (81 `/api/*` + 1 metrics + 3 swagger + 12 pprof) |
| Endpoints with **any** HTTP-level test | **54 / 81 API endpoints (67%)** |
| Endpoints with **solid** coverage (happy + key failure paths) | **~50 / 81 (62%)** |
| Endpoints with **zero** HTTP-level test | **43 / 97** (27 API + 16 infra) |
| Endpoint test files | **8** (`auth`, `workout`, `measurement`, `admin`, `meal`, `comment`, `relationship`, `coach` e2e files) — **81 tests**, all passing |
| Handler unit tests | **0** |
| Service test files | 4 (`auth`, `password_reset`, `user`, `workout_plan`) — HTTP mapping not covered |
| Repository test files | 17 — data layer only |
| CI running backend tests | **None** (only `.github/workflows/migrate.yml` exists; no `go test`) |

**Verdict**: The e2e harness that exists is high quality (real router + real PostgreSQL + JWT middleware) and now covers **auth, workouts, meals, measurements, admin, comments, relationships and coaching requests**. Remaining domains with **no HTTP-level tests**: **trainer catalog/availability/reviews (12 routes), workout plans (10), the exercise catalog (8 of 8)**. Business rules still **untested at every layer**: review ownership/rating, workout-plan rules at HTTP level, and availability service — coaching request transitions/reject are now covered at HTTP level (this update). Remaining P1: only `PUT /api/users/me`.

---

## 2. Test Inventory

### 2.1 Endpoint-level (HTTP) tests — `backend/internal/api/e2e/`

| File | Tests | Covers |
|------|-------|--------|
| `auth_e2e_test.go` | 17 | register, login, refresh, logout, delete/restore account, protected-route 401s, password-reset request→confirm, field validation, rate-limiter (allow + **429**) |
| `workout_e2e_test.go` | 15 | workout create/read/list, role guards, cross-athlete isolation, invalid payloads, pagination + date filters, client view (w/ and w/o relationship, terminated) |
| `measurement_e2e_test.go` | 6 | measurement CRUD, **24h edit window**, role guards, invalid payloads/IDs, client view |
| `admin_e2e_test.go` | 8 | stats, users list/detail, role/status changes, comments + exercise moderation, password change, non-admin 403 matrix |
| `meal_e2e_test.go` | 10 | meal create/read/list + client view, role guards, cross-athlete isolation, 8 invalid payloads, 401 matrix, malformed token, date/pagination filters, `mealType` filter (client view) |
| `comment_e2e_test.go` | 9 | comment create/read/list (workout + meal targets), permission matrix (cross-athlete, trainer w/o + w/ + terminated relationship, **admin → 403**), 8 create-validation branches + 2000-char boundary, GET query validation, threading (parent/reply/cross-target), author-only PUT + DELETE, 4-route 401 matrix |
| `relationship_e2e_test.go` | 8 | invite→accept full loop (+ DB-verified consumption), my-clients, client detail + stats (volume/breakdown/averages), accept failure matrix (validation/binding/unknown/used/expired/already-has-trainer), role guards (trainer+athlete+admin), client-view 404/403 incl. terminated, terminate + post-state, `pendingInvitations`, 7-route 401 matrix. First run exposed 2 handler bugs (now fixed) |
| `coach_e2e_test.go` | 8 | create (payload, optional message, 4 binding branches, 404/400/409), /my (empty `[]`, sent/received + enrichment), /pending (scoped, guard), accept flow (+ double-accept, non-owner, has-trainer conflicts), reject flow (+ re-reject/accept conflicts), guard-before-parsing, admin-/my 500 pin, terminated-relationship pins, 5-route 401 matrix. No handler changes |
| `e2e_env.go` / `e2e_helpers.go` / `e2e_types.go` | — | Full wiring mirroring `module.go` (12 route groups), test-DB via `POSTGRES_TEST_DSN` or testcontainers, helpers |

**Test function names (81 total as of 2026-10-01 — verify live with `go test -list 'TestE2E.*' ./internal/api/e2e/`)**:
- *Original 16 (2026-09-29)*:
- `TestE2E_Register_Login_Protected`, `TestE2E_Register_DuplicateEmailAndUsername`, `TestE2E_Register_InvalidRole`, `TestE2E_Login_WrongPassword`, `TestE2E_Login_ByUsername`, `TestE2E_ProtectedRoute_MissingAndInvalidToken`, `TestE2E_RefreshToken`, `TestE2E_DeleteAndRestoreAccount`, `TestE2E_DeleteAccount_WrongPassword`, `TestE2E_RateLimiter_AllowsNormalTraffic`
- `TestE2E_Workout_CR_OwnAthlete`, `TestE2E_Workout_TrainerCannotCreate`, `TestE2E_Workout_AthleteCannotViewOthers`, `TestE2E_Workout_InvalidPayloads`, `TestE2E_Workout_TrainerClientView_NoRelationship`, `TestE2E_Workout_TrainerClientView_WithRelationship`
- *Auth completion (+7)*: `TestE2E_Register_InvalidPayloads`, `TestE2E_RefreshToken_InvalidInput`, `TestE2E_Logout`, `TestE2E_Restore_EdgeCases`, `TestE2E_PasswordReset_RequestValidation`, `TestE2E_PasswordReset_FullFlow`, `TestE2E_RateLimiter_TooManyRequests`
- *Workout completion (+9)*: `TestE2E_Workout_Unauthenticated`, `TestE2E_Workout_RoleGuards`, `TestE2E_Workout_CreateValidation`, `TestE2E_Workout_CreateRoundTrip`, `TestE2E_Workout_ListPaginationAndDateFilters`, `TestE2E_Workout_ListPaginationEdgeCases`, `TestE2E_Workout_GetByID_Access`, `TestE2E_Workout_ClientView_RoleGuardsAndFilters`, `TestE2E_Workout_ClientView_TerminatedRelationship`
- *Measurement (+6)*: `TestE2E_Measurement_CRUD_OwnAthlete`, `TestE2E_Measurement_TrainerForbidden`, `TestE2E_Measurement_AthleteCannotViewOthers`, `TestE2E_Measurement_InvalidPayloadsAndIDs`, `TestE2E_Measurement_EditWindow24h`, `TestE2E_Measurement_TrainerClientView`
- *Admin (+8)*: `TestE2E_Admin_NonAdminForbidden`, `TestE2E_Admin_UsersListAndDetail`, `TestE2E_Admin_DashboardStats`, `TestE2E_Admin_UpdateUserRole`, `TestE2E_Admin_UpdateUserStatus`, `TestE2E_Admin_CommentsModeration`, `TestE2E_Admin_ExerciseModeration`, `TestE2E_Admin_ChangePassword`
- *Meal (+10)*: `TestE2E_Meal_CR_OwnAthlete`, `TestE2E_Meal_TrainerCannotCreate`, `TestE2E_Meal_AthleteCannotViewOthers`, `TestE2E_Meal_InvalidPayloads`, `TestE2E_Meal_TrainerClientView_NoRelationship`, `TestE2E_Meal_TrainerClientView_WithRelationship`, `TestE2E_Meal_AthleteCannotAccessClientView`, `TestE2E_Meal_Unauthenticated`, `TestE2E_Meal_MalformedToken`, `TestE2E_Meal_ListWithFilters`
- *Comment (+9)*: `TestE2E_Comment_CreateAndGet_OwnAthlete`, `TestE2E_Comment_AccessDenied`, `TestE2E_Comment_TrainerWithRelationship`, `TestE2E_Comment_CreateValidation`, `TestE2E_Comment_GetValidation`, `TestE2E_Comment_Threading`, `TestE2E_Comment_UpdateAuthorOnly`, `TestE2E_Comment_DeleteAuthorOnly`, `TestE2E_Comment_Unauthenticated`
- *Relationship (+8)*: `TestE2E_Relationship_InviteAccept_FullFlow`, `TestE2E_Relationship_ClientStats_WithData`, `TestE2E_Relationship_Accept_FailureBranches`, `TestE2E_Relationship_RoleGuards`, `TestE2E_Relationship_ClientView_AccessFailures`, `TestE2E_Relationship_Terminate`, `TestE2E_Relationship_Unauthenticated`, `TestE2E_Relationship_MyTrainer_PendingInvitations`
- *Coaching (+8)*: `TestE2E_Coach_CreateAndMyRequests`, `TestE2E_Coach_CreateValidationAndRoleGuards`, `TestE2E_Coach_PendingAndReject`, `TestE2E_Coach_Accept_Flow`, `TestE2E_Coach_Accept_AthleteHasTrainer`, `TestE2E_Coach_AdminMyRequests`, `TestE2E_Coach_TerminatedRelationship`, `TestE2E_Coach_Unauthenticated`

### 2.2 Non-endpoint tests (do NOT exercise HTTP layer)

| Layer | Files | Notes |
|-------|-------|-------|
| Service | 4: `auth_service_test.go`, `password_reset_service_test.go`, `user_service_test.go`, `workout_plan_service_test.go` | Fake repos; business logic only — status-code mapping, binding, middleware untested |
| Repository (PostgreSQL) | 17: body_measurement, coaching_request, comment, exercise, meal, password_reset, relationship, trainer_profile, trainer_review, user, workout, workout_plan, workout_plan_assignment, auth_cache, jsonb, benchmark, helpers | Real DB via `SetupTestPostgresDB` |
| Infra | `cache_test.go`, `resend_test.go` | Unit-level |
| Handlers | **0 files** | No handler unit tests exist |

---

## 3. Full Endpoint Coverage Matrix

**Legend**: ✅ solid e2e coverage · ⚠️ partial/incidental (happy path only, or exercised only as a helper) · ❌ no HTTP-level test

### 3.1 Auth — `auth_routes.go` (rate-limited group)

| # | Endpoint | Status | Existing coverage / gap |
|---|----------|--------|-------------------------|
| 1 | POST `/api/auth/register` | ✅ | 201; 409 dup email & username; 400 invalid role; **400 field validation** (empty, weak password, short + non-alphanum username, bad email, non-object body — incl. exact validator message). **Gap**: 500 path only |
| 2 | POST `/api/auth/login` | ✅ | 200 by email + by username; 401 wrong password; 403 soft-deleted account; **429 after burst exhausted (exact message + refill recovery)** |
| 3 | POST `/api/auth/refresh` | ✅ | 200 + new token works; access-token-as-refresh → 401; **400 missing body / non-object; 401 garbage token** |
| 4 | POST `/api/auth/logout` | ✅ | 200 + exact message, both unauthenticated and with a token (route has no JWT middleware — swagger's `@Failure 401` is unreachable). Note: no server-side revocation asserted |
| 5 | POST `/api/auth/restore` | ✅ | Success path (delete→restore→token works); **403 account-not-deleted, 401 wrong password, 401 unknown identifier, 403 expired 30-day window (SQL-backdated `deleted_at`), 400 missing fields** |
| 6 | POST `/api/auth/password-reset/request` | ✅ | **400 missing/invalid email + non-object (exact message); unknown email → generic 200 with zero token rows (anti-enumeration); known email → exactly 1 valid DB token; second request does not duplicate** |
| 7 | POST `/api/auth/password-reset/confirm` | ✅ | **Full flow**: raw token (hash swapped in DB, since only SHA-256 is persisted) → 200 + token consumed + old password 401 + new password 200; **replayed token → 400; expired token → 400**; 400 missing fields / short password / unknown token (exact generic invalid-link message) |


### 3.2 Users — `user_routes.go`

| # | Endpoint | Status | Existing coverage / gap |
|---|----------|--------|-------------------------|
| 8 | GET `/api/users/me` | ✅ | 200 + username assertion; 401 for missing / invalid / malformed token |
| 9 | PUT `/api/users/me` | ❌ | **Never tested** (search for `MethodPut, "/api/users/me"` → 0 hits). Profile update rules untested |
| 10 | DELETE `/api/users/me` | ✅ | 200 with password; 401 wrong password; post-delete login → 403 |

### 3.3 Admin — `admin_routes.go` (auth + `AdminOnlyMiddleware`)

**✅ Covered as of 2026-09-29** by `admin_e2e_test.go` (8 tests, all PASS). All 10 routes exercised, including the non-admin 403 matrix across every route, `AdminOnlyMiddleware`'s exact message, last-admin protections, and the suspended/banned → 403 middleware block. Admin identity is bootstrapped by `promoteToAdmin` (SQL `UPDATE users SET role='admin'` **before login** so the JWT carries the admin role — registration forbids the admin role).

| # | Endpoint | Status | Coverage notes |
|---|----------|--------|----------------|
| 11 | GET `/api/admin/stats` | ✅ | totals for 3 users (users/trainers/athletes/new-today-week-month, 0 workouts/meals); 403 matrix; 401 |
| 12 | GET `/api/admin/users` | ✅ | full list, `role` filter, `search`, `limit/offset` pagination + `total`; 403 matrix |
| 13 | GET `/api/admin/users/:id` | ✅ | 200 detail round-trip; `abc` → 400; 999999 → 404 (exact message) |
| 14 | PUT `/api/admin/users/:id/role` | ✅ | athlete→trainer→admin + persistence via detail; **self-change → 400** (`SELF_ROLE_CHANGE`); invalid/missing role → 400; 404/400 IDs. Note: `LAST_ADMIN` demote branch is unreachable (actor≠target admin implies ≥2 admins) |
| 15 | PUT `/api/admin/users/:id/status` | ✅ | suspend → **victim's requests → 403 with status message**; ban → 403; reactivate → 200; **last-admin self-suspend → 400**; `"deleted"` rejected → 400; 404/400 |
| 16 | GET `/api/admin/comments` | ✅ | seeded via API (exercise→workout→comment); field assertions; `targetType=workout/meal` filters |
| 17 | DELETE `/api/admin/comments/:id` | ✅ | 200 + list re-check → 0; double-delete → 404 (exact message); `abc` → 400 |
| 18 | PUT `/api/admin/exercises/:id/verify` | ✅ | 200 + `isVerified=true` persisted via public GET; 999999 → 404 (status only — service returns the generic `USER_NOT_FOUND` sentinel for verify-misses, deliberately not enshrined); `abc` → 400 |
| 19 | DELETE `/api/admin/exercises/:id` | ✅ | 200 + public GET → 404; double-delete → 404 (exact message); `abc` → 400 |
| 20 | PUT `/api/admin/profile/password` | ✅ | wrong old → 400 (exact message); short new / missing fields → 400; success → 200; **old login → 401, new login → 200** |

> Regression check: all 10 routes reject trainer AND athlete with 403 (`TestE2E_Admin_NonAdminForbidden` iterates the full `adminRoutes` table).

### 3.4 Workouts — `workout_routes.go`

**All 4 routes ✅ — completed 2026-09-29** (`workout_e2e_test.go`, 15 tests: 6 pre-existing strengthened + 9 added).

| # | Endpoint | Status | Coverage |
|---|----------|--------|----------|
| 21 | POST `/api/workouts` | ✅ | 201; **full JSONB round-trip** (2 exercises × 2 sets, notes, freeform `exerciseId: 0`, weight/unit/reps/rest/`completed`); 401 ×3 (missing/malformed/unusable token); trainer **and admin** → 403; 16 invalid-payload branches (missing date/exercises/name/reps/unit, zero reps, negative weight/rest, unknown unit, non-RFC3339 date, non-object and non-JSON bodies) — all asserting the exact `error` body |
| 22 | GET `/api/workouts` | ✅ | 200 newest-first ordering; `limit`/`offset` incl. offset past end; `startDate`+`endDate` window; reversed range; **single bound silently ignored**; malformed range → 400 (own-list message); trainer/admin → 403; **429-adjacent pagination warts pinned** (`limit=0`/`abc` → empty 200, `limit=-1`/`offset=-1` → 500, see §4.4) |
| 23 | GET `/api/workouts/:id` | ✅ | 200 own; other athlete → 403 (message); `999999` → 404 (message); `abc`/`1.5` → 400 (message); negative id → 404; **trainer/admin cross-tenant read pinned = 200 (AUTHZ-001)** |
| 24 | GET `/api/clients/:username/workouts` | ✅ | athlete **and admin** → 403 role guard (before param parsing); unknown username → 404; no relationship → 403 (message); **terminated relationship → 403**; 200 with relationship incl. payload; `exerciseType` case-insensitive partial match + no-match; `limit`/`offset`; date window; malformed date → 400 (`INVALID_DATE` message — see §4.4) |


### 3.5 Meals — `meal_routes.go`

**✅ Covered as of 2026-09-30** by `meal_e2e_test.go` (10 tests, all PASS) — completes the P1 item and closes §5.7. Contract notes discovered while writing the tests: own-list `GET /api/meals` accepts only `limit/offset/startDate/endDate/date` (**no `mealType` filter** — it lives on the trainer client view), and the invalid-range error is the RFC3339 variant of the message.

| # | Endpoint | Status | Coverage |
|---|----------|--------|----------|
| 25 | POST `/api/meals` | ✅ | 201 + full JSONB round-trip (2 items with macros read back); trainer → 403; **8 invalid-payload branches → 400 with exact `error` body** (missing date, missing mealType, invalid mealType enum, empty items, missing food, missing quantity, negative calories, non-object body); 401 unauth |
| 26 | GET `/api/meals` | ✅ | 200 list + round-trip; cross-athlete list isolation (count 0); `date` filter (3/3); `limit`/`offset` pagination (2 + 1); invalid `date` → 400 (YYYY-MM-DD message, exact); invalid `startDate/endDate` → 400 (RFC3339 message, exact); 401. **Gap**: `startDate/endDate` happy window; W2/W3 pagination warts not pinned here |
| 27 | GET `/api/meals/:id` | ✅ | 200 own (mealType + both items asserted); other athlete → 403; 401. **Gap**: nonexistent → 404, `abc` → 400 |
| 28 | GET `/api/clients/:username/meals` | ✅ | unknown username → 404; unrelated athlete → 403; athlete role guard → 403 (trainer-only); 200 after `establishRelationship`; **`mealType` filter** (breakfast → 1 match, dinner → 0); 401. **Gap**: terminated relationship, `date`/`limit` filters |

### 3.6 Body Measurements — `measurement_routes.go`

**✅ Covered as of 2026-09-29** by `measurement_e2e_test.go` (6 tests, all PASS) — the only domain where the audit's P0 gap was closed the same day. All 7 routes exercised, including the 24h edit window (via DB backdating of `created_at`) and error-body assertions via `RequireJSONError`.

| # | Endpoint | Status | Note |
|---|----------|--------|------|
| 29 | POST `/api/measurements` | ✅ | 201 + full payload round-trip; trainer → 403; 6 validation cases → 400 |
| 30 | GET `/api/measurements` | ✅ | list, `limit`/`offset`, date-range filter, invalid range → 400; trainer → 403 |
| 31 | GET `/api/measurements/latest` | ✅ | 200; empty → 204; other athleteId → 403; bad athleteId → 400; trainer w/o relationship → 403 |
| 32 | GET `/api/measurements/:id` | ✅ | 200; cross-athlete → 403; 404 w/ message; `abc` → 400; trainer w/o relationship → 403, w/ relationship → 200 |
| 33 | PUT `/api/measurements/:id` | ✅ | 200 + persistence; cross-athlete → 403; **24h window → 403** (backdated `created_at`); 404/400 |
| 34 | DELETE `/api/measurements/:id` | ✅ | 200 + read-path verification; cross-athlete → 403; **24h window → 403**; 404/400 |
| 35 | GET `/api/clients/:username/measurements` | ✅ | 200 after `establishRelationship`; unknown → 404; no relationship → 403; athlete role → 403 |

> The 24h rule lives in `models.BodyMeasurement.CanEdit()` + `body_measurement_service.go:172`. Previously untested at every layer — now executed by `TestE2E_Measurement_EditWindow24h` (backdates `created_at` by 25h via SQL, asserts PUT/DELETE → 403 with exact error messages).

### 3.7 Comments — `comment_routes.go`

**✅ Covered as of 2026-09-30** by `comment_e2e_test.go` (9 tests, all PASS) — closes the audit's last P0 item. Contract notes discovered while writing the tests: `CanAccessComments` admits only the **athlete owning the target** or a **trainer with an active relationship** — an **admin gets 403** here (moderation lives on `/api/admin/comments`); `CreateCommentRequest` carries only `binding` tags, so *every* binding failure (missing field, empty/oversized content, non-object body, non-string targetId) returns the same message and the handler's second `validator.Struct` branch is dead code (finding C3); `PUT`/`DELETE` check authorship **before** parsing the body; and a nonexistent comment ID surfaces as `ErrTargetNotFound` ("the workout or meal you are commenting on was not found" — C2).

| # | Endpoint | Status | Coverage |
|---|----------|--------|----------|
| 36 | POST `/api/comments` | ✅ | 201 round-trip on **workout and meal** targets (`type`, `commentId`, `targetType`/`targetId`, `authorId`, `authorRole`, `content`, nil `parentCommentId`, `createdAt`); other athlete → 403; trainer w/o relationship → 403, **with relationship → 201 (`authorRole:"trainer"`), terminated → 403**; admin → 403 (pinned); target 999999 → 404; **8 invalid-payload branches → 400 with exact `error`** (missing targetType/targetId/content, empty content, 2001-char content, non-object body, numeric targetId, non-numeric targetId, non-numeric parentCommentId — 2000 chars accepted as boundary); empty-string `parentCommentId` = top-level; threading: reply → 201 + parent set, missing parent → 400, cross-target parent → 400, permission checked before parent validity; 401 unauth. **Gap**: invalid `targetType` enum → **500** (C1) |
| 37 | GET `/api/comments` | ✅ | 200 `{comments:[...]}` round-trip; `created_at` ASC ordering; cross-athlete → 403; trainer w/o relationship → 403, with → 200, terminated → 403; admin → 403; validation: missing params / non-numeric targetId / invalid targetType (400, exact messages) / nonexistent target (404); 401 |
| 38 | PUT `/api/comments/:id` | ✅ | 200 author edit → `content` updated + `editedAt` set + persisted on re-read; non-author → 403 (also with an invalid body — authorship precedes binding); author + invalid body → 400; 2001-char content → 400; `abc` → 400; `999999` → **404 with the target-not-found message** (C2, pinned); 401. **Gap**: comment-deleted 404 race branch unreachable |
| 39 | DELETE `/api/comments/:id` | ✅ | 200 `{"message":"Comment deleted"}` + list re-check (survivor asserted); non-author → 403; `abc` → 400; double-delete → 404; `999999` → 404 (C2); 401 |

### 3.8 Relationships — `relationship_routes.go`

**✅ Covered as of 2026-09-30** by `relationship_e2e_test.go` (8 tests, all PASS; `-run 'TestE2E_Relationship'` → ok, 12.5s). This is the suite that exposed the two handler bugs fixed in Update 5. Contract notes: accepting a code creates the relationship **already active** and sets `profile.trainerAssignment`; a repeat DELETE on an already-terminated relationship returns **200** (no status guard — pinned); role checks precede parameter/body parsing; and `pendingInvitations` on `my-trainer` reads **relationships** with status `pending`, not rows in `invitations`.

| # | Endpoint | Status | Coverage |
|---|----------|--------|----------|
| 40 | POST `/api/relationships/invite` | ✅ | 201 + `message`; code matches `^[0-9a-f]{8}$`; `expiresAt` within 6–8 days of now; athlete + admin → 403 (exact message); 401 ×3. **Gap**: no assertion that generating several codes invalidates earlier ones (it does not) |
| 41 | GET `/api/relationships/my-clients` | ✅ | 200 `{clients,count}` with 2 clients incl. athlete usernames + `status:"active"`; 0 after termination; athlete + admin → 403; 401 ×3 |
| 42 | GET `/api/relationships/client/:username` | ✅ | 200 with relationship + athlete profile + this-week counters (1/1 after seeding one workout + one meal); unknown username → **404** (was 500, fixed); unrelated athlete → 403; another trainer's client → 403; terminated → 403; athlete + admin → 403; 401 ×3 |
| 43 | GET `/api/relationships/client/:username/stats` | ✅ | 200: `totalVolume` 484 (60.5 kg × 8), weeklyVolume, exerciseBreakdown (name/sets/reps/maxWeight), consistency 0 (1 workout/week), meal averages (calories 495, protein 65.5), mealTypeBreakdown. 404 unknown (was 500, fixed) / 403 no relationship / 403 wrong role; 401 ×3 |
| 44 | POST `/api/relationships/accept` | ✅ | 200 + relationship `active`/trainerId/athleteId; `trainerAssignment` set; `invitations.status='used'` + `relationships.status='active'` verified in DB; **3 validation branches** (empty / short / missing code → "Validation failed…"), **3 binding branches** (numeric code, array body, empty body → "Invalid invitation data…"); unknown code → 404; replay → 409; already-has-trainer → 409; **expired code (SQL-backdated `expires_at`) → 400**; trainer + admin → 403; 401 ×3 |
| 45 | GET `/api/relationships/my-trainer` | ✅ | 200: empty `pendingInvitations` + no `activeTrainer` before any relationship; unconsumed invitation code does **not** appear; SQL-seeded pending relationship appears in `pendingInvitations` (id/trainerId/athleteId/status) but **not** as `activeTrainer`; after accept → `activeTrainer` with the right relationship + trainer; **after termination → no `activeTrainer`** (was reported as active, fixed); non-athlete → 403; 401 ×3 |
| 46 | DELETE `/api/relationships/:id` | ✅ | 200 + `message` + relationship payload; athlete- and trainer-side termination; `abc` → 400; `999999` → 404; uninvolved trainer → 403; post-termination: my-clients empty, `trainerAssignment` cleared, client views 403; **re-terminate → 200** (pinned); 401 ×3 |

### 3.9 Trainer catalog / availability / reviews — `trainer_routes.go`

**All 12 routes ❌ — zero HTTP-level tests.**

| # | Endpoint | Auth | Status |
|---|----------|------|--------|
| 47 | GET `/api/trainers` | public | ❌ |
| 48 | GET `/api/trainers/:id` | public | ❌ |
| 49 | GET `/api/trainers/:id/availability` | public | ❌ |
| 50 | GET `/api/trainers/:id/reviews` | public | ❌ |
| 51 | PUT `/api/trainers/me/profile` | trainer | ❌ (trainer-only role guard untested) |
| 52 | GET `/api/trainers/me/profile` | trainer | ❌ |
| 53 | GET `/api/trainers/me/availability` | trainer | ❌ |
| 54 | PUT `/api/trainers/me/availability` | trainer | ❌ |
| 55 | DELETE `/api/trainers/me/availability/:slotId` | trainer | ❌ |
| 56 | POST `/api/trainers/:id/reviews` | athlete | ❌ (rating 1–5 validation, athlete-only rule untested) |
| 57 | PUT `/api/reviews/:id` | owner | ❌ |
| 58 | DELETE `/api/reviews/:id` | owner | ❌ |

### 3.10 Coaching Requests — `coaching_request_routes.go`

**✅ Covered as of 2026-10-01** by `coach_e2e_test.go` (8 tests, all PASS; `-run 'TestE2E_Coach'` → ok, 12.4s). Contract notes: the create body carries only a `binding:"required"` on `trainerId`, so every binding failure (missing field, wrong type, array body, empty body) returns the same 400 message; `PUT /:id/accept` and `PUT /:id/reject` check the trainer role **before** parsing the ID; the `CoachingRequestResolvedError` message interpolates the stored status; and `GetMyRequests` touches the error path only for non-athlete/non-trainer roles.

| # | Endpoint | Status | Coverage |
|---|----------|--------|----------|
| 59 | POST `/api/coaching-requests` | ✅ | 201 + full payload (`requestId/athleteId/trainerId/message/status:"pending"/type/createdAt`); optional message; **4 binding branches → 400** (missing field, string `trainerId`, array body, empty body); unknown trainer → 404; non-trainer target (athlete, incl. self) → 400; duplicate pending → 409; active trainer → 409; trainer + admin → 403; 401 ×3 |
| 60 | GET `/api/coaching-requests/my` | ✅ | 200 `{requests:[...]}`; empty `[]` (non-null) for both roles; athlete sees sent requests with athlete+trainer enrichment; trainer sees received; accepted/rejected statuses surface after transitions; **admin → 500** (H1, pinned) |
| 61 | GET `/api/coaching-requests/pending` | ✅ | 200 trainer-scoped pending-only view (2 entries, other trainer's requests excluded; empty `[]` before any request); accepted/rejected rows leave the view; athlete + admin → 403; 401 ×3 |
| 62 | PUT `/api/coaching-requests/:id/accept` | ✅ | 200 `{"message":"coaching request accepted"}` + active relationship (trainerId/athleteId, DB `active`, `trainerAssignment` set, request row `accepted`, /pending drains); double-accept → 409; reject-after-accept prerequisite covered via the reject test; non-owner trainer → 403; pending request made before taking another trainer → 409 `ErrAthleteAlreadyHasActiveTrainer` (row stays `pending`); **terminated relationship → 409** (H2, pinned); `abc` → 400; `999999` → 404; athlete + admin → 403 (even ahead of ID parsing); 401 ×3 |
| 63 | PUT `/api/coaching-requests/:id/reject` | ✅ | 200 `{"message":"coaching request rejected"}` + DB `rejected` + /pending drain + /my update; re-reject → 409 and reject-after-accept → 409 with the stored status; non-owner → 403; `abc` → 400; `999999` → 404; athlete + admin → 403 (even ahead of ID parsing); 401 ×3 |

### 3.11 Exercise catalog — `exercise_routes.go`

| # | Endpoint | Status | Existing coverage / gap |
|---|----------|--------|-------------------------|
| 64 | GET `/api/muscle-groups` | ❌ | |
| 65 | GET `/api/equipment` | ❌ | |
| 66 | GET `/api/exercises` | ❌ | filters/search params untested |
| 67 | GET `/api/exercises/:id` | ❌ | |
| 68 | GET `/api/exercises/muscle-group/:id` | ❌ | |
| 69 | GET `/api/exercises/equipment/:id` | ❌ | |
| 70 | GET `/api/exercises/search` | ❌ | |
| 71 | POST `/api/exercises` | ⚠️ | Success path only (used by `createExerciseForWorkout` helper, 201 asserted). **Gap**: validation 400, unauth 401 |

### 3.12 Workout Plans — `workout_plan_routes.go`

**All 10 routes ❌ — zero HTTP-level tests.** (`WorkoutPlanService` unit tests exist — business logic partially covered, but **all HTTP role guards, assignment flow and `POST /:id/start` untested**.)

| # | Endpoint | Status |
|---|----------|--------|
| 72 | GET `/api/workout-plans/assigned` | ❌ |
| 73 | POST `/api/workout-plans` | ❌ |
| 74 | GET `/api/workout-plans` | ❌ |
| 75 | GET `/api/workout-plans/:id` | ❌ |
| 76 | PUT `/api/workout-plans/:id` | ❌ |
| 77 | DELETE `/api/workout-plans/:id` | ❌ |
| 78 | POST `/api/workout-plans/:id/assign` | ❌ |
| 79 | GET `/api/workout-plans/:id/assignments` | ❌ |
| 80 | POST `/api/workout-plans/:id/start` | ❌ |
| 81 | GET `/api/clients/:username/workout-plans` | ❌ |

### 3.13 Infrastructure routes

| # | Endpoint | Status | Note |
|---|----------|--------|------|
| 82 | GET `/metrics` | ❌ | **Not even wired into the test router** (`e2e_env.go` omits metrics/swagger/profiling registration) |
| 83 | GET `/swagger/doc.json` | ❌ | Not in test router |
| 84 | GET `/swagger/index.html` | ❌ | Not in test router |
| 85 | GET `/swagger` (301 → index) | ❌ | Not in test router |
| 86–97 | `/debug/pprof/*` (12 routes, `PPROF_ENABLED=true` only) | ❌ | Not in test router; conditional — low priority, but "disabled by default" gating is untested |

---

## 4. Quality of Existing Endpoint Tests

### 4.1 What the existing tests do well

- **Real stack**: tests go through the actual Gin router, JWT middleware, handler → service → PostgreSQL (isolated per-test DB), so status-code mapping is genuinely exercised.
- **Auth happy + key failure paths**: duplicate conflicts (409), role enum (400), wrong password (401), soft-deleted login (403), token-type confusion on refresh (401), three flavors of invalid `Authorization` (401).
- **Authorization boundaries for workouts**: trainer → 403 on create; cross-athlete isolation (403 on read + empty list); relationship-gated trainer view (403 → 200 after handshake).
- **Payload round-trip assertions**: created workout's exercises are read back and compared field-by-field, not just status-checked.
- **Validation paths**: missing/empty/malformed JSON, non-numeric and nonexistent IDs.

### 4.2 Gaps in the existing tests (functional depth)

| Area | Gap | Status |
|------|-----|--------|
| Rate limiting | `TestE2E_RateLimiter_AllowsNormalTraffic` only asserted traffic is **allowed**. | ✅ **Closed** — `TestE2E_RateLimiter_TooManyRequests` drains the burst and asserts `429` + exact message + refill recovery (verified deterministic over `-count=3`) |
| Error body contract | Helper `RequireJSONError` existed but was never used. | ✅ **Closed** — now used by measurement/admin/auth suites; companion `RequireJSONMessage` added for success bodies (`message` field) |
| Logout | `POST /api/auth/logout` never called (also reveals design note: handler performs no server-side refresh-token revocation — worth an explicit test documenting the contract). | ✅ **Closed** — `TestE2E_Logout` documents the 200 no-op contract (unauthenticated + authenticated); no-revocation note recorded in §3.1 |
| Register validation | Only role-enum tested; `min=8` password, `alphanum` username, `email` format branches never hit. | ✅ **Closed** — `TestE2E_Register_InvalidPayloads` (6 branches, incl. exact validator message) |
| Restore failures | Wrong-password / not-deleted / expired-window branches untested. | ✅ **Closed** — `TestE2E_Restore_EdgeCases` (403 not-deleted, 401 wrong password, 401 unknown identifier, 403 expired window via SQL-backdated `deleted_at`) |
| Workout list filters | `limit/offset/startDate/endDate/exerciseType` on both own-list and client-list never exercised. | ✅ **Closed** — `TestE2E_Workout_ListPaginationAndDateFilters` + `..._ClientView_RoleGuardsAndFilters` + `..._ListPaginationEdgeCases` |
| Unauthenticated (401) on domain routes | 401 only verified on `/api/users/me`. | ✅ **Closed** — measurement + admin + workout suites assert 401 on domain routes |
| Athlete vs trainer on client view | `GET /api/clients/:username/workouts` athlete → 403 branch never executed. | ✅ **Closed** — `TestE2E_Workout_ClientView_RoleGuardsAndFilters` (athlete AND admin → 403, role check wins over param parsing) |
| Meal suite | All 4 meal routes had zero HTTP tests; the WIP file broke the package build and `TestE2E_Meal_ListWithFilters` failed (§5.7). | ✅ **Closed 2026-09-30** — `meal_e2e_test.go` (10 tests, all PASS): role guards, cross-athlete isolation, 8 payload branches, client view + `mealType` filter, 401 matrix, `date`/pagination filters |
| Comment suite | All 4 comment routes had zero HTTP tests; permission / threading / 2000-char rules were untested at every layer. | ✅ **Closed 2026-09-30** — `comment_e2e_test.go` (9 tests, all PASS): permission matrix (incl. **admin → 403** and terminated relationship), threading, author-only PUT/DELETE with ordering pins, validation boundaries, 401 matrix |
| Relationship suite | All 7 relationship routes had zero HTTP tests; the invite→accept loop, `IsActive()` gating and the client-view 404 mapping were untested at every layer. | ✅ **Closed 2026-09-30** — `relationship_e2e_test.go` (8 tests, all PASS); first run exposed 2 production bugs now fixed (Update 5) |
| `ClearAllData` | Helper defined, never used — isolation relies entirely on per-test DB creation (works, but the helper is dead code). | ❌ **Open** (still dead code) |
| Coaching helper coverage | `establishRelationship()` exercises create/pending/accept only as a **setup side-effect** — no negative cases (reject, `/my`, role guards, duplicate requests). | ✅ **Closed 2026-10-01** — `coach_e2e_test.go` (8 tests, all PASS): dedicated reject/`my`/role-guard/duplicate tests + terminated-relationship pins |
| Coaching-request suite | All 5 routes were incidental-only (2 never called); the terminated-relationship guards and admin `/my` contract were untested at every layer. | ✅ **Closed 2026-10-01** — `coach_e2e_test.go` (8 tests, all PASS); 2 findings pinned (H1–H2) |

### 4.3 Compensating lower-layer coverage

| Business rule | Service test | Repo test | HTTP test |
|---------------|--------------|-----------|-----------|
| Register/login/refresh semantics | ✅ `auth_service_test.go` | ✅ | ✅ full (register field rules, refresh invalid input, 429) |
| Password reset flow | ✅ `password_reset_service_test.go` | ✅ | ✅ full (request anti-enumeration + dedupe, confirm success/reuse/expiry) |
| Account delete/restore | ✅ `user_service_test.go` | ✅ | ✅ full (happy + not-deleted + wrong password + expired window) |
| Workout plan rules (3-plan limit etc.) | ✅ `workout_plan_service_test.go` | ✅ | ❌ |
| **Workout CRUD / role / query rules** | ❌ no `workout_service_test.go` | ✅ `workout_test.go` | ✅ **full (2026-09-29)** — role guards, field validation, JSONB round-trip, pagination + date filters, client view |
| **Measurement 24h window** | ❌ | CRUD only | ✅ (added 2026-09-29, `TestE2E_Measurement_EditWindow24h`) |
| **Comment permissions/threading/2000-char** | ❌ | CRUD only | ✅ **full (2026-09-30)** — permission matrix (owner / active relationship / terminated / **admin 403**), threading + parent checks, author-only edit/delete, 2000-char boundary, GET query validation |
| **Meal role/ownership/query rules** | ❌ | CRUD only | ✅ **full (2026-09-30)** — role guards, cross-athlete isolation, 8 payload branches, client view + `mealType` filter, `date` + pagination filters |
| Review rating/ownership rules | ❌ | CRUD only | ❌ |
| Relationship invite/accept flow | ❌ | CRUD only | ✅ **full (2026-09-30)** — invite→accept with DB-verified consumption, accept failure matrix (validation/binding/unknown/replay/expired/already-has-trainer), my-clients, client detail + stats, terminate, role guards |
| Coaching request transitions | ❌ | CRUD only | ✅ **full (2026-10-01)** — create matrix (binding/404/400/dup/409), /my + /pending scoped views, accept (relationship/assignment/status) + double-accept/non-owner/has-trainer conflicts, reject + re-reject/reject-after-accept conflicts, guard-before-parsing, ID validation, admin-/my 500 pin, terminated-relationship pins |
| Availability slots | ❌ | ❌ | ❌ |
| Admin operations | ❌ | ❌ | ❌ |

**Untested at every layer** (highest-risk findings): availability service, admin service, review service. (Comment permission/threading rules left this list on 2026-09-30 — now exercised at the HTTP layer; the 24h measurement window likewise; the invitation flow and relationship `IsActive()` rules likewise; coaching-request transitions/reject likewise on 2026-10-01.)

### 4.4 Behaviour pinned by the workout suite (findings)

The completed workout suite documents several behaviours that are arguably defects. Tests are annotated with references so a future fix fails loudly and forces a conscious update:

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| W1 | **Client-view 400 fallback is dead code** — `GetClientWorkouts` calls `handleServiceError` before its own `"Invalid request. Please check the client username and search parameters and try again"` branch, and `ParseWorkoutQueryParams` can only fail with `INVALID_DATE`, which `handleServiceError` already maps. | `workout_handler.go:227-234`; `TestE2E_Workout_ClientView_RoleGuardsAndFilters` asserts the `INVALID_DATE` message | Cosmetic/dead code, but the two list endpoints return **different** messages for the same malformed input (`GET /api/workouts` → "Invalid search parameters…") |
| W2 | **Pagination is unclamped → 500** — `limit=-1` / `offset=-1` are forwarded to PostgreSQL and surface as `500 Something went wrong` (SQLSTATE 2201W/2201X). | `TestE2E_Workout_ListPaginationEdgeCases` (asserts 500); matches security audit **OBS-002** | Client-triggerable 500 from a query string; should be clamped or 400 |
| W3 | **Non-numeric / zero pagination silently returns an empty page** — `strconv.Atoi` errors are discarded, so `limit=abc` → `LIMIT 0` → `200 {count: 0}`. | same test | Silent wrong results, indistinguishable from "no workouts" |
| W4 | **`count` is the page size, not a total** — both list endpoints return `len(workouts)`; no total/next-page metadata. | `workout_service.go:115-118, 174-177`; asserted in pagination test | Clients cannot implement paging UI |
| W5 | **A single date bound is silently ignored** — the range filter applies only when BOTH `startDate` and `endDate` are present; `?startDate=X` alone returns everything. | `ParseWorkoutQueryParams`; asserted (3 rows returned) | Silent filter no-op |
| W6 | **Reversed range is accepted and returns nothing** — no `start <= end` validation. | asserted (0 rows, 200) | Minor |
| W7 | **Trainer/admin IDOR pin** — `GetWorkout` enforces ownership only for athletes, so any trainer or admin can read any workout by ID without a relationship. | `TestE2E_Workout_GetByID_Access` asserts **200** for both; security audit **AUTHZ-001** (unfixed) | Documented medium-severity authorization gap; the test will need flipping to 403 when fixed |
### 4.5 Behaviour pinned by the comment suite (findings)

Same policy as §4.4 — defects are pinned by tests so a future fix fails loudly:

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| C1 | **POST does not validate the `targetType` enum** — the binding tag is only `required`, so `"banana"` reaches `ResolveTargetAthlete`'s `default` branch, which returns a plain `fmt.Errorf` (not a sentinel) → `handleCommentServiceError` falls through to `handleInternalError` → **500**. `GET /api/comments` validates the same input and returns **400** with an exact message. | `TestE2E_Comment_CreateValidation/invalid targetType is 500 not 400`; `comment_handler.go` (no enum check) vs `GetComments` (`Invalid target type. Must be "workout" or "meal"`) | Client-triggerable 500 + inconsistent contract between the two routes |
| C2 | **Missing comment reports the wrong entity** — `CanEditOrDeleteComment` returns `ErrTargetNotFound` when the comment does not exist, so `PUT`/`DELETE /api/comments/:id` with an unknown ID returns 404 `"the workout or meal you are commenting on was not found"`. The correct branch (`"Comment not found. It may have been deleted"`, `comment_handler.go:274`) is unreachable: the comment was already proven to exist by the earlier service check. | `TestE2E_Comment_UpdateAuthorOnly` + `TestE2E_Comment_DeleteAuthorOnly` (both assert the target-not-found text) | Misleading API contract; message maps to the wrong resource |
| C3 | **`validator.Struct` branch is dead code** — `CreateCommentRequest`/`UpdateCommentRequest` declare only `binding:` tags while `validator.New()` reads `validate:` tags, so the second 400 branch (`"Validation failed. Please check the comment content (1-2000 characters) and try again"`) can never fire; all binding failures (missing field, empty/oversized content, non-object body, non-string `targetId`) return `"Invalid comment data. Please check the content and try again"`. | `TestE2E_Comment_CreateValidation` (7-branch table asserting the single message) | Same class as W1 (dead branch); the documented 1–2000 hint is never surfaced |
| C4 | **Admins are denied on `/api/comments`** — `CanAccessComments` handles only `athlete` (must own target) and `trainer` (needs active relationship) and returns `ErrAccessDenied` for everything else, so an admin token gets **403** on both create and list. Moderation is only available through `/api/admin/comments`. | `TestE2E_Comment_AccessDenied` (admin create + list → 403, exact message) | Intentional-looking but undocumented; pinned so an "admin bypass" change is a conscious decision |

### 4.6 Behaviour pinned by the relationship suite (findings)

Same policy as §4.4/§4.5 — defects are pinned by tests so a future fix fails loudly. R2/R3 were fixed in this pass; R1 is a design wart that the tests now document.

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| R1 | **`pendingInvitations` is a dead feature** — `GetMyTrainer` fills it from `GetPendingByAthleteID`, i.e. relationships with `status = 'pending'`, but **no application code path creates a pending relationship**: `InvitationService.AcceptInvitation` calls `Accept()` immediately (invitation_service.go:76) and `CoachingRequestService.AcceptCoachingRequest` hardcodes `RelationshipStatusActive` (coaching_request_service.go:112). Meanwhile the unconsumed `invitations` rows that users actually generate are never surfaced. | `TestE2E_Relationship_MyTrainer_PendingInvitations`: a generated code → 0 pending; only a SQL-seeded pending row → 1 | The field is always `[]` in production; the UI cannot show a trainer "pending" — either wire it to `invitations` or drop it |
| R2 | **`my-trainer` reported non-active relationships as the active trainer** — `GetMyTrainer` used `GetByAthleteID` (newest row, **any** status) and never called `IsActive()`, unlike `GetClientDetails`/`GetClientStats`. A terminated (or pending) relationship was returned as `activeTrainer` with `status:"terminated"`. | `TestE2E_Relationship_ClientView_AccessFailures` ("expected no activeTrainer after termination") + `..._MyTrainer_PendingInvitations` | **FIXED 2026-09-30** — guard added: `if activeRelationship != nil && activeRelationship.IsActive()` |
| R3 | **Latent 500 on accept when a pending row exists for the same pair** — `relationships` has `UNIQUE(trainer_id, athlete_id)` while `AcceptInvitation` inserts unconditionally, so accepting a code for a pair that already has a `pending` row hits the constraint and surfaces as `500 Something went wrong`. Unreachable today only because nothing creates pending rows (R1). | Discovered while writing `..._MyTrainer_PendingInvitations` (first version seeded the pending row for the same trainer and the accept returned 500; the test now uses a second trainer) | If R1 is ever wired up, accepting must upsert/reactivate the existing row instead of inserting |

### 4.7 Behaviour pinned by the coaching-request suite (findings)

Same policy as §4.4–§4.6 — defects are pinned by tests so a future fix fails loudly. Neither was fixed in this pass (no handler changes); H2 is the higher-severity item.

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| H1 | **Admin gets 500 on `GET /coaching-requests/my`** — `GetMyRequests` switches only on athlete/trainer; any other role produces a plain `fmt.Errorf` that `handleInternalError` reports as `500 Something went wrong`. | `TestE2E_Coach_AdminMyRequests` asserts 500 | Same class as C1 (role-unaware service seam). Trivial fix: reject the admin at the handler with 403 like the sibling routes, or give the service an `admin → []` branch |
| H2 | **Terminated relationships permanently block the coaching loop** — `CreateCoachingRequest` (`coaching_request_service.go:39-42`) and `AcceptCoachingRequest` (`:102-105`) treat *any* row from `GetByAthleteID` as a trainer, without the `IsActive()` check their invitation-service sibling performs (`invitation_service.go:70`). After a termination the athlete can neither request a new coach nor have a pre-existing pending request answered — both return 409 blaming an "active" trainer that no longer exists. | `TestE2E_Coach_TerminatedRelationship`: post-termination create → 409 `ErrAlreadyHasActiveTrainer`, accept → 409 `ErrAthleteAlreadyHasActiveTrainer` | High-severity UX trap: the one legitimate path back to a trainer (request a new one) is closed exactly when the athlete needs it. Fix mirrors `my-trainer` (R2): `existingRelationship != nil && existingRelationship.IsActive()` on both guards |

---

## 5. Process / Infrastructure Findings

1. **No CI for backend tests** — `.github/workflows/` contains only `migrate.yml`. Nothing runs `go test ./...`, so even the 81 passing e2e tests provide no regression guarantee — as demonstrated by the red `relationship_e2e_test.go` WIP file that sat unnoticed in the tree until the relationship pass (finding 8).
2. **Test router ≠ production router** — `e2e_env.go` omits `RegisterMetricsRoutes`, `RegisterSwaggerRoutes`, `RegisterProfilingRoutes` (16 routes unreachable from tests).
3. **Stale plan doc** — `plans/backend-http-e2e-test-plan.md` (2026-09-01) specifies 11 domain test files; its status table still says "Implementation ❌ Not started" although `auth_e2e_test.go` and `workout_e2e_test.go` now exist (naming also diverged: helpers live in `e2e_helpers.go`, not `e2e_test.go`).
4. **Doc drift in `AGENTS.md`** — API section lists `GET/PUT /api/admin/profile` which do not exist (actual: `PUT /api/admin/profile/password`), and omits several admin routes (`/stats`, status, comments, exercises). Route files were used as source of truth for this audit.
5. **Local run recipe works**: suite needs `POSTGRES_TEST_DSN` (local PG on :5432) or Docker for testcontainers; helper script `backend/run_e2e.cmd` exists.
6. **`POSTGRES_TEST_DSN` isolation was broken — FIXED 2026-09-29** (`internal/testutils/postgres.go`): `setupIsolatedDSNDB` did `cfg.Database = testDB; testDSN := cfg.ConnString()` — but pgx's `ConnString()` returns the original connection string and ignores the mutation (verified empirically), so migrations and the test pool targeted the **maintenance/dev `gymtrack` DB**. Isolation only ever worked via the testcontainers path. Fixed with `dsnWithDatabase()` (URL + keyword DSN forms); `go vet` clean; e2e + repo spot-checks green in true isolation.
   - **Fallout**: all `POSTGRES_TEST_DSN` runs (including this audit's earlier runs) wrote test artifacts into the dev DB — test users (registration emails all end in `@e2e.test`), their workouts/meals/measurements/comments, plus one measurement with `created_at` backdated −25h. Suggested cleanup (review before running):
     ```sql
     BEGIN;
     DELETE FROM comments            WHERE author_id  IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM workouts            WHERE athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM meals               WHERE athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM body_measurements   WHERE athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM relationships       WHERE trainer_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test')
                                        OR athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM coaching_requests   WHERE trainer_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test')
                                        OR athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM workout_plan_assignments WHERE athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM workout_plans       WHERE trainer_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM invitations         WHERE trainer_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM trainer_reviews     WHERE trainer_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test')
                                        OR athlete_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM trainer_availabilities WHERE trainer_id IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM exercises           WHERE created_by IN (SELECT user_id FROM users WHERE email LIKE '%@e2e.test');
     DELETE FROM users               WHERE email LIKE '%@e2e.test';
     COMMIT;
     ```

7. **WIP `meal_e2e_test.go` briefly broke the whole test package (2026-09-29) — RESOLVED 2026-09-30** — it contained compile errors that prevented `go test ./internal/api/e2e/` from building, so *no* e2e test could run. Compile errors fixed mechanically: unused `athleteToken` in `TestE2E_Meal_TrainerCannotCreate`, six `[]any{{...}}` composite literals (need explicit `map[string]any{...}` element types), and the invalid-payload table's `payload` field widened to `any` so the `"not-a-map"` case compiles. The remaining failure, `TestE2E_Meal_ListWithFilters` (1/7 meal tests), was fixed by aligning assertions with the real contract: own-list `GET /api/meals` supports only `limit/offset/startDate/endDate/date` — the `mealType` filter moved to the client-view test — and the invalid-range error is the RFC3339 variant (`"Invalid date format. Please use RFC3339 format, e.g. 2026-09-06T00:00:00Z"`). The meal suite is now 10/10 PASS (§3.5).

8. **`relationship_e2e_test.go` sat red in the tree (2026-09-30) — RESOLVED 2026-09-30** — the WIP file needed `relationship_handler.go` fixes, not test changes: (a) `GetClientDetails` / `GetClientStats` mapped an unknown username to **500** because `PostgresUserRepository.GetUserByUsername` returns `(nil, domainerrors.ErrNotFound)` and both handlers checked `err != nil` before their `athlete == nil` → 404 branch; (b) `GetMyTrainer` published any relationship returned by `GetByAthleteID` as `activeTrainer`, including **terminated** and pending ones. Both fixed in the handlers (§4.6 R2); the suite went 7→8 tests and `-run 'TestE2E_Relationship'` is green (12.5s), with the **full suite green** again (112.2s, 73 tests).

---


## 6. Recommendations (prioritized)

Aligns with the existing plan `plans/backend-http-e2e-test-plan.md` (recommended order §7); update that plan's stale status table.

| Priority | Add | Why |
|----------|-----|-----|
| **P0** | ~~`admin_e2e_test.go`~~ **DONE 2026-09-29** — all 10 routes + non-admin → 403 matrix | ✅ 8 tests added, all PASS |
| **P0** | ~~`measurement_e2e_test.go`~~ **DONE 2026-09-29** — CRUD + **24h window** (edit/delete → 403 with message assertions) + client view | ✅ 6 tests added, all PASS |
| **P0** | ~~`comment_e2e_test.go` — CRUD + author-only edit/delete + permissions + threading~~ **DONE 2026-09-30** | ✅ 9 tests added, all PASS — **4/4 comment routes covered**; last P0 closed; findings C1–C4 pinned (§4.5) |
| **P1** | ~~`meal_e2e_test.go` — mirror workout pattern~~ **DONE 2026-09-30** — create/read/list/invalid/role/client view + 401 matrix + malformed token + `date`/pagination/`mealType` filters | ✅ 10 tests added, all PASS — **4/4 meal routes covered**, §5.7 resolved |
| **P1** | ~~`relationship_e2e_test.go` — invite→accept→my-clients→my-trainer→stats→terminate~~ **DONE 2026-09-30** | ✅ 8 tests added, all PASS — **7/7 relationship routes covered**; found & fixed the 500→404 client mapping and the `my-trainer` `IsActive()` bug |
| **P1** | ~~Fix `GetClientDetails` 404 mapping (`errors.Is(err, domainerrors.ErrNotFound)`)~~ **DONE 2026-09-30** | ✅ Also applied to `GetClientStats`; `GetMyTrainer` now filters on `IsActive()` (§4.6 R2) |
| **P2** | Decide R1: wire `my-trainer.pendingInvitations` to `invitations` (or drop the field) | Currently always `[]` — dead feature (§4.6) |
| **P1** | ~~Auth-suite gaps (logout + password-reset HTTP + restore branches + register validation + **rate-limit 429**)~~ **DONE 2026-09-29** in `auth_e2e_test.go` | ✅ 7 tests added, all PASS |
| **P1** | ~~`workout_e2e_test.go` gaps~~ **DONE 2026-09-29** — 9 tests added + 6 strengthened (401 matrix, role guards, validation, round-trip, pagination/filters, client view, terminated relationship) | ✅ 15/15 PASS |
| **P1** | `user_e2e_test.go` — **`PUT /api/users/me` remains untested** (logout/restore/register-validation/429 done above) | Closes last auth/user gap |
| **P1** | ~~`coach_e2e_test.go` — dedicated reject/`my`/role-guard tests (incidental helper coverage is not enough)~~ **DONE 2026-10-01** | ✅ 8 tests added, all PASS — **5/5 coaching routes covered**; findings H1–H2 pinned (§4.7) |
| **P1** | Fix H2: add `IsActive()` to the two `coaching_request_service.go` guards (lines 39–42, 102–105) | High-severity: terminated athletes are locked out of the coaching loop; mirrors the R2 fix |
| **P2** | `workout_plan_e2e_test.go` — trainer CRUD, assign, athlete start, role guards | 10 routes; service tests exist but HTTP guards don't |
| **P2** | `trainer_e2e_test.go` — public catalog + me/profile + availability + reviews incl. role guards | 12 routes, zero coverage |
| **P2** | `exercise_e2e_test.go` — 7 public GETs + POST 400/401 | Cheap, public, good smoke coverage |
| **P2** | Start asserting error bodies via existing `RequireJSONError` helper in new tests | Locks the `{"error": ...}` contract |
| **P3** | Wire metrics/swagger routes into test router; smoke-test `/metrics`, `/swagger/doc.json`; test pprof disabled-by-default | Completes 97/97 |
| **P3** | Add backend CI workflow: `go vet ./...` + `go test ./...` with `POSTGRES_TEST_DSN` service container | Without this, coverage gains don't persist |

### Coverage target

| Milestone | Endpoints with HTTP tests |
|-----------|---------------------------|
| Today (2026-10-01, coaching done — all P0 closed, P1 nearly done) | 54 / 81 (67%) |
| After P1 (`PUT /api/users/me`) | ~55 / 81 (~68%) |
| After P2 (trainer catalog 12 + workout plans 10 + exercise catalog 8) | ~78 / 81 (~96%) |
| After P3 | 97 / 97 routes reachable & smoke-tested |

---

## 7. Appendix — Verification Commands

```bash
# Run endpoint tests (needs local PG or Docker)
cd backend
# PowerShell:
$env:POSTGRES_TEST_DSN='postgres://postgres:123456@localhost:5432/gymtrack?sslmode=disable'
go test -count=1 -timeout 300s ./internal/api/e2e/ -v

# All backend tests
go test ./...
```

Audit executed 2026-09-29: e2e suite **PASS** (16 tests, 13.2s).
Last refreshed 2026-10-01 after the coaching-request suite: `-run 'TestE2E_Coach'` → **PASS (8 tests, 12.4s)**. Suite invocation: `go test -count=1 -timeout 300s ./internal/api/e2e/`.

