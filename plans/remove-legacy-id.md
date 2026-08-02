# Plan: Remove `legacy_id` Usages from Codebase

## Background

`legacy_id` is a column on the `exercises` table that was introduced during the Couchbase → PostgreSQL migration to store the original Couchbase UUID of each exercise, enabling tracing/debugging during the migration.

The migration is now **complete** (migration plans live in `plans/done/`), and `legacy_id` is a **dead column**:

- It is **never read or written by any Go application code** — no struct field, no SQL query references it.
- The `PostgresExerciseRepository` `exCols` constant, `INSERT`, `SELECT`, and `UPDATE` queries all omit it.
- The `Exercise` model (`backend/internal/domain/models/exercise.go`) has no `LegacyID` field.

This plan removes all `legacy_id` usages from active source code and documentation.

---

## All Occurrences (categorized)

### 🔴 Source Code — Schema Definitions (must change)

| File | Line | Usage |
|------|------|-------|
| `backend/migrations/001_initial_schema.up.sql` | 41 | `legacy_id TEXT UNIQUE,` in `exercises` table DDL |
| `backend/internal/testutils/migrations/001_initial_schema.up.sql` | 41 | Same, for test database setup |
| `backend/cmd/ensure-schema/main.go` | 58 | Same, embedded `migrationSQL` string (must stay in sync with 001) |

### 🔴 Source Code — Seed Script (must change)

| File | Lines | Usage |
|------|-------|-------|
| `seed_exercises.sql` (untracked, root) | 3, 34, 109 | Uses `legacy_id` as `ON CONFLICT (legacy_id) DO NOTHING` idempotency key + INSERT column |

### 🟡 Active Documentation (should update)

| File | Lines | Content |
|------|-------|---------|
| `backend/docs/postgresql-migration.md` | 38-40, 75-81 | "Legacy ID Tracing" section + "Legacy ID Mapping Algorithm" section |

### ⚪ Historical Plan Documents (leave as-is — completed work records)

| File | Count | Content |
|------|-------|---------|
| `plans/done/couchbase_to_postgresql_migration_blueprint.md` | 9 refs | Migration design blueprint |
| `plans/done/db-migration.md` | 14 refs | Migration task progress log |

### ✅ Not Affected (verified clean)

- **Go application code**: models, repositories, services, handlers — zero references
- **Frontend** (`frontend/src/`): no references (the "Legacy per-set workout types" comment in `types/index.ts:333` is unrelated)
- **Mobile** (`mobile/src/`): no references
- **Binary `.exe` files**: compiled artifacts containing the embedded SQL string — will auto-update on recompile

---

## Steps

### Step 1: Create migration `004` to drop the column from existing databases

Since migration `001` is already applied to existing dev databases, removing the line from `001` only affects fresh installs. A new migration drops the column from existing databases and adds a `UNIQUE` constraint on `exercises.name` (which the seed script needs for its new idempotency strategy).

**Create** `backend/migrations/004_drop_exercise_legacy_id.up.sql`:
```sql
ALTER TABLE exercises DROP COLUMN IF EXISTS legacy_id;
ALTER TABLE exercises ADD CONSTRAINT exercises_name_unique UNIQUE (name);
```

**Create** `backend/migrations/004_drop_exercise_legacy_id.down.sql`:
```sql
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_unique;
ALTER TABLE exercises ADD COLUMN legacy_id TEXT UNIQUE;
```

> **Why add `UNIQUE(name)`?** The seed script (`seed_exercises.sql`) currently uses `ON CONFLICT (legacy_id) DO NOTHING` for idempotency. Without `legacy_id`, it needs another unique conflict target. Exercise names should be unique anyway, making this a good practice change. The Go `CreateExercise` repo method doesn't specify `legacy_id` in its INSERT, so this won't break app-created exercises.

### Step 2: Remove `legacy_id` from the 3 schema definition files

- `backend/migrations/001_initial_schema.up.sql` — delete line 41 (`legacy_id TEXT UNIQUE,`)
- `backend/internal/testutils/migrations/001_initial_schema.up.sql` — delete line 41
- `backend/cmd/ensure-schema/main.go` — delete line 58

### Step 3: Update `seed_exercises.sql` (untracked)

- Remove `legacy_id` from the INSERT column list (line 34)
- Remove the `legacy_id` values (first field of each VALUES tuple, e.g. `'bench-press',`)
- Change `ON CONFLICT (legacy_id) DO NOTHING` → `ON CONFLICT (name) DO NOTHING` (line 109)
- Update the comment on line 3

### Step 4: Update `backend/docs/postgresql-migration.md`

- Remove/rewrite the "Legacy ID Tracing" section (lines 38-40)
- Update the "Legacy ID Mapping Algorithm" section (lines 75-81) to note that `legacy_id` was removed after migration completion

### Step 5: Leave `plans/done/` documents unchanged

These are historical records of completed migration work. Rewriting them would falsify the project history. They already live in `plans/done/` signaling their archival status.

### Step 6: Verify

- Run `go build ./...` in `backend/` to confirm compilation
- Run `go test ./...` to confirm tests pass (testutils migration is used by integration tests)
- Run `go run cmd/ensure-schema/main.go` to confirm schema verification still works

---

## Tradeoffs / Decisions

1. **`UNIQUE(name)` constraint** — Adding this as part of migration 004 gives the seed script a conflict target. Alternative: rewrite the seed script to use `WHERE NOT EXISTS` subqueries instead.

2. **`plans/done/` documents** — Leave unchanged as historical records (recommended).

3. **`seed_exercises.sql`** — Currently untracked in git. Update in place (recommended) or delete if throwaway.

---

## Impact Summary

- **Breaking change?** No. The column was never read or written by application code. Existing rows in the `legacy_id` column will be dropped, but no code references them.
- **Migration required?** Yes — migration `004` drops the column from existing databases. Fresh installs via migration `001` (updated) won't have it.
- **Frontend/Mobile impact?** None — no client references `legacy_id`.
