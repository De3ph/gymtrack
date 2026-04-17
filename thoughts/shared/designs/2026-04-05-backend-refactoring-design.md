date: 2026-04-05
topic: "Backend Refactoring Plan"
status: validated

## Problem Statement

The backend has a clean layered architecture on paper but several critical implementation issues undermine it:

- **Tests don't compile** — zero safety net for changes
- **Global mutable state** in config and middleware makes testing impossible
- **Unchecked type assertions** in 20+ handler locations will cause runtime panics
- **Inconsistent abstractions** — some repos are interfaces, others are concrete structs
- **Business logic in handlers** instead of services — hard to test and reuse
- **~400 lines of duplicated code** between workout and meal handlers

## Constraints

- **No behavior changes** — all endpoints must return identical responses
- **Go idioms** — follow patterns: accept interfaces, return structs, zero value useful
- **Preserve Couchbase integration** — no database schema changes
- **Phased delivery** — each phase leaves the codebase in a working state

## Approach: Four Phases by Dependency Order

**Phase 1: Foundations** — Fix globals, compile tests, error handling
**Phase 2: Abstractions** — Repository interfaces, service dependency fixes
**Phase 3: Service Layer** — Extract business logic from handlers
**Phase 4: Cleanup** — Deduplication, security hardening, stub implementations

## Architecture

### Current Architecture Issues

```
cmd/server/main.go          → Entry point (OK, but wires globals)
internal/config/
  db.go                     → GlobalCluster, GlobalBucket (P0: global mutable state)
internal/api/
  middleware/
    auth_middleware.go      → panic on init, global appConfig (P0)
  handlers/
    workout_handler.go      → 406 lines, business logic inside (P2)
    meal_handler.go         → 420 lines, duplicated from workout (P2)
    relationship_handler.go → 723 lines, stats calculation in handler (P2)
internal/domain/
  repositories/
    workout_repository.go   → Concrete struct, no interface (P1)
    meal_repository.go      → Concrete struct, no interface (P1)
    *_repository.go         → Uses globals for N1QL queries (P0)
  services/
    *_service.go            → Depends on concrete types, not interfaces (P1)
```

### Target Architecture

```
cmd/server/main.go          → Entry point, pure DI (no globals)
internal/config/
  config.go                 → Config struct (immutable after load)
  db.go                     → Connect returns *gocb.Cluster (no globals)
internal/api/
  response/                 → NEW: shared error/success response helpers
  middleware/
    auth.go                 → NewAuthMiddleware(cfg) gin.HandlerFunc
    role.go                 → NEW: RequireRole(role) gin.HandlerFunc
  handlers/                 → Thin: parse → call service → respond
internal/domain/
  errors/                   → NEW: sentinel errors (ErrNotFound, etc.)
  models/                   → Unchanged (document structs)
  repositories/             → All interfaces + Couchbase implementations
  services/                 → All accept interfaces, contain business logic
```

## Components

### Phase 1: Foundations

**1.1 Eliminate Global Mutable State**

- `config.GlobalCluster` and `config.GlobalBucket` → removed
- `db.go`: `ConnectToCouchbase()` returns `(*gocb.Cluster, *gocb.Bucket, error)`
- All repositories receive `*gocb.Collection` and use it for ALL operations (KV + N1QL)
- `middleware.appConfig` → removed
- `InitAuthMiddleware(cfg)` → `NewAuthMiddleware(cfg) gin.HandlerFunc`

**1.2 Fix Unchecked Type Assertions**

- New `internal/api/response/helpers.go`:
  - `GetUserID(c *gin.Context) (string, error)`
  - `GetUserRole(c *gin.Context) (string, error)`
- All handlers use these helpers instead of `c.Get("userID").(string)`
- Missing context values return 401 immediately

**1.3 Standardize Error Responses**

- New `internal/api/response/error.go`:
  - `Error(c *gin.Context, code int, message string)`
  - `Success(c *gin.Context, data interface{})`
  - `Created(c *gin.Context, data interface{})`
- Consistent JSON shape: `{"error": "user-friendly message"}`
- Internal details logged server-side, never sent to client

**1.4 Fix Compilation Errors in Tests**

