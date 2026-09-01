// Command migrate applies pending SQL migrations from backend/migrations/ to
// the database named by POSTGRES_DSN. Applied migrations are tracked in a
// schema_migrations table, so re-running is safe: already-applied files are
// skipped, pending files are applied in filename order (001, 002, ...) each in
// its own transaction together with its tracking row.
//
// Unlike cmd/ensure-schema (which drops the schema and applies migration 001
// only, for local resets), this tool is additive and safe to run on any
// environment.
package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	logger "gymtrack-backend/internal/infrastructure/log"

	"go.uber.org/zap"
)

func main() {
	logger.InitConsole()
	defer logger.Sync()

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:123456@localhost:5432/gymtrack?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		zap.L().Fatal("failed to connect", zap.Error(err))
	}
	defer pool.Close()
	ctx := context.Background()

	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		name TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		zap.L().Fatal("failed to create schema_migrations", zap.Error(err))
	}

	applied, err := appliedMigrations(ctx, pool)
	if err != nil {
		zap.L().Fatal("failed to read applied migrations", zap.Error(err))
	}

	files, err := migrationFiles()
	if err != nil {
		zap.L().Fatal("failed to list migrations", zap.Error(err))
	}

	pending := 0
	for _, file := range files {
		name := strings.TrimSuffix(filepath.Base(file), ".up.sql")
		if applied[name] {
			fmt.Printf("skip    %s (already applied)\n", name)
			continue
		}
		pending++
		if err := applyMigration(ctx, pool, name, file); err != nil {
			zap.L().Fatal("migration failed", zap.String("migration", name), zap.Error(err))
		}
		fmt.Printf("applied %s\n", name)
	}

	if pending == 0 {
		fmt.Println("database is up to date")
	}
}

// appliedMigrations returns the set of migration names recorded in
// schema_migrations.
func appliedMigrations(ctx context.Context, pool *pgxpool.Pool) (map[string]bool, error) {
	rows, err := pool.Query(ctx, `SELECT name FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		applied[name] = true
	}
	return applied, rows.Err()
}

// migrationFiles returns the sorted paths of all *.up.sql files in
// backend/migrations/.
func migrationFiles() ([]string, error) {
	matches, err := filepath.Glob("migrations/*.up.sql")
	if err != nil {
		return nil, err
	}
	sort.Strings(matches)
	if len(matches) == 0 {
		return nil, fmt.Errorf("no migrations found; run from the backend/ directory")
	}
	return matches, nil
}

// applyMigration runs one migration file and records it, atomically.
func applyMigration(ctx context.Context, pool *pgxpool.Pool, name, path string) error {
	sql, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, string(sql)); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO schema_migrations (name) VALUES ($1)`, name,
	); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
