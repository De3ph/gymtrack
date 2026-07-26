# Couchbase to PostgreSQL Migration

## 1. Migration Strategy

GymTrack migrated from Couchbase to PostgreSQL using an offline dump-transform-load approach. The migration reads all documents from Couchbase via N1QL queries, transforms them into relational rows, and inserts them into PostgreSQL within a single transaction.

There is no dual-write phase. This is a development environment with no production users, so the cutover is instantaneous: swap the DI wiring in `module.go` and restart.

The migration runner previously lived at `cmd/migrate/runner.go` (removed after migration completion). It read from Couchbase collections, built in-memory ID maps, inserted rows in FK-safe order, rewrote JSONB payloads that referenced old UUIDs, and verified row counts before committing.

## 2. Schema Changes (Couchbase to PostgreSQL)

### Document IDs

Couchbase uses UUID strings as document keys (`userId`, `exerciseId`, `workoutId`, etc.). PostgreSQL uses `SERIAL INTEGER` primary keys. The mapping is built at runtime during migration and is not persistent.

| Couchbase Key | PostgreSQL Column | Type |
|---|---|---|
| `userId` | `user_id` | `SERIAL INTEGER` |
| `exerciseId` | `id` | `SERIAL INTEGER` |
| `workoutId` | `id` | `SERIAL INTEGER` |
| `mealId` | `id` | `SERIAL INTEGER` |
| `planId` | `id` | `SERIAL INTEGER` |
| `measurementId` | `id` | `SERIAL INTEGER` |
| `commentId` | `id` | `SERIAL INTEGER` |

### JSONB Columns

Four columns store structured data as JSONB rather than decomposing into separate tables:

| Table | Column | Content |
|---|---|---|
| `workouts` | `exercises` | Array of exercise entries with sets, reps, weight |
| `meals` | `items` | Array of food items with nutritional info |
| `body_measurements` | `parts` | Object keyed by body part, each with a `value` field |
| `workout_plans` | `exercises` | Array of exercise entries for the plan template |

### Legacy ID Tracing

The `exercises` table includes a `legacy_id TEXT UNIQUE` column that stores the original Couchbase UUID. This allows tracing any PostgreSQL exercise back to its Couchbase origin and simplifies debugging if the JSONB rewrite misses an reference.

### Table Count

13 domain tables plus 2 lookup tables:

**Lookup tables** (no FK dependencies, integer PKs from Couchbase):
- `muscle_groups`
- `equipment_definitions`

**Domain tables:**
- `users`, `exercises`, `relationships`, `coaching_requests`, `trainer_reviews`, `trainer_availabilities`, `workout_plans`, `workouts`, `meals`, `body_measurements`, `comments`, `workout_plan_assignments`, `invitations`

### Indexes

**GIN indexes** on JSONB columns for containment queries:
- `workout_plans_exercises_gin`
- `workouts_exercises_gin`
- `meals_items_gin`
- `body_measurements_parts_gin`

**Expression indexes** on `body_measurements.parts` for chart queries. Each supported body part gets a partial index that drills into the nested JSONB structure:

```sql
CREATE INDEX idx_bm_chest ON body_measurements
    (athlete_id, ((parts->'chest'->>'value')::numeric))
    WHERE parts ? 'chest';
```

Thirteen body parts are indexed: chest, waist, hips, bicepLeft, bicepRight, forearmLeft, forearmRight, thighLeft, thighRight, calfLeft, calfRight, neck, shoulder.

### Foreign Key Constraints

Couchbase had no referential integrity. PostgreSQL enforces FK constraints on all relationships. The migration runner inserts tables in dependency order to satisfy these constraints within a single transaction.

## 3. Legacy ID Mapping Algorithm

The migration runs inside a single PostgreSQL transaction. All ID maps are held in memory. If any step fails, the entire transaction rolls back.

### Phase 1: Migrate exercises, build exerciseIDMap

Exercises are migrated first (after users and lookup tables). Each Couchbase `exerciseId` (UUID string) is stored in `exercises.legacy_id`. The new SERIAL integer ID is captured via `RETURNING id` and stored in `exerciseIDMap[oldUUID] = newIntegerID`.

### Phase 2: Migrate workout_plans with empty exerciseIDMap

Workout plan exercises reference exercises by UUID. During plan migration, the `rewriteExercisesJSONB` function is called with `exerciseIDMap = nil`, so exercise references pass through unchanged as UUIDs.

### Phase 3: Migrate workouts with full exerciseIDMap

Workout exercises are rewritten. The `rewriteExercisesJSONB` function iterates each element in the JSONB array, finds the `exerciseId` field (a UUID string), looks it up in `exerciseIDMap`, and replaces it with the new integer. If any UUID is missing from the map, the migration fails with an explicit error.

### Phase 4: Migrate remaining tables in FK order

After exercises and workouts, the remaining tables are inserted in order: meals, body_measurements, comments, workout_plan_assignments, invitations. Each uses its own ID map (e.g., `workoutIDMap`, `mealIDMap`) built during insertion.

Comments require a two-pass approach: first all comments are inserted (building `commentIDMap`), then a second pass updates `parent_comment_id` for threaded comments.

### Phase 5: Verify row counts

After commit, `verifyCounts` queries both Couchbase and PostgreSQL for each table and prints the counts. Any mismatch is logged as `COUNT MISMATCH`. This is a sanity check, not an atomic rollback point.