- Fix `comment_service_test.go` mock types
- Fix `tests/comment_handler_test.go` imports and syntax
- `go test ./...` passes (even if coverage is minimal)

### Phase 2: Abstractions

**2.1 Repository Interfaces for All Domains**

Define interfaces where currently concrete:
- `WorkoutRepository` interface → `CouchbaseWorkoutRepository` impl
- `MealRepository` interface → `CouchbaseMealRepository` impl
- `RelationshipRepository` interface → `CouchbaseRelationshipRepository` impl
- `CommentRepository` interface → `CouchbaseCommentRepository` impl

**2.2 Services Depend on Interfaces**

- All service constructors accept interface parameters
- `TrainerCatalogService` accepts `TrainerProfileRepository` interface (not concrete)
- `ReviewService` accepts `ReviewRepository` interface (not concrete)
- `AvailabilityService` accepts `AvailabilityRepository` interface (not concrete)
- All handlers accept interface parameters

**2.3 Add Context to Repository Methods**

- All repo methods accept `context.Context` as first parameter
- Callers control timeouts: `ctx, cancel := context.WithTimeout(ctx, 10*time.Second)`
- Remove internal `context.WithTimeout(context.Background(), ...)` from repos

### Phase 3: Service Layer

**3.1 Extract Workout Service**

`WorkoutService` with methods:
- `CreateWorkout(ctx, athleteID, req) → (*Workout, error)`
- `GetWorkout(ctx, workoutID, requesterID, requesterRole) → (*Workout, error)`
- `UpdateWorkout(ctx, workoutID, requesterID, requesterRole, req) → (*Workout, error)`
- `DeleteWorkout(ctx, workoutID, requesterID, requesterRole) error`
- `GetWorkouts(ctx, athleteID, requesterID, requesterRole, filters) → ([]Workout, error)`

Handler becomes thin: parse request → call service → return response.

**3.2 Extract Meal Service**

Same pattern as Workout Service. Shared authorization patterns between the two.

**3.3 Role-Based Middleware**

- `RequireRole(role string) gin.HandlerFunc`
- Applied at route registration: `r.GET("/workouts", role.RequireRole("athlete"), handler.GetWorkouts)`
- Handlers no longer need inline role checks for endpoint-level authorization

### Phase 4: Cleanup

**4.1 Deduplicate Handler Patterns**

- `parsePagination(c) → (limit, offset int)`
- `parseDateRange(c) → (startDate, endDate time.Time)`
- Shared relationship verification helper

**4.2 Fix Stub Implementations**

- `CountTrainers` → actual N1QL COUNT query
- `SearchTrainers` → actual text search with query parameter
- `BookSlot` → actual booking logic with availability check

**4.3 Security Hardening**

- bcrypt cost: 10 → 12
- Remove default Couchbase credentials from config
- Replace `generateUUID()` with `github.com/google/uuid`
- Remove all error detail leakage

**4.4 Clean Up Build Artifacts**

- Remove `main.exe`, `server.exe`, `test-server`
- Add to `.gitignore` if not already

## Data Flow

```
HTTP Request
  → Gin Router
    → Auth Middleware (validates JWT, sets userID/role in context)
      → Role Middleware (optional, checks role)
        → Handler (parses request, calls service)
          → Service (business logic: authz, validation, orchestration)
            → Repository Interface (data access)
              → Couchbase Implementation (KV + N1QL via injected collection)
```

## Error Handling

- **Handlers**: `response.Error(c, code, "user message")`. Log internals.
- **Services**: `fmt.Errorf("create workout for %s: %w", athleteID, err)`
- **Repositories**: `fmt.Errorf("insert workout document: %w", err)`
- **Sentinel errors**: `ErrNotFound`, `ErrUnauthorized`, `ErrForbidden`, `ErrValidationError` in `domain/errors`

## Testing Strategy

- **Phase 1**: Fix compilation, add middleware tests
- **Phase 2**: Add repository mocks, fix service tests
- **Phase 3**: Add service unit tests for workout/meal logic
- **Phase 4**: Add handler tests with mocked services

## Open Questions

- Structured logger (`slog`) vs `log.Printf`? Recommend `slog` (stdlib since Go 1.21, minimal overhead).
- Shared `response` package or per-handler helpers? Recommend shared package to eliminate duplication.
