# Couchbase → PostgreSQL Migration

## TL;DR

> **Quick Summary**: Migrate GymTrack from Couchbase (document DB) to PostgreSQL 16+ (relational + JSONB). Keep all 14 repository interfaces unchanged — swap Couchbase impls for PostgreSQL impls via uber/fx DI. Data migration runs offline (dev phase, no prod users).
>
> **Deliverables**:
> - Full PostgreSQL schema (13 domain tables, 2 lookup tables)
> - 14 Postgres*Repository implementations (existing interfaces unchanged)
> - `cmd/migrate/main.go` CLI migration runner
> - `docker-compose.yml` for PostgreSQL 16
> - Module.go DI wiring swap (Couchbase → Postgres)
> - JSONB query helpers for exercise/meal/food containment queries
>
> **Estimated Effort**: Large (26 implementation tasks + 4 verification)
> **Parallel Execution**: YES — 6 waves of 3-7 parallel tasks each
> **Critical Path**: Deps → Repos → Migration logic → DI wiring → F tests

---

## Context

### Original Request
Optimize `plans/couchbase_to_postgresql_migration_blueprint.md` for agent execution — convert blueprint into an actionable work plan with wave-based parallelism, agent dispatch, and per-task QA scenarios.

### Source Blueprint
`plans/couchbase_to_postgresql_migration_blueprint.md` (v1.1) — comprehensive design document covering schema, ID strategy, DI wiring, query patterns, and migration pipeline.

### Key Design Decisions (from blueprint, verified)
- **All domain tables**: UUID PKs matching existing UUID string fields — no FK type mismatch, no frontend churn
- **Lookup tables** (`muscle_groups`, `equipment_definitions`): SERIAL/INTEGER PKs (seeded int IDs 1-8)
- **exercises.legacy_id**: For seeded non-UUID IDs ("exercise_Bench Press"); deterministic UUID v5 replacement
- **JSONB arrays**: `workouts.exercises`, `meals.items`, `workout_plans.exercises` stay JSONB
- **body_measurements.parts**: JSONB source of truth with expression indexes on 13 supported paths
- **DI strategy**: Keep 14 interfaces, swap fx providers, rollback = one-line revert
- **Migration**: Offline dump-transform-load, Couchbase untouched during dev phase

---

## Work Objectives

### Core Objective
Replace Couchbase persistence with PostgreSQL while preserving all repository interfaces, data semantics, and API contracts.

### Concrete Deliverables
- `docker-compose.yml` — PostgreSQL 16 service
- `migrations/` — timestamped SQL migration files
- `internal/repository/postgres/` — 14+ repository files
- `cmd/migrate/main.go` — migration CLI runner
- `internal/config/postgres.go` — pgxpool connection provider
- `internal/testutils/postgres.go` — testcontainers integration
- `internal/app/module.go` — updated DI module (Postgres wired in, Couchbase removed)

### Definition of Done
- [ ] `docker compose up -d` starts PostgreSQL 16
- [ ] `go run cmd/migrate/main.go` loads data from Couchbase JSONL export into PostgreSQL
- [ ] `go test ./internal/repository/postgres/...` passes with testcontainers
- [ ] Application starts, all CRUD operations work against PostgreSQL
- [ ] Chart queries (§6) return correct data for sample users

### Must Have
- All 14 repository interfaces implemented in `internal/repository/postgres/` with unchanged method signatures
- Schema matches §3 DDL exactly (UUID PKs, GIN indexes, expression indexes, CHECK constraints, FKs)
- Migration handles exercise legacy_id rewrite in JSONB arrays
- Unit tests for each repository using testcontainers
- Rollback: one-line change in module.go to restore Couchbase impls

### Must NOT Have
- Do NOT change repository interface signatures in `internal/domain/repositories/`
- Do NOT add Couchbase dependencies to Postgres repository files
- Do NOT add shared types or code-gen between frontend/backend
- Do NOT modify service layer code
- Do NOT change frontend API contracts (IDs remain strings)
- Do NOT modify existing Couchbase repository files (keep for rollback)
- Do NOT add uuid-ossp extension (gen_random_uuid() is built-in in PG 13+)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (testcontainers pattern used for repo tests)
- **Automated tests**: YES (tests-after — unit tests per repository)
- **Framework**: Go `testing` + `testify` + `testcontainers-go` for integration tests
- **Migration test**: Run migration CLI against fresh PostgreSQL instance, verify row counts + FK integrity

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.omo/evidence/migration/task-{N}-{slug}.{ext}`.

- **Go code**: `go build ./...` + `go test ./...` + `go vet ./...`
- **PostgreSQL**: Run SQL against live container, verify schemas + indexes + sample queries
- **Migration**: Full end-to-end run with verification SQL
- **DI wiring**: `go run cmd/server/main.go` starts without Couchbase import errors

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Pre-flight — sequential, runs first):
└── 0: Pre-flight environment verification [quick]

Wave 1 (Infrastructure — all parallel, depend on 0):
├── 1: Add deps to go.mod (pgx, sqlx, testcontainers) [quick]
├── 2: Create docker-compose.yml [quick]
├── 3: Create migrations/ with full schema DDL [quick]
├── 4: Create config.ProvidePostgresPool [quick]
├── 5: Create internal/testutils/postgres.go [quick]
└── 6: Create cmd/migrate/main.go scaffold [quick]

Wave 2 (Core repos — all parallel, depend on 1-6):
├── 7: PostgresUserRepository [unspecified-high]
├── 8: PostgresRelationshipRepository [unspecified-high]
├── 9: PostgresCoachingRequestRepository [unspecified-high]
├── 10: PostgresTrainerReviewRepository [unspecified-high]
├── 11: PostgresTrainerProfileRepository [unspecified-high]
└── 12: PostgresCommentRepository [unspecified-high]

Wave 3 (JSONB repos — all parallel, depend on 1-6):
├── 13: PostgresWorkoutRepository (exercises JSONB) [deep]
├── 14: PostgresMealRepository (items JSONB) [deep]
├── 15: PostgresBodyMeasurementRepository (parts JSONB) [deep]
├── 16: PostgresWorkoutPlanRepository (exercises JSONB + order) [deep]
└── 17: PostgresWorkoutPlanAssignmentRepository [unspecified-high]

Wave 4 (Exercise + migration — depend on 2, 3):
├── 18: PostgresExerciseRepository (legacy_id + UUID v5) [deep]
├── 19: Port seed data (muscle_groups, equipment_definitions) [quick]
└── 20: Build migration runner load logic + legacyIDMap rewrite [deep]

Wave 5 (DI wiring + cleanup — depend on 4):
├── 21: Rewrite module.go (swap fx providers) [deep]
├── 22: Remove Couchbase deps from AppProvider/config [unspecified-high]
├── 23: Add JSONB query helpers [quick]
├── 24: Fix CoachingRequest cbjson tags → json [quick]
└── 25: Write unit tests for all repos [unspecified-high]

Wave FINAL (4 parallel reviews → user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality + build + lint (unspecified-high)
├── F3: Integration/parity QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 0 | - | 1-6 |
| 1-6 | 0 | 7-17 |
| 7-12 | 1-6 | 18-25 |
| 13-17 | 1-6 | 18-25 |
| 18-20 | 7-17 | 21-25 |
| 21-25 | 18-20 | F1-F4 |
| F1-F4 | 21-25 | - |

### Agent Dispatch Summary

| Wave | Tasks | Agent Assignments |
|------|-------|-------------------|
| 0 | 1 | 0 → `quick` |
| 1 | 6 | 1-6 → `quick` |
| 2 | 6 | 7-12 → `unspecified-high` |
| 3 | 5 | 13-16 → `deep`, 17 → `unspecified-high` |
| 4 | 3 | 18 → `deep`, 19 → `quick`, 20 → `deep` |
| 5 | 5 | 21 → `deep`, 22 → `unspecified-high`, 23-24 → `quick`, 25 → `unspecified-high` |
| FINAL | 4 | F1 → `oracle`, F2-3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

### Task 0: Pre-flight environment verification

**What to do**:
- Verify Docker is installed and running: `docker info`
- Verify Go version ≥ 1.24: `go version`
- Verify baseline build passes: `cd backend && go build ./...`
- Verify existing tests pass: `cd backend && go test ./...`
- Check git status is clean: `git status`

**Must NOT do**:
- Do NOT modify any files
- Do NOT install new dependencies

**Recommended Agent Profile**: `quick`
- Reason: Simple verification commands

**Parallelization**:
- **Can Run In Parallel**: NO — Sequential, runs first
- **Blocks**: All other tasks (1-25)
- **Blocked By**: None

**References**:
- `backend/go.mod` — Current dependencies
- `backend/AGENTS.md` — Build commands

**Acceptance Criteria**:
- [ ] `docker info` succeeds
- [ ] `go version` shows ≥ 1.24
- [ ] `go build ./...` passes
- [ ] `go test ./...` passes (or no tests exist yet)
- [ ] Git working tree is clean

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
docker info && echo "Docker OK" || echo "Docker FAIL"
go version | grep -E "1\.2[4-9]|1\.3"
go build ./... && echo "Build OK" || echo "Build FAIL"
go test ./... || echo "No tests or FAIL"
git status --porcelain | wc -l  # should be 0
```

**Commit**: NO (no changes)

---

### Task 1: Add pgx, sqlx, testcontainers to go.mod

**What to do**:
- Run `cd backend && go get github.com/jackc/pgx/v5 github.com/jackc/pgx/v5/pgxpool github.com/jmoiron/sqlx github.com/testcontainers/testcontainers-go`
- Run `go mod tidy`
- Verify `go build ./...` still passes
- Verify new dependencies appear in `go.mod`

**Must NOT do**:
- Do NOT remove Couchbase dependencies (keep for rollback)
- Do NOT add any import statements to existing files
- Do NOT create any new Go files

**Recommended Agent Profile**: `quick`
- Reason: Simple dependency management
- Skills: `golang-dependency-management`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 2-6
- **Blocks**: Tasks 7-25 (all repos need pgx)
- **Blocked By**: Task 0

**References**:
- `backend/go.mod` — Target file

**Acceptance Criteria**:
- [ ] `grep pgx go.mod` shows pgx/v5
- [ ] `grep sqlx go.mod` shows sqlx
- [ ] `grep testcontainers go.mod` shows testcontainers-go
- [ ] `go build ./...` passes

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go get github.com/jackc/pgx/v5 github.com/jackc/pgx/v5/pgxpool github.com/jmoiron/sqlx github.com/testcontainers/testcontainers-go
go mod tidy
grep -E "pgx/v5|sqlx|testcontainers" go.mod
go build ./...
```

**Commit**: `feat(deps): add PostgreSQL migration dependencies`

---

### Task 2: Create docker-compose.yml for PostgreSQL 16

**What to do**:
- Create `docker-compose.yml` at repository root (`D:/Dev/gymtrack/docker-compose.yml`)
- Use `postgres:16-alpine` image
- Expose port 5432:5432
- Set environment: `POSTGRES_DB=gymtrack`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=123456789`
- Add healthcheck: `pg_isready -U postgres`
- Add volume: `pgdata:/var/lib/postgresql/data`
- Add command: `postgres -c shared_preload_libraries=pg_stat_statements`

**Must NOT do**:
- Do NOT modify any existing files
- Do NOT use a custom Dockerfile
- Do NOT expose additional ports

**Recommended Agent Profile**: `quick`
- Reason: Single YAML file creation

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 1, 3-6
- **Blocks**: Task 3 (schema needs running PG)
- **Blocked By**: Task 0

**References**:
- Blueprint §10: Connection string template

**Acceptance Criteria**:
- [ ] `docker-compose.yml` exists at repo root
- [ ] `docker compose up -d` starts PostgreSQL
- [ ] `docker compose ps` shows healthy status
- [ ] Can connect with: `docker compose exec db psql -U postgres -d gymtrack -c "SELECT 1"`

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack
docker compose up -d
sleep 5
docker compose ps | grep healthy
docker compose exec db psql -U postgres -d gymtrack -c "SELECT version()"
```

**Commit**: `feat(infra): add PostgreSQL 16 docker-compose.yml`

---

### Task 3: Create migrations/ with full schema DDL

**What to do**:
- Create `backend/migrations/` directory
- Create `backend/migrations/001_initial_schema.up.sql` with all DDL from blueprint `./couchbase_to_postgresql_migration_blueprint - 3. Target Schema (PostgreSQL)`:
  - 13 domain tables (users, workouts, meals, exercises, relationships, coaching_requests, trainer_reviews, trainer_availabilities, comments, invitations, body_measurements, workout_plans, workout_plan_assignments)
  - 2 lookup tables (muscle_groups, equipment_definitions)
  - All indexes: GIN on JSONB columns, expression indexes on body_measurements.paths, B-tree on foreign keys
  - All CHECK constraints and foreign keys
- Create `backend/migrations/001_initial_schema.down.sql` with `DROP TABLE IF EXISTS` for all tables in reverse dependency order
- Apply schema to running PostgreSQL: `docker compose exec -T db psql -U postgres -d gymtrack < backend/migrations/001_initial_schema.up.sql`
- Verify all tables created: `\dt` should show 15 tables

**Must NOT do**:
- Do NOT use uuid-ossp extension (gen_random_uuid() is built-in in PG 13+)
- Do NOT add data seeding SQL (that's Task 19)
- Do NOT use migration frameworks (golang-migrate, goose) — just raw SQL files

**Recommended Agent Profile**: `quick`
- Reason: SQL file creation, schema is fully specified in blueprint

**Parallelization**:
- **Can Run In Parallel**: NO — needs Task 2 (running PG)
- **Blocks**: Tasks 7-20 (all repos need schema)
- **Blocked By**: Task 2

**References**:
- Blueprint §3 (lines 60-287): Complete DDL
- `backend/internal/domain/models/` — All model structs for column verification

**Acceptance Criteria**:
- [ ] `backend/migrations/001_initial_schema.up.sql` exists with 15 CREATE TABLE statements
- [ ] `backend/migrations/001_initial_schema.down.sql` exists with 15 DROP TABLE statements
- [ ] Schema applies without errors to running PostgreSQL
- [ ] `\dt` shows exactly 15 tables
- [ ] All indexes exist (check with `\di`)
- [ ] All foreign keys exist (check with `\d+ tablename`)

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack
# Apply schema
cat backend/migrations/001_initial_schema.up.sql | docker compose exec -T db psql -U postgres -d gymtrack
# Verify tables
docker compose exec db psql -U postgres -d gymtrack -c "\dt" | wc -l  # should be ~18 (15 tables + header/footer)
# Verify indexes
docker compose exec db psql -U postgres -d gymtrack -c "\di" | grep -c "idx_"
# Verify GIN indexes
docker compose exec db psql -U postgres -d gymtrack -c "SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%gin%'"
# Test rollback
cat backend/migrations/001_initial_schema.down.sql | docker compose exec -T db psql -U postgres -d gymtrack
docker compose exec db psql -U postgres -d gymtrack -c "\dt"  # should be empty
```

