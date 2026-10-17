# GymTrack Backend — Go + Gin + PostgreSQL

## Commands (all run from `backend/`)

| Command | Action |
|---|---|
| `go run cmd/server/main.go` | Start server on port 8080 |
| `go build -o server.exe cmd/server/main.go` | Build binary |
| `go run cmd/db-roles/main.go` | Provision least-privilege DB roles (`gymtrack_app` DML-only, `gymtrack_migrate` owner). Run before `migrate`; idempotent |
| `go run cmd/migrate/main.go` | Apply SQL migrations from embedded FS (default: `-dir up`) |
| `go run cmd/migrate/main.go -dir down` | Roll back the last applied migration |
| `go run cmd/migrate/main.go -dir force 3` | Force `schema_migrations` version (dirty-state recovery) |
| `go run cmd/ensure-schema/main.go` | Destructive local reset: drops schema, applies all migrations, seeds lookup tables |
| `go test ./...` | Run all tests |
| `go test ./internal/infrastructure/persistence/postgres/...` | Run Postgres repository tests (uses real PostgreSQL via `POSTGRES_TEST_DSN`) |
| `go run cmd/seed/main.go` | Seed mock data: 30 workouts + 30 meals for `de3ph` (password `1234567890`) |

**No hot-reload** — stop and restart after every edit, or use a tool like `air`.

## Dependencies (Go 1.25, module `gymtrack-backend`)

- **Web**: `github.com/gin-gonic/gin` + `gin-contrib/cors`
- **DB**: `github.com/jackc/pgx/v5` (PostgreSQL)
- **Auth**: `github.com/golang-jwt/jwt/v5` + `golang.org/x/crypto`
- **DI**: `go.uber.org/fx` v1.24 (composition root in `internal/app/module.go`)
- **Cache**: `github.com/patrickmn/go-cache` (in-memory adapters in `infrastructure/cache`)
- **Metrics**: `github.com/prometheus/client_golang` (HTTP metrics middleware)
- **Logging**: `go.uber.org/zap`
- **Docs**: `github.com/swaggo/swag` + `gin-swagger` (Swagger UI at `/swagger/*`)
- **Validation**: `github.com/go-playground/validator/v10`
- **Config**: `github.com/joho/godotenv` (loads `.env`)
- **Migrations**: `github.com/golang-migrate/migrate/v4` v4.19 (`iofs` + `database/postgres` drivers; SQL embedded via `embed.FS`)
- **Testing**: `github.com/stretchr/testify` + `github.com/stretchr/objx`

## Architecture (layered)

```
cmd/server/main.go         — Thin entry point: fx.New(app.Module).Run()
internal/
  app/
    module.go              — uber-go/fx DI composition root (all providers/invokes)
  api/
    handlers/              — 14 handlers, thin HTTP layer (parse req → call service → respond)
    middleware/            — auth, admin, rate-limit, body-limit, metrics
    routes/                — 12 route files, grouped by domain
  config/                  — Config struct, PostgreSQL connection pool, seed data
  migrate/                 — embedded SQL migrations (embed.FS) + MigrationsFS() for golang-migrate
  domain/
    errors/                — ErrNotFound, ErrUnauthorized, ErrForbidden, etc.
    models/                — 15 domain structs (Workout, User, Meal, Exercise, etc.)
    repositories/          — 14 interfaces defining data access contracts
    services/              — 15 service implementations with business logic
  infrastructure/
    persistence/
      postgres/            — PostgreSQL repository implementations
      repository.go        — RepositoryFactory creating all repositories
    cache/                 — In-memory cache adapters (gocache) + Prometheus metrics
    log/                   — Zap logger setup
  testutils/               — Mock helpers (mocks.go, testutils.go)
  utils/                   — clock.go (Clock interface + RealClock for testable time)
```

## Database (PostgreSQL)

- **Host**: `localhost` (configurable via `POSTGRES_DSN` and `POSTGRES_TEST_DSN` env vars).
- **Port**: `5432` (default PostgreSQL port).
- **Database**: `gymtrack` (default database name).
- **Schema**: `public` (default schema).
- **Tables**: `users`, `relationships`, `workouts`, `meals`, `comments`, `invitations`, `exercises`, `equipment`, `muscle_groups`, `coaching_requests`, `trainer_reviews`, `trainer_availabilities`, `workout_plans`, `workout_plan_assignments`, `body_measurements`.
- **Schema management**: Tables are created via migration scripts. Run `go run ./cmd/migrate` to apply migrations.
- **Migration library**: `golang-migrate/migrate/v4` with `iofs` source (reading from the embedded `internal/migrate/migrations/` FS) and `database/postgres` driver. Tracking table is `schema_migrations` (managed by the library; `version INT`, `dirty BOOLEAN`). Same table format as the previous custom runner, so existing databases are picked up automatically — no manual re-baselining.
- **Adding a migration**: Create `internal/migrate/migrations/NNN_<name>.up.sql` + matching `.down.sql`. Then `go run cmd/migrate/main.go`. The CI job (`.github/workflows/migrate.yml`) runs `go run ./cmd/migrate` against a fresh Postgres 16 service container and verifies `schema_migrations` ends clean (`dirty=false`).
- **Primary keys**: All tables use `id SERIAL PRIMARY KEY`. Foreign keys reference these integer IDs.
- **JSONB columns**: `workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises` store arrays as JSONB.

