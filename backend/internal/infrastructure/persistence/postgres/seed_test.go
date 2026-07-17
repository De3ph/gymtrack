package postgres

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// seedMigrationPath resolves the migration file relative to this source file.
func seedMigrationPath() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "..", "migrations", "001_initial_schema.up.sql")
}

// setupSeedDB returns a pool connected to a fresh PostgreSQL database for
// testing SeedLookupTables. Uses POSTGRES_TEST_DSN env var if set, otherwise
// spins up a testcontainers instance.
func setupSeedDB(t *testing.T) (*pgxpool.Pool, func()) {
	t.Helper()
	ctx := context.Background()

	sql, err := os.ReadFile(seedMigrationPath())
	require.NoError(t, err, "read migration file")

	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		pool, err := pgxpool.New(ctx, dsn)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)
		require.NoError(t, err, "reset schema")
		_, err = pool.Exec(ctx, string(sql))
		require.NoError(t, err, "apply schema")
		return pool, func() { pool.Close() }
	}

	container, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("seedtest"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err, "start postgres container")

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, string(sql))
	require.NoError(t, err, "apply schema")

	cleanup := func() {
		pool.Close()
		_ = container.Terminate(ctx)
	}
	return pool, cleanup
}

func TestSeedLookupTables(t *testing.T) {
	pool, cleanup := setupSeedDB(t)
	defer cleanup()
	ctx := context.Background()

	err := SeedLookupTables(ctx, pool)
	require.NoError(t, err, "seed lookup tables")

	var mgCount int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM muscle_groups").Scan(&mgCount)
	require.NoError(t, err)
	assert.Equal(t, 7, mgCount)

	var eqCount int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM equipment_definitions").Scan(&eqCount)
	require.NoError(t, err)
	assert.Equal(t, 8, eqCount)

	var desc string
	err = pool.QueryRow(ctx, "SELECT description FROM muscle_groups WHERE id = $1", 1).Scan(&desc)
	require.NoError(t, err)
	assert.Equal(t, "Chest", desc)

	err = pool.QueryRow(ctx, "SELECT description FROM equipment_definitions WHERE id = $1", 8).Scan(&desc)
	require.NoError(t, err)
	assert.Equal(t, "Other", desc)

	// Idempotent: second run must not error or change counts.
	err = SeedLookupTables(ctx, pool)
	require.NoError(t, err, "re-seed should be idempotent")

	var mgCount2 int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM muscle_groups").Scan(&mgCount2)
	require.NoError(t, err)
	assert.Equal(t, 7, mgCount2)

	var eqCount2 int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM equipment_definitions").Scan(&eqCount2)
	require.NoError(t, err)
	assert.Equal(t, 8, eqCount2)
}
