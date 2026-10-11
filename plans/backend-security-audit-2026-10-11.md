# Backend Security Audit — 2026-10-11

**Scope:** `backend/` (Go REST API) at commit `2d54dbb`. Standard source-first review: auth, access control / IDOR, injection, JWT & session lifecycle, secrets, rate limiting, error handling.
**Method:** static review of handlers → services → repositories against the codebase's own trust model (relationship-gated trainer access, ownership checks, admin-only routes). No live probing. Note: `backend/` working tree had 11 uncommitted files at review time; findings reference committed content where possible.

---

## Executive summary

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| 1 | **High** | IDOR: any trainer can read any workout / meal by ID without an active-relationship check | `workout_service.go`, `meal_service.go` |
| 2 | **Medium** | IDOR: any authenticated user can delete any trainer's availability slot | `availability_handler.go`, `availability_service.go` |
| 3 | **Medium** | JWT lifecycle: refresh mints tokens with stale role; no revocation after password change/reset; suspended users can keep tokens fresh | `auth_service.go` |
| 4 | **Medium** | Secrets in public GitHub history (`backend/.env` in init commit: JWT secret + Couchbase credentials) | git history, commit `2096525` |
| 5 | **Medium** | Rate limiting bypassable via `X-Forwarded-For`; limiter cleanup goroutine never starts (unbounded memory) | `module.go`, `rate_limit_middleware.go` |
| 6 | **Low** | Invitation codes are 32-bit and `/relationships/accept` is unthrottled | `postgres/invitation.go`, `relationship_routes.go` |
| 7 | **Low** | `/metrics` and Swagger UI are unauthenticated; Swagger UI loads JS from a third-party CDN | `metrics_routes.go`, `swagger_routes.go` |
| 8 | **Low** | Mass assignment: `PUT /users/me` wholesale-replaces profile incl. `trainerAssignment` / `clientList` | `user_service.go` |
| 9 | **Low** | `POST /api/exercises` lets any authenticated user write to the global public catalog | `exercise_routes.go`, `exercise_service.go` |
| 10 | **Low / info** | Misc: timing-based user enumeration on login, stale-state race in read-modify-write updates, dev-only defaults (`postgres:123456`, seed tool resets a known password) | various |

No SQL injection found — all queries use pgx parameter placeholders. No password-hash disclosure — `PasswordHash` is `json:"-"` and the public trainer catalog SQL deliberately omits `password_hash`.

---

## Findings

### 1. HIGH — IDOR: trainer can read any workout/meal by ID (no relationship check)

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

**Evidence**

- `git log --all -- backend/.env` shows `backend/.env` was committed in the **init commit `2096525`** and untracked later in `4b6ab27` ("Untrack backend/.env (secrets in git history)"). The blob remains retrievable: `git show 2096525:backend/.env`.
- The blob contains a `JWT_SECRET` (17 characters — also weaker than the current 32-char policy) and a **Couchbase connection string with username and password** (pre-PostgreSQL era).
- The repository is **public**: `https://github.com/De3ph/gymtrack` (verified 2026-10-11).

**Current state (verified):**
- ✅ The **current** `backend/.env` JWT secret is different (64 chars) — rotated at some point after the leak. The leaked secret is not the signing key of a current deployment.
- ✅ `backend/.env` is now `.gitignore`d (`.gitignore:39`) and untracked.
- ⚠️ The Couchbase credentials in history have **not been verifiably rotated** from this repository — whether the referenced Couchbase instance still exists is outside the repo (needs validation by the owner).

**Fix:**
1. Confirm the Couchbase deployment the leaked credentials pointed at is decommissioned, or rotate those credentials if it is not (they are public).
2. Consider the leaked 17-char JWT secret burned — already rotated; ensure no other environment (staging, backups, old images) still uses it.
3. Optionally scrub history (BFG / `git filter-repo`) and force-push; note that clones/forks may retain it, so rotation (done for JWT) is the real control, not deletion.
4. Add a CI secret-scanning step (e.g. gitleaks) to prevent recurrence; the "cline checkpoint" commits show tooling auto-commits — worth watching.

---

### 5. MEDIUM — Rate limiter: spoofable client IP + cleanup goroutine never started

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

**Location:** `backend/internal/infrastructure/persistence/postgres/invitation.go` line 36 (`generateRandomHex(ctx, 4)` → 8 hex chars = 2³² ≈ 4.3×10⁹), `relationship_routes.go` (no limiter on `/relationships/accept`).

