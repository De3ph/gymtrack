package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"go.uber.org/zap"

	logger "gymtrack-backend/internal/infrastructure/log"
)

func main() {
	logger.InitConsole()
	defer logger.Sync()

	dryRun := flag.Bool("dry-run", false, "Log what would be deleted without executing")
	batchSize := flag.Int("batch", 100, "Number of users to process per batch")
	beforeDuration := flag.Duration("before", 720*time.Hour, "Duration before now to consider expired (default 30 days)")
	flag.Parse()

	if err := run(*dryRun, *batchSize, *beforeDuration); err != nil {
		zap.L().Fatal("cleanup failed", zap.Error(err))
	}
}

func run(dryRun bool, batchSize int, beforeDuration time.Duration) error {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	ctx := context.Background()

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:123456@localhost:5432/gymtrack?sslmode=disable"
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()

	cutoff := time.Now().Add(-beforeDuration)
	zap.L().Info("starting cleanup",
		zap.Bool("dry_run", dryRun),
		zap.Int("batch_size", batchSize),
		zap.Time("cutoff", cutoff),
	)

	totalDeleted := 0

	for {
		ids, err := fetchExpiredUserIDs(ctx, pool, cutoff, batchSize)
		if err != nil {
			return fmt.Errorf("query expired users: %w", err)
		}

		if len(ids) == 0 {
			break
		}

		if dryRun {
			zap.L().Info("would delete users", zap.Int("count", len(ids)), zap.Ints("user_ids", ids))
			totalDeleted += len(ids)
			if len(ids) < batchSize {
				break
			}
			continue
		}

		if err := deleteUsersInBatch(ctx, pool, ids); err != nil {
			return fmt.Errorf("delete batch: %w", err)
		}

		totalDeleted += len(ids)
		zap.L().Info("batch deleted", zap.Int("count", len(ids)))

		if len(ids) < batchSize {
			break
		}
	}

	zap.L().Info("cleanup complete",
		zap.Int("total_deleted", totalDeleted),
		zap.Bool("dry_run", dryRun),
	)
	return nil
}

func fetchExpiredUserIDs(ctx context.Context, pool *pgxpool.Pool, cutoff time.Time, limit int) ([]int, error) {
	query := `SELECT user_id FROM users WHERE deleted_at < $1 ORDER BY deleted_at LIMIT $2`
	rows, err := pool.Query(ctx, query, cutoff, limit)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan user_id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration: %w", err)
	}
	return ids, nil
}

func deleteUsersInBatch(ctx context.Context, pool *pgxpool.Pool, ids []int) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, id := range ids {
		if _, err := tx.Exec(ctx, `DELETE FROM users WHERE user_id = $1`, id); err != nil {
			return fmt.Errorf("delete user %d: %w", id, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
