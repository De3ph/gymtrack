# Backend HTTP Integration / E2E Test Plan

> Created: 2026-09-01 — from issue: "No E2E test suite. Repository-level and unit tests exist, but integration across the full HTTP layer is limited."

## 1. Current Testing Landscape

### What exists today

| Layer | Location | Count | Approach |
|-------|----------|-------|----------|
| Repository (PostgreSQL) | `internal/infrastructure/persistence/postgres/*_test.go` | 13 files | `testcontainers` or `POSTGRES_TEST_DSN` + real migrations |
| Service (business logic) | `internal/domain/services/*_test.go` | 4 files | Fake repos, no HTTP |
| Utility / helpers | `internal/infrastructure/persistence/postgres/helpers_test.go`, `cache_test.go` | 2 files | Unit-level |
| Fixture factories + mock repos | `internal/testutils/testutils.go` | — | `CreateTestContext()`, mock repos for handlers |

### What is missing

- **Zero tests exercise the Gin HTTP router end-to-end** (handler → service → PostgreSQL).
- `testutils.CreateTestContext()` exists but is designed for unit-testing handlers in isolation (manually setting `c.Set("userID", …)`), not for going through the JWT auth middleware.
- No test covers: JWT issuance → Bearer token injection → auth middleware → handler → PostgreSQL round-trip.
- No test covers: error mapping from service layer → HTTP status codes through `handleServiceError` / `handleInternalError`.
- No test covers: middleware chain (CORS, body limit, rate limit, tracing, metrics).

### Test files currently in `backend/`

```
internal/domain/services/
  auth_service_test.go
  password_reset_service_test.go
  user_service_test.go
  workout_plan_service_test.go

internal/infrastructure/persistence/postgres/
  auth_cache_test.go       benchmark_test.go
  body_measurement_test.go coaching_request_test.go
  comment_test.go          exercise_test.go
  helpers_test.go          meal_test.go
  password_reset_test.go   relationship_test.go
  trainer_profile_test.go  trainer_review_test.go
  user_test.go             workout_plan_assignment_test.go
  workout_plan_test.go     workout_test.go
```

## 2. What E2E Means Here

The phrase "integration across the full HTTP layer" refers to **backend HTTP integration tests** — not browser Playwright tests. These tests sit between the existing repository tests (lowest level) and the frontend Playwright tests (highest level).

A test starts a real (or `httptest`) Gin server, sends HTTP requests with JSON bodies and `Authorization: Bearer` headers, and asserts on status codes, response bodies, and side-effects in PostgreSQL.

---

## 3. Architecture for Backend E2E Tests

```
backend/
└── internal/
    └── api/
        └── e2e/
            ├── e2e_test.go          # Shared suite setup/teardown, buildTestRouter(), helpers
            ├── auth_e2e_test.go     # Register, login, refresh, logout, restore account
            ├── user_e2e_test.go     # GET/PUT /api/users/me, DELETE account
            ├── workout_e2e_test.go  # CRUD workouts, 24h edit window, client view
            ├── meal_e2e_test.go     # CRUD meals, client view
            ├── measurement_e2e_test.go # CRUD body measurements, client view
            ├── relationship_e2e_test.go # Invite/accept code, my-clients, my-trainer, terminate
            ├── comment_e2e_test.go  # CRUD comments on workouts/meals/measurements
            ├── exercise_e2e_test.go # Browse exercises, muscle groups, equipment (public)
            ├── coach_e2e_test.go    # Coaching requests: create, accept, reject
            └── admin_e2e_test.go    # Admin: list users, change roles (admin-only)
```

### Shared setup (per test suite)

1. Start PostgreSQL (testcontainers or `POSTGRES_TEST_DSN`)
2. Run migrations (`applyMigrations`)
3. Seed lookup tables (muscle groups, equipment)
4. Build Gin router exactly like production (same middleware chain)
5. Create test users (athlete + trainer)
6. Login → capture JWT tokens
7. Run tests
8. Cleanup (pool close / container terminate)

### Key design decisions

1. **Reuse existing `SetupTestPostgresDB`** from `internal/testutils/postgres.go` — dual strategy (env var + testcontainers), migrations applied, lookup tables seeded.

2. **Build the real router** — construct a `gin.Engine` with the same middleware chain as `module.go`'s `RegisterRoutes`. Tests go through CORS, body limit, tracing, metrics, auth middleware, and all handler code.

