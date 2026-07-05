package testutils

import (
	"context"
	_ "embed"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

//go:embed migrations/001_initial_schema.up.sql
var migrationSQL string

// SetupTestPostgresDB spins up a testcontainers PostgreSQL, applies migrations,
// seeds lookup tables, and returns a connection pool and cleanup function.
func SetupTestPostgresDB(t *testing.T) (*pgxpool.Pool, func()) {
	t.Helper()

	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	dsn, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}

	// Apply schema migration
	if _, err := pool.Exec(ctx, migrationSQL); err != nil {
		pool.Close()
		t.Fatalf("failed to apply schema: %v", err)
	}

	// Seed lookup tables
	seedLookupTables(ctx, pool)

	cleanup := func() {
		pool.Close()
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %v", err)
		}
	}

	return pool, cleanup
}

// seedLookupTables inserts standard values for reference tables.
func seedLookupTables(ctx context.Context, pool *pgxpool.Pool) {
	muscleGroups := []struct {
		code        string
		description string
	}{
		{"chest", "Pectorals"},
		{"back", "Latissimus dorsi and rhomboids"},
		{"shoulders", "Deltoids"},
		{"biceps", "Biceps brachii"},
		{"triceps", "Triceps brachii"},
		{"legs", "Quadriceps, hamstrings, and glutes"},
		{"abs", "Abdominal muscles"},
		{"glutes", "Gluteus maximus"},
	}

	for _, mg := range muscleGroups {
		_, _ = pool.Exec(ctx,
			"INSERT INTO muscle_groups (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
			mg.code, mg.description,
		)
	}

	equipment := []struct {
		code        string
		description string
	}{
		{"barbell", "Standard barbell"},
		{"dumbbell", "Dumbbells"},
		{"kettlebell", "Kettlebell"},
		{"cable", "Cable machine"},
		{"machine", "Weight machine"},
		{"bodyweight", "Bodyweight exercise"},
		{"band", "Resistance band"},
	}

	for _, eq := range equipment {
		_, _ = pool.Exec(ctx,
			"INSERT INTO equipment_definitions (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
			eq.code, eq.description,
		)
	}
}
