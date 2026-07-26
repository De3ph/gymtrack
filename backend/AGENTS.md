# GymTrack Backend — Go + Gin + PostgreSQL

## Commands (all run from `backend/`)

| Command | Action |
|---|---|
| `go run cmd/server/main.go` | Start server on port 8080 |
| `go build -o server.exe cmd/server/main.go` | Build binary |
| `go test ./...` | Run all tests |
| `go test ./internal/infrastructure/persistence/postgres/...` | Run Postgres repository tests (uses real PostgreSQL via `POSTGRES_TEST_DSN`) |

**No hot-reload** — stop and restart after every edit, or use a tool like `air`.

## Dependencies (Go 1.24, module `gymtrack-backend`)

- **Web**: `github.com/gin-gonic/gin` + `gin-contrib/cors`
- **DB**: `github.com/jackc/pgx/v5` (PostgreSQL)
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
  config/                  — Config struct, PostgreSQL connection pool, seed data
  domain/
    errors/                — ErrNotFound, ErrUnauthorized, ErrForbidden, etc.
    models/                — 15 domain structs (Workout, User, Meal, Exercise, etc.)
    repositories/          — 14 interfaces defining data access contracts
    services/              — 15 service implementations with business logic
  infrastructure/
    persistence/
      postgres/            — 15 repository implementations (PostgreSQL)
      repository.go        — RepositoryFactory creating all repositories
  testutils/               — Mock helpers (mocks.go, testutils.go)
  utils/                   — clock.go (RealClock interface for testable time)
```

## Database (PostgreSQL)

- **Host**: `localhost` (configurable via `POSTGRES_DSN` and `POSTGRES_TEST_DSN` env vars).
- **Port**: `5432` (default PostgreSQL port).
- **Database**: `gymtrack` (default database name).
- **Schema**: `public` (default schema).
- **Tables**: `users`, `relationships`, `workouts`, `meals`, `comments`, `invitations`, `exercises`, `equipment`, `muscle_groups`, `coaching_requests`, `trainer_reviews`, `trainer_availabilities`, `workout_plans`, `workout_plan_assignments`, `body_measurements`.
- **Schema management**: Tables are created via migration scripts. Run `go run ./cmd/migrate` to apply migrations.
- **Primary keys**: All tables use `id SERIAL PRIMARY KEY`. Foreign keys reference these integer IDs.
- **JSONB columns**: `workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises` store arrays as JSONB.

## Configuration

Loaded from `.env` in the `backend/` dir (also tries `../.env` and `../../.env`):

| Env var | Default | Notes |
|---|---|---|
| `POSTGRES_DSN` | (required) | PostgreSQL connection string |
| `POSTGRES_TEST_DSN` | (required) | PostgreSQL connection string for tests |
| `JWT_SECRET` | (required) | Must be ≥32 characters |

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
- **Repository Factory**: Use `persistence.RepositoryFactory` to create all repositories from a single `pgxpool.Pool`. The factory is provided via uber/fx and individual repositories are extracted via accessor methods.
- **DTO layer**: Currently handlers parse raw JSON into domain models directly (no separate DTO package) — but the convention is to use request/response types in handler files. Model after `body_measurement_handler.go` or `workout_handler.go`.
- **Error handling**: Domain errors in `internal/domain/errors/` are `var` sentinel errors. Handlers do `errors.Is(err, domainerrors.ErrNotFound)` type switching (see `workout_handler.go` pattern).
- **Testable time**: Use `utils.RealClock` (implements `Clock` interface) everywhere instead of `time.Now()`. Pass it via constructor.

## Known gaps

- Invitation service still uses Couchbase (not migrated to PostgreSQL).
- No E2E test suite. Repository-level tests exist but integration with the full HTTP layer is untested.
- `SeedAllData()` in `config/seed_data.go` is commented out in `main.go` -- uncomment if needed for development.
- Schema managed via `backend/migrations/001_initial_schema.up.sql` -- no migration tool (e.g., golang-migrate) yet.
- JSONB columns (`workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises`) are untyped `[]byte` in Go code; no struct deserialization layer.
