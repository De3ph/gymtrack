# Backend Security Audit — 2026-10-11

**Scope:** `backend/` (Go REST API) at commit `2d54dbb`. Standard source-first review: auth, access control / IDOR, injection, JWT & session lifecycle, secrets, rate limiting, error handling.
**Method:** static review of handlers → services → repositories against the codebase's own trust model (relationship-gated trainer access, ownership checks, admin-only routes). No live probing. Note: `backend/` working tree had 11 uncommitted files at review time; findings reference committed content where possible.

---

## Executive summary

| # | Severity | Finding | Location | Status (2026-10-20) |
|---|----------|---------|----------|---------------------|
| 1 | **High** | IDOR: any trainer can read any workout / meal by ID without an active-relationship check | `workout_service.go`, `meal_service.go` | ✅ Fixed |
| 2 | **Medium** | IDOR: any authenticated user can delete any trainer's availability slot | `availability_handler.go`, `availability_service.go` | ✅ Fixed |
| 3 | **Medium** | JWT lifecycle: refresh mints tokens with stale role; no revocation after password change/reset; suspended users can keep tokens fresh | `auth_service.go` | ✅ Fixed |
| 4 | **Medium** | Secrets in public GitHub history (`backend/.env` in init commit: JWT secret + Couchbase credentials) | git history, commit `2096525` | ❌ **Not fixed — worse** |
| 5 | **Medium** | Rate limiting bypassable via `X-Forwarded-For`; limiter cleanup goroutine never starts (unbounded memory) | `module.go`, `rate_limit_middleware.go` | ✅ Fixed |
| 6 | **Low** | Invitation codes are 32-bit and `/relationships/accept` is unthrottled | `postgres/invitation.go`, `relationship_routes.go` | ❌ Not fixed |
| 7 | **Low** | `/metrics` and Swagger UI are unauthenticated; Swagger UI loads JS from a third-party CDN | `metrics_routes.go`, `swagger_routes.go` | ❌ Not fixed |
| 8 | **Low** | Mass assignment: `PUT /users/me` wholesale-replaces profile incl. `trainerAssignment` / `clientList` | `user_service.go` | ⚠️ Partial — mass assignment closed, validation missing |
| 9 | **Low** | `POST /api/exercises` lets any authenticated user write to the global public catalog | `exercise_routes.go`, `exercise_service.go` | ❌ Not fixed |
| 10 | **Low / info** | Misc: timing-based user enumeration on login, stale-state race in read-modify-write updates, dev-only defaults (`postgres:123456`, seed tool resets a known password) | various | ⚠️ Mostly open — only CORS placeholder fixed |

No SQL injection found — all queries use pgx parameter placeholders. No password-hash disclosure — `PasswordHash` is `json:"-"` and the public trainer catalog SQL deliberately omits `password_hash`.

---

## Findings

> Each finding below preserves its original 2026-10-11 evidence. The status block under each heading records the 2026-10-20 re-check; where the status says fixed, the code snippets in "Evidence" describe the pre-fix state.

### 1. HIGH — IDOR: trainer can read any workout/meal by ID (no relationship check)

> **Status: ✅ FIXED** (verified 2026-10-20). `workout_service.go:153-165` and `meal_service.go:77-89` now call `HasActiveRelationship(ctx, requesterID, ownerID)` for `RoleTrainer` and return `FORBIDDEN` when absent. Regression tests: `workout_service_test.go:86-107`, `meal_service_test.go:81-102`. Commit `1f4d078`.
>
> Remaining test debt: `backend/internal/api/e2e/workout_e2e_test.go:788-796` still asserts the old 200 behavior for an unrelated trainer (comment "Known unfixed finding AUTHZ-001") and will fail against a DB. Update or delete that case. Admin still bypasses the check by design.

**Location**
- `backend/internal/domain/services/workout_service.go` — `GetWorkout` (lines 144–158)
- `backend/internal/domain/services/meal_service.go` — `GetMeal` (lines 68–82)

