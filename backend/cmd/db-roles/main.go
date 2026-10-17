// Command db-roles provisions the least-privilege PostgreSQL roles used by the
// API and the migration runner.
//
// It connects as an admin (superuser) using POSTGRES_ADMIN_DSN (falling back to
// POSTGRES_DSN) and creates/updates:
//
//	gymtrack_app      - DML-only role the API connects as
//	gymtrack_migrate  - owner role the migration runner connects as
//
// Role names and passwords come from APP_DB_USER / APP_DB_PASSWORD and
// MIGRATE_DB_USER / MIGRATE_DB_PASSWORD. The command is idempotent; run it
// before cmd/migrate on every deployment.
//
//	go run cmd/db-roles/main.go
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"

	"gymtrack-backend/internal/dbroles"
	logger "gymtrack-backend/internal/infrastructure/log"

	"go.uber.org/zap"
)

func main() {
	logger.InitConsole()
	defer logger.Sync()

	adminDSN := firstNonEmpty(os.Getenv("POSTGRES_ADMIN_DSN"), os.Getenv("POSTGRES_DSN"))
	if adminDSN == "" {
		zap.L().Fatal("POSTGRES_ADMIN_DSN (or POSTGRES_DSN) is required")
	}

	opts := dbroles.Options{
		AppRole:         getEnv("APP_DB_USER", "gymtrack_app"),
		AppPassword:     os.Getenv("APP_DB_PASSWORD"),
		MigrateRole:     getEnv("MIGRATE_DB_USER", "gymtrack_migrate"),
		MigratePassword: os.Getenv("MIGRATE_DB_PASSWORD"),
	}
	// Fail fast on missing role secrets before opening a connection.
	if err := opts.ValidateRoles(); err != nil {
		zap.L().Fatal("invalid role configuration", zap.Error(err))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	conn, err := pgx.Connect(ctx, adminDSN)
	if err != nil {
		zap.L().Fatal("failed to connect with admin DSN", zap.Error(err))
	}
	defer func() { _ = conn.Close(context.Background()) }()

	// The database name is taken from the admin connection so the grants match
	// the database the migrations will run against.
	opts.Database = conn.Config().Database
	if opts.Database == "" {
		zap.L().Fatal("admin DSN does not include a database name")
	}

	// Validated after the database name is known (Validate checks it too).
	if err := opts.Validate(); err != nil {
		zap.L().Fatal("invalid role configuration", zap.Error(err))
	}

	if err := dbroles.Apply(ctx, conn, opts); err != nil {
		zap.L().Fatal("failed to provision database roles",
			zap.String("appRole", opts.AppRole),
			zap.String("migrateRole", opts.MigrateRole),
			zap.String("database", opts.Database),
			zap.Error(err))
	}

	fmt.Printf("provisioned roles %s (DML) and %s (owner) on database %s\n",
		opts.AppRole, opts.MigrateRole, opts.Database)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
