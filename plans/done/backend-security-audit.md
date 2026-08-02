# Backend Security Audit Plan — GymTrack

**Date**: 2026-07-30
**Scope**: `D:\Dev\gymtrack\backend` (Go 1.25, Gin v1.11, pgx/v5, uber-go/fx)
**Methodology**: 5 parallel sub-agent audits covering injection, crypto/secrets, web/headers, auth/authz, concurrency/dependencies

## Status: COMPLETE ✅ (5/5 domains complete)

| Domain | Status | Findings |
|--------|--------|----------|
| Injection Patterns | ✅ Complete | 0 vulnerabilities, 2 observations |
| Web Security & Headers | ✅ Complete | 12 findings |
| Cryptography & Secrets | ✅ Complete | 9 findings |
| Authentication & Authorization | ✅ Complete | 19 items (2 issues, 17 verified) |
| Concurrency & Dependencies | ✅ Complete | 8 findings |

---

## 1. Injection Patterns — COMPLETE ✅

**Overall**: The backend is well-defended. All 17 PostgreSQL repositories consistently use parameterized queries (`$1`, `$2`, …). Zero injection vulnerabilities found.

### OBS-001: Raw `err.Error()` returned to clients (Info Disclosure)
- **Severity**: Low (DREAD: 3.0)
- **Locations**: `trainer_catalog_handler.go:69,101,133,145,186`, `exercise_handler.go:46,64,82,168,196,244`, `comment_handler.go:90,94,124,258,264,279,327`, `body_measurement_handler.go:79,356,383,415`, `auth_middleware.go:37`
- **Fix**: Return generic messages; log details server-side

### OBS-002: Unvalidated `limit`/`offset` pagination
- **Severity**: Low (DREAD: 2.6)
- **Locations**: `admin_handler.go:58-59`, `trainer_catalog_handler.go:62-63`, `body_measurement_handler.go`
- **Fix**: Clamp limit to max 100, offset to min 0


---

## 2. Web Security & Headers — COMPLETE ✅

### WEB-001: CORS AllowAllOrigins + AllowCredentials (spec-invalid)
- **Severity**: Medium (DREAD: 5.5)
- **Location**: `internal/app/module.go:206-214`
- **Desc**: `AllowAllOrigins=true` + `AllowCredentials=true` emits invalid combo. Escalates to Critical if cookie auth added.
- **Fix**: Use explicit origin allow-list (already commented out on L209!)

### WEB-002: No HTTP server timeouts (Slowloris DoS)
- **Severity**: High (DREAD: 7.8)
- **Location**: `internal/app/module.go` — `http.Server{}`
- **Desc**: Zero ReadTimeout/WriteTimeout/IdleTimeout — unauthenticated DoS
- **Fix**: `ReadTimeout: 10s, WriteTimeout: 30s, IdleTimeout: 120s, ReadHeaderTimeout: 5s`

### WEB-003: No request body size limit (memory-exhaustion DoS)
- **Severity**: High (DREAD: 7.2)
- **Fix**: Add Gin MaxMultipartMemory + body size middleware

### WEB-004: No rate limiting on auth endpoints
- **Severity**: High (DREAD: 8.0)
- **Desc**: Brute-force + bcrypt CPU amplification DoS
- **Fix**: Per-IP rate limiter via `golang.org/x/time/rate`

### WEB-005: No TLS — Bearer tokens in cleartext
- **Severity**: Medium (DREAD: 5.5)
- **Fix**: TLS config or reverse-proxy TLS termination

### WEB-006: Missing security response headers
- **Severity**: Medium (DREAD: 4.5)
- **Missing**: HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy
- **Fix**: Security header middleware

### WEB-007: Internal error leakage via `"details": err.Error()`
- **Severity**: Medium (DREAD: 5.0)
- **Fix**: Generic client errors, detailed server-side logs

### WEB-008: Swagger UI exposed without protection
- **Severity**: Medium (DREAD: 5.5)
- **Location**: `internal/api/routes/swagger_routes.go`
- **Fix**: Gate behind env flag or basic auth in production

### WEB-009: /metrics endpoint unauthenticated
- **Severity**: Medium (DREAD: 5.5)
- **Location**: `internal/api/routes/metrics_routes.go`
- **Fix**: Auth middleware or separate internal port

### WEB-010: No server-side token revocation
- **Severity**: Medium (DREAD: 5.5)
- **Desc**: Logout is client-side only. Stolen tokens usable after logout.
- **Fix**: Token blacklist or short-lived access tokens