**Evidence**

```go
// workout_service.go GetWorkout
if input.RequesterRole == models.RoleAthlete && workout.AthleteID != input.RequesterID {
    return nil, NewServiceError("This workout belongs to another athlete...", "FORBIDDEN")
}
return workout, nil // trainers fall through with NO relationship check
```

Only athletes are ownership-checked. For `RoleTrainer` (and admin), the function returns any record fetched by ID. The handler docs even state "athletes can only access their own workouts" while the trainer path silently bypasses the invariant enforced everywhere else.

**Contrast with sibling domains**, which do enforce the relationship control for trainers:
- `body_measurement_service.go` `GetBodyMeasurement` → `relationshipRepo.HasActiveRelationship(...)` for trainers
- `comment_service.go` `CanAccessComments` → same check
- `workout_plan_service.go` `GetClientPlans`, `workout_service.go` `GetClientWorkouts`, `meal_service.go` `GetClientMeals` → all relationship-gated

**Impact:** Any registered trainer can read **any athlete's** workout and meal records (dates, exercises, weights, food logs) by enumerating sequential IDs — including clients of other trainers, completely outside any coaching relationship. This is a cross-tenant read of personal health data. IDs are serial integers, so enumeration is trivial (`/api/workouts/1`, `/api/workouts/2`, …). Athlete records are also readable by a trainer the athlete never interacted with.

**Reproduction (safe, on a local instance):** register trainer A and athlete B (no relationship). As A: `GET /api/workouts/<id created by B>` → 200 with B's data; `GET /api/meals/<id created by B>` → 200.

**Fix (smallest effective change):** enforce the same invariant as measurements in both services — trainers must hold an active relationship with `record.AthleteID`:

```go
} else if input.RequesterRole == models.RoleTrainer {
    hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.RequesterID, workout.AthleteID)
    if err != nil { return nil, err }
    if !hasActive { return nil, NewServiceError("...no active relationship...", "FORBIDDEN") }
}
```

(`WorkoutService`/`MealService` already receive `relationshipRepo`.) Add regression tests: trainer + unrelated athlete's record → 403.

---

### 2. MEDIUM — IDOR: any authenticated user can delete any availability slot

> **Status: ✅ FIXED** (verified 2026-10-20). Caller identity is threaded end to end: handler reads `userID` + `userRole` and rejects non-trainers (`availability_handler.go:137-172`); service signature is `DeleteSlot(ctx, trainerID, slotID)`; SQL is `DELETE ... WHERE id = $1 AND trainer_id = $2` with `ErrNotFound` on zero rows (`postgres/availability.go:121-130`). Tests: `availability_handler_test.go:234-295`. Commits `a3afbba`, `ed0f078`.
>
> Residual (was "optional" in this audit): the `/trainers/me` route group still has only the auth middleware (`trainer_routes.go:22-28`), so `GetMyAvailability` / `SetMyAvailability` have no trainer-role check. No cross-user access is possible — the service forces `TrainerID` from the session — so this is hardening, not the reported IDOR.

**Location**
- `backend/internal/api/handlers/availability_handler.go` — `DeleteSlot` (lines 135–150)
- `backend/internal/domain/services/availability_service.go` — `DeleteSlot` (lines 90–92)
- `backend/internal/infrastructure/persistence/postgres/availability.go` — line 122

**Evidence**

The handler never reads `userID` from the context and performs no role check:

```go
func (h *AvailabilityHandler) DeleteSlot(c *gin.Context) {
    slotID, err := strconv.Atoi(slotIDStr)
    ...
    err = h.service.DeleteSlot(c.Request.Context(), slotID)   // no caller identity passed
```

```go
func (s *AvailabilityService) DeleteSlot(ctx context.Context, slotID int) error {
    return s.availabilityRepo.DeleteAvailability(ctx, slotID)
}
```

