// Package postgres provides PostgreSQL implementations of all domain repository
// interfaces. Each Postgres*Repository receives a *pgxpool.Pool via constructor
// injection and implements the corresponding repositories.* interface from
// internal/domain/repositories/.
//
// # JSONB Columns
//
// Several tables use JSONB columns for flexible embedded data:
//   - workouts.exercises      -> []models.WorkoutExercise (NOT NULL)
//   - meals.items             -> []models.FoodItem (NOT NULL)
//   - body_measurements.parts -> map[string]models.BodyMeasurementPart (NOT NULL DEFAULT '{}')
//   - workout_plans.exercises -> []models.WorkoutPlanExercise (NOT NULL DEFAULT '[]')
//   - users.profile           -> models.UserProfile (NOT NULL DEFAULT '{}')
//
// Use the typed Marshal*/Unmarshal* helpers in jsonb.go for all JSONB
// conversions (e.g. MarshalWorkoutExercises/UnmarshalWorkoutExercises).
// The low-level MarshalToJSONB/UnmarshalFromJSONB primitives in helpers.go
// are internal to that typed layer.
//
// # Error Mapping
//
// PostgreSQL pgx.ErrNoRows is mapped to domainerrors.ErrNotFound to preserve
// the same error contract the service layer expects from repositories.
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
package postgres