## Configuration

Loaded from `.env` in the `backend/` dir (also tries `../.env` and `../../.env`):

| Env var | Default | Notes |
|---|---|---|
| `POSTGRES_DSN` | (required) | PostgreSQL connection string |
| `POSTGRES_TEST_DSN` | (required) | PostgreSQL connection string for tests |
| `JWT_SECRET` | (required) | Must be ≥32 characters |
| `APP_ENV` | `development` | `production` selects gin release mode |
| `GIN_MODE` | (derived) | Explicit `debug`/`release`/`test`; overrides `APP_ENV` |
| `PORT` | `8080` | HTTP listen port |
| `CORS_ALLOWED_ORIGINS` | dev localhost list | Comma-separated allow-list; empty in production = same-origin proxy only |
| `TRUSTED_PROXIES` | (none) | Comma-separated IPs/CIDRs allowed to set `X-Forwarded-For`. Untrusted headers are ignored (`ClientIP` cannot be spoofed). Compose pins the `gymtrack` network to 172.31.0.0/24 and trusts only that subnet |
| `POSTGRES_ADMIN_DSN` | falls back to `POSTGRES_DSN` | Admin DSN for `cmd/db-roles` (superuser) |
| `APP_DB_USER` / `APP_DB_PASSWORD` | `gymtrack_app` / — | Runtime role provisioned by `cmd/db-roles` |
| `MIGRATE_DB_USER` / `MIGRATE_DB_PASSWORD` | `gymtrack_migrate` / — | Migration role (schema owner) |

`JWT_SECRET` is required and validated at startup — server will crash with `log.Fatal` if missing or too short.

## API structure

- Base path: `/api`
- Auth: Bearer token in `Authorization` header. Validated by `middleware.JWTAuthMiddleware()`.
- CORS: Allow origins `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3001`, `http://127.0.0.1:3001` (the code uses a `[IP_ADDRESS]` placeholder that resolves to the LAN IP). Methods: GET, POST, PUT, DELETE, OPTIONS. `AllowCredentials: true`.
- Role checks: middleware enforces roles (e.g., admin) from JWT claims.
- Swagger UI: `http://localhost:8080/swagger/index.html`

## Git safety

**Never run `git reset --hard`.** It silently deletes uncommitted work, including changes you
did not make, and the lost content is usually not recoverable. Use `git reset --soft` or
`git reset --mixed` to undo a commit. Run `git status` before any history-rewriting command.

## Key patterns to follow

- **Handler → Service → Repository**: Handlers parse requests and return responses. Services contain business logic. Repositories do data access. No business logic in handlers.
- **Constructor injection**: Services receive repository interfaces; handlers receive service interfaces. All wiring is in `internal/app/module.go` via uber-go/fx.
- **Repository Factory**: Use `persistence.RepositoryFactory` to create all repositories from a single `pgxpool.Pool`. The factory is provided via uber/fx and individual repositories are extracted via accessor methods.
- **DTO layer**: Currently handlers parse raw JSON into domain models directly (no separate DTO package) — but the convention is to use request/response types in handler files. Model after `body_measurement_handler.go` or `workout_handler.go`.
- **Error handling**: Domain errors in `internal/domain/errors/` are `var` sentinel errors. Handlers do `errors.Is(err, domainerrors.ErrNotFound)` type switching (see `workout_handler.go` pattern).
- **Testable time**: Use `utils.RealClock` (implements `Clock` interface) everywhere instead of `time.Now()`. Pass it via constructor.

## Known gaps

- No E2E test suite. Repository-level and unit tests exist, but integration across the full HTTP layer is limited.
- Schema is managed by `golang-migrate/migrate/v4` (`internal/migrate/migrations/` embedded via `embed.FS`). New files follow `{version}_{name}.up.sql` / `{version}_{name}.down.sql`. Idempotent — run `go run cmd/migrate/main.go` after adding a file. `cmd/ensure-schema` is a destructive local reset (drops the public schema, applies all migrations, seeds lookup tables).
- JSONB columns (`workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises`, `users.profile`) use the typed deserialization layer in `internal/infrastructure/persistence/postgres/jsonb.go` (e.g. `MarshalWorkoutExercises`/`UnmarshalWorkoutExercises`); repositories scan into `[]byte` then call the typed helper — do not call raw `MarshalToJSONB`/`UnmarshalFromJSONB` from repository code.
