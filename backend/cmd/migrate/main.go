// Command migrate applies or rolls back SQL migrations against the database
// named by POSTGRES_DSN. Migrations are embedded into the binary so the tool
// runs without access to the source tree.
//
// Usage:
//
//	go run cmd/migrate/main.go                 # up (default)
//	go run cmd/migrate/main.go -dir up         # apply all pending
//	go run cmd/migrate/main.go -dir down       # roll back last applied
//	go run cmd/migrate/main.go -dir force 3    # mark version 3 (recovery)
package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"strconv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"gymtrack-backend/internal/config"
	migratelib "gymtrack-backend/internal/migrate"

	logger "gymtrack-backend/internal/infrastructure/log"

	"go.uber.org/zap"
)

func main() {
	logger.InitConsole()
	defer logger.Sync()

	dir := flag.String("dir", "up", "migration direction: up, down, or force <version>")
	flag.Parse()

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = config.DefaultPostgresDSN()
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

	switch *dir {
	case "up":
		err := m.Up()
		if err != nil && !errors.Is(err, migrate.ErrNoChange) {
			zap.L().Fatal("migration up failed", zap.Error(err))
		}
		if errors.Is(err, migrate.ErrNoChange) {
			fmt.Println("database is up to date")
		} else {
			fmt.Println("migrations applied")
		}
	case "down":
		err := m.Down()
		if err != nil && !errors.Is(err, migrate.ErrNoChange) {
			zap.L().Fatal("migration down failed", zap.Error(err))
		}
		if errors.Is(err, migrate.ErrNoChange) {
			fmt.Println("no migrations to roll back")
		} else {
			fmt.Println("last migration rolled back")
		}
	case "force":
		args := flag.Args()
		if len(args) != 1 {
			fmt.Fprintln(os.Stderr, "force requires a version argument: -dir force <version>")
			os.Exit(2)
		}
		version, perr := strconv.Atoi(args[0])
		if perr != nil {
			fmt.Fprintf(os.Stderr, "invalid version %q: %v\n", args[0], perr)
			os.Exit(2)
		}
		if ferr := m.Force(version); ferr != nil {
			zap.L().Fatal("force version failed", zap.Int("version", version), zap.Error(ferr))
		}
		fmt.Printf("forced schema_migrations version to %d\n", version)
	default:
		fmt.Fprintf(os.Stderr, "unknown -dir value %q (use up, down, or force)\n", *dir)
		os.Exit(2)
	}
}
