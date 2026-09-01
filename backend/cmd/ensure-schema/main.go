// Command ensure-schema performs a destructive local reset: it drops the
// public schema, applies all up migrations from a clean slate, and seeds the
// lookup tables. Use it when you want a fresh development database.
//
// In production prefer cmd/migrate, which is non-destructive.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"

	"gymtrack-backend/internal/config"
	logger "gymtrack-backend/internal/infrastructure/log"
	migratelib "gymtrack-backend/internal/migrate"

	"go.uber.org/zap"
)

func main() {
	logger.InitConsole()
	defer logger.Sync()

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = config.DefaultPostgresDSN()
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		zap.L().Fatal("failed to connect", zap.Error(err))
	}
	defer pool.Close()

	zap.L().Info("dropping public schema...")
	if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
		zap.L().Fatal("failed to drop schema", zap.Error(err))
	}

	src, err := iofs.New(migratelib.MigrationsFS(), ".")
	if err != nil {
		zap.L().Fatal("failed to create migration source", zap.Error(err))
	}

	m, err := migrate.NewWithSourceInstance("iofs", src, dsn)
	if err != nil {
		zap.L().Fatal("failed to initialize migrator", zap.Error(err))
	}
	defer func() {
		sErr, dErr := m.Close()
		if sErr != nil {
			zap.L().Warn("source close error", zap.Error(sErr))
		}
		if dErr != nil {
			zap.L().Warn("database close error", zap.Error(dErr))
		}
	}()

	zap.L().Info("applying all up migrations...")
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		zap.L().Fatal("failed to apply migrations", zap.Error(err))
	}
	zap.L().Info("migrations applied successfully")

	zap.L().Info("seeding lookup tables...")
	if err := seedLookupTables(ctx, pool); err != nil {
		zap.L().Fatal("failed to seed lookup tables", zap.Error(err))
	}
	zap.L().Info("lookup tables seeded")

	fmt.Println()
	fmt.Println("[OK] Schema reset, migrated, and seeded")
	fmt.Println("  Database: gymtrack")
	fmt.Println("  Tables: 15")
	fmt.Println("  Seed data: muscle_groups, equipment_definitions")
}

func seedLookupTables(ctx context.Context, pool *pgxpool.Pool) error {
	muscleGroups := []string{"chest", "back", "shoulders", "biceps", "triceps", "legs", "abs", "glutes"}
	for _, code := range muscleGroups {
		if _, err := pool.Exec(ctx,
			"INSERT INTO muscle_groups (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
			code, code,
		); err != nil {
			return err
		}
	}

	equipment := []string{"barbell", "dumbbell", "kettlebell", "cable", "machine", "bodyweight", "band"}
	for _, code := range equipment {
		if _, err := pool.Exec(ctx,
			"INSERT INTO equipment_definitions (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
			code, code,
		); err != nil {
			return err
		}
	}
	return nil
}
