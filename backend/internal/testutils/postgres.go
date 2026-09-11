package testutils

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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
// Each call creates (or reuses) an isolated database so tests can run in
// parallel across packages without DROPPING each other's schema:
//
//  1. POSTGRES_TEST_DSN env var — if set, the database named in the DSN is
//     used as a maintenance DB. A fresh database "<base>_t<N>" is created
//     per call (migrations applied), and dropped on cleanup.
//  2. testcontainers — spins up a postgres:16-alpine container.
//
// The cleanup function drops the per-test database and closes the pool
// (and, for testcontainers, terminates the container).
func SetupTestPostgresDB(t testing.TB) (*pgxpool.Pool, func()) {
	t.Helper()

	ctx := context.Background()

	// Strategy 1: direct DSN from env (CI / non-Docker environments).
	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		pool, cleanup := setupIsolatedDSNDB(t, ctx, dsn)
		seedLookupTables(ctx, pool)
		return pool, cleanup
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

// setupIsolatedDSNDB creates a fresh database derived from the given DSN,
// applies migrations to it and returns a pool plus a cleanup that drops it.
// The DSN's database is used as the maintenance connection target and is
// never dropped — only the derived per-test database is.
func setupIsolatedDSNDB(t testing.TB, ctx context.Context, dsn string) (*pgxpool.Pool, func()) {
	t.Helper()

	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("failed to parse POSTGRES_TEST_DSN: %v", err)
	}
	baseDB := cfg.Database
	if baseDB == "" {
		baseDB = "postgres"
	}
	testDB := nextTestDBName(baseDB)

	cfg.Database = baseDB
	maintDSN := cfg.ConnString()

	// Drop leftover per-test databases from prior runs (best-effort, once/process).
	dropOldTestDBs(ctx, maintDSN, baseDB+"_t_%")

	maintConn, err := pgx.Connect(ctx, maintDSN)
	if err != nil {
		t.Fatalf("failed to connect using POSTGRES_TEST_DSN: %v", err)
	}
	// CREATE DATABASE cannot run in a transaction; use a bare connection.
	if _, err := maintConn.Exec(ctx, `CREATE DATABASE `+pgx.Identifier{testDB}.Sanitize()); err != nil {
		maintConn.Close(ctx)
		t.Fatalf("failed to create isolated test database %q: %v", testDB, err)
	}
	maintConn.Close(ctx)

	cfg.Database = testDB
	testDSN := cfg.ConnString()

	if err := applyMigrations(testDSN); err != nil {
		dropDatabase(ctx, maintDSN, testDB)
		t.Fatalf("failed to apply schema to %q: %v", testDB, err)
	}

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		dropDatabase(ctx, maintDSN, testDB)
		t.Fatalf("failed to create pool for %q: %v", testDB, err)
	}

	return pool, func() {
		pool.Close()
		dropDatabase(ctx, maintDSN, testDB)
	}
}

// nextTestDBName derives a unique, lowercase, identifier-safe database name
// from the maintenance database name. A random UUID suffix guarantees
// uniqueness across separate `go test` runs (and crashed runs) — so two
// concurrent test binaries never collide, and a leftover database from a
// prior run is never silently reused.
func nextTestDBName(base string) string {
	safe := strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r + ('a' - 'A')
		case r >= '0' && r <= '9':
			return r
		default:
			return '_'
		}
	}, base)
	if safe == "" {
		safe = "testdb"
	}
	return fmt.Sprintf("%s_t_%s", safe, uuid.NewString())
}

// dropOldTestDBs removes leftover per-test databases from prior runs. Called
// once per process before any new test database is created. Best-effort.
var droppedOldDBs sync.Once

func dropOldTestDBs(ctx context.Context, maintDSN, pattern string) {
	droppedOldDBs.Do(func() {
		conn, err := pgx.Connect(ctx, maintDSN)
		if err != nil {
			return
		}
		defer conn.Close(ctx)
		rows, err := conn.Query(ctx, `SELECT datname FROM pg_database WHERE datname LIKE $1`, pattern)
		if err != nil {
			return
		}
		defer rows.Close()
		var dbs []string
		for rows.Next() {
			var db string
			if err := rows.Scan(&db); err == nil {
				dbs = append(dbs, db)
			}
		}
		for _, db := range dbs {
			ident := pgx.Identifier{db}.Sanitize()
			_, _ = conn.Exec(ctx, `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, db)
			_, _ = conn.Exec(ctx, `DROP DATABASE IF EXISTS `+ident)
		}
	})
}

// dropDatabase terminates stray backends on the test database and drops it.
// Failures are best-effort: dropping may race with pool shutdown on Windows,
// so errors are intentionally ignored.
func dropDatabase(ctx context.Context, maintDSN, db string) {
	conn, err := pgx.Connect(ctx, maintDSN)
	if err != nil {
		return
	}
	defer conn.Close(ctx)
	ident := pgx.Identifier{db}.Sanitize()
	_, _ = conn.Exec(ctx, `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, db)
	_, _ = conn.Exec(ctx, `DROP DATABASE IF EXISTS `+ident)
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