### WEB-011: Gin trusts all proxies (X-Forwarded-For spoofable)
- **Severity**: Low (DREAD: 4.8)
- **Fix**: `r.SetTrustedProxies([]string{"127.0.0.1", "10.0.0.0/8"})`

### WEB-012: Server binds 0.0.0.0:8080
- **Severity**: Low (DREAD: 5.2)
- **Location**: `internal/app/module.go:249`
- **Fix**: Bind `127.0.0.1:8080` when behind reverse proxy

---



---

## 3. Cryptography & Secrets — COMPLETE ✅

### CRYPTO-001: bcrypt.DefaultCost used (cost=10)
- **Severity**: Low (DREAD: 3.2)
- **Location**: `auth_service.go:57` — `bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)`
- **Desc**: bcrypt.DefaultCost = 10. OWASP recommends cost ≥ 12 for 2024+. With cost 10, passwords hash in ~1s; cost 12 takes ~4s, significantly increasing brute-force resistance.
- **Fix**: `const bcryptCost = 12` and use `bcrypt.GenerateFromPassword(password, bcryptCost)`
- **DREAD**: D4 R5 E3 A3 D1

### CRYPTO-002: No refresh token rotation
- **Severity**: Medium (DREAD: 5.0)
- **Location**: `auth_service.go:129-140` — RefreshToken generates only a new access token, not a new refresh token. Old refresh token remains valid for its full 7-day lifetime.
- **Desc**: If a refresh token is stolen, an attacker can continuously generate new access tokens for up to 7 days with no server-side detection or revocation. No token family tracking.
- **Fix**: Implement refresh token rotation — issue new refresh token, invalidate old one. Track token family in DB or Redis.
- **DREAD**: D5 R4 E4 A7 D5

### CRYPTO-003: JWT claims missing iss/aud/nbf/jti
- **Severity**: Low (DREAD: 2.0)
- **Location**: `auth_service.go:153-158` — token claims only include userId, role, exp, type
- **Desc**: No issuer (iss), audience (aud), not-before (nbf), or JWT ID (jti) claims. Missing nbf is minor. Missing iss/aud means tokens from one environment could be accepted in another (staging↔production).
- **Fix**: Add `iss` ("gymtrack-api"), `aud` ("gymtrack-client"), `nbf`, `jti` (UUID) claims.
- **DREAD**: D2 R3 E2 A2 D1

### CRYPTO-004: JWT algorithm pinning — ✅ VERIFIED SECURE
- `auth_service.go:167` — checks `token.Method.(*jwt.SigningMethodHMAC)` — rejects all non-HMAC algorithms (including `alg:none`). Good.

### CRYPTO-005: Token type enforcement — ✅ VERIFIED SECURE
- `auth_service.go:183-186` — validates token type (access vs refresh). Refresh tokens can't be used as access tokens and vice versa.

### CRYPTO-006: Expiry validation — ✅ VERIFIED SECURE
- `auth_service.go:188-193` — validates exp claim explicitly. Good.

### CRYPTO-007: Password comparison — ✅ VERIFIED SECURE
- `auth_service.go:105` — uses `bcrypt.CompareHashAndPassword` which is constant-time.

### CRYPTO-008: JWT secret validation at startup — ✅ VERIFIED SECURE
- `config.go:28-30` — blocks startup if JWT_SECRET < 32 chars. No default/fallback secret. Good.

### CRYPTO-009: Invitation codes use crypto/rand — ✅ VERIFIED SECURE
- `invitation.go:5,34` — imports `crypto/rand`, uses `generateRandomHex(ctx, 8)`. Cryptographically secure.

### Overall Crypto Score: Good. The two real issues (bcrypt cost, token rotation) are medium/low severity. No hardcoded secrets, no weak algorithms, no timing leaks detected.



---

## 4. Authentication & Authorization — COMPLETE ✅

