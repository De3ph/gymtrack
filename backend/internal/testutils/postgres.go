package testutils

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	migratelib "gymtrack-backend/internal/migrate"
)

// applyMigrations runs all pending migrations using the embedded migration FS.
func applyMigrations(dsn string) error {
	src, err := iofs.New(migratelib.MigrationsFS(), ".")
	if err != nil {
		return err
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, dsn)
	if err != nil {
		return err
	}
	defer func() {
		sErr, dErr := m.Close()
		if sErr != nil {
			_ = dErr
		}
	}()
	err = m.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

// SetupTestPostgresDB returns a PostgreSQL connection pool for testing.
//
// It tries two strategies in order:
//  1. POSTGRES_TEST_DSN env var — if set, connects directly (no Docker needed).
//  2. testcontainers — spins up a postgres:16-alpine container.
//
// The cleanup function closes the pool and (for testcontainers) terminates the
// container.
func SetupTestPostgresDB(t testing.TB) (*pgxpool.Pool, func()) {
	t.Helper()

	ctx := context.Background()

	// Strategy 1: direct DSN from env (CI / non-Docker environments).
	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		pool, err := pgxpool.New(ctx, dsn)
		if err != nil {
			t.Fatalf("failed to connect using POSTGRES_TEST_DSN: %v", err)
		}
		// Reset schema — drop all tables then re-apply (fresh DB per test run).
		if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
			pool.Close()
			t.Fatalf("failed to reset schema via POSTGRES_TEST_DSN: %v", err)
		}
		if err := applyMigrations(dsn); err != nil {
			pool.Close()
			t.Fatalf("failed to apply schema via POSTGRES_TEST_DSN: %v", err)
		}
		seedLookupTables(ctx, pool)
		return pool, func() { pool.Close() }
	}

	// Strategy 2: testcontainers (default, requires Docker).
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

	if err := applyMigrations(dsn); err != nil {
		pgContainer.Terminate(ctx)
		t.Fatalf("failed to apply schema: %v", err)
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
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