3. **JWT flow in tests:**
   - Register a test athlete + trainer via `POST /api/auth/register`.
   - Login via `POST /api/auth/login` to get `accessToken`.
   - Use `accessToken` in `Authorization: Bearer <token>` header for all authenticated requests.
   - This validates the entire auth chain.

4. **Test isolation:** Each top-level test group resets state by either running TRUNCATE on all tables between groups, or using unique usernames per test run.

5. **Assertions:** `github.com/stretchr/testify/assert` and `require` (already a dependency).

---

## 4. Key Scenarios to Cover Per Domain

### Auth (`auth_e2e_test.go`)

- Register athlete → 201, login → 200 + JWT, access protected resource → 200
- Register trainer → 201, login → 200
- Duplicate email → 409, duplicate username → 409
- Bad credentials → 401
- Invalid token on protected route → 401
- Refresh token flow → new access token
- Soft-delete account → 200, subsequent access → 403, restore → 200

### Workouts (`workout_e2e_test.go`)

- Athlete creates workout → 201
- Athlete lists own workouts → 200
- Athlete gets own workout by ID → 200
- Athlete updates within 24h → 200
- Athlete updates after 24h → 403
- Athlete deletes within 24h → 200
- Trainer views athlete workouts (with active relationship) → 200
- Trainer without relationship → 403

### Meals (`meal_e2e_test.go`) — same CRUD + 24h window + trainer client view pattern.

### Body Measurements (`measurement_e2e_test.go`) — same CRUD + 24h window + trainer client view pattern.

### Relationships (`relationship_e2e_test.go`)

- Trainer generates invite code → 200
- Athlete accepts invite code → 200 (relationship active)
- Athlete gets own trainer → 200
- Trainer gets own clients → 200
- Trainer gets client stats → 200
- Terminate relationship → 200

### Comments (`comment_e2e_test.go`)

- Comment on workout → 201
- List comments for workout → 200
- Author updates own comment → 200
- Non-author updates → 403
- Author deletes own comment → 200

### Exercises (`exercise_e2e_test.go`) — public catalog: list with filters, get by ID.

### Coaching Requests (`coach_e2e_test.go`)

- Athlete creates coaching request → 201
- Trainer lists pending requests → 200
- Trainer accepts request → 200
- Trainer rejects request → 200

### Admin (`admin_e2e_test.go`)

- Admin lists users → 200
- Admin changes user role → 200
- Non-admin tries admin route → 403

---

## 5. Implementation Steps

1. **Create `internal/api/e2e/e2e_test.go`** — test suite boilerplate with shared setup:
   - PostgreSQL setup (reuse `testutils.SetupTestPostgresDB`)
   - Build test router (construct inline with same middleware chain as `module.go`)
   - Helper functions: `registerUser()`, `login() → accessToken`, `authRequest() → ResponseRecorder`

2. **Create domain test files** one at a time:
   - `[domain]_e2e_test.go` with sequential tests
   - Each test uses the shared PostgreSQL instance and router

3. **Handle the 24-hour edit window** — create/update/delete within the same test function (within real 24h) for the happy path. For the refusal path, manipulate clock via test clock injection or test after the window.

4. **Add a Go test command**:
   ```bash
   cd backend && go test ./internal/api/e2e/... -v
   ```

5. **CI-friendly** — tests work with `POSTGRES_TEST_DSN` env var (no Docker needed in CI if a PostgreSQL service is available).

---

## 6. Risks / Considerations

| Concern | Mitigation |
|---------|------------|
| Router construction is inside `fx.Invoke(RegisterRoutes)` in `module.go` | Construct the router inline in test setup with the same middleware chain |
| JWT secret must match between test registration/login and middleware validation | Use a fixed `testJWTSecret` in the test router build |
| Testcontainers requires Docker | Tests fall back to `POSTGRES_TEST_DSN` (same pattern as existing repo tests) |
| Test execution time | PostgreSQL setup per suite (not per test), individual tests are fast HTTP calls |
| Soft-delete / restore flow changes user state | Use unique usernames per test group; clean up with TRUNCATE between top-level groups |

---

## 7. Recommended Order

1. **`auth_e2e_test.go`** — validates the entire auth pipeline that every other test depends on
2. **`workout_e2e_test.go`** — most complex domain with 24h window + trainer client view
3. **Remaining CRUD domains** — meals, measurements, relationships, comments, coaching, admin — follow the same pattern

---

## 8. Status

| Item | Status |
|------|--------|
| Analysis complete | ✅ |
| Plan saved | ✅ |
| Implementation | ❌ Not started |
