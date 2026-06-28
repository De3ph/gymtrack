# GymTrack Backend — Go + Gin + Couchbase

## Commands (all run from `backend/`)

| Command | Action |
|---|---|
| `go run cmd/server/main.go` | Start server on port 8080 |
| `go build -o server.exe cmd/server/main.go` | Build binary |
| `go test ./...` | Run all tests (currently none exist — no `_test.go` files found) |

**No hot-reload** — stop and restart after every edit, or use a tool like `air`.

## Dependencies (Go 1.24, module `gymtrack-backend`)

- **Web**: `github.com/gin-gonic/gin` + `gin-contrib/cors`
- **DB**: `github.com/couchbase/gocb/v2` (Couchbase)
- **Auth**: `github.com/golang-jwt/jwt/v5` + `golang.org/x/crypto`
- **Docs**: `github.com/swaggo/swag` + `gin-swagger` (Swagger UI at `/swagger/*`)
- **Validation**: `github.com/go-playground/validator/v10`
- **Config**: `github.com/joho/godotenv` (loads `.env`)
- **Testing**: `github.com/stretchr/testify` + `github.com/stretchr/objx`

## Architecture (layered)

```
cmd/server/main.go         — DI wiring, router setup, startup
internal/
  api/
    handlers/              — 14 handlers, thin HTTP layer (parse req → call service → respond)
    middleware/             — auth_middleware.go, admin_middleware.go
    routes/                — 12 route files, grouped by domain
  config/                  — Config struct, Couchbase connect, collection init, seed data
  domain/
    errors/                — ErrNotFound, ErrUnauthorized, ErrForbidden, etc.
    models/                — 15 domain structs (Workout, User, Meal, Exercise, etc.)
    repositories/          — 14 interfaces defining data access contracts
    services/              — 15 service implementations with business logic
  testutils/               — Mock helpers (mocks.go, testutils.go)
  utils/                   — clock.go (RealClock interface for testable time)
```

## Database (Couchbase)

- **Bucket**: `gymtrack` (configurable via `COUCHBASE_BUCKET` env var).
- **Scope**: `_default` (all collections live here).
- **12 collections**: `users`, `relationships`, `workouts`, `meals`, `comments`, `invitations`, `muscle_groups`, `equipment`, `exercises`, `workout_plans`, `workout_plan_assignments`, `body_measurements`.
- **Auto-provisioning**: On startup, `config.InitializeCollections()` creates missing collections **and** N1QL indexes. You do not need a pre-setup Couchbase schema beyond the bucket.
- **Document IDs** follow the pattern `{type}::{uuid}` (e.g., `workout::abc-123`). All documents include a `type` field matching the collection name.

## Configuration

Loaded from `.env` in the `backend/` dir (also tries `../.env` and `../../.env`):

| Env var | Default | Notes |
|---|---|---|
| `COUCHBASE_CONNECTION_STRING` | `couchbase://localhost` | |
| `COUCHBASE_USERNAME` | `Administrator` | |
| `COUCHBASE_PASSWORD` | `password` | |
| `COUCHBASE_BUCKET` | `gymtrack` | |
| `JWT_SECRET` | **(required)** | Must be ≥32 chars |

`JWT_SECRET` is required and validated at startup — server will crash with `log.Fatal` if missing or too short.

## API structure

- Base path: `/api`
- Auth: Bearer token in `Authorization` header. Validated by `middleware.JWTAuthMiddleware()`.
- CORS: Allow origins `localhost:3000`, `localhost:3001`. Methods: GET, POST, PUT, DELETE, OPTIONS.
- Role middleware: `middleware.RoleMiddleware()` checks user role from JWT claims.
- Swagger UI: `http://localhost:8080/swagger/index.html`

## Key patterns to follow

- **Handler → Service → Repository**: Handlers parse requests and return responses. Services contain business logic. Repositories do data access. No business logic in handlers.
- **Constructor injection**: Services receive repository interfaces; handlers receive service interfaces. All wiring is explicit in `main.go`.
- **DTO layer**: Currently handlers parse raw JSON into domain models directly (no separate DTO package) — but the convention is to use request/response types in handler files. Model after `body_measurement_handler.go` or `workout_handler.go`.
- **Error handling**: Domain errors in `internal/domain/errors/` are `var` sentinel errors. Handlers do `errors.Is(err, domainerrors.ErrNotFound)` type switching (see `workout_handler.go` pattern).
- **Testable time**: Use `utils.RealClock` (implements `Clock` interface) everywhere instead of `time.Now()`. Pass it via constructor.

## Known gaps

- No test files exist. Backend test patterns should use `testutils` mocks + testify.
- `utils.clock.go` provides `Clock` interface + `RealClock` — services that use time already accept this via constructor.
- `SeedAllData()` in `config/seed_data.go` is commented out in `main.go` — uncomment if needed for development.
