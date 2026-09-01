# golang-migrate/migrate Integration Plan (Production-Ready)

## Overview
Replace custom migration runner with battle-tested `golang-migrate/migrate` library using embedded migrations for production deployments.

---

## Architecture Decision

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Source Driver** | `iofs` + `embed.FS` | Go 1.16+ native, zero filesystem deps at runtime |
| **Binary Embedding** | Yes | Atomic deployments, no missing-file failures in containers |
| **CLI Tool** | Install in CI/CD only | Keep binary small; ops use CLI separately |
| **Dirty State** | Support `force` command | Production recovery safety net |

---

## Dependencies to Add
```bash
go get github.com/golang-migrate/migrate/v4
go get github.com/golang-migrate/migrate/v4/database/postgres
go get github.com/golang-migrate/migrate/v4/source/iofs
```

---

## Files to Create/Modify

### 1. New: `internal/migrate/embed.go`
```go
package migrate

import (
	_ "embed"
	"io/fs"
)

//go:embed migrations/*.sql
var MigrationFiles embed.FS

func MigrationsFS() fs.FS {
	fsys, _ := fs.Sub(MigrationFiles, "migrations")
	return fsys
}
```

### 2. Refactor: `cmd/migrate/main.go`
- Use `migrate.NewWithSourceInstance("iofs", src, dsn)`
- Support flags: `-dir up|down|force <version>`
- Remove custom `schema_migrations` logic (library handles it)
- Keep same env var (`POSTGRES_DSN`) and default

### 3. Refactor: `cmd/ensure-schema/main.go`
- Replace embedded SQL constant with library calls:
  - `m.Down()` to version 0 (clean slate)
  - `m.Up()` to apply all migrations
- Keep lookup table seeding

### 4. Update: `internal/config/config.go`
- Export `DefaultPostgresDSN()` for shared default

### 5. New: `.github/workflows/migrate.yml`
```yaml
- name: Run migrations
  run: |
    migrate -database ${{ secrets.POSTGRES_DSN }} -source file://backend/migrations up
```

---

## Migration Files (Current → Compatible)

Current 6 migrations in `backend/migrations/` work unchanged:
```
001_initial_schema.up.sql / .down.sql
002_add_user_status.up.sql / .down.sql
003_add_exercise_verified.up.sql
004_drop_exercise_legacy_id.up.sql / .down.sql
005_add_account_deletion.up.sql / .down.sql
006_add_password_reset.up.sql / .down.sql
```

golang-migrate expects: `{version}_{name}.up.sql` / `{version}_{name}.down.sql` ✓

---

## CI/CD Integration

### GitHub Actions
```yaml
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install migrate CLI
        run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
      - name: Run migrations
        run: migrate -database ${{ secrets.POSTGRES_DSN }} -source file://backend/migrations up
```

### Container Deploy
```dockerfile
# Build stage: migrations embedded in binary
# Runtime: no migration files needed
# Deploy: binary runs `migrate -dir up` on startup (or sidecar)
```

---

## Operational Commands

| Operation | Command |
|-----------|---------|
| Apply all | `go run cmd/migrate/main.go -dir up` |
| Rollback 1 | `go run cmd/migrate/main.go -dir down` |
| Force version | `go run cmd/migrate/main.go -dir force 3` |
| CLI (CI) | `migrate -database $DSN -source file://backend/migrations up` |

---

## Backward Compatibility

- ✅ `go run cmd/migrate/main.go` still works (defaults to `-dir up`)
- ✅ Same `POSTGRES_DSN` env var
- ✅ Same output format ("migrations applied", "database is up to date")
- ✅ Existing `schema_migrations` table compatible (library uses same name)

---

## Testing Checklist

- [ ] Fresh DB: `migrate up` creates all 15 tables + indexes
- [ ] Existing DB: `migrate up` skips applied, applies pending
- [ ] Rollback: `migrate down` reverts last migration cleanly
- [ ] Dirty state: interrupt mid-migration → `force` recovers
- [ ] Embedded FS: binary works without `backend/migrations/` directory
- [ ] CI: workflow passes with test database

---

## Rollback Plan

If issues arise:
1. Revert `cmd/migrate/main.go` to custom implementation (git history)
2. Remove `internal/migrate/embed.go`
3. Remove migrate dependencies from `go.mod`
4. No DB changes needed (schema_migrations table unchanged)

---

## References
- [golang-migrate Tutorial](https://github.com/golang-migrate/migrate/blob/master/database/postgres/TUTORIAL.md)
- [iofs Source Driver](https://github.com/golang-migrate/migrate/blob/master/source/iofs/iofs.go)
- [Embedded Migrations](https://github.com/golang-migrate/migrate/blob/master/source/pkger/README.md)