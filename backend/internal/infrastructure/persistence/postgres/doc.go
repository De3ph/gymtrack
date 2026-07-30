// Package postgres provides PostgreSQL implementations of all domain repository
// interfaces. Each Postgres*Repository receives a *pgxpool.Pool via constructor
// injection and implements the corresponding repositories.* interface from
// internal/domain/repositories/.
//
// # JSONB Columns
//
// Several tables use JSONB columns for flexible embedded data:
//   - workouts.exercises   -> []models.WorkoutExercise
//   - meals.items          -> []models.MealItem
//   - body_measurements.parts -> []models.BodyPath
//   - workout_plans.exercises -> []models.PlannedExercise
//
// Use MarshalToJSONB/UnmarshalFromJSONB in helpers.go for all JSONB conversions.
//
// # Error Mapping
//
// PostgreSQL pgx.ErrNoRows is mapped to domainerrors.ErrNotFound to preserve
// the same error contract the service layer expects from Couchbase repos.
// UPDATE/DELETE with zero rows affected also returns domainerrors.ErrNotFound.
//
// # Connection Management
//
// The pool is configured in internal/config/postgres.go via ProvidePostgresPool.
// Tests use SetupTestPostgresDB from internal/testutils/postgres.go which
// accepts POSTGRES_TEST_DSN.
//
// # Cache Layer
//
// Read-heavy repositories (user, exercise, muscle group, equipment,
// relationship, trainer profile) are wrapped by caching decorators in the
// *_cached.go files. Each decorator composes a domain repository with a
// cache.Cache[T] supplied by internal/infrastructure/cache/factory.go, which
// honours the CACHE_ENABLED env flag (NoOpCache when disabled).
//
// # Migration Context
//
// PostgreSQL is the sole persistence backend; the original Couchbase
// implementations have been removed. Repository wiring lives in
// internal/app/module.go.
package postgres