```sql
-- postgres/availability.go:122
DELETE FROM trainer_availabilities WHERE id = $1   -- no trainer_id predicate
```

The route is registered behind the auth middleware only (`trainer_routes.go` line 28), and the endpoint's own Swagger docs claim "Only the trainer who owns the slot can delete it" — an explicit control that no layer implements.

**Impact:** Any authenticated user (including athletes) can delete any trainer's availability slots by iterating numeric IDs (`DELETE /api/trainers/me/availability/1`, `/2`, …). Integrity/availability impact on trainer scheduling data; low sensitivity, but the ownership control is fully defeated. IDs are serial.

**Fix:** thread the caller through and enforce ownership at the last decision point — `DELETE ... WHERE id = $1 AND trainer_id = $2`, with the handler passing `c.Get("userID")` and returning 404/403 on zero rows affected; optionally add a trainer-role check on the `/trainers/me` group (note `SetMyAvailability`/`GetMyAvailability` also lack a role check — an athlete can currently create availability rows for themselves).

---

### 3. MEDIUM — JWT lifecycle gaps: stale role at refresh, no revocation on credential change

> **Status: ✅ FIXED** (verified 2026-10-20). `RefreshToken` now reloads the user from the DB, rejects non-active/deleted accounts, compares `tokenVersion`, and mints with the DB role (`auth_service.go:203-258`). A `token_version` counter was added (`migrations/001_baseline.up.sql:542`, `models/user.go:60-65`), embedded in tokens (`auth_service.go:270-277`), enforced in middleware (`auth_middleware.go:78-84`) and on refresh (`auth_service.go:243-247`), and bumped on password change (`admin_service.go:188-193`), password reset (`password_reset_service.go:181-186`) and role change (`admin_service.go:230-234`). Tests: `auth_service_test.go:143-256`, `postgres/user_test.go:344-381`. Commit `b92737d`.
>
> Note: on a transient DB read failure the middleware falls back to JWT claim role (`auth_middleware.go:71-75`) — an explicit availability tradeoff, documented inline.

**Location:** `backend/internal/domain/services/auth_service.go`

**Evidence**

a) **Role is inherited from the refresh token, never re-read from the DB** (RefreshToken, lines 204–219):

```go
claims, err := s.validateToken(refreshToken, TokenTypeRefresh)
accessToken, err := s.generateToken(claims.UserID, claims.Role, TokenTypeAccess, time.Hour)
```

Refresh tokens live **7 days**. `AdminOnlyMiddleware` trusts the JWT `role` claim, and the auth middleware only re-checks *status*, not *role* (`auth_middleware.go` lines 44–59). So if an admin demotes a user (or the last-admin protection forces a demotion), the demoted user can keep minting **admin** access tokens from their old refresh token for up to 7 days. `admin_service.UpdateUserRole` writes the new role to the DB but nothing invalidates outstanding tokens.

b) **Status is not re-checked at refresh** — a suspended/banned user's refresh token still returns fresh access tokens (`RefreshToken` never loads the user). API requests are blocked by the middleware's DB status check, so impact here is limited to token freshness, but it means suspensions only take effect at the middleware layer and the account keeps cycling valid tokens.

c) **Password change/reset does not revoke existing tokens.** `AdminService.ChangePassword` and `PasswordResetService.ConfirmPasswordReset` update `password_hash` only. An attacker holding a stolen refresh token retains valid access for up to 7 days *after* the victim rotates their password — undermining the primary recovery control.

**Fix (narrowest source change):**
1. In `RefreshToken`, load the user by `claims.UserID` and derive role/status from the DB (fail on non-active) — this alone closes a→b and shrinks the demotion window from 7 days to one request.
2. Add a `tokenVersion` (or `pwChangedAt` timestamp) claim to tokens and include the current value from the users row in validation; bump it on password change/reset/role change. This is the standard mechanism to make stateless JWTs revocable and closes c.

**Severity rationale:** medium — a real control (role revocation) is deferred up to 7 days rather than fully defeated; requires the specific admin-demotion or stolen-token precondition.