### Complete FK-safe insertion order

```
muscle_groups, equipment_definitions, users, relationships,
coaching_requests, trainer_reviews, trainer_availabilities,
exercises, workout_plans, workouts, meals, body_measurements,
comments, workout_plan_assignments, invitations
```

### The rewriteExercisesJSONB function

```go
func rewriteExercisesJSONB(raw interface{}, exerciseIDMap map[string]int) ([]byte, error)
```

Takes the raw Couchbase JSON (interface{}) and the exercise ID map. Marshals to JSON, unmarshals into `[]map[string]interface{}`, iterates each exercise entry, replaces `exerciseId` (UUID string) with the mapped integer, then re-marshals to `[]byte` for PostgreSQL JSONB insertion. When `exerciseIDMap` is nil (used for workout_plans), the function skips the rewrite and returns the original JSON.

## 4. JSONB Query Patterns

### Writing JSONB

Go structs are marshaled to `[]byte` and inserted directly into JSONB columns. The `MarshalToJSONB` helper wraps `json.Marshal` with error context:

```go
exercisesJSON, err := postgres.MarshalToJSONB(workout.Exercises)
// ...
_, err = tx.Exec(ctx,
    "INSERT INTO workouts (athlete_id, date, exercises) VALUES ($1, $2, $3)",
    athleteID, date, exercisesJSON,
)
```

The pgx driver accepts `[]byte` as a JSONB parameter without any cast.

### Reading JSONB

JSONB columns are scanned into `[]byte` slices, then deserialized:

```go
var exercisesRaw []byte
err := row.Scan(&exercisesRaw)
// ...
var exercises []ExerciseEntry
err := postgres.UnmarshalFromJSONB(exercisesRaw, &exercises)
```

The `UnmarshalFromJSONB` helper handles nil/empty payloads gracefully, returning nil without error so that empty JSONB columns don't break deserialization.

### Migration-specific patterns

During migration, Couchbase documents arrive as `map[string]interface{}`. The runner marshals nested objects directly:

```go
profileJSON, err := json.Marshal(doc["profile"])
// Insert as JSONB
_, err = tx.Exec(ctx,
    "INSERT INTO users (profile) VALUES ($1)",
    profileJSON,
)
```

### Querying JSONB

For array containment queries, use GIN indexes:

```sql
SELECT * FROM workouts
WHERE exercises @> '[{"exerciseId": 42}]'::jsonb;
```

For body measurement chart queries, the expression indexes allow efficient filtering by body part value:

```sql
SELECT date, (parts->'chest'->>'value')::numeric AS chest
FROM body_measurements
WHERE athlete_id = $1 AND parts ? 'chest'
ORDER BY date;
```

## 5. Rollback Procedure

Rolling back to Couchbase is a one-line change in `module.go`.

### Step 1: Swap DI wiring

In `internal/app/module.go`, change the `RepositoryModule` to provide Couchbase repositories instead of PostgreSQL:

```go
// Before (PostgreSQL):
func(pool *pgxpool.Pool) repositories.UserRepository {
    return postgres.NewPostgresUserRepository(pool)
}

// After (Couchbase):
func(cluster *gocb.Cluster) repositories.UserRepository {
    return couchbase.NewCouchbaseUserRepository(cluster)
}
```

Each of the 14 repository providers follows the same pattern: swap the constructor from `postgres.NewPostgresXxxRepository(pool)` to `couchbase.NewCouchbaseXxxRepository(cluster)`.

### Step 2: Keep the couchbase directory intact

The `internal/repository/couchbase/` directory is never deleted. All Couchbase repository implementations remain in the codebase, ready to be reactivated.

### Step 3: Couchbase dependencies stay in go.mod

The `github.com/couchbase/gocb/v2` dependency remains in `go.mod`. It compiles but is unused until the swap.

### Step 4: Switch environment variables

In `.env`, swap from `POSTGRES_DSN` back to the Couchbase connection variables:

```
COUCHBASE_CONNECTION_STRING=couchbase://localhost
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=password
COUCHBASE_BUCKET=gymtrack
```

Remove or comment out `POSTGRES_DSN`.

### Step 5: Restart

```
go run cmd/server/main.go
```

The application starts against Couchbase with no code changes beyond the `module.go` swap.

## 6. Connection Pool Configuration

The PostgreSQL connection pool is configured in `internal/config/postgres.go` using `pgxpool`:

| Setting | Value | Purpose |
|---|---|---|
| `MaxConns` | 25 | Upper bound on open connections |
| `MinConns` | 2 | Connections maintained even when idle |
| `MaxConnLifetime` | 30 minutes | Connections are closed and replaced after this duration |
| `MaxConnIdleTime` | 5 minutes | Idle connections beyond MinConns are closed after this duration |

The DSN is read from the `POSTGRES_DSN` environment variable. The pool is created once at startup and injected into all repositories via the fx dependency graph in `module.go`.

## 7. Running the Migration

Apply the schema, then run the data migration:

```bash
# Apply schema
go run ./cmd/migrate

# Or manually with psql
psql -U postgres -d gymtrack -f migrations/001_initial_schema.up.sql
```

The migration runner connects to both Couchbase and PostgreSQL. Ensure both are running and the environment variables are set before executing.