**Commit**: `feat(schema): add initial PostgreSQL migration DDL`

---

### Task 4: Create config.ProvidePostgresPool

**What to do**:
- Create `backend/internal/config/postgres.go` with:
  - `type PostgresConfig struct { DSN string }` — reads from `POSTGRES_DSN` env var
  - `func ProvidePostgresPool(cfg *PostgresConfig) (*pgxpool.Pool, error)` — creates connection pool
  - Pool config: MaxConns=25, MinConns=2, MaxConnLifetime=30min, MaxConnIdleTime=5min
  - Health check: ping on startup, return error if connection fails
- Add `PostgresDSN` to `backend/internal/config/config.go` Config struct
- Default DSN: `postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable`

**Must NOT do**:
- Do NOT import Couchbase packages in postgres.go
- Do NOT modify config.go beyond adding the PostgresDSN field
- Do NOT create a wrapper type around pgxpool.Pool

**Recommended Agent Profile**: `quick`
- Reason: Single file creation, straightforward connection pool setup

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 1-3, 5-6
- **Blocks**: Tasks 7-25 (all repos need pool)
- **Blocked By**: Task 1 (needs pgx dependency)

**References**:
- `backend/internal/config/config.go` — Existing config pattern
- `backend/internal/config/couchbase.go` — Existing ProvideCouchbaseConnection pattern

**Acceptance Criteria**:
- [ ] `backend/internal/config/postgres.go` exists
- [ ] `ProvidePostgresPool` returns `*pgxpool.Pool`
- [ ] `go build ./internal/config/...` passes
- [ ] Can connect to running PostgreSQL: `POSTGRES_DSN=postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable go run -exec "echo connected" ./internal/config/`

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/config/...
go vet ./internal/config/...
# Test connection (requires running PG from Task 2)
POSTGRES_DSN="postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable" go run -exec "echo" ./internal/config/ 2>&1 | head -5
```

**Commit**: `feat(config): add PostgreSQL connection pool provider`

---

### Task 5: Create internal/testutils/postgres.go

**What to do**:
- Create `backend/internal/testutils/postgres.go` with:
  - `func SetupTestPostgresDB(t *testing.T) (*pgxpool.Pool, func())` — spins up testcontainers PostgreSQL, applies migrations, returns pool and cleanup function
  - Uses `github.com/testcontainers/testcontainers-go` with `postgres:16-alpine` image
  - Applies schema from `backend/migrations/001_initial_schema.up.sql` (embedded with `//go:embed`)
  - Cleanup function terminates container and closes pool
  - Seeds lookup tables (muscle_groups, equipment_definitions) for tests that need them

**Must NOT do**:
- Do NOT use a shared/global test database
- Do NOT skip the cleanup function (containers must be terminated)
- Do NOT hardcode ports (use random available ports)

**Recommended Agent Profile**: `quick`
- Reason: Single file creation, testcontainers pattern is well-documented

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 1-4, 6
- **Blocks**: Task 25 (tests need test utils)
- **Blocked By**: Task 1 (needs testcontainers dependency)

**References**:
- testcontainers-go documentation: https://golang.testcontainers.org/modules/postgres/
- `backend/internal/testutils/` — Existing test utils directory

**Acceptance Criteria**:
- [ ] `backend/internal/testutils/postgres.go` exists
- [ ] `SetupTestPostgresDB` returns `(*pgxpool.Pool, func())`
- [ ] `go build ./internal/testutils/...` passes
- [ ] Test container starts and terminates cleanly in a sample test

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/testutils/...
# Verify function signature
grep -n "SetupTestPostgresDB" internal/testutils/postgres.go
# Verify embedded migration
ls -la internal/testutils/migrations/
```

**Commit**: `feat(test): add PostgreSQL testcontainer setup utility`

---

### Task 6: Create cmd/migrate/main.go scaffold

**What to do**:
- Create `backend/cmd/migrate/main.go` with CLI scaffold:
  - Subcommands: `export` (Couchbase → JSONL), `load` (JSONL → PostgreSQL), `verify` (check migration integrity)
  - Uses `flag` package for argument parsing (no external CLI framework)
  - `export`: Connects to Couchbase, reads all collections, writes JSONL files to `backend/migrations/data/`
  - `load`: Reads JSONL files, transforms data, inserts into PostgreSQL via pgxpool
  - `verify`: Compares row counts between Couchbase and PostgreSQL
  - All subcommands log progress to stdout
  - Graceful shutdown on SIGINT/SIGTERM

**Must NOT do**:
- Do NOT implement full export/load logic yet (that's Task 20)
- Do NOT add the exercise legacy_id rewrite logic yet (that's Task 20)
- Do NOT use cobra/viper/other CLI frameworks (keep it simple with flag package)

**Recommended Agent Profile**: `quick`
- Reason: CLI scaffold only, logic comes later

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 1-5
- **Blocks**: Task 20 (migration logic builds on scaffold)
- **Blocked By**: Task 1 (needs dependencies), Task 4 (needs pool provider)

**References**:
- Blueprint §4: Data migration pipeline
- Blueprint §9: Migration checklist

**Acceptance Criteria**:
- [ ] `backend/cmd/migrate/main.go` exists
- [ ] `go build ./cmd/migrate/...` passes
- [ ] `go run ./cmd/migrate/... --help` shows usage
- [ ] `go run ./cmd/migrate/... export` prints "export not implemented" and exits 0
- [ ] `go run ./cmd/migrate/... load` prints "load not implemented" and exits 0
- [ ] `go run ./cmd/migrate/... verify` prints "verify not implemented" and exits 0

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./cmd/migrate/...
./migrate --help
./migrate export
./migrate load
./migrate verify
```

**Commit**: `feat(migrate): add migration CLI scaffold`

---

### Task 7: Implement PostgresUserRepository

**What to do**:
- Create `backend/internal/repository/postgres/user.go`
- Implement `PostgresUserRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.UserRepository` interface:
  ```go
  CreateUser(ctx context.Context, user *models.User) error
  GetUserByEmail(ctx context.Context, email string) (*models.User, error)
  GetUserByUsername(ctx context.Context, username string) (*models.User, error)
  GetUserByID(ctx context.Context, userID string) (*models.User, error)
  GetAllUsers(ctx context.Context) ([]*models.User, error)
  UpdateUser(ctx context.Context, user *models.User) error
  ```