---

### 4. MEDIUM — Secrets in public GitHub history

> **Status: ❌ NOT FIXED — and worse than originally reported** (verified 2026-10-20).
>
> **Warning:** the current JWT signing key is publicly retrievable. `origin/master` HEAD (`dbcaee7`) still tracks `backend/.env`, and the 64-character `JWT_SECRET` in that file is byte-identical to the value in the working copy today. Anyone can read it at `https://github.com/De3ph/gymtrack/blob/master/backend/.env`. Treat this key as compromised and rotate it before anything else in this plan.
>
> Current state:
> - The untracking commit `4b6ab27` exists only on the local `feature/ui-makeup` branch. On `master` the file is still tracked and `.gitignore` is absent.
> - History was not rewritten: `2096525` still exists and is an ancestor of both HEAD and `origin/master`; `git show 2096525:backend/.env` and the GitHub raw URL for that commit both still return the blob (17-char `JWT_SECRET` + Couchbase connection string, username, password).
> - The 64-character secret appears in 13 commits across `master` history.
> - No CI secret scanning: the only workflow is `.github/workflows/frontend-typecheck.yml`; no gitleaks/trufflehog/detect-secrets config or pre-commit hook. GitHub-native secret scanning status is not verifiable from the repository.
> - `git grep -i couchbase` finds no code dependency left (PostgreSQL migration removed it), and the current `backend/.env` no longer has Couchbase keys — but the leaked credentials remain public and no rotation/decommission record exists.
>
> Required to close:
> 1. Rotate the **current 64-character `JWT_SECRET`** (and any still-live Couchbase credentials), then redeploy.
> 2. Remove `backend/.env` from `master` and every other branch, add `.gitignore` there.
> 3. Scrub history with `git filter-repo`/BFG and force-push; coordinate with forks/clones, and assume old clones retain the secret.
> 4. Add secret scanning to CI (gitleaks) and verify GitHub push protection is on.

**Evidence**

- `git log --all -- backend/.env` shows `backend/.env` was committed in the **init commit `2096525`** and untracked later in `4b6ab27` ("Untrack backend/.env (secrets in git history)"). The blob remains retrievable: `git show 2096525:backend/.env`.
- The blob contains a `JWT_SECRET` (17 characters — also weaker than the current 32-char policy) and a **Couchbase connection string with username and password** (pre-PostgreSQL era).
- The repository is **public**: `https://github.com/De3ph/gymtrack` (verified 2026-10-11).

**Current state at review time (2026-10-11) — superseded by the verification above:**
- ⚠️ The 17-char secret was replaced with a 64-char value, but that replacement was itself committed and is still public on `master` (see verification).
- ⚠️ `.gitignore` and the untracking commit exist only on `feature/ui-makeup`; `master` still tracks `backend/.env`.
- ⚠️ The Couchbase credentials in history have **not been verifiably rotated** from this repository — whether the referenced Couchbase instance still exists is outside the repo (needs validation by the owner).

**Fix:**
1. Confirm the Couchbase deployment the leaked credentials pointed at is decommissioned, or rotate those credentials if it is not (they are public).
2. Rotate **both** the leaked 17-char secret and the currently exposed 64-char secret; audit other environments (staging, backups, old images) for either value.
3. Remove the file from every branch, then scrub history (BFG / `git filter-repo`) and force-push. Clones/forks may retain it, so rotation is the real control.
4. Add a CI secret-scanning step (e.g. gitleaks) to prevent recurrence; the "cline checkpoint" commits show tooling auto-commits — worth watching.

---

### 5. MEDIUM — Rate limiter: spoofable client IP + cleanup goroutine never started

