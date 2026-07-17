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
// # Migration Context
//
// These repos replace the original Couchbase implementations under
// internal/repository/couchbase/ (kept for rollback). The DI swap is done in
// internal/app/module.go -- one line change to revert.
package postgres