- `users.profile` column is JSONB — marshal `models.UserProfile` to JSON on write, unmarshal on read
- Map Couchbase error patterns to PostgreSQL: `gocb.ErrDocumentNotFound` → `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Use `sql.NullString` for nullable fields if any
- Follow pattern from Appendix A: Repository Code Template

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/user_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT change method signatures

**Recommended Agent Profile**: `unspecified-high`
- Reason: Standard CRUD repository, no JSONB complexity beyond profile field
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 8-12
- **Blocks**: None (repos are independent)
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/user_repository.go` — Interface definition (lines 15-22)
- `backend/internal/repository/couchbase/user_repository.go` — Couchbase implementation (reference only)
- `backend/internal/domain/models/user.go` — User and UserProfile structs
- Blueprint §3.1: users table DDL

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/user.go` exists
- [ ] `PostgresUserRepository` implements all 6 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/user_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresUserRepository` passes
- [ ] Test covers: Create, GetByID, GetUserByEmail, GetUserByUsername, GetAllUsers, UpdateUser
- [ ] Test verifies JSONB profile round-trip (marshal → store → retrieve → unmarshal)

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresUserRepository
```

**Commit**: `feat(repo/postgres): implement PostgresUserRepository`

---

### Task 8: Implement PostgresRelationshipRepository

**What to do**:
- Create `backend/internal/repository/postgres/relationship.go`
- Implement `PostgresRelationshipRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.RelationshipRepository` interface:
  ```go
  Create(ctx context.Context, relationship *models.Relationship) error
  GetByID(ctx context.Context, relationshipID string) (*models.Relationship, error)
  GetByTrainerID(ctx context.Context, trainerID string) ([]*models.Relationship, error)
  GetByAthleteID(ctx context.Context, athleteID string) (*models.Relationship, error)
  GetPendingByAthleteID(ctx context.Context, athleteID string) ([]*models.Relationship, error)
  HasActiveRelationship(ctx context.Context, trainerID, athleteID string) (bool, error)
  Update(ctx context.Context, relationship *models.Relationship) error
  Delete(ctx context.Context, relationshipID string) error
  ```
- `HasActiveRelationship` returns `EXISTS(SELECT 1 FROM relationships WHERE trainer_id=$1 AND athlete_id=$2 AND status='active')`
- `GetPendingByAthleteID` filters by `status = 'pending'`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/relationship_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface

**Recommended Agent Profile**: `unspecified-high`
- Reason: Standard CRUD repository with status filtering
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 7, 9-12
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/relationship_repository.go` — Interface definition
- `backend/internal/repository/couchbase/relationship_repository.go` — Couchbase implementation
- `backend/internal/domain/models/relationship.go` — Relationship struct
- Blueprint §3.5: relationships table DDL

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/relationship.go` exists
- [ ] `PostgresRelationshipRepository` implements all 8 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/relationship_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresRelationshipRepository` passes
- [ ] Test covers: Create, GetByID, GetByTrainerID, GetByAthleteID, GetPendingByAthleteID, HasActiveRelationship, Update, Delete
- [ ] Test verifies `HasActiveRelationship` returns correct boolean
- [ ] Test verifies `GetPendingByAthleteID` filters by status

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresRelationshipRepository
```

**Commit**: `feat(repo/postgres): implement PostgresRelationshipRepository`

---

### Task 9: Implement PostgresCoachingRequestRepository

**What to do**:
- Create `backend/internal/repository/postgres/coaching_request.go`
- Implement `PostgresCoachingRequestRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.CoachingRequestRepository` interface:
  ```go
  Create(ctx context.Context, request *models.CoachingRequest) error
  GetByID(ctx context.Context, requestID string) (*models.CoachingRequest, error)
  GetByAthleteID(ctx context.Context, athleteID string) ([]*models.CoachingRequest, error)
  GetByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error)
  Update(ctx context.Context, request *models.CoachingRequest) error
  Delete(ctx context.Context, requestID string) error
  GetPendingByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error)
  ```
- `GetPendingByTrainerID` filters by `status = 'pending'`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/coaching_request_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface

**Recommended Agent Profile**: `unspecified-high`
- Reason: Standard CRUD repository with status filtering
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 7-8, 10-12
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/coaching_request_repository.go` — Interface definition
- `backend/internal/repository/couchbase/coaching_request_repository.go` — Couchbase implementation
- `backend/internal/domain/models/coaching_request.go` — CoachingRequest struct
- Blueprint §3.6: coaching_requests table DDL

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/coaching_request.go` exists
- [ ] `PostgresCoachingRequestRepository` implements all 7 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/coaching_request_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresCoachingRequestRepository` passes
- [ ] Test covers: Create, GetByID, GetByAthleteID, GetByTrainerID, GetPendingByTrainerID, Update, Delete
- [ ] Test verifies `GetPendingByTrainerID` filters by status

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresCoachingRequestRepository
```

**Commit**: `feat(repo/postgres): implement PostgresCoachingRequestRepository`

---

### Task 10: Implement PostgresTrainerReviewRepository

**What to do**:
- Create `backend/internal/repository/postgres/trainer_review.go`
- Implement `PostgresTrainerReviewRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.TrainerReviewRepository` interface:
  ```go
  Create(ctx context.Context, review *models.TrainerReview) error
  GetByID(ctx context.Context, reviewID string) (*models.TrainerReview, error)
  GetByTrainerID(ctx context.Context, trainerID string) ([]*models.TrainerReview, error)
  GetByAthleteID(ctx context.Context, athleteID string) (*models.TrainerReview, error)
  Update(ctx context.Context, review *models.TrainerReview) error
  Delete(ctx context.Context, reviewID string) error
  GetAverageRating(ctx context.Context, trainerID string) (float64, int, error)
  GetRatingsForTrainers(ctx context.Context, trainerIDs []string) (map[string]struct{Avg float64; Count int}, error)
  ```
- `GetAverageRating` uses `SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM trainer_reviews WHERE trainer_id=$1`
- `GetRatingsForTrainers` uses `SELECT trainer_id, AVG(rating), COUNT(*) FROM trainer_reviews WHERE trainer_id = ANY($1) GROUP BY trainer_id`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/trainer_review_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface

**Recommended Agent Profile**: `unspecified-high`
- Reason: Repository with aggregate queries (AVG, COUNT, GROUP BY)
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 7-9, 11-12
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/trainer_review_repository.go` — Interface definition
- `backend/internal/repository/couchbase/trainer_review_repository.go` — Couchbase implementation
- `backend/internal/domain/models/trainer_review.go` — TrainerReview struct
- Blueprint §3.7: trainer_reviews table DDL

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/trainer_review.go` exists
- [ ] `PostgresTrainerReviewRepository` implements all 8 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/trainer_review_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresTrainerReviewRepository` passes
- [ ] Test covers: Create, GetByID, GetByTrainerID, GetByAthleteID, Update, Delete, GetAverageRating, GetRatingsForTrainers
- [ ] Test verifies `GetAverageRating` returns correct average and count
- [ ] Test verifies `GetRatingsForTrainers` returns correct map for multiple trainers

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresTrainerReviewRepository
```

**Commit**: `feat(repo/postgres): implement PostgresTrainerReviewRepository`

---

### Task 11: Implement PostgresTrainerProfileRepository

**What to do**:
- Create `backend/internal/repository/postgres/trainer_profile.go`
- Implement `PostgresTrainerProfileRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.TrainerProfileRepository` interface:
  ```go
  GetByUserID(ctx context.Context, userID string) (*models.TrainerProfile, error)
  Create(ctx context.Context, profile *models.TrainerProfile) error
  Update(ctx context.Context, profile *models.TrainerProfile) error
  Delete(ctx context.Context, userID string) error
  GetAllTrainers(ctx context.Context) ([]*models.TrainerProfile, error)
  SearchTrainers(ctx context.Context, query string) ([]*models.TrainerProfile, error)
  ```
- `trainer_profiles` table has `user_id` as primary key (1:1 with users table)
- `SearchTrainers` uses `ILIKE` on `bio`, `specializations`, `certifications` fields
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/trainer_profile_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT confuse with TrainerReviewRepository (Task 10)

**Recommended Agent Profile**: `unspecified-high`
- Reason: Repository with text search (ILIKE)
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 7-10, 12
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/trainer_profile_repository.go` — Interface definition
- `backend/internal/repository/couchbase/trainer_profile_repository.go` — Couchbase implementation
- `backend/internal/domain/models/trainer_profile.go` — TrainerProfile struct
- Blueprint §3.8: trainer_profiles table DDL (if exists, otherwise part of users table)

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/trainer_profile.go` exists
- [ ] `PostgresTrainerProfileRepository` implements all 6 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/trainer_profile_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresTrainerProfileRepository` passes
- [ ] Test covers: Create, GetByUserID, Update, Delete, GetAllTrainers, SearchTrainers
- [ ] Test verifies `SearchTrainers` finds trainers by bio/specializations/certifications

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresTrainerProfileRepository
```

**Commit**: `feat(repo/postgres): implement PostgresTrainerProfileRepository`

---

### Task 12: Implement PostgresCommentRepository

**What to do**:
- Create `backend/internal/repository/postgres/comment.go`
- Implement `PostgresCommentRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.CommentRepository` interface:
  ```go
  Create(ctx context.Context, comment *models.Comment) error
  GetByID(ctx context.Context, commentID string) (*models.Comment, error)
  GetByWorkoutID(ctx context.Context, workoutID string) ([]*models.Comment, error)
  GetByMealID(ctx context.Context, mealID string) ([]*models.Comment, error)
  GetByAuthorID(ctx context.Context, authorID string) ([]*models.Comment, error)
  Update(ctx context.Context, comment *models.Comment) error
  Delete(ctx context.Context, commentID string) error
  ```
- `comments` table has `target_type` (workout/meal) and `target_id` columns
- `GetByWorkoutID` filters by `target_type = 'workout' AND target_id = $1`
- `GetByMealID` filters by `target_type = 'meal' AND target_id = $1`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/comment_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface

**Recommended Agent Profile**: `unspecified-high`
- Reason: Repository with polymorphic target_type filtering
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 7-11
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/comment_repository.go` — Interface definition
- `backend/internal/repository/couchbase/comment_repository.go` — Couchbase implementation
- `backend/internal/domain/models/comment.go` — Comment struct
- Blueprint §3.9: comments table DDL

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/comment.go` exists
- [ ] `PostgresCommentRepository` implements all 7 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/comment_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresCommentRepository` passes
- [ ] Test covers: Create, GetByID, GetByWorkoutID, GetByMealID, GetByAuthorID, Update, Delete
- [ ] Test verifies `GetByWorkoutID` only returns workout comments
- [ ] Test verifies `GetByMealID` only returns meal comments

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresCommentRepository
```

**Commit**: `feat(repo/postgres): implement PostgresCommentRepository`

---

### Task 13: Implement PostgresWorkoutRepository

**What to do**:
- Create `backend/internal/repository/postgres/workout.go`
- Implement `PostgresWorkoutRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.WorkoutRepository` interface:
  ```go
  Create(ctx context.Context, workout *models.Workout) error
  GetByID(ctx context.Context, workoutID string) (*models.Workout, error)
  GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.Workout, error)
  GetByAthleteDateRange(ctx context.Context, athleteID string, startDate, endDate time.Time) ([]*models.Workout, error)
  Update(ctx context.Context, workout *models.Workout) error
  Delete(ctx context.Context, workoutID string) error
  ```
- **CRITICAL**: `exercises` column is JSONB — must marshal `[]models.WorkoutExercise` to JSON on write, unmarshal on read
- Use `json.Marshal()` to convert exercises slice to `[]byte` for INSERT/UPDATE
- Use `json.Unmarshal()` to convert `[]byte` back to exercises slice on SELECT
- Handle NULL exercises gracefully (empty slice if NULL)
- `GetByAthleteID` uses `ORDER BY completed_at DESC LIMIT $2 OFFSET $3`
- `GetByAthleteDateRange` uses `WHERE completed_at BETWEEN $2 AND $3`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/workout_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT store exercises as separate table rows (they must be JSONB array)

**Recommended Agent Profile**: `deep`
- Reason: JSONB array marshaling/unmarshaling, multiple query patterns
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 14-17
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/workout_repository.go` — Interface definition
- `backend/internal/repository/couchbase/workout_repository.go` — Couchbase implementation
- `backend/internal/domain/models/workout.go` — Workout and WorkoutExercise structs
- Blueprint §3.2: workouts table DDL (exercises JSONB column)

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/workout.go` exists
- [ ] `PostgresWorkoutRepository` implements all 6 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/workout_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresWorkoutRepository` passes
- [ ] Test covers: Create, GetByID, GetByAthleteID, GetByAthleteDateRange, Update, Delete
- [ ] Test verifies exercises JSONB round-trip (marshal → store → retrieve → unmarshal)
- [ ] Test verifies GetByAthleteDateRange filters correctly
- [ ] Test verifies pagination with limit/offset

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresWorkoutRepository
```

**Commit**: `feat(repo/postgres): implement PostgresWorkoutRepository`

---

### Task 14: Implement PostgresMealRepository

**What to do**:
- Create `backend/internal/repository/postgres/meal.go`
- Implement `PostgresMealRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.MealRepository` interface:
  ```go
  Create(ctx context.Context, meal *models.Meal) error
  GetByID(ctx context.Context, mealID string) (*models.Meal, error)
  GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.Meal, error)
  GetByAthleteDateRange(ctx context.Context, athleteID string, startDate, endDate time.Time) ([]*models.Meal, error)
  Update(ctx context.Context, meal *models.Meal) error
  Delete(ctx context.Context, mealID string) error
  ```
- **CRITICAL**: `items` column is JSONB — must marshal `[]models.MealItem` to JSON on write, unmarshal on read
- Use `json.Marshal()` to convert items slice to `[]byte` for INSERT/UPDATE
- Use `json.Unmarshal()` to convert `[]byte` back to items slice on SELECT
- Handle NULL items gracefully (empty slice if NULL)
- `GetByAthleteID` uses `ORDER BY consumed_at DESC LIMIT $2 OFFSET $3`
- `GetByAthleteDateRange` uses `WHERE consumed_at BETWEEN $2 AND $3`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/meal_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT store items as separate table rows (they must be JSONB array)

**Recommended Agent Profile**: `deep`
- Reason: JSONB array marshaling/unmarshaling, multiple query patterns
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 13, 15-17
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/meal_repository.go` — Interface definition
- `backend/internal/repository/couchbase/meal_repository.go` — Couchbase implementation
- `backend/internal/domain/models/meal.go` — Meal and MealItem structs
- Blueprint §3.3: meals table DDL (items JSONB column)

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/meal.go` exists
- [ ] `PostgresMealRepository` implements all 6 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/meal_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresMealRepository` passes
- [ ] Test covers: Create, GetByID, GetByAthleteID, GetByAthleteDateRange, Update, Delete
- [ ] Test verifies items JSONB round-trip (marshal → store → retrieve → unmarshal)
- [ ] Test verifies GetByAthleteDateRange filters correctly
- [ ] Test verifies pagination with limit/offset

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresMealRepository
```

**Commit**: `feat(repo/postgres): implement PostgresMealRepository`

---

### Task 15: Implement PostgresBodyMeasurementRepository

**What to do**:
- Create `backend/internal/repository/postgres/body_measurement.go`
- Implement `PostgresBodyMeasurementRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.BodyMeasurementRepository` interface:
  ```go
  Create(ctx context.Context, measurement *models.BodyMeasurement) error
  GetByID(ctx context.Context, measurementID string) (*models.BodyMeasurement, error)
  GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.BodyMeasurement, error)
  GetLatestByAthleteID(ctx context.Context, athleteID string) (*models.BodyMeasurement, error)
  Update(ctx context.Context, measurement *models.BodyMeasurement) error
  Delete(ctx context.Context, measurementID string) error
  ```
- **CRITICAL**: `paths` column is JSONB — must marshal `[]models.BodyPath` to JSON on write, unmarshal on read
- Use `json.Marshal()` to convert paths slice to `[]byte` for INSERT/UPDATE
- Use `json.Unmarshal()` to convert `[]byte` back to paths slice on SELECT
- Handle NULL paths gracefully (empty slice if NULL)
- `GetByAthleteID` uses `ORDER BY recorded_at DESC LIMIT $2 OFFSET $3`
- `GetLatestByAthleteID` uses `ORDER BY recorded_at DESC LIMIT 1`
- **PERFORMANCE**: Add expression indexes on common JSONB paths (e.g., `((paths->0->>'body_part'))`) for query optimization
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/body_measurement_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT store paths as separate table rows (they must be JSONB array)

**Recommended Agent Profile**: `deep`
- Reason: JSONB array marshaling/unmarshaling, expression indexes, performance optimization
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 13-14, 16-17
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/body_measurement_repository.go` — Interface definition
- `backend/internal/repository/couchbase/body_measurement_repository.go` — Couchbase implementation
- `backend/internal/domain/models/body_measurement.go` — BodyMeasurement and BodyPath structs
- Blueprint §3.4: body_measurements table DDL (paths JSONB column, expression indexes)

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/body_measurement.go` exists
- [ ] `PostgresBodyMeasurementRepository` implements all 6 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/body_measurement_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresBodyMeasurementRepository` passes
- [ ] Test covers: Create, GetByID, GetByAthleteID, GetLatestByAthleteID, Update, Delete
- [ ] Test verifies paths JSONB round-trip (marshal → store → retrieve → unmarshal)
- [ ] Test verifies GetLatestByAthleteID returns most recent measurement
- [ ] Test verifies pagination with limit/offset

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresBodyMeasurementRepository
```

**Commit**: `feat(repo/postgres): implement PostgresBodyMeasurementRepository`

---

### Task 16: Implement PostgresWorkoutPlanRepository

**What to do**:
- Create `backend/internal/repository/postgres/workout_plan.go`
- Implement `PostgresWorkoutPlanRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.WorkoutPlanRepository` interface:
  ```go
  Create(ctx context.Context, plan *models.WorkoutPlan) error
  GetByID(ctx context.Context, planID string) (*models.WorkoutPlan, error)
  GetByTrainerID(ctx context.Context, trainerID string) ([]*models.WorkoutPlan, error)
  Update(ctx context.Context, plan *models.WorkoutPlan) error
  Delete(ctx context.Context, planID string) error
  ```
- **CRITICAL**: `exercises` column is JSONB — must marshal `[]models.PlannedExercise` to JSON on write, unmarshal on read
- Use `json.Marshal()` to convert exercises slice to `[]byte` for INSERT/UPDATE
- Use `json.Unmarshal()` to convert `[]byte` back to exercises slice on SELECT
- Handle NULL exercises gracefully (empty slice if NULL)
- `GetByTrainerID` uses `ORDER BY created_at DESC`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/workout_plan_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT store exercises as separate table rows (they must be JSONB array)

**Recommended Agent Profile**: `deep`
- Reason: JSONB array marshaling/unmarshaling
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 13-15, 17
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/workout_plan_repository.go` — Interface definition
- `backend/internal/repository/couchbase/workout_plan_repository.go` — Couchbase implementation
- `backend/internal/domain/models/workout_plan.go` — WorkoutPlan and PlannedExercise structs
- Blueprint §3.10: workout_plans table DDL (exercises JSONB column)

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/workout_plan.go` exists
- [ ] `PostgresWorkoutPlanRepository` implements all 5 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/workout_plan_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresWorkoutPlanRepository` passes
- [ ] Test covers: Create, GetByID, GetByTrainerID, Update, Delete
- [ ] Test verifies exercises JSONB round-trip (marshal → store → retrieve → unmarshal)

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresWorkoutPlanRepository
```

**Commit**: `feat(repo/postgres): implement PostgresWorkoutPlanRepository`

---

### Task 17: Implement PostgresWorkoutPlanAssignmentRepository

**What to do**:
- Create `backend/internal/repository/postgres/workout_plan_assignment.go`
- Implement `PostgresWorkoutPlanAssignmentRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.WorkoutPlanAssignmentRepository` interface:
  ```go
  Create(ctx context.Context, assignment *models.WorkoutPlanAssignment) error
  GetByID(ctx context.Context, assignmentID string) (*models.WorkoutPlanAssignment, error)
  GetByPlanID(ctx context.Context, planID string) ([]*models.WorkoutPlanAssignment, error)
  GetByAthleteID(ctx context.Context, athleteID string) ([]*models.WorkoutPlanAssignment, error)
  GetByAthleteAndPlan(ctx context.Context, athleteID, planID string) (*models.WorkoutPlanAssignment, error)
  Update(ctx context.Context, assignment *models.WorkoutPlanAssignment) error
  Delete(ctx context.Context, assignmentID string) error
  ```
- No JSONB columns in this table (simple relational table)
- `GetByAthleteAndPlan` returns single assignment or `domainerrors.ErrNotFound`
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/workout_plan_assignment_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface

**Recommended Agent Profile**: `unspecified-high`
- Reason: Standard CRUD repository, no JSONB complexity
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 13-16
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/domain/repositories/workout_plan_assignment_repository.go` — Interface definition
- `backend/internal/repository/couchbase/workout_plan_assignment_repository.go` — Couchbase implementation
- `backend/internal/domain/models/workout_plan_assignment.go` — WorkoutPlanAssignment struct
- Blueprint §3.11: workout_plan_assignments table DDL

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/workout_plan_assignment.go` exists
- [ ] `PostgresWorkoutPlanAssignmentRepository` implements all 7 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/workout_plan_assignment_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresWorkoutPlanAssignmentRepository` passes
- [ ] Test covers: Create, GetByID, GetByPlanID, GetByAthleteID, GetByAthleteAndPlan, Update, Delete
- [ ] Test verifies `GetByAthleteAndPlan` returns correct single assignment

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresWorkoutPlanAssignmentRepository
```

**Commit**: `feat(repo/postgres): implement PostgresWorkoutPlanAssignmentRepository`

---

### Task 18: Implement PostgresExerciseRepository

**What to do**:
- Create `backend/internal/repository/postgres/exercise.go`
- Implement `PostgresExerciseRepository` struct with `*pgxpool.Pool` field
- Implement all methods from `repositories.ExerciseRepository` interface:
  ```go
  Create(ctx context.Context, exercise *models.Exercise) error
  GetByID(ctx context.Context, exerciseID string) (*models.Exercise, error)
  GetAll(ctx context.Context) ([]*models.Exercise, error)
  GetByMuscleGroupID(ctx context.Context, muscleGroupID int) ([]*models.Exercise, error)
  GetByEquipmentID(ctx context.Context, equipmentID int) ([]*models.Exercise, error)
  Search(ctx context.Context, query string) ([]*models.Exercise, error)
  Update(ctx context.Context, exercise *models.Exercise) error
  Delete(ctx context.Context, exerciseID string) error
  ```
- **CRITICAL**: `GetByID` must handle both UUID and legacy_id formats:
  - If `exerciseID` matches UUID pattern (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`), query by `id` column
  - Otherwise, query by `legacy_id` column