> **Status: ✅ FIXED** (verified 2026-10-20).
> - `SetTrustedProxies` is called at router construction, with a fail-closed fallback (`module.go:218-227`); values come from `TRUSTED_PROXIES` and default to `nil` = trust no proxy (`config.go:137,156-159`). Compose sets `172.31.0.0/24` and nginx overwrites `X-Forwarded-For` (`docker-compose.yml:126`, `nginx/default.conf:27-49`).
> - `cleanupLoop` is actually started lazily on first `Allow` via `sync.Once`, prunes entries idle >15 min every 5 min, and is stopped through an fx `OnStop` hook (`rate_limit_middleware.go:36-114`, `module.go:229-241`). Tests: `rate_limit_middleware_test.go:11-26,66-88`.
>
> Commit `13f1ff9`. Residual: trusting the whole compose subnet lets a compromised container forge client IPs; external clients cannot.

**Location**
- `backend/internal/app/module.go` — router created with `gin.Default()` (line 211), never `SetTrustedProxies` (grep confirms zero call sites)
- `backend/internal/api/middleware/rate_limit_middleware.go`

**Evidence**

a) **Client IP is attacker-controlled.** Gin's default is to trust *all* proxies, so `c.ClientIP()` (line 87) honors `X-Forwarded-For` supplied by any direct client. The per-IP limiter is keyed on that value:

```go
ip := c.ClientIP()
if !rl.Allow(ip) { ... }
```

An attacker sends `X-Forwarded-For: <random IP>` per request and gets a fresh token bucket every time → the brute-force protection on `/auth/login`, `/auth/register`, `/auth/password-reset/*` is defeated.

b) **The map grows unboundedly.** `NewRateLimiter` (lines 40–48) comments *"cleanupLoop deferred to first request via lifecycle hook instead"* — but no lifecycle hook or any caller of `cleanupLoop` exists (grep confirms the only references are its own definition). Every unique key creates a `limiterEntry` that is never pruned. Combined with (a), an attacker can grow the map with spoofed IPs without limit → memory-exhaustion DoS on a single process.

c) **Scope:** only `/auth/*` is limited at all (`AuthLimiter` on the auth group). `/relationships/accept` and every other endpoint are unthrottled (see finding 6).

**Fix:**
1. `router.SetTrustedProxies(nil)` (or the actual proxy CIDRs) right after `gin.New/Default()` so `ClientIP()` only trusts the real proxy chain.
2. Actually start the cleanup: run `rl.cleanupLoop()` in a goroutine with a stop channel wired into the fx lifecycle (the intended design per the comment), or use a fixed-size LRU.
3. If deployed behind a reverse proxy, this also fixes correct attribution of real client IPs in logs.

**Severity rationale:** medium — defeats an explicit anti-brute-force control and enables a remote memory DoS, but requires direct network access to the service.

---

### 6. LOW — Invitation codes: 32 bits of entropy, unthrottled acceptance

> **Status: ❌ NOT FIXED** (verified 2026-10-20). Still `generateRandomHex(ctx, 4)` = 8 hex chars / 32 bits (`postgres/invitation.go:34-36`), and commit `7679fce` deliberately reduced it from 8 bytes to 4. The validator pins `len=8` (`relationship_handler.go:51-52`) and the e2e test pins `^[0-9a-f]{8}$` (`relationship_e2e_test.go:138-142`). `/relationships/accept` still has only the auth middleware (`relationship_routes.go:20`, `module.go:366`); the limiter is applied only to `/api/auth/*` (`auth_routes.go:15`). No attempt counter/lockout in `InvitationService.AcceptInvitation`.
>
> Fix: raise to 8+ bytes (no migration needed — `code` is `varchar(32)`), update validator/e2e regex, and apply the limiter to the accept route.

**Location:** `backend/internal/infrastructure/persistence/postgres/invitation.go` line 36 (`generateRandomHex(ctx, 4)` → 8 hex chars = 2³² ≈ 4.3×10⁹), `relationship_routes.go` (no limiter on `/relationships/accept`).