### AUTHZ-001: Trainer can access any workout/meal by ID without relationship check
- **Severity**: Medium (DREAD: 5.0)
- **Location**: `workout_service.go:76`, `meal_service.go:77`
- **Desc**: `GetWorkout` and `GetMeal` only enforce ownership when `RequesterRole == RoleAthlete`. For trainers, the method skips the ownership check entirely — any authenticated trainer can view ANY workout/meal by ID, even for athletes they have no relationship with. This is inconsistent with `GetBodyMeasurement` which properly checks trainer relationships.
- **Fix**: Add relationship check for trainer requests (see BodyMeasurement's implementation):
```go
} else if input.RequesterRole == models.RoleTrainer {
    hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.RequesterID, workout.AthleteID)
    if err != nil || !hasActive {
        return nil, NewServiceError("Access denied", "FORBIDDEN")
    }
}
```
- **DREAD**: D5 R7 E5 A5 D3

### AUTHZ-002: Exercise creation requires auth but is not admin-restricted
- **Severity**: Low (DREAD: 3.0)
- **Location**: `exercise_routes.go:26` — CreateExercise behind authMw but NOT admin middleware
- **Desc**: Any authenticated user (athlete/trainer) can create exercises. The AGENTS.md says "POST/PUT/DELETE /api/exercises/:id — Admin only". PUT/DELETE are on admin routes, but POST is not. This could allow exercise catalog pollution.
- **Fix**: Move CreateExercise under admin middleware, or keep intentional (allows community-contributed exercises).
- **DREAD**: D2 R5 E4 A3 D1

### Verified Secure (17 items) — no findings:

| # | Endpoint | Ownership Check | Details |
|---|---------|----------------|---------|
| A3 | Workout Create | ✅ | `workout_service.go:40` — role=athlete only, owned by context user |
| A4 | Workout Update | ✅ | `workout_service.go:136-141` — ownership + CanEdit() 24h check |
| A5 | Workout Delete | ✅ | `workout_service.go:168-174` — ownership + CanEdit() 24h check |
| A6 | Meal Create | ✅ | `meal_service.go:41` — role=athlete only |
| A7 | Meal Update | ✅ | `meal_service.go:150-156` — ownership + CanEdit() 24h check |
| A8 | Meal Delete | ✅ | `meal_service.go:182-188` — ownership + CanEdit() 24h check |
| A9 | BodyMeasurement Create | ✅ | `body_measurement_service.go:49` — role=athlete only |
| A10 | BodyMeasurement Update/Delete | ✅ | ownership + CanEdit() 24h check |
| A11 | BodyMeasurement GetByID | ✅ | `body_measurement_service.go:93-105` — athlete=ownership, trainer=relationship |
| A12 | Comment CRUD | ✅ | `comment_service.go` — target ownership (athlete) or active relationship (trainer); author-only edit/delete |
| A13 | Review CRUD | ✅ | `review_service.go` — active relationship check, duplicate prevention, author-only edit/delete |
| A14 | Workout Plan CRUD | ✅ | trainer-only create/assign; ownership+relationship checks |
| A15 | Mass assignment (role) | ✅ | `user_handler.go:79-81` — UpdateProfileRequest has no role field; `auth_types.go:20` — register role limited to trainer/athlete |
| A16 | Admin middleware | ✅ | `admin_routes.go:13` — both authMw + AdminOnlyMiddleware(); role check correct |
| A17 | Trainer-client endpoints | ✅ | `GetClientWorkouts/Meals/Measurements` all verify active relationship |
| A18 | Coaching requests | ✅ | athlete-only create, trainer-only accept/reject |
| A19 | Auth middleware | ✅ | `auth_middleware.go` — fail-closed, validates Bearer header, checks user status |



---

## Remediation Priority


---

## 5. Concurrency & Dependencies — COMPLETE ✅

### CONC-001: Invitation acceptance race condition
- **Severity**: Medium (DREAD: 4.0)
- **Location**: `invitation_service.go:86-90` — `MarkInvitationUsed` errors are silently logged, not returned
- **Desc**: When two athletes accept the same invitation code simultaneously, both calls to `AcceptInvitation` can pass the `ValidateInvitation` check before either calls `MarkInvitationUsed`. Since the mark failure is logged but doesn't abort the operation, both relationships are created despite the code being single-use.
- **Fix**: Return the `MarkInvitationUsed` error, or use a DB transaction with `SELECT ... FOR UPDATE` on the invitation row:
```go
if err := s.method.MarkInvitationUsed(ctx, invitation.InvitationID); err != nil {
    return nil, fmt.Errorf("failed to mark invitation as used: %w", err)
}
```
- **DREAD**: D4 R4 E3 A5 D4

### CONC-002: Cache metrics goroutine has no shutdown
- **Severity**: Low (DREAD: 2.0)
- **Location**: `gocache_adapter.go:29-35` — goroutine runs `for range ticker.C` with no context cancellation
- **Desc**: The goroutine runs until program exit. Acceptable for long-running servers but could cause goroutine leaks in tests that create cache instances.
- **Fix**: Add context cancellation or `Close()` method for test cleanup.
- **DREAD**: D1 R3 E2 A2 D2

### Verified Secure (6 items) — no findings:

| # | Area | Details |
|---|------|---------|
| C3 | Cache metrics | ✅ `metrics.go:19-20` — atomic.Uint64 for hits/misses. Thread-safe. |
| C4 | Cache deep copy | ✅ `gocache_adapter.go:63,88` — deep copy via gob on Get and Set. Prevents shared mutable state. |
| C5 | go-cache internal | ✅ `patrickmn/go-cache` uses sync.RWMutex internally. All operations safe. |
| C6 | Eviction | ✅ `evictRandom2` uses Items() which returns a copy under lock. Reservoir sampling then deletes from live cache. |
| C7 | Graceful shutdown | ✅ `module.go:257-261` — fx lifecycle hook with 10s shutdown timeout. Correct. |
| C8 | Connection pool | ✅ pgxpool.Pool via fx DI — single instance, Go's connection pool is thread-safe. |

### DEP-001: Dependencies up to date — ✅
- `golang-jwt/jwt/v5 v5.3.1` — current
- `pgx/v5 v5.10.0` — recent
- `golang.org/x/crypto v0.51.0` — recent
- `gin v1.11.0` — latest
- `golang.org/x/net v0.53.0` — recent
- No known-vulnerable versions detected. Recommend running `go tool govulncheck ./...` periodically.

### DEP-002: Missing `-race` in standard test suite — ⚠️
- **Severity**: Low
- **Desc**: No evidence of `go test -race ./...` being run in CI. The race detector should be enabled for all test runs.
- **Fix**: Add `-race` flag to CI test command: `go test -race -count=1 ./...`



---

## Executive Summary

| Severity | Count | Items |
|----------|-------|-------|
| **Critical** | 0 | None detected |
| **High** | 3 | WEB-002 (timeouts), WEB-003 (body limit), WEB-004 (rate limiting) |
| **Medium** | 11 | WEB-001,005,006,007,008,009,010; AUTHZ-001; CRYPTO-002; CONC-001 |
| **Low** | 7 | WEB-011,012; CRYPTO-001,003; AUTHZ-002; OBS-001,002; CONC-002; DEP-002 |
| **Verified** | — | Injection: 0 vulns; Auth: 17 endpoints secure; Crypto: 6 checks pass; Concurrency: 6 areas safe |

### Key Strengths
- **Zero SQL injection** — 17 repos, all parameterized
- **Strong ownership enforcement** — 17 of 19 authorization points verified secure
- **No hardcoded secrets** — JWT secret from env, validated at startup
- **No weak algorithms** — HMAC-SHA256, bcrypt, crypto/rand all correctly used
- **Deep copy on cache** — prevents shared mutable state bugs

### Key Weaknesses
- **No server protection** — missing timeouts, body limits, rate limiting (DoS trivector)
- **Trainer IDOR** — workout/meal by ID lacks trainer relationship check (inconsistent with BodyMeasurement)
- **Bcrypt cost too low** — DefaultCost (10) vs recommended 12+
- **No refresh token rotation** — stolen refresh token grants indefinite access for 7 days
- **CORS wildcard + credentials** — invalid spec combo, commented-out allow-list exists

---

## Remediation Priority

### Immediate (before production deployment)
1. **WEB-002**: Server timeouts — 1-line fix: `ReadTimeout, WriteTimeout, IdleTimeout, ReadHeaderTimeout`
2. **WEB-003**: Request body size limit — add `MaxBytesReader` middleware
3. **WEB-004**: Auth rate limiting — per-IP limiter on `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`
4. **WEB-007**: Stop leaking `err.Error()` in 5xx JSON responses

### Current Sprint
5. **AUTHZ-001**: Add trainer relationship check to `GetWorkout`/`GetMeal` (copy pattern from `GetBodyMeasurement`)
6. **WEB-001**: Production CORS origin allow-list (restore commented-out L209!)
7. **CRYPTO-002**: Refresh token rotation — invalidate old token on refresh
8. **CRYPTO-001**: Bump bcrypt cost to 12
9. **WEB-005**: TLS configuration
10. **WEB-006**: Security headers middleware
11. **WEB-008/WEB-009**: Gate Swagger + /metrics behind auth in production
12. **CONC-001**: Return error on invitation MarkInvitationUsed failure

### Next Sprint
13. **WEB-010**: Token revocation/blacklist
14. **WEB-011/WEB-012**: Proxy config + listen address hardening
15. **OBS-001/OBS-002**: Error message cleanup + pagination clamping
16. **CRYPTO-003**: Add iss/aud/nbf/jti JWT claims
17. **DEP-002**: Enable `go test -race` in CI
18. **AUTHZ-002**: Decide if exercise creation should be admin-only