- Use regex: `var uuidRegex = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)`
- `Search` uses `ILIKE` on `name` column: `WHERE name ILIKE $1` (with `%query%` wrapping)
- `GetByMuscleGroupID` and `GetByEquipmentID` use integer foreign keys
- Map errors: `pgx.ErrNoRows` → `domainerrors.ErrNotFound`
- Follow pattern from Appendix A

**Must NOT do**:
- Do NOT modify `internal/domain/repositories/exercise_repository.go`
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT add new methods not in the interface
- Do NOT convert legacy_id to UUID in the repository (that's migration logic, not repository logic)

**Recommended Agent Profile**: `deep`
- Reason: Dual ID format handling (UUID vs legacy_id), regex validation
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: NO — must run after Tasks 13-17 (Wave 4)
- **Blocks**: Task 20 (migration runner needs exercise repo)
- **Blocked By**: Tasks 7-17

**References**:
- `backend/internal/domain/repositories/exercise_repository.go` — Interface definition
- `backend/internal/repository/couchbase/exercise_repository.go` — Couchbase implementation
- `backend/internal/domain/models/exercise.go` — Exercise struct
- Blueprint §3.1: exercises table DDL (id UUID, legacy_id TEXT)
- Blueprint §4: ID mapping strategy (legacy_id for non-UUID exercise IDs)

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/exercise.go` exists
- [ ] `PostgresExerciseRepository` implements all 8 methods
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/exercise_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestPostgresExerciseRepository` passes
- [ ] Test covers: Create, GetByID (with UUID), GetByID (with legacy_id), GetAll, GetByMuscleGroupID, GetByEquipmentID, Search, Update, Delete
- [ ] Test verifies UUID regex correctly identifies UUID vs legacy_id format
- [ ] Test verifies Search uses ILIKE for case-insensitive matching

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestPostgresExerciseRepository
# Verify UUID regex works
go test -v ./internal/repository/postgres/ -run TestExerciseIDFormat
```

**Commit**: `feat(repo/postgres): implement PostgresExerciseRepository`

---

### Task 19: Port seed data (muscle_groups, equipment_definitions)

**What to do**:
- Create `backend/internal/repository/postgres/seed.go`
- Implement `SeedLookupTables(ctx context.Context, pool *pgxpool.Pool) error`
- Seed `muscle_groups` table with 7 rows:
  ```sql
  INSERT INTO muscle_groups (id, name) VALUES
  (1, 'Chest'), (2, 'Back'), (3, 'Shoulders'), (4, 'Arms'),
  (5, 'Legs'), (6, 'Core'), (7, 'Full Body')
  ON CONFLICT (id) DO NOTHING;
  ```
- Seed `equipment_definitions` table with 8 rows:
  ```sql
  INSERT INTO equipment_definitions (id, name) VALUES
  (1, 'Barbell'), (2, 'Dumbbell'), (3, 'Machine'), (4, 'Cable'),
  (5, 'Bodyweight'), (6, 'Kettlebell'), (7, 'Resistance Band'), (8, 'Other')
  ON CONFLICT (id) DO NOTHING;
  ```
- Use `ON CONFLICT DO NOTHING` to make seeding idempotent (safe to run multiple times)
- Return error if any INSERT fails (excluding conflicts)

**Must NOT do**:
- Do NOT modify `internal/config/seed_data.go` (Couchbase seed data)
- Do NOT import `github.com/couchbase/gocb/v2`
- Do NOT use AUTO_INCREMENT/SERIAL for IDs (must use explicit integer IDs to match exercise FKs)
- Do NOT seed exercises table (that's Task 20 migration logic)

**Recommended Agent Profile**: `quick`
- Reason: Simple seed data insertion, fixed ID values
- Skills: None (basic SQL)

**Parallelization**:
- **Can Run In Parallel**: YES — with Task 18 (Wave 4)
- **Blocks**: Task 20 (migration runner needs lookup tables seeded before exercises)
- **Blocked By**: Tasks 1-6

**References**:
- `backend/internal/config/seed_data.go` — Existing Couchbase seed data (reference only)
- Blueprint §3.1: muscle_groups and equipment_definitions table DDL
- Blueprint §4: Seed data migration strategy

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/seed.go` exists
- [ ] `SeedLookupTables` function exists and accepts `(ctx, pool)` parameters
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/seed_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestSeedLookupTables` passes
- [ ] Test verifies muscle_groups has 7 rows with correct IDs and names
- [ ] Test verifies equipment_definitions has 8 rows with correct IDs and names
- [ ] Test verifies seeding is idempotent (can run twice without error)

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestSeedLookupTables
# Verify seed data in database
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack -c "SELECT COUNT(*) FROM muscle_groups;"  # should be 7
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack -c "SELECT COUNT(*) FROM equipment_definitions;"  # should be 8
```

**Commit**: `feat(repo/postgres): add seed data for muscle_groups and equipment_definitions`

---

### Task 20: Build migration runner load logic + legacyIDMap rewrite

**What to do**:
- Create `backend/cmd/migrate/runner.go`
- Implement `RunMigration(ctx context.Context, couchbaseClient *gocb.Cluster, pgPool *pgxpool.Pool) error`
- **Phase 1: Build legacyIDMap**
  - Query all exercises from Couchbase
  - For each exercise with non-UUID ID (e.g., "exercise_Bench Press"):
    - Generate deterministic UUID v5: `uuid.NewSHA1(uuid.NameSpaceURL, []byte("gymtrack-exercise-"+legacyID))`
    - Store mapping: `legacyIDMap[legacyID] = newUUID`
- **Phase 2: Migrate in FK-safe order**
  - Migrate users (no dependencies)
  - Migrate relationships (depends on users)
  - Migrate coaching_requests (depends on users)
  - Migrate trainer_reviews (depends on users)
  - Migrate trainer_profiles (depends on users)
  - Migrate comments (depends on users)
  - Migrate muscle_groups (no dependencies)
  - Migrate equipment_definitions (no dependencies)
  - Migrate exercises (depends on muscle_groups, equipment_definitions, users; use legacyIDMap)
  - Migrate workouts (depends on users; rewrite exercise IDs in JSONB using legacyIDMap)
  - Migrate meals (depends on users)
  - Migrate body_measurements (depends on users)
  - Migrate workout_plans (depends on users; rewrite exercise IDs in JSONB using legacyIDMap)
  - Migrate workout_plan_assignments (depends on workout_plans, users)
- **Phase 3: Rewrite JSONB exercise IDs**
  - For workouts: unmarshal exercises JSONB, replace `exerciseId` values using legacyIDMap, re-marshal
  - For workout_plans: unmarshal exercises JSONB, replace `exerciseId` values using legacyIDMap, re-marshal
- **Phase 4: Verify migration**
  - Compare row counts: Couchbase vs PostgreSQL for each collection
  - Log any discrepancies
  - Return error if critical tables have mismatched counts
- Use transactions for each table migration (rollback on error)
- Log progress: "Migrating users: 150/150 complete"

**Must NOT do**:
- Do NOT modify existing repository files
- Do NOT use repository implementations (migration uses direct pgx queries for performance)
- Do NOT skip the legacyIDMap rewrite (workouts and workout_plans will have broken exercise references)
- Do NOT migrate in arbitrary order (FK violations will occur)
- Do NOT use batch inserts without transactions (partial failures will corrupt data)

**Recommended Agent Profile**: `deep`
- Reason: Complex multi-phase migration, JSONB rewriting, UUID v5 generation, FK ordering
- Skills: `golang-patterns`, `golang-error-handling`, `golang-concurrency`

**Parallelization**:
- **Can Run In Parallel**: NO — must run after Tasks 18-19 (Wave 4)
- **Blocks**: Tasks 21-25 (DI wiring needs migrated data)
- **Blocked By**: Tasks 7-19

**References**:
- `backend/cmd/migrate/main.go` — Migration CLI scaffold (Task 6)
- Blueprint §4: Data migration pipeline
- Blueprint §4.1: Load order (FK-safe sequence)
- Blueprint §4.2: legacyIDMap rewrite algorithm
- Blueprint §4.3: JSONB exercise ID rewrite

**Acceptance Criteria**:
- [ ] `backend/cmd/migrate/runner.go` exists
- [ ] `RunMigration` function exists and accepts `(ctx, couchbaseClient, pgPool)` parameters
- [ ] `go build ./cmd/migrate/...` passes
- [ ] Unit test file exists: `backend/cmd/migrate/runner_test.go`
- [ ] `go test ./cmd/migrate/ -run TestRunMigration` passes
- [ ] Test verifies legacyIDMap correctly maps legacy IDs to UUID v5
- [ ] Test verifies workouts JSONB has rewritten exercise IDs
- [ ] Test verifies workout_plans JSONB has rewritten exercise IDs
- [ ] Test verifies FK-safe order (no constraint violations)
- [ ] Test verifies row count comparison (Couchbase vs PostgreSQL)
- [ ] Manual test: `go run ./cmd/migrate load` completes successfully with test data

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./cmd/migrate/...
go test -v ./cmd/migrate/ -run TestRunMigration
# Manual migration test (requires Couchbase with test data)
go run ./cmd/migrate load --couchbase-url=http://localhost:8091 --couchbase-user=Administrator --couchbase-pass=password --pg-dsn="postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable"
# Verify row counts
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack -c "SELECT 'users' as table_name, COUNT(*) FROM users UNION ALL SELECT 'workouts', COUNT(*) FROM workouts UNION ALL SELECT 'exercises', COUNT(*) FROM exercises;"
```

**Commit**: `feat(migrate): implement data migration runner with legacyIDMap rewrite`

---

### Task 21: Rewrite module.go (swap fx providers)

**What to do**:
- Edit `backend/internal/app/module.go`
- Replace all Couchbase repository providers with PostgreSQL providers
- Change from:
  ```go
  fx.Provide(repositories.NewUserRepository) // Couchbase
  ```
- Change to:
  ```go
  fx.Provide(func(pool *pgxpool.Pool) repositories.UserRepository {
      return postgres.NewPostgresUserRepository(pool)
  })
  ```
- Swap all 14 repositories:
  1. UserRepository → PostgresUserRepository
  2. RelationshipRepository → PostgresRelationshipRepository
  3. CoachingRequestRepository → PostgresCoachingRequestRepository
  4. TrainerReviewRepository → PostgresTrainerReviewRepository
  5. TrainerProfileRepository → PostgresTrainerProfileRepository
  6. CommentRepository → PostgresCommentRepository
  7. WorkoutRepository → PostgresWorkoutRepository
  8. MealRepository → PostgresMealRepository
  9. BodyMeasurementRepository → PostgresBodyMeasurementRepository
  10. WorkoutPlanRepository → PostgresWorkoutPlanRepository
  11. WorkoutPlanAssignmentRepository → PostgresWorkoutPlanAssignmentRepository
  12. ExerciseRepository → PostgresExerciseRepository
  13. MuscleGroupRepository → PostgresMuscleGroupRepository
  14. EquipmentRepository → PostgresEquipmentRepository
- Replace Couchbase connection provider with PostgreSQL pool provider:
  ```go
  fx.Provide(config.ProvideCouchbaseConnection) // OLD
  fx.Provide(config.ProvidePostgresPool)         // NEW
  ```
- Update imports: add `postgres` package, remove unused Couchbase imports
- Keep Couchbase code commented out (for rollback) or in separate file

**Must NOT do**:
- Do NOT delete Couchbase provider code entirely (keep for rollback in commented form)
- Do NOT change interface types (repositories.UserRepository stays the same)
- Do NOT add new dependencies beyond pgxpool
- Do NOT modify handler or service code (DI is transparent to them)

**Recommended Agent Profile**: `deep`
- Reason: Critical DI wiring change, must maintain interface contracts, rollback safety
- Skills: `golang-uber-fx`, `golang-dependency-injection`, `golang-patterns`

**Parallelization**:
- **Can Run In Parallel**: NO — must run after Tasks 7-18 (Wave 5)
- **Blocks**: Task 22 (cleanup depends on successful swap)
- **Blocked By**: Tasks 7-18, 13-17

**References**:
- `backend/internal/app/module.go` — Current DI module
- Blueprint §5: DI wiring swap strategy
- Blueprint §5.1: fx.Provide pattern for PostgreSQL repositories

**Acceptance Criteria**:
- [ ] `backend/internal/app/module.go` updated with PostgreSQL providers
- [ ] All 14 repositories swapped from Couchbase to PostgreSQL
- [ ] `go build ./internal/app/...` passes
- [ ] `go build ./cmd/server/...` passes
- [ ] Application starts without Couchbase connection errors
- [ ] `go run ./cmd/server/main.go` starts successfully (with PostgreSQL running)
- [ ] Rollback test: uncommenting Couchbase providers restores original behavior

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/app/...
go build ./cmd/server/...
# Start server (requires PostgreSQL running with migrated data)
go run ./cmd/server/main.go
# Test API endpoints
curl -s http://localhost:8080/api/v1/health | jq .
curl -s http://localhost:8080/api/v1/users/test@example.com | jq .user_id
```

**Commit**: `feat(di): swap Couchbase to PostgreSQL in module.go`

---

### Task 22: Remove Couchbase deps from AppProvider/config

**What to do**:
- Edit `backend/internal/app/app.go`
- Remove `Couchbase *gocb.Cluster` field from `AppProvider` struct
- Remove Couchbase initialization from `NewAppProvider` function
- Remove `config.InitializeCollections()` call (no longer needed)
- Edit `backend/internal/config/config.go`
- Remove `GlobalCluster` and `GlobalBucket` variables
- Remove `InitializeCollections()` function
- Remove Couchbase-related environment variables from `Load()`:
  - `COUCHBASE_CONNECTION_STRING`
  - `COUCHBASE_USERNAME`
  - `COUCHBASE_PASSWORD`
  - `COUCHBASE_BUCKET`
- Edit `backend/internal/config/couchbase.go`
- Delete entire file or rename to `couchbase.go.bak` (keep for rollback)
- Keep `backend/internal/repository/couchbase/` directory intact (rollback safety)
- Verify `go build ./...` passes with Couchbase code removed

**Must NOT do**:
- Do NOT delete `backend/internal/repository/couchbase/` directory (keep for rollback)
- Do NOT remove `github.com/couchbase/gocb/v2` from go.mod (keep for rollback period)
- Do NOT modify PostgreSQL config code
- Do NOT change Config struct fields (only remove Couchbase fields)

**Recommended Agent Profile**: `unspecified-high`
- Reason: Surgical removal of Couchbase dependencies, must not break build
- Skills: `golang-patterns`, `golang-error-handling`

**Parallelization**:
- **Can Run In Parallel**: NO — must run after Task 21 (Wave 5)
- **Blocks**: None (cleanup task)
- **Blocked By**: Task 21

**References**:
- `backend/internal/app/app.go` — AppProvider struct
- `backend/internal/config/config.go` — Global Couchbase variables
- `backend/internal/config/couchbase.go` — Couchbase initialization
- Blueprint §5.2: Couchbase cleanup checklist

**Acceptance Criteria**:
- [ ] `backend/internal/app/app.go` has no `Couchbase` field in AppProvider
- [ ] `backend/internal/config/config.go` has no `GlobalCluster` or `GlobalBucket`
- [ ] `backend/internal/config/couchbase.go` deleted or renamed to `.bak`
- [ ] `go build ./internal/app/...` passes
- [ ] `go build ./internal/config/...` passes
- [ ] `go build ./cmd/server/...` passes
- [ ] No references to `gocb.Cluster` in app.go or config.go
- [ ] `grep -r "gocb.Cluster" backend/internal/app/ backend/internal/config/` returns nothing

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/app/...
go build ./internal/config/...
go build ./cmd/server/...
# Verify no Couchbase references in cleaned files
grep -r "gocb.Cluster" internal/app/ internal/config/ && echo "FAIL: Couchbase refs found" || echo "PASS: Clean"
# Verify Couchbase repo dir still exists (rollback safety)
ls -la internal/repository/couchbase/ | head -5
```

**Commit**: `refactor(config): remove Couchbase dependencies from app and config`

---

### Task 23: Add JSONB query helpers

**What to do**:
- Create `backend/internal/repository/postgres/helpers.go`
- Implement helper functions for JSONB queries:
  ```go
  // MarshalToJSONB converts Go struct/slice to JSONB-compatible []byte
  func MarshalToJSONB(v interface{}) ([]byte, error)
  
  // UnmarshalFromJSONB converts JSONB []byte to Go struct/slice
  func UnmarshalFromJSONB(data []byte, v interface{}) error
  
  // IsUUID checks if string matches UUID format
  func IsUUID(s string) bool
  ```
- `MarshalToJSONB` uses `json.Marshal()` and returns `[]byte`
- `UnmarshalFromJSONB` uses `json.Unmarshal()` with pointer receiver
- `IsUUID` uses regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- These helpers are used by repositories for JSONB column handling
- Add unit tests for each helper function

**Must NOT do**:
- Do NOT put helpers in domain layer (keep in postgres repository package)
- Do NOT use these helpers for non-JSONB columns
- Do NOT add database connection logic to helpers (pure functions only)

**Recommended Agent Profile**: `quick`
- Reason: Simple utility functions, no business logic
- Skills: `golang-patterns`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 24-25 (Wave 5)
- **Blocks**: None
- **Blocked By**: Tasks 1-6

**References**:
- Blueprint §6: JSONB query patterns
- `backend/internal/repository/postgres/exercise.go` — Uses IsUUID helper

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/helpers.go` exists
- [ ] `MarshalToJSONB`, `UnmarshalFromJSONB`, `IsUUID` functions implemented
- [ ] `go build ./internal/repository/postgres/...` passes
- [ ] Unit test file exists: `backend/internal/repository/postgres/helpers_test.go`
- [ ] `go test ./internal/repository/postgres/ -run TestHelpers` passes
- [ ] Test verifies MarshalToJSONB round-trip (marshal → unmarshal = original)
- [ ] Test verifies IsUUID correctly identifies UUID vs non-UUID strings

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go build ./internal/repository/postgres/...
go test -v ./internal/repository/postgres/ -run TestHelpers
go test -v ./internal/repository/postgres/ -run TestIsUUID
go test -v ./internal/repository/postgres/ -run TestMarshalToJSONB
```

**Commit**: `feat(repo/postgres): add JSONB query helpers`

---

### Task 24: Fix CoachingRequest cbjson tags → json

**What to do**:
- Edit `backend/internal/domain/models/coaching_request.go`
- Change all `cbjson` struct tags to `json`:
  ```go
  // BEFORE
  type CoachingRequest struct {
      ID        string `cbjson:"id" json:"id"`
      AthleteID string `cbjson:"athlete_id" json:"athlete_id"`
      // ...
  }
  
  // AFTER
  type CoachingRequest struct {
      ID        string `json:"id"`
      AthleteID string `json:"athlete_id"`
      // ...
  }
  ```
- Search for all files with `cbjson` tags: `grep -r "cbjson:" backend/internal/domain/models/`
- Fix all occurrences across all model files
- Verify `go build ./internal/domain/models/...` passes
- Verify `go build ./...` passes (ensure no broken references)

**Must NOT do**:
- Do NOT change `json` tag values (only remove `cbjson` tags)
- Do NOT modify struct field names
- Do NOT change repository or service code
- Do NOT add new fields

**Recommended Agent Profile**: `quick`
- Reason: Simple find-and-replace across model files
- Skills: None (text editing)

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks 223, 22 ( ( (Wave 5)
- **Blocks By**: Tasks 1-6

**References**:
- `backend/internal/domain/models/coaching_request.go` — CoachingRequest struct (primary target)
- Blueprint §7: cb Couchbase-specific struct tags

**Acceptance Criteria**:
- [ ] `grep -r "cbjson:"` backend/internal/domain/models/` returns zero matches
- [ ] All ` files `json:` tags (no `cbjson:`)
- [ ] `go build ./internal/domain/models/...` passes
- [ ] `go build ./...` passes
- [ ] No compilation errors from removed `cbjson` tags

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
# Find all cbjson tags
grep -r "cbjson:" internal/domain/models/
# Should return nothing after fix
# Verify build
go build ./internal/domain/models/...
go build ./...
```

**Commit**: `fix(models): replace cbjson tags with json tags`

---


25: Write unit tests for all repos

**What to do**:
- Create unit test files for all 12 PostgreSQL repositories:
  ```
  backend/internal/repository/postgres/user_test.go
  backend/internal/repository/postgres/relationship_test.go
  backend/internal/repository/postgres/coaching_request_test.go
  backend/internal/repository/postgres/trainer_review_test.go
  backend/internal/repository/postgres/trainer_profile_test.go
  backend/internal/repository/postgres/comment_test.go
  backend/internal/repository/postgres/workout_test.go
  backend/internal/repository/postgres/meal_test.go
  backend/internal/repository/postgres/body_measurement_test.go
  backend/internal/repository/postgres/workout_plan_test.go
  backend/internal/repository/postgres/workout_plan_assignment_test.go
  backend/internal/repository/postgres/exercise_test.go
  ```
- Each test file must:
  - Use `testutils.SetupTestPostgresDB(t)` to create test database
  - Test all repository methods (Create, GetByID, GetAll, Update, Delete, etc.)
  - Test error cases (not found, duplicate, invalid ID format)
  - Test JSONB round-trip (for repos with JSONB columns)
  - Use table-driven tests for clarity
- Run all tests: `go test -v ./internal/repository/postgres/...`
- Verify 100% pass rate with no skipped tests
- Generate coverage report: `go test -cover ./internal/repository/postgres/...`

**Must NOT do**:
- Do NOT use mocks (use real testcontainers PostgreSQL)
- Do NOT skip error case tests
- Do NOT skip JSONB round-trip tests for JSONB repositories
- Do NOT share test database instances between tests (each test gets fresh DB)

**Recommended Agent Profile**: `unspecified-high`
- Reason: Comprehensive test coverage for 12 repositories, multiple test scenarios each
- Skills: `golang-testing`, `golang-patterns`

**Parallelization**:
- **Can Run In Parallel**: NO — must run after Tasks 7-18 (Wave 5)
- **Blocks**: Final Verification Wave (F1-F4)
- **Blocked By**: Tasks 7-18

**References**:
- `backend/internal/testutils/postgres.go` — Test database setup (Task 5)
- Blueprint §7: Testing strategy for PostgreSQL repositories
- Each repository file for method signatures

**Acceptance Criteria**:
- [ ] All 12 test files exist in `backend/internal/repository/postgres/`
- [ ] `go test -v ./internal/repository/postgres/...` passes with 100% success
- [ ] `go test -cover ./internal/repository/postgres/...` shows ≥80% coverage
- [ ] Each test file has ≥10 test cases (covering happy path + error cases)
- [ ] JSONB repositories have round-trip tests
- [ ] No test uses mocks (all use testcontainers)
- [ ] `go test -race ./internal/repository/postgres/...` passes (no race conditions)

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend
go test -v ./internal/repository/postgres/...
go test -cover ./internal/repository/postgres/...
go test -race ./internal/repository/postgres/...
# Verify test count
go test -v ./internal/repository/postgres/... 2>&1 | grep -c "PASS"
```

**Commit**: `test(repo/postgres): add comprehensive unit tests for all repositories`

---

## Final Verification Wave

### Task F1: Full integration test (end-to-end verification)

**What to do**:
- Run complete build verification: `go build ./...`
- Run all unit tests: `go test ./...`
- Run all repository tests with verbose output: `go test -v ./internal/repository/postgres/...`
- Start PostgreSQL container: `docker compose up -d`
- Run migration CLI: `go run ./cmd/migrate load`
- Verify all tables populated: `docker exec gymtrack-postgres psql -U gymtrack -d gymtrack -c "\dt"`
- Verify row counts match Couchbase source (if available)
- Start application: `go run ./cmd/server/main.go`
- Test API endpoints:
  ```bash
  curl -s http://localhost:8080/api/v1/health
  curl -s http://localhost:8080/api/v1/users/test@example.com
  curl -s http://localhost:8080/api/v1/exercises
  curl -s http://localhost:8080/api/v1/muscle-groups
  curl -s http://localhost:8080/api/v1/equipment
  ```
- Verify JSONB queries work (workouts with exercises, meals with items)
- Verify legacy_id resolution works (exercise lookup by old ID)

**Must NOT do**:
- Do NOT skip any verification step
- Do NOT ignore test failures
- Do NOT proceed if build fails

**Recommended Agent Profile**: `unspecified-high`
- Reason: Comprehensive end-to-end verification, multiple systems involved
- Skills: `golang-testing`, `golang-patterns`, `docker`

**Parallelization**:
- **Can Run In Parallel**: NO — must run after Task 25 (Final Wave)
- **Blocks**: Task F2, F3, F4
- **Blocked By**: Task 25

**References**:
- Blueprint §8: Integration verification checklist

**Acceptance Criteria**:
- [ ] `go build ./...` passes with zero errors
- [ ] `go test ./...` passes with 100% success
- [ ] `go test -v ./internal/repository/postgres/...` shows all tests passing
- [ ] PostgreSQL container running and accessible
- [ ] Migration CLI completes successfully
- [ ] All 13 tables exist in PostgreSQL
- [ ] Application starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] User lookup works (PostgreSQL query)
- [ ] Exercise lookup works (both UUID and legacy_id)
- [ ] JSONB queries return correct data

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend

# Build verification
go build ./... && echo "BUILD: PASS" || echo "BUILD: FAIL"

# Test verification
go test ./... && echo "TESTS: PASS" || echo "TESTS: FAIL"

# Repository tests
go test -v ./internal/repository/postgres/... 2>&1 | tail -20

# Docker + migration
docker compose up -d
sleep 5
go run ./cmd/migrate load

# Verify tables
docker exec gymtrack-postgres psql -U gymtrack -d gymtrack -c "\dt"

# Verify row counts
docker exec gymtrack-postgres psql -U gymtrack -d gymtrack -c "
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL SELECT 'workouts', COUNT(*) FROM workouts
UNION ALL SELECT 'exercises', COUNT(*) FROM exercises
UNION ALL SELECT 'meals', COUNT(*) FROM meals;
"

# Start application
go run ./cmd/server/main.go &
APP_PID=$!
sleep 3

# Test endpoints
curl -s http://localhost:8080/api/v1/health | jq .
curl -s http://localhost:8080/api/v1/exercises | jq '.[0].exercise_id'

# Cleanup
kill $APP_PID
docker compose down
```

**Commit**: No commit (verification only)

---

### Task F2: Code quality review (lint + vet + fmt)

**What to do**:
- Run `go vet ./...` to check for suspicious constructs
- Run `gofmt -l .` to find files needing formatting
- Run `gofmt -w .` to auto-format if needed
- Run `go mod tidy` to clean up go.mod
- Verify no unused imports: `go vet ./...` catches these
- Verify no deprecated API usage: `go vet ./...` catches these
- Check for common Go anti-patterns:
  - Error handling: all errors checked and wrapped
  - Context propagation: all functions accept context.Context
  - Resource cleanup: defer Close() on connections/rows
  - Goroutine leaks: all goroutines have exit paths
- Review code for consistency:
  - All repository methods follow same pattern
  - All error messages use same format
  - All JSONB handling uses helpers.go functions

**Must NOT do**:
- Do NOT change business logic during formatting
- Do NOT remove commented-out Couchbase code (keep for rollback)
- Do NOT add new features during review

**Recommended Agent Profile**: `quick`
- Reason: Automated linting and formatting checks
- Skills: `golang-patterns`, `golang-lint`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks F3, F4 (Final Wave)
- **Blocks**: None
- **Blocked By**: Task F1

**References**:
- Blueprint §9: Code quality standards

**Acceptance Criteria**:
- [ ] `go vet ./...` passes with zero warnings
- [ ] `gofmt -l .` returns empty list (all files formatted)
- [ ] `go mod tidy` makes no changes (go.mod is clean)
- [ ] No unused imports found
- [ ] No deprecated API usage found
- [ ] All error handling follows Go best practices
- [ ] All context propagation is correct

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend

# Vet check
go vet ./... && echo "VET: PASS" || echo "VET: FAIL"

# Format check
FILES=$(gofmt -l .)
if [ -z "$FILES" ]; then
    echo "FORMAT: PASS"
else
    echo "FORMAT: FAIL - Files need formatting:"
    echo "$FILES"
fi

# Auto-format if needed
gofmt -w .

# Module cleanup
go mod tidy
git diff go.mod go.sum  # Should show no changes

# Check for unused imports
go vet ./... 2>&1 | grep -i "imported and not used" && echo "FAIL: Unused imports" || echo "PASS: No unused imports"
```

**Commit**: `chore: code quality improvements (formatting, vet fixes)` (only if changes made)

---

### Task F3: Performance benchmarking

**What to do**:
- Create benchmark tests for critical repository operations:
  ```go
  // backend/internal/repository/postgres/benchmark_test.go
  func BenchmarkUserRepository_GetByID(b *testing.B)
  func BenchmarkWorkoutRepository_GetByAthleteID(b *testing.B)
  func BenchmarkExerciseRepository_GetByID_UUID(b *testing.B)
  func BenchmarkExerciseRepository_GetByID_LegacyID(b *testing.B)
  func BenchmarkJSONBMarshal_WorkoutExercises(b *testing.B)
  func BenchmarkJSONBUnmarshal_WorkoutExercises(b *testing.B)
  ```
- Run benchmarks: `go test -bench=. -benchmem ./internal/repository/postgres/`
- Compare against Couchbase benchmarks (if available from previous testing)
- Identify performance bottlenecks:
  - Slow queries (>100ms)
  - High memory allocation in JSONB operations
  - Connection pool exhaustion under load
- Optimize if needed:
  - Add database indexes for slow queries
  - Optimize JSONB marshaling/unmarshaling
  - Tune connection pool settings
- Document performance characteristics in `backend/docs/performance.md`

**Must NOT do**:
- Do NOT optimize prematurely (measure first)
- Do NOT add indexes without benchmark evidence
- Do NOT change repository interfaces for performance
- Do NOT use caching without documenting trade-offs

**Recommended Agent Profile**: `deep`
- Reason: Performance analysis requires understanding of database query patterns and optimization
- Skills: `golang-benchmark`, `golang-performance`, `postgresql-indexing`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks F2, F4 (Final Wave)
- **Blocks**: None
- **Blocked By**: Task F1

**References**:
- Blueprint §10: Performance considerations
- PostgreSQL indexing guide: https://www.postgresql.org/docs/current/indexes.html

**Acceptance Criteria**:
- [ ] `backend/internal/repository/postgres/benchmark_test.go` exists
- [ ] `go test -bench=. ./internal/repository/postgres/` runs successfully
- [ ] All benchmarks complete in <100ms per operation (single query)
- [ ] JSONB marshal/unmarshal benchmarks show <1ms overhead for typical payloads
- [ ] No benchmark shows >1s per operation (indicates missing index or N+1 query)
- [ ] `backend/docs/performance.md` documents benchmark results and optimization decisions
- [ ] Connection pool settings documented and justified

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend

# Run all benchmarks
go test -bench=. -benchmem ./internal/repository/postgres/

# Run specific benchmark with verbose output
go test -bench=BenchmarkUserRepository_GetByID -benchmem -v ./internal/repository/postgres/

# Run benchmark with CPU profiling
go test -bench=. -cpuprofile=cpu.prof ./internal/repository/postgres/
go tool pprof cpu.prof

# Run benchmark with memory profiling
go test -bench=. -memprofile=mem.prof ./internal/repository/postgres/
go tool pprof mem.prof

# Compare against baseline (if exists)
# go test -bench=. -benchmem -run=^$ ./internal/repository/postgres/ > new.txt
# benchstat old.txt new.txt
```

**Commit**: `perf(repo/postgres): add performance benchmarks and optimization`

---

### Task F4: Documentation update

**What to do**:
- Update `backend/AGENTS.md`:
  - Add PostgreSQL setup instructions
  - Update development workflow (migration steps)
  - Document new environment variables
  - Add troubleshooting section for common PostgreSQL issues
- Update `README.md` (if exists):
  - Add PostgreSQL as dependency
  - Update installation instructions
  - Add migration guide for existing deployments
- Create `backend/docs/postgresql-migration.md`:
  - Document migration strategy and decisions
  - List all schema changes (Couchbase → PostgreSQL)
  - Document legacy_id mapping algorithm
  - Document JSONB query patterns
  - Add rollback procedure
- Create `backend/docs/performance.md`:
  - Document benchmark results from Task F3
  - List optimization decisions made
  - Document connection pool configuration
  - Add query performance tips
- Update code comments:
  - Add package-level documentation to `internal/repository/postgres/`
  - Document complex functions (migration runner, legacy ID resolution)
  - Add examples to helper functions

**Must NOT do**:
- Do NOT remove Couchbase documentation (keep for historical reference)
- Do NOT document internal implementation details that may change
- Do NOT add API documentation (that's Swagger/OpenAPI, separate task)

**Recommended Agent Profile**: `unspecified-high`
- Reason: Documentation requires understanding of migration decisions and user workflows
- Skills: `golang-documentation`, `technical-writing`

**Parallelization**:
- **Can Run In Parallel**: YES — with Tasks F2, F3 (Final Wave)
- **Blocks**: None
- **Blocked By**: Task F1

**References**:
- Blueprint §11: Documentation requirements
- Existing `backend/AGENTS.md` for style and format

**Acceptance Criteria**:
- [ ] `backend/AGENTS.md` updated with PostgreSQL instructions
- [ ] `backend/docs/postgresql-migration.md` exists and is comprehensive
- [ ] `backend/docs/performance.md` exists with benchmark results
- [ ] All new repository files have package-level documentation
- [ ] Complex functions have inline comments explaining logic
- [ ] Documentation is accurate and matches actual implementation
- [ ] No broken links or references in documentation

**QA Scenarios**:
```bash
cd D:/Dev/gymtrack/backend

# Verify documentation files exist
ls -la AGENTS.md docs/postgresql-migration.md docs/performance.md

# Check for broken links (if using markdown link checker)
# markdown-link-check AGENTS.md docs/*.md

# Verify documentation mentions key concepts
grep -i "postgresql" AGENTS.md && echo "PASS: PostgreSQL mentioned" || echo "FAIL"
grep -i "migration" docs/postgresql-migration.md && echo "PASS: Migration documented" || echo "FAIL"
grep -i "benchmark" docs/performance.md && echo "PASS: Benchmarks documented" || echo "FAIL"

# Verify package documentation
go doc ./internal/repository/postgres | head -20

# Verify function documentation
go doc ./internal/repository/postgres.IsUUID
go doc ./internal/repository/postgres.MarshalToJSONB
```

**Commit**: `docs: update documentation for PostgreSQL migration`

---

## Commit Strategy

| Task | Commit Message | Type |
|------|---------------|------|
| 0 | (no commit - verification only) | - |
| 1 | `feat(deps): add pgx, sqlx, testcontainers to go.mod` | feat |
| 2 | `feat(infra): add docker-compose.yml for PostgreSQL 16` | feat |
| 3 | `feat(schema): add initial migration DDL (13 domain + 2 lookup tables)` | feat |
| 4 | `feat(config): add ProvidePostgresPool connection provider` | feat |
| 5 | `feat(testutils): add testcontainers PostgreSQL helper` | feat |
| 6 | `feat(cmd): scaffold migration CLI runner` | feat |
| 7 | `feat(repo): implement PostgresUserRepository` | feat |
| 8 | `feat(repo): implement PostgresRelationshipRepository` | feat |
| 9 | `feat(repo): implement PostgresCoachingRequestRepository` | feat |
| 10 | `feat(repo): implement PostgresTrainerReviewRepository` | feat |
| 11 | `feat(repo): implement PostgresTrainerProfileRepository` | feat |
| 12 | `feat(repo): implement PostgresCommentRepository` | feat |
| 13 | `feat(repo): implement PostgresWorkoutRepository (exercises JSONB)` | feat |
| 14 | `feat(repo): implement PostgresMealRepository (items JSONB)` | feat |
| 15 | `feat(repo): implement PostgresBodyMeasurementRepository (parts JSONB)` | feat |
| 16 | `feat(repo): implement PostgresWorkoutPlanRepository (exercises JSONB)` | feat |
| 17 | `feat(repo): implement PostgresWorkoutPlanAssignmentRepository` | feat |
| 18 | `feat(repo): implement PostgresExerciseRepository (legacy_id + UUID v5)` | feat |
| 19 | `feat(seed): port muscle_groups and equipment_definitions seeding` | feat |
| 20 | `feat(migrate): implement migration runner with legacyIDMap rewrite` | feat |
| 21 | `refactor(di): swap fx providers from Couchbase to PostgreSQL` | refactor |
| 22 | `refactor(config): remove Couchbase dependencies from app/config` | refactor |
| 23 | `feat(repo): add JSONB query helpers` | feat |
| 24 | `fix(model): remove cbjson tags from CoachingRequest` | fix |
| 25 | `test(repo): add comprehensive unit tests for all PostgreSQL repositories` | test |
| F1-F4 | (no commit - verification only) | - |

### Commit Rules
- Each task produces exactly ONE commit
- Commit message follows Conventional Commits format
- Commit includes ONLY files changed by that task
- No squash commits - each task is independently reviewable
- If a task fails QA, fix and amend the same commit (no "fix fix fix" chains)

---

## Success Criteria

### Must Pass Before Marking Complete

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | `go build ./...` passes | `cd D:/Dev/gymtrack/backend && go build ./...` |
| 2 | `go vet ./...` passes | `cd D:/Dev/gymtrack/backend && go vet ./...` |
| 3 | `go test ./...` passes (all tests) | `cd D:/Dev/gymtrack/backend && go test ./...` |
| 4 | `go test ./internal/repository/postgres/...` passes | All 12+ repo test files green |
| 5 | Docker compose starts PostgreSQL | `docker compose up -d && docker compose ps` shows healthy |
| 6 | Schema applies cleanly | `cat migrations/001_initial_schema.up.sql | docker compose exec -T db psql` |
| 7 | Migration runner completes | `go run ./cmd/migrate load` exits 0 |
| 8 | Application starts against PostgreSQL | `go run ./cmd/server/main.go` starts on :8080 |
| 9 | All 14 repository interfaces unchanged | `git diff internal/domain/repositories/` shows no changes |
| 10 | No Couchbase imports in postgres/ | `grep -r "gocb" internal/repository/postgres/` returns nothing |
| 11 | Rollback works | Reverting module.go to Couchbase providers compiles |
| 12 | All IDs remain strings | No frontend changes needed |

### Definition of Done
- [ ] All 26 tasks completed (Task 0 through Task 25)
- [ ] Final Verification Wave (F1-F4) passes
- [ ] All success criteria above verified
- [ ] No regressions in existing Couchbase code paths (kept for rollback)

---

## Appendix A: Postgres Repository Code Template

### Standard Repository Pattern

Every `Postgres*Repository` follows this exact pattern. Use as starting template for each new repo file.

```go
package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	domainerrors "gymtrack-backend/internal/domain/errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresXxxRepository implements repositories.XxxRepository using PostgreSQL.
type PostgresXxxRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresXxxRepository creates a new PostgreSQL-backed XxxRepository.
func NewPostgresXxxRepository(pool *pgxpool.Pool) *PostgresXxxRepository {
	return &PostgresXxxRepository{pool: pool}
}
```

### CRUD Operations

```go
// Create inserts a new record.
func (r *PostgresXxxRepository) Create(ctx context.Context, entity *models.Xxx) error {
	query := `INSERT INTO table_name (id, field1, field2, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)`
	_, err := r.pool.Exec(ctx, query,
		entity.ID, entity.Field1, entity.Field2, entity.CreatedAt, entity.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create xxx: %w", err)
	}
	return nil
}

// GetByID retrieves a record by primary key.
func (r *PostgresXxxRepository) GetByID(ctx context.Context, id string) (*models.Xxx, error) {
	var entity models.Xxx
	err := r.pool.QueryRow(ctx, `SELECT id, field1, field2, created_at, updated_at
		FROM table_name WHERE id = $1`, id).
		Scan(&entity.ID, &entity.Field1, &entity.Field2, &entity.CreatedAt, &entity.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get xxx by ID: %w", err)
	}
	return &entity, nil
}

// Update modifies an existing record.
func (r *PostgresXxxRepository) Update(ctx context.Context, entity *models.Xxx) error {
	query := `UPDATE table_name SET field1 = $2, field2 = $3, updated_at = $4 WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, entity.ID, entity.Field1, entity.Field2, entity.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to update xxx: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// Delete removes a record by primary key.
func (r *PostgresXxxRepository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM table_name WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete xxx: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}
```

### JSONB Column Pattern

For columns that store JSON data (exercises, items, parts, profile):

```go
import "encoding/json"

// marshalJSONB marshals a Go value to JSON bytes for JSONB columns.
func marshalJSONB(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// scanJSONB scans a JSONB column into a Go value.
func scanJSONB(data []byte, v interface{}) error {
	if data == nil {
		return nil
	}
	return json.Unmarshal(data, v)
}

// Usage in Create:
func (r *PostgresWorkoutRepository) Create(ctx context.Context, workout *models.Workout) error {
	exercisesJSON, err := json.Marshal(workout.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal exercises: %w", err)
	}
	query := `INSERT INTO workouts (workout_id, athlete_id, date, exercises, plan_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err = r.pool.Exec(ctx, query,
		workout.WorkoutID, workout.AthleteID, workout.Date,
		exercisesJSON, workout.PlanID,
		workout.CreatedAt, workout.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create workout: %w", err)
	}
	return nil
}

// Usage in GetByID:
func (r *PostgresWorkoutRepository) GetByID(ctx context.Context, workoutID string) (*models.Workout, error) {
	var workout models.Workout
	var exercisesRaw []byte
	var planID sql.NullString
	err := r.pool.QueryRow(ctx, `SELECT workout_id, athlete_id, date, exercises, plan_id, created_at, updated_at
		FROM workouts WHERE workout_id = $1`, workoutID).
		Scan(&workout.WorkoutID, &workout.AthleteID, &workout.Date,
			&exercisesRaw, &planID,
			&workout.CreatedAt, &workout.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get workout: %w", err)
	}
	if exercisesRaw != nil {
		if err := json.Unmarshal(exercisesRaw, &workout.Exercises); err != nil {
			return nil, fmt.Errorf("failed to unmarshal exercises: %w", err)
		}
	}
	if planID.Valid {
		workout.PlanID = planID.String
	}
	return &workout, nil
}
```

### Key Patterns Summary

| Pattern | Implementation |
|---------|---------------|
| Error mapping | `errors.Is(err, pgx.ErrNoRows)` → `domainerrors.ErrNotFound` |
| UUID ↔ string | Direct string binding — pgx handles conversion automatically |
| JSONB write | `json.Marshal(value)` → `[]byte` → bind to JSONB column |
| JSONB read | Scan into `[]byte` → `json.Unmarshal(data, &value)` |
| Nullable columns | Use `*string` or `sql.NullString` for nullable text/UUID |
| Timestamps | PostgreSQL `TIMESTAMPTZ` maps directly to Go `time.Time` |
| RowsAffected | Check `result.RowsAffected() == 0` for "not found" on UPDATE/DELETE |
| Multi-row queries | Use `rows, err := pool.Query()` + `defer rows.Close()` + `for rows.Next()` |
| Single-row queries | Use `pool.QueryRow()` (auto-closes, no defer needed) |
| Batch inserts | Use `pgx.Batch` for seeding data |

---

## Appendix B: Complete Interface Index

### All 14 Repository Interfaces

| # | Interface | Source File | Methods | Impl File |
|---|-----------|-------------|---------|-----------|
| 1 | `UserRepository` | `internal/domain/repositories/user_repository.go` | `CreateUser`, `GetUserByEmail`, `GetUserByUsername`, `GetUserByID`, `GetAllUsers`, `UpdateUser` | `postgres/user.go` |
| 2 | `WorkoutRepository` | `internal/domain/repositories/workout_repository.go` | `Create`, `GetByID`, `GetByAthleteID`, `GetByAthleteDateRange`, `Update`, `Delete` | `postgres/workout.go` |
| 3 | `MealRepository` | `internal/domain/repositories/meal_repository.go` | `Create`, `GetByID`, `GetByAthleteID`, `GetByAthleteDateRange`, `Update`, `Delete` | `postgres/meal.go` |
| 4 | `RelationshipRepository` | `internal/domain/repositories/relationship_repository.go` | `Create`, `GetByID`, `GetByTrainerID`, `GetByAthleteID`, `GetPendingByAthleteID`, `HasActiveRelationship`, `Update`, `Delete` | `postgres/relationship.go` |
| 5 | `CommentRepository` | `internal/domain/repositories/comment_repository.go` | `Create`, `GetByID`, `GetByTarget`, `GetByAuthor`, `GetReplies`, `Update`, `Delete` | `postgres/comment.go` |
| 6 | `MuscleGroupRepository` | `internal/domain/repositories/muscle_group_repository.go` | `GetAllMuscleGroups`, `GetMuscleGroupByID` | `postgres/muscle_group.go` |
| 7 | `EquipmentRepository` | `internal/domain/repositories/equipment_repository.go` | `GetAllEquipment`, `GetEquipmentByID` | `postgres/equipment.go` |
| 8 | `ExerciseRepository` | `internal/domain/repositories/exercise_repository.go` | `CreateExercise`, `GetExerciseByID`, `GetAllExercises`, `GetExercisesByMuscleGroup`, `GetExercisesByEquipment`, `SearchExercises` | `postgres/exercise.go` |
| 9 | `WorkoutPlanRepository` | `internal/domain/repositories/workout_plan_repository.go` | `Create`, `GetByID`, `GetByTrainerID`, `Update`, `Delete` | `postgres/workout_plan.go` |
| 10 | `WorkoutPlanAssignmentRepository` | `internal/domain/repositories/workout_plan_repository.go` (bottom) | `Create`, `GetByID`, `GetByPlanID`, `GetByAthleteID`, `GetByAthleteAndPlan`, `GetByTrainerID`, `DeleteByPlanID` | `postgres/workout_plan_assignment.go` |
| 11 | `BodyMeasurementRepository` | `internal/domain/repositories/body_measurement_repository.go` | `Create`, `GetByID`, `GetByAthleteID`, `GetByAthleteDateRange`, `GetLatestByAthleteID`, `Update`, `Delete` | `postgres/body_measurement.go` |
| 12 | `TrainerProfileRepository` | `internal/domain/repositories/trainer_profile_repository.go` | `GetPublicTrainers`, `GetTrainerByID`, `UpdateTrainerProfile`, `SearchTrainers`, `CountTrainers` | `postgres/trainer_profile.go` |
| 13 | `AvailabilityRepository` | `internal/domain/repositories/availability_repository.go` | `GetByTrainerID`, `GetBySlotID`, `UpsertAvailability`, `DeleteAvailability`, `GetAvailableSlots`, `BookSlotAtomic`, `CleanupExpiredSlots` | `postgres/availability.go` |
| 14 | `ReviewRepository` | `internal/domain/repositories/review_repository.go` | `GetByTrainerID`, `CreateReview`, `UpdateReview`, `DeleteReview`, `GetByAthleteID`, `GetAverageRating`, `GetReviewByID`, `GetRatingsForTrainers` | `postgres/review.go` |

### Additional Repository (no interface - inline service):
- **CoachingRequestRepository** (`internal/domain/repositories/coaching_request_repository.go`): `Create`, `GetByID`, `GetByAthleteID`, `GetByTrainerID`, `Update`, `Delete`, `GetPendingByTrainerID` → `postgres/coaching_request.go`

### Important Note on Invitations:
There is **NO InvitationRepository interface** in the codebase. Invitations are handled by `internal/domain/services/invitation_service.go` using a `GocbCollectionAdapter` that directly accesses the Couchbase `users` collection. During migration, this service must be updated to use PostgreSQL directly (or a new PostgresInvitationRepository must be created and the service refactored). This is NOT covered in the 26 tasks - it is a follow-up task.

### Method Count Summary:
- Total interfaces: 14 (+ 1 CoachingRequest)
- Total methods: 95
- Methods with JSONB handling: ~25 (across Workout, Meal, BodyMeasurement, WorkoutPlan repos)
- Methods with nullable columns: ~10 (exercise.created_by, comment.parent_comment_id)

---

## Appendix C: Known Gotchas

### 1. pgx NULL Handling
**Problem**: PostgreSQL `NULL` columns cause scan errors if Go struct fields are non-pointer types.
**Solution**: Use `*string`, `*int`, `*time.Time` for nullable columns, or use `sql.NullString`, `sql.NullInt64`, etc.
**Example**:
```go
// WRONG: Will panic on NULL
var createdBy string
row.Scan(&createdBy)

// CORRECT: Pointer type
var createdBy *string
row.Scan(&createdBy)

// CORRECT: sql.NullString
var createdBy sql.NullString
row.Scan(&createdBy)
if createdBy.Valid {
    // use createdBy.String
}
```

### 2. JSONB Round-Trip with `encoding/json`
**Problem**: JSONB columns store JSON as bytes. Must marshal/unmarshal correctly.
**Solution**: Use `json.Marshal()` to convert Go struct → `[]byte` for INSERT, `json.Unmarshal()` to convert `[]byte` → Go struct for SELECT.
**Example**:
```go
// Write (Create/Update)
exercisesJSON, err := json.Marshal(workout.Exercises)
if err != nil {
    return fmt.Errorf("failed to marshal exercises: %w", err)
}
pool.Exec(ctx, insertQuery, ..., exercisesJSON, ...)

// Read (Select)
var exercisesRaw []byte
row.Scan(..., &exercisesRaw, ...)
if exercisesRaw != nil {
    if err := json.Unmarshal(exercisesRaw, &workout.Exercises); err != nil {
        return fmt.Errorf("failed to unmarshal exercises: %w", err)
    }
}
```

### 3. UUID ↔ String Type Handling
**Problem**: PostgreSQL `UUID` type vs Go `string` type.
**Solution**: pgx v5 handles this automatically. Pass string directly, pgx converts to/from UUID.
**Example**:
```go
// This works - pgx handles UUID ↔ string conversion
pool.Exec(ctx, "INSERT INTO users (user_id) VALUES ($1)", user.UserID) // user.UserID is string
pool.QueryRow(ctx, "SELECT user_id FROM users WHERE user_id = $1", id).Scan(&user.UserID)
```

### 4. `ON CONFLICT` for Upserts
**Problem**: Need to handle duplicate inserts gracefully.
**Solution**: Use `ON CONFLICT (column) DO NOTHING` or `DO UPDATE`.
**Example**:
```sql
-- Skip if exists
INSERT INTO workout_plan_assignments (plan_id, athlete_id, status)
VALUES ($1, $2, $3)
ON CONFLICT (plan_id, athlete_id) DO NOTHING;

-- Update if exists
INSERT INTO user_profiles (user_id, bio)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio;
```

### 5. `time.Time` and `TIMESTAMPTZ`
**Problem**: PostgreSQL `TIMESTAMPTZ` vs Go `time.Time`.
**Solution**: Direct mapping works. pgx handles timezone conversion automatically.
**Example**:
```go
// This works - pgx handles TIMESTAMPTZ ↔ time.Time
pool.Exec(ctx, "INSERT INTO workouts (created_at) VALUES ($1)", workout.CreatedAt)
pool.QueryRow(ctx, "SELECT created_at FROM workouts").Scan(&workout.CreatedAt)
```

### 6. Composite Primary Keys and UNIQUE Constraints
**Problem**: Tables with multi-column unique constraints.
**Solution**: Use `ON CONFLICT (col1, col2)` syntax.
**Example**:
```sql
-- workout_plan_assignments has UNIQUE(plan_id, athlete_id)
INSERT INTO workout_plan_assignments (plan_id, athlete_id, status)
VALUES ($1, $2, $3)
ON CONFLICT (plan_id, athlete_id) DO NOTHING;
```

### 7. GIN Index Queries for JSONB Containment
**Problem**: Need to query JSONB arrays efficiently.
**Solution**: Use `@>` (contains) operator with GIN index.
**Example**:
```sql
-- Find workouts containing specific exercise
SELECT * FROM workouts
WHERE exercises @> '[{"exerciseId": "abc-123"}]'::jsonb;

-- Find meals containing specific food
SELECT * FROM meals
WHERE items @> '[{"foodId": "xyz-456"}]'::jsonb;
```
**Note**: Requires GIN index on JSONB column (created in migration DDL).

### 8. `rows.Close()` vs `QueryRow`
**Problem**: Resource leaks from unclosed rows.
**Solution**: `QueryRow` auto-closes. `Query` requires manual `defer rows.Close()`.
**Example**:
```go
// QueryRow - no defer needed
row := pool.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", email)
err := row.Scan(&id)

// Query - MUST defer Close
rows, err := pool.Query(ctx, "SELECT id FROM users")
if err != nil {
    return err
}
defer rows.Close() // Always defer
for rows.Next() {
    // process rows
}
```

### 9. `rows.Err()` After Iteration
**Problem**: Iteration errors not caught.
**Solution**: Always check `rows.Err()` after `for rows.Next()` loop.
**Example**:
```go
rows, err := pool.Query(ctx, "SELECT id FROM users")
if err != nil {
    return err
}
defer rows.Close()

for rows.Next() {
    var id string
    if err := rows.Scan(&id); err != nil {
        return err
    }
    // process id
}

// MUST check this
if err := rows.Err(); err != nil {
    return fmt.Errorf("row iteration error: %w", err)
}
```

### 10. Batch Inserts with pgx
**Problem**: Slow individual inserts for seed data.
**Solution**: Use `pgx.Batch` for bulk operations.
**Example**:
```go
batch := &pgx.Batch{}
for _, mg := range muscleGroups {
    batch.Queue("INSERT INTO muscle_groups (id, name) VALUES ($1, $2)", mg.ID, mg.Name)
}
results := pool.SendBatch(ctx, batch)
defer results.Close()
for i := 0; i < len(muscleGroups); i++ {
    if _, err := results.Exec(); err != nil {
        return fmt.Errorf("batch insert failed: %w", err)
    }
}
```

### 11. `TrainerFilters` Struct Import
**Problem**: `TrainerFilters` struct defined in interface file, not model file.
**Solution**: Import from `internal/domain/repositories/trainer_profile_repository.go`.
**Example**:
```go
import "gymtrack-backend/internal/domain/repositories"

func (r *PostgresTrainerProfileRepository) GetPublicTrainers(
    ctx context.Context,
    filters *repositories.TrainerFilters, // Import from repositories package
    limit, offset int,
) ([]*models.TrainerProfile, error) {
    // implementation
}
```

### 12. `BookSlotAtomic` → PostgreSQL Row-Level Lock
**Problem**: Couchbase `MutateIn` atomic updates don't translate directly.
**Solution**: Use PostgreSQL `SELECT ... FOR UPDATE` or `UPDATE ... WHERE` with condition.
**Example**:
```sql
-- Atomic slot booking (prevents double-booking)
UPDATE trainer_availabilities
SET is_booked = true, booked_by = $1, booked_at = NOW()
WHERE slot_id = $2
  AND is_booked = false  -- Only book if not already booked
RETURNING slot_id;
```
**Note**: Check `RowsAffected() == 0` to detect booking conflict.

### 13. `CleanupExpiredSlots` → DELETE with WHERE
**Problem**: Need to delete old availability slots.
**Solution**: Use `DELETE` with timestamp condition.
**Example**:
```sql
-- Delete slots older than 30 days
DELETE FROM trainer_availabilities
WHERE slot_date < NOW() - INTERVAL '30 days'
  AND is_booked = false;  -- Only delete unbooked slots
```

### 14. cbjson Tags on CoachingRequest
**Problem**: `CoachingRequest` struct has `cbjson` struct tags (Couchbase-specific).
**Solution**: Remove `cbjson` tags, keep only `json` tags. Task 24 handles this.
**Example**:
```go
// BEFORE (Couchbase)
type CoachingRequest struct {
    ID        string `json:"id" cbjson:"id"`
    AthleteID string `json:"athlete_id" cbjson:"athlete_id"`
}

// AFTER (PostgreSQL)
type CoachingRequest struct {
    ID        string `json:"id"`
    AthleteID string `json:"athlete_id"`
}
```

---

## Appendix D: Environment & Verification

### Pre-flight Checklist

Before starting the migration, verify the following:

#### System Requirements
- **Go version**: 1.24 or later
  ```bash
  go version  # Should show go1.24.x
  ```
- **Docker**: Installed and running
  ```bash
  docker --version
  docker ps  # Should not error
  ```
- **PostgreSQL client** (optional, for manual inspection):
  ```bash
  psql --version  # Should show 16.x
  ```

#### Project State
- **Clean git status**: No uncommitted changes
  ```bash
  cd D:/Dev/gymtrack/backend
  git status
  ```
- **Existing Couchbase code builds**: Baseline verification
  ```bash
  go build ./...
  ```
- **Dependencies available**: go.mod has Couchbase deps (for rollback)
  ```bash
  grep "github.com/couchbase/gocb/v2" go.mod
  ```

#### Database State
- **Couchbase running** (if doing live migration):
  ```bash
  curl http://localhost:8091/pools  # Should return JSON
  ```
- **No existing PostgreSQL** (or ready to drop/recreate):
  ```bash
  docker compose ps  # Should show no containers or stopped
  ```

### Environment Setup

#### 1. Start PostgreSQL Container
```bash
cd D:/Dev/gymtrack
docker compose up -d
docker compose ps  # Should show "healthy"
```

#### 2. Verify Connection
```bash
cd D:/Dev/gymtrack/backend
go run -tags test ./cmd/test-db-connection  # Or use psql
psql -h localhost -p 5432 -U gymtrack -d gymtrack -c "SELECT version();"
```

#### 3. Apply Schema
```bash
cat backend/migrations/001_initial_schema.up.sql | \
  docker exec -i gymtrack-postgres psql -U gymtrack -d gymtrack
```

#### 4. Verify Schema
```bash
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack -c "\dt"
# Should show 15 tables (13 domain + 2 lookup)
```

### Verification Commands by Wave

#### Wave 1: Infrastructure (Tasks 0-6)
```bash
# Task 0: Pre-flight verification
go version  # >= 1.24
docker --version
git status  # Clean

# Task 1: Dependencies
grep "jackc/pgx/v5" go.mod  # Present
grep "jmoiron/sqlx" go.mod  # Present

# Task 2: Docker Compose
docker compose up -d
docker compose ps | grep healthy

# Task 3: Schema
cat backend/migrations/001_initial_schema.up.sql | \
  docker exec -i gymtrack-postgres psql -U gymtrack -d gymtrack
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack -c "\dt" | wc -l  # Should be 18 (15 tables + headers)

# Task 4: Config
POSTGRES_DSN="postgres://gymtrack:password@localhost:5432/gymtrack?sslmode=disable" \
  go run -exec "echo" ./internal/config/  # Should print "connected"

# Task 5: Test Utilities
go build ./internal/testutils/...
grep "SetupTestPostgresDB" internal/testutils/postgres.go  # Function exists

# Task 6: Migration CLI
go build ./cmd/migrate/...
./migrate --help  # Shows usage
./migrate export  # "not implemented"
./migrate load    # "not implemented"
./migrate verify  # "not implemented"
```

#### Wave 2: Core Repositories (Tasks 7-12)
```bash
# Build all repos
go build ./internal/repository/postgres/...

# Run all repo tests
go test -v ./internal/repository/postgres/ -run TestPostgresUserRepository
go test -v ./internal/repository/postgres/ -run TestPostgresRelationshipRepository
go test -v ./internal/repository/postgres/ -run TestPostgresCoachingRequestRepository
go test -v ./internal/repository/postgres/ -run TestPostgresTrainerReviewRepository
go test -v ./internal/repository/postgres/ -run TestPostgresTrainerProfileRepository
go test -v ./internal/repository/postgres/ -run TestPostgresCommentRepository

# Verify interface compliance
go build ./internal/domain/repositories/...  # Should not error
```

#### Wave 3: JSONB Repositories (Tasks 13-17)
```bash
# Build all repos
go build ./internal/repository/postgres/...

# Run all repo tests
go test -v ./internal/repository/postgres/ -run TestPostgresWorkoutRepository
go test -v ./internal/repository/postgres/ -run TestPostgresMealRepository
go test -v ./internal/repository/postgres/ -run TestPostgresBodyMeasurementRepository
go test -v ./internal/repository/postgres/ -run TestPostgresWorkoutPlanRepository
go test -v ./internal/repository/postgres/ -run TestPostgresWorkoutPlanAssignmentRepository

# Verify JSONB round-trip (check test output for "JSONB" tests)
go test -v ./internal/repository/postgres/ -run TestJSONB 2>&1 | grep PASS
```

#### Wave 4: Exercise + Migration (Tasks 18-20)
```bash
# Task 18: Exercise Repository
go test -v ./internal/repository/postgres/ -run TestPostgresExerciseRepository
go test -v ./internal/repository/postgres/ -run TestExerciseIDFormat  # UUID regex

# Task 19: Seed Data
go test -v ./internal/repository/postgres/ -run TestSeedLookupTables
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack \
  -c "SELECT COUNT(*) FROM muscle_groups;"  # Should be 7
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack \
  -c "SELECT COUNT(*) FROM equipment_definitions;"  # Should be 8

# Task 20: Migration Runner
go test -v ./cmd/migrate/ -run TestRunMigration
# Manual test (requires Couchbase with data):
go run ./cmd/migrate load \
  --couchbase-url=http://localhost:8091 \
  --couchbase-user=Administrator \
  --couchbase-pass=password \
  --pg-dsn="postgres://gymtrack:password@localhost:5432/gymtrack?sslmode=disable"
```

#### Wave 5: DI Wiring + Cleanup (Tasks 21-25)
```bash
# Task 21: Module Swap
go build ./internal/app/...
go build ./cmd/server/...
go run ./cmd/server/main.go  # Should start on :8080
curl -s http://localhost:8080/api/v1/health | jq .

# Task 22: Couchbase Cleanup
grep -r "gocb.Cluster" internal/app/ internal/config/  # Should return nothing
ls -la internal/repository/couchbase/  # Should still exist (rollback)

# Task 23: JSONB Helpers
go test -v ./internal/repository/postgres/ -run TestHelpers
go test -v ./internal/repository/postgres/ -run TestIsUUID
go test -v ./internal/repository/postgres/ -run TestMarshalToJSONB

# Task 24: cbjson Tags
grep -r "cbjson:" internal/domain/models/  # Should return nothing
go build ./internal/domain/models/...

# Task 25: All Tests
go test -v ./internal/repository/postgres/...  # All tests pass
go test -cover ./internal/repository/postgres/...  # >= 80% coverage
go test -race ./internal/repository/postgres/...  # No race conditions
```

#### Final Verification Wave (F1-F4)
```bash
# F1: Full Integration Test
go build ./...
go test ./...
docker compose up -d
go run ./cmd/migrate load
docker exec gymtrack-postgres psql -U gymtrack -d gymtrack -c "\dt"
go run ./cmd/server/main.go &
sleep 3
curl -s http://localhost:8080/api/v1/health | jq .
curl -s http://localhost:8080/api/v1/exercises | jq '.[0].exercise_id'
kill %1
docker compose down

# F2: Code Quality
go vet ./...
gofmt -l .  # Should return nothing
go mod tidy
git diff go.mod go.sum  # Should show no changes

# F3: Performance Benchmarks
go test -bench=. -benchmem ./internal/repository/postgres/
go test -bench=BenchmarkUserRepository_GetByID -benchmem -v ./internal/repository/postgres/

# F4: Documentation
ls -la AGENTS.md docs/postgresql-migration.md docs/performance.md
grep -i "postgresql" AGENTS.md  # Should find matches
go doc ./internal/repository/postgres | head -20
```

### Troubleshooting

#### PostgreSQL Container Won't Start
```bash
# Check logs
docker compose logs postgres

# Common issue: Port 5432 already in use
netstat -an | grep 5432  # Windows
lsof -i :5432            # macOS/Linux

# Fix: Stop other PostgreSQL or change port in docker-compose.yml
```

#### Connection Refused
```bash
# Verify container is running
docker compose ps

# Check if PostgreSQL is ready
docker exec gymtrack-postgres pg_isready -U gymtrack

# Wait for ready (can take 10-30 seconds on first start)
sleep 30
docker exec gymtrack-postgres pg_isready -U gymtrack
```

#### Migration Fails with Foreign Key Error
```bash
# Check migration order in cmd/migrate/runner.go
# Must follow dependency order:
# 1. users, muscle_groups, equipment_definitions (no dependencies)
# 2. relationships, coaching_requests, trainer_reviews (depend on users)
# 3. exercises (depends on muscle_groups, equipment_definitions)
# 4. workouts, meals, body_measurements (depend on users)
# 5. workout_plans (depends on users)
# 6. workout_plan_assignments (depends on workout_plans, users)
```

#### JSONB Unmarshal Error
```bash
# Check JSONB column in database
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack \
  -c "SELECT exercises FROM workouts LIMIT 1;"

# Verify JSON is valid
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack \
  -c "SELECT exercises::text FROM workouts LIMIT 1;"

# Common issue: NULL JSONB column
# Fix: Check for nil before unmarshal
if exercisesRaw != nil {
    json.Unmarshal(exercisesRaw, &workout.Exercises)
}
```

#### UUID Format Error
```bash
# Check if exercise_id is UUID or legacy format
docker exec -it gymtrack-postgres psql -U gymtrack -d gymtrack \
  -c "SELECT id, legacy_id FROM exercises LIMIT 5;"

# Verify UUID regex in exercise repository
grep -A 2 "uuidRegex" internal/repository/postgres/exercise.go

# Test regex manually
go run -exec "echo" -tags test <<'EOF'
package main
import (
    "fmt"
    "regexp"
)
func main() {
    uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
    fmt.Println(uuidRegex.MatchString("550e8400-e29b-41d4-a716-446655440000")) // true
    fmt.Println(uuidRegex.MatchString("exercise_BenchPress"))                    // false
}
EOF
```

### Rollback Procedures

#### Quick Rollback (DI Only)
If PostgreSQL implementation has issues, revert to Couchbase:
```bash
# 1. Revert module.go
git checkout HEAD~1 internal/app/module.go  # Or specific commit

# 2. Rebuild and restart
go build ./cmd/server/...
go run ./cmd/server/main.go

# 3. Verify Couchbase is working
curl -s http://localhost:8080/api/v1/health | jq .
```

#### Full Rollback (Remove PostgreSQL)
If migration is abandoned entirely:
```bash
# 1. Stop PostgreSQL container
docker compose down -v  # -v removes volumes

# 2. Remove PostgreSQL files
rm -rf backend/internal/repository/postgres/
rm -rf backend/migrations/
rm -f backend/internal/config/postgres.go
rm -f backend/internal/testutils/postgres.go
rm -f backend/cmd/migrate/

# 3. Remove PostgreSQL dependencies
go mod edit -droprequire github.com/jackc/pgx/v5
go mod edit -droprequire github.com/jmoiron/sqlx
go mod edit -droprequire github.com/testcontainers/testcontainers-go
go mod tidy

# 4. Revert all changes
git checkout main -- .

# 5. Verify Couchbase still works
go build ./...
go run ./cmd/server/main.go
```

#### Partial Rollback (Keep Schema, Revert Code)
If schema is correct but code has issues:
```bash
# 1. Keep PostgreSQL container and schema running
docker compose ps  # Verify still running

# 2. Revert repository implementations
git checkout HEAD~12 internal/repository/postgres/  # Adjust commit count

# 3. Revert module.go to Couchbase
git checkout HEAD~1 internal/app/module.go

# 4. Rebuild
go build ./...

# 5. Application uses Couchbase, but PostgreSQL schema remains for debugging
```

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DSN` | `postgres://gymtrack:password@localhost:5432/gymtrack?sslmode=disable` | PostgreSQL connection string |
| `POSTGRES_MAX_CONNS` | `25` | Maximum connection pool size |
| `POSTGRES_MIN_CONNS` | `2` | Minimum connection pool size |
| `POSTGRES_MAX_CONN_LIFETIME` | `30m` | Maximum connection lifetime |
| `POSTGRES_MAX_CONN_IDLE_TIME` | `5m` | Maximum idle time before closing |
| `COUCHBASE_URL` | `http://localhost:8091` | Couchbase cluster URL (for migration) |
| `COUCHBASE_USERNAME` | `Administrator` | Couchbase admin username |
| `COUCHBASE_PASSWORD` | `password` | Couchbase admin password |
| `COUCHBASE_BUCKET` | `gymtrack` | Couchbase bucket name |

### Next Steps After Migration

1. **Monitor Performance**: Use `pg_stat_statements` to identify slow queries
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Optimize Indexes**: Add indexes for frequently queried columns
   ```sql
   CREATE INDEX CONCURRENTLY idx_workouts_athlete_date 
   ON workouts(athlete_id, completed_at DESC);
   ```

3. **Set Up Backups**: Configure pg_dump cron job
   ```bash
   pg_dump -U gymtrack -h localhost gymtrack > backup_$(date +%Y%m%d).sql
   ```

4. **Plan Invitation Repository**: Create proper PostgresInvitationRepository
   - Extract invitation logic from `invitation_service.go`
   - Create `InvitationRepository` interface
   - Implement `PostgresInvitationRepository`
   - Refactor service to use repository

5. **Remove Couchbase Code**: After stable production period (2-4 weeks)
   ```bash
   rm -rf internal/repository/couchbase/
   go mod edit -droprequire github.com/couchbase/gocb/v2
   go mod tidy
   ```

---

## Document Metadata

- **Version**: 2.0 (Optimized for Agent Execution)
- **Last Updated**: 2026-05-07
- **Total Tasks**: 26 implementation + 4 verification = 30 tasks
- **Estimated Duration**: 6-8 weeks (with parallel execution)
- **Critical Path**: Tasks 0 → 1-6 → 7-17 → 18-20 → 21 → 25 → F1
- **Rollback Safety**: Full rollback possible at any stage

---

*End of Optimized Migration Plan*