**Evidence / impact:** Codes are crypto-random (good) but only 4 bytes, expire after 7 days, and multiple pending codes can be valid at once. The accept endpoint has no rate limit of its own (and the limiter that exists is bypassable — finding 5). A patient attacker holding an athlete account could enumerate guesses for an active code and link themselves as a client of a trainer who never invited them. The claim itself is atomic (single `UPDATE ... WHERE status='pending'` — nicely done), so the only issue is entropy + throttling.

**Fix:** raise to 8+ bytes (`generateRandomHex(ctx, 8)` — 16 chars, still copy-pasteable), and put a modest per-IP/per-account limiter on `/relationships/accept`. Migrations note: the `code` column presumably has a length constraint — check before widening.

---

### 7. LOW — Unauthenticated `/metrics` and Swagger UI

> **Status: ❌ NOT FIXED** (verified 2026-10-20). `/metrics` is still registered directly on the router with no middleware (`metrics_routes.go:9-10`), as is `/swagger/*` (`swagger_routes.go:28-45`); both are mounted right after the metrics middleware, outside the authenticated `/api` group (`module.go:350-354`). nginx proxies both on the public listener (`nginx/default.conf:43-58`). The Scalar UI still loads from a third-party CDN (`swagger_routes.go:110`), and no self-hosted bundle exists in the repo.

**Location:** `backend/internal/api/routes/metrics_routes.go`, `swagger_routes.go`; mounted in `module.go` lines 292–294.

**Evidence / impact:**
- `GET /metrics` (Prometheus) is unauthenticated: exposes route inventory, per-status request counts, Go runtime/process internals. Useful recon for an attacker; classic exposure mistake.
- `/swagger/index.html` serves the full OpenAPI spec unauthenticated, and loads the UI from `cdn.jsdelivr.net` — a third-party origin executing JS on your origin (supply-chain / script-injection trust).

**Fix:** guard both behind the auth middleware (or bind to an internal-only port/interface), and self-host the Scalar bundle instead of the CDN script.

---

### 8. LOW — Mass assignment on profile update

> **Status: ⚠️ PARTIALLY FIXED** (verified 2026-10-20). Mass assignment is closed: `UpdateUserProfile` now merges an allow-list (`Name`, `Bio`, `Age`, `Weight`, `Height`, `FitnessGoals`, `Certifications`, `Specializations`) over the stored profile instead of replacing it, so `TrainerAssignment` / `ClientList` cannot be set by a client (`user_service.go:55-72`). Regression test asserts client-supplied server fields are ignored (`user_service_test.go:382-401`, commit `e5c9a50`).
>
> Still missing: no field validation. `UserProfile` has no validate tags (`models/user.go:24-45`) and the service never invokes its validator; the handler only calls `ShouldBindJSON` (`user_handler.go:106-118`). No age/weight/height ranges or string length caps.

**Location:** `backend/internal/domain/services/user_service.go` `UpdateUserProfile` (lines 43–63); `backend/internal/domain/models/user.go` `UserProfile`.

**Evidence:** `PUT /users/me` accepts a full `UserProfile` and does `user.Profile = profile` — wholesale replacement, no field validation, no role-based field filtering. `UserProfile` embeds server-managed fields:

```go
TrainerAssignment int    `json:"trainerAssignment,omitempty"` // Athlete's trainer ID
ClientList        []int  `json:"clientList,omitempty"`        // List of athlete IDs
```

These are set by server flows (`invitation_service.go:140`, `coaching_request_service.go:129`, cleared in `relationship_handler.go:539`) but a client can also set them directly: an athlete can self-assign `trainerAssignment: <any trainer ID>` without that trainer's involvement, or set an arbitrary `clientList`.

**Impact:** data-integrity / display-spoofing. I verified no authorization decision consumes these fields (relationship checks use the `relationships` table), so this does **not** grant data access today. But any future code that trusts `profile.trainerAssignment` would silently inherit an attacker-controlled value — and the fields contradict the source of truth after termination/acceptance races.

