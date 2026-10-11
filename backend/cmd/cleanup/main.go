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

	totalDeleted, err := cleanup(ctx, pool, cutoff, dryRun, batchSize)
	if err != nil {
		return err
	}

	zap.L().Info("cleanup complete",
		zap.Int("total_deleted", totalDeleted),
		zap.Bool("dry_run", dryRun),
	)
	return nil
}

// cleanup deletes every user soft-deleted before cutoff, in batches, and
// returns how many rows it processed.
//
// The cursor advances every iteration regardless of mode. That is what makes
// dry-run terminate: because it removes nothing, there is no window movement to
// page past, so without a cursor it re-reads the same first page forever.
func cleanup(ctx context.Context, pool *pgxpool.Pool, cutoff time.Time, dryRun bool, batchSize int) (int, error) {
	total := 0
	cursor := expiredCursor{}

	for {
		ids, next, err := fetchExpiredUserIDs(ctx, pool, cutoff, cursor, batchSize)
		if err != nil {
			return total, fmt.Errorf("query expired users: %w", err)
		}

		if len(ids) == 0 {
			break
		}

		if dryRun {
			zap.L().Info("would delete users", zap.Int("count", len(ids)), zap.Ints("user_ids", ids))
			total += len(ids)
			cursor = next
			if len(ids) < batchSize {
				break
			}
			continue
		}

		if err := deleteUsersInBatch(ctx, pool, ids); err != nil {
			return total, fmt.Errorf("delete batch: %w", err)
		}

		total += len(ids)
		zap.L().Info("batch deleted", zap.Int("count", len(ids)))
		cursor = next

		if len(ids) < batchSize {
			break
		}
	}

	return total, nil
}

// expiredCursor is a position in the (deleted_at, user_id) ordering, used as a
// keyset rather than an OFFSET.
//
// OFFSET cannot page a result set that is being modified. In delete mode each
// batch removes the rows it just returned, so every subsequent page would skip
// that many rows; in dry-run mode nothing is removed, so the same page is
// returned forever and the loop never terminates.
//
// keyset holds its position instead, so both modes advance. The zero value
// sorts before every real row and therefore matches everything on the first
// page. user_id is part of the key because deleted_at is not unique: without it
// a batch boundary landing on a repeated timestamp would silently drop rows.
type expiredCursor struct {
	deletedAt time.Time
	userID    int
}

// fetchExpiredUserIDs returns up to limit expired user IDs positioned strictly
// after `after`, together with the cursor to resume from.
//
// `after` is passed by value so the caller's position is never mutated; the
// zero value starts at the beginning.
func fetchExpiredUserIDs(ctx context.Context, pool *pgxpool.Pool, cutoff time.Time, after expiredCursor, limit int) ([]int, expiredCursor, error) {
	query := `
		SELECT user_id, deleted_at
		FROM users
		WHERE deleted_at < $1
		  AND (deleted_at, user_id) > ($2, $3)
		ORDER BY deleted_at, user_id
		LIMIT $4`

	rows, err := pool.Query(ctx, query, cutoff, after.deletedAt, after.userID, limit)
	if err != nil {
		return nil, expiredCursor{}, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var ids []int
	next := after
	for rows.Next() {
		var (
			id        int
			deletedAt time.Time
		)
		if err := rows.Scan(&id, &deletedAt); err != nil {
			return nil, expiredCursor{}, fmt.Errorf("scan user_id: %w", err)
		}
		ids = append(ids, id)
		next = expiredCursor{deletedAt: deletedAt, userID: id}
	}
	if err := rows.Err(); err != nil {
		return nil, expiredCursor{}, fmt.Errorf("row iteration: %w", err)
	}
	return ids, next, nil
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