**Evidence / impact:** Codes are crypto-random (good) but only 4 bytes, expire after 7 days, and multiple pending codes can be valid at once. The accept endpoint has no rate limit of its own (and the limiter that exists is bypassable — finding 5). A patient attacker holding an athlete account could enumerate guesses for an active code and link themselves as a client of a trainer who never invited them. The claim itself is atomic (single `UPDATE ... WHERE status='pending'` — nicely done), so the only issue is entropy + throttling.

**Fix:** raise to 8+ bytes (`generateRandomHex(ctx, 8)` — 16 chars, still copy-pasteable), and put a modest per-IP/per-account limiter on `/relationships/accept`. Migrations note: the `code` column presumably has a length constraint — check before widening.

---

### 7. LOW — Unauthenticated `/metrics` and Swagger UI

**Location:** `backend/internal/api/routes/metrics_routes.go`, `swagger_routes.go`; mounted in `module.go` lines 292–294.

**Evidence / impact:**
- `GET /metrics` (Prometheus) is unauthenticated: exposes route inventory, per-status request counts, Go runtime/process internals. Useful recon for an attacker; classic exposure mistake.
- `/swagger/index.html` serves the full OpenAPI spec unauthenticated, and loads the UI from `cdn.jsdelivr.net` — a third-party origin executing JS on your origin (supply-chain / script-injection trust).

**Fix:** guard both behind the auth middleware (or bind to an internal-only port/interface), and self-host the Scalar bundle instead of the CDN script.

---

### 8. LOW — Mass assignment on profile update

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

**Location:** `backend/internal/api/routes/exercise_routes.go` (lines 22–27), `exercise_service.go`.

**Evidence:** `POST /api/exercises` requires only authentication — no trainer/admin role — while verify/delete are admin-only. `Name`/`Category` have no length or content limits (`binding:"required"` only). The catalog is served **unauthenticated** (`GET /api/exercises*`).

**Impact:** any registered account can inject unlimited arbitrary content into a globally visible, unauthenticated catalog (spam, shock text, inflated rows). Integrity of shared data; no XSS in the API itself (rendering is frontend's responsibility).

**Fix:** require trainer or admin role for creation (aligning with the AGENTS.md "Admin only" intent for catalog writes) and bound name/category length; consider a `created_by`-scoped "custom exercises" model if user-created exercises are a feature.

---

### 10. LOW / INFORMATIONAL — Misc

| Item | Location | Note |
|---|---|---|
| Timing-based user enumeration on login | `auth_service.go` `Login` (101–108) | Unknown identifier returns immediately; known identifier pays a bcrypt compare. Password-reset request path is correctly constant-response; login could do a dummy bcrypt hash when user is nil. |
| Read-modify-write race on user updates | `user_service.go`, `admin_service.go`, `invitation_service.go` all do `GetUserByID` → mutate → `UpdateUser` (full row write) | A concurrent profile update can re-write a stale `status`/`role` (e.g. suspension overwritten by an in-flight profile edit). Small window, needs concurrency to exploit; consider updating only changed columns. |
| Dev defaults with hardcoded credentials | `config/config.go` `DefaultPostgresDSN` → `postgres://postgres:123456@...sslmode=disable` | Fine for local dev; consider logging a loud warning when the fallback DSN is used. |
| Seed tool resets a known password | `cmd/seed/main.go` line 23 (`targetPassword = "1234567890"` for user `de3ph`) | Documented dev tool; must never run against a shared/prod DSN. Consider a guard env var. |
| Body-limit rejects chunked requests | `body_limit_middleware.go` line 20 (`ContentLength < 0` → 413) | Availability quirk for chunked-encoding clients, not a security issue; `MaxBytesReader` still enforces the cap. |
| pprof when enabled is unauthenticated | `profiling_routes.go` | Correctly default-off with a warning comment; if ever enabled on a reachable host, `/debug/pprof` should be auth-guarded too. |
| `[IP_ADDRESS]` CORS placeholder is dead config | `module.go` line 272 | The literal string never matches a real Origin, so LAN-IP origins are effectively not allowed (CORS is stricter than AGENTS.md describes, not looser). Clean it up or implement the substitution. |
| `login` treats identifiers containing `@` as email | `auth_service.go` line 87 | A username containing `@` can never log in via username path. Functional, not security. |

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

*Review limitations: static source analysis plus git-history inspection only; no runtime probing of a deployed instance. Claimed-but-unverifiable facts are flagged inline (Couchbase instance liveness, reverse-proxy topology in production).*