**Fix:** strip server-managed fields before persisting (zero `TrainerAssignment`/`ClientList` from client input in `UpdateUserProfile`), and validate the remaining profile fields (age/weight ranges, string lengths).

---

### 9. LOW — Any authenticated user can write to the global exercise catalog

> **Status: ❌ NOT FIXED** (verified 2026-10-20). `POST /api/exercises` is still in the auth-only group with no role check (`exercise_routes.go:23-27`; handler only reads `userID`, `exercise_handler.go:247-258`). `CreateExerciseRequest` has only `binding:"required"` on `Name`/`Category` with no `max=` bounds (`exercise_handler.go:24-36`). The route test pins auth-only behavior (`exercise_routes_test.go:95-141`). Verify/delete remain admin-only.

**Location:** `backend/internal/api/routes/exercise_routes.go` (lines 22–27), `exercise_service.go`.

**Evidence:** `POST /api/exercises` requires only authentication — no trainer/admin role — while verify/delete are admin-only. `Name`/`Category` have no length or content limits (`binding:"required"` only). The catalog is served **unauthenticated** (`GET /api/exercises*`).

**Impact:** any registered account can inject unlimited arbitrary content into a globally visible, unauthenticated catalog (spam, shock text, inflated rows). Integrity of shared data; no XSS in the API itself (rendering is frontend's responsibility).

**Fix:** require trainer or admin role for creation (aligning with the AGENTS.md "Admin only" intent for catalog writes) and bound name/category length; consider a `created_by`-scoped "custom exercises" model if user-created exercises are a feature.

---

### 10. LOW / INFORMATIONAL — Misc

> **Status: ⚠️ MOSTLY OPEN** (verified 2026-10-20). Only the dead CORS placeholder is resolved; every other item below still reproduces in the current source. See the per-item status column.

| Item | Location | Note | Status |
|---|---|---|---|
| Timing-based user enumeration on login | `auth_service.go` `Login` (101–108) | Unknown identifier returns immediately; known identifier pays a bcrypt compare. Password-reset request path is correctly constant-response; login could do a dummy bcrypt hash when user is nil. | ❌ Open — early return still at `auth_service.go:101-103` |
| Read-modify-write race on user updates | `user_service.go`, `admin_service.go`, `invitation_service.go` all do `GetUserByID` → mutate → `UpdateUser` (full row write) | A concurrent profile update can re-write a stale `status`/`role` (e.g. suspension overwritten by an in-flight profile edit). Small window, needs concurrency to exploit; consider updating only changed columns. | ❌ Open — full-row `UPDATE` at `postgres/user.go:231-234` (only `token_version` excluded) |
| Dev defaults with hardcoded credentials | `config/config.go` `DefaultPostgresDSN` → `postgres://postgres:123456@...sslmode=disable` | Fine for local dev; consider logging a loud warning when the fallback DSN is used. | ❌ Open — `config.go:59-61,126`; no warning |
| Seed tool resets a known password | `cmd/seed/main.go` line 23 (`targetPassword = "1234567890"` for user `de3ph`) | Documented dev tool; must never run against a shared/prod DSN. Consider a guard env var. | ❌ Open — unconditional reset at `cmd/seed/main.go:193-217`, no guard |
| Body-limit rejects chunked requests | `body_limit_middleware.go` line 20 (`ContentLength < 0` → 413) | Availability quirk for chunked-encoding clients, not a security issue; `MaxBytesReader` still enforces the cap. | ❌ Open (informational) |
| pprof when enabled is unauthenticated | `profiling_routes.go` | Correctly default-off with a warning comment; if ever enabled on a reachable host, `/debug/pprof` should be auth-guarded too. | ❌ Open — `profiling_routes.go:16` has no middleware |
| `[IP_ADDRESS]` CORS placeholder is dead config | `module.go` line 272 | The literal string never matches a real Origin, so LAN-IP origins are effectively not allowed (CORS is stricter than AGENTS.md describes, not looser). Clean it up or implement the substitution. | ✅ Fixed — origins built from config (`module.go:320-334`, `config.go:99-122`); docs still mention it |
| `login` treats identifiers containing `@` as email | `auth_service.go` line 87 | A username containing `@` can never log in via username path. Functional, not security. | ❌ Open — unchanged, by design |

---

## Verified controls (checked, holding)

- **SQL injection:** none. All PostgreSQL access uses pgx `$n` placeholders; dynamic SQL only interpolates placeholder *indexes* and static column lists (`trainer_profile.go`, `workout.go` `fmt.Sprintf` usages verified). Search filters are parameterized.
- **Password storage:** bcrypt with `DefaultCost` on register, change, and reset; `PasswordHash` is `json:"-"` so it cannot reach a response body; the unauthenticated trainer catalog SQL deliberately omits `password_hash`.
- **Registration:** role restricted to `trainer|athlete` via validator — no self-service admin.
- **Admin surface:** every `/admin/*` route sits behind `JWTAuthMiddleware` + `AdminOnlyMiddleware`; self-role-change and last-admin demotion/suspension are blocked.
- **Relationship gating (outside finding 1/2):** client workout/meal/measurement/plan listings, comment create/read, review create (active relationship + one-per-pair), plan assignment (relationship), plan view (creator or assignment) all enforce the invariant.
- **Edit windows:** 24h (workouts) and 7d (measurements) enforced server-side via domain methods.
- **Password reset:** 256-bit token, SHA-256 hashed at rest, 1h TTL, atomically single-use, generic responses (no enumeration), inactive/deleted accounts excluded; account restore requires the password and respects the 30-day window; account deletion requires password confirmation and blocks admins.
- **Transport hardening:** 1 MiB body cap, per-handler 5s timeouts, `http.Server` read/write/idle timeouts, structured logs with scrubbed error responses (no internal error text leaks; the one `details` example found is only in a Swagger comment).
- **CORS:** explicit origin allowlist with credentials (no wildcard); `/auth` per-IP limiter exists (see finding 5 for its weaknesses).

## Suggested fix order

1. **Now** — finding 1 (two small service edits + tests) and finding 2 (one SQL predicate + handler wiring); both are small diffs against already-injected dependencies.
2. **This week** — finding 5 (SetTrustedProxies + start cleanupLoop), finding 3 (role/status re-read at refresh; token versioning can follow), confirm finding 4's Couchbase credentials are dead.
3. **Backlog** — findings 6–9 and the misc items.

---

## Verification — 2026-10-20

Re-checked against `feature/ui-makeup` HEAD `9393008` (source plus git history, no runtime probing).

| Finding | Result |
|---|---|
| 1 — workout/meal IDOR | ✅ Fixed (`1f4d078`); stale e2e assertion remains |
| 2 — availability delete IDOR | ✅ Fixed (`a3afbba`, `ed0f078`) |
| 3 — JWT role/status/revocation | ✅ Fixed (`b92737d`) |
| 4 — secrets in public history | ❌ Not fixed; current 64-char JWT secret still public on `master` |
| 5 — rate limiter IP + cleanup | ✅ Fixed (`13f1ff9`) |
| 6 — invitation entropy + throttling | ❌ Not fixed (entropy was deliberately reduced in `7679fce`) |
| 7 — unauthenticated `/metrics` + Swagger | ❌ Not fixed |
| 8 — profile mass assignment | ⚠️ Mass assignment fixed (`e5c9a50`); validation still missing |
| 9 — exercise creation authz + bounds | ❌ Not fixed |
| 10 — misc | ⚠️ Only the CORS placeholder is fixed |

**Highest priority now:** rotate the JWT secret and remove `backend/.env` from `master`/history (finding 4), then close findings 6, 7, 9.

---

*Review limitations: static source analysis plus git-history inspection only; no runtime probing of a deployed instance. Claimed-but-unverifiable facts are flagged inline (Couchbase instance liveness, reverse-proxy topology in production).*
