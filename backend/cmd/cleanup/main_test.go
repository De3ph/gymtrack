package main

import (
	"context"
	"fmt"
	"testing"
	"time"

	"gymtrack-backend/internal/testutils"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// seedExpiredUsers inserts n users soft-deleted at the given time and returns
// their IDs.
func seedExpiredUsers(t *testing.T, pool *pgxpool.Pool, prefix string, n int, deletedAt time.Time) []int {
	t.Helper()

	ctx := context.Background()
	ids := make([]int, 0, n)
	for i := 0; i < n; i++ {
		username := fmt.Sprintf("%s_%d", prefix, i)
		var id int
		err := pool.QueryRow(ctx, `
			INSERT INTO users (username, email, password_hash, role, status, profile, created_at, updated_at, deleted_at)
			VALUES ($1, $2, 'hash', 'athlete', 'deleted', '{}'::jsonb, NOW(), NOW(), $3)
			RETURNING user_id`,
			username, username+"@test.com", deletedAt,
		).Scan(&id)
		require.NoError(t, err, "seed %s", username)
		ids = append(ids, id)
	}
	return ids
}

func countUsers(t *testing.T, pool *pgxpool.Pool) int {
	t.Helper()

	var n int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM users`).Scan(&n))
	return n
}

// A dry run removes nothing, so an implementation that pages by repeating the
// same query never terminates: every page comes back full and identical. The
// exact batch size is the trigger — one short page ends the loop, but a full
// page followed by `continue` spins forever.
//
// The timeout is the assertion. The old code would have to be killed here.
func TestCleanup_DryRunTerminatesOnFullPage(t *testing.T) {
	pool, cleanupDB := testutils.SetupTestPostgresDB(t)
	defer cleanupDB()

	ctx := context.Background()
	cutoff := time.Now().Add(-time.Hour)
	deletedAt := cutoff.Add(-24 * time.Hour)

	const (
		expired   = 7
		batchSize = 3 // every page but the last is full
	)
	seedExpiredUsers(t, pool, "dryrun", expired, deletedAt)
	before := countUsers(t, pool)

	type result struct {
		total int
		err   error
	}
	done := make(chan result, 1)

	go func() {
		total, err := cleanup(ctx, pool, cutoff, true, batchSize)
		done <- result{total, err}
	}()

	var got result
	select {
	case got = <-done:
	case <-time.After(30 * time.Second):
		t.Fatalf("dry run did not terminate: it is re-reading the same page (%d rows, batch %d)", before, batchSize)
	}

	require.NoError(t, got.err)
	assert.Equal(t, expired, got.total, "dry run must report every expired user")
	assert.Equal(t, before, countUsers(t, pool), "dry run must not delete anything")
}

// Delete mode must visit each row exactly once. Paging by OFFSET would skip
// rows, because every batch removes the rows it just returned.
func TestCleanup_DeleteModeVisitsEveryRowOnce(t *testing.T) {
	pool, cleanupDB := testutils.SetupTestPostgresDB(t)
	defer cleanupDB()

	ctx := context.Background()
	cutoff := time.Now().Add(-time.Hour)
	deletedAt := cutoff.Add(-24 * time.Hour)

	const (
		expired   = 7
		batchSize = 3
	)
	seedExpiredUsers(t, pool, "deletemode", expired, deletedAt)
	before := countUsers(t, pool)
	require.Positive(t, before)

	total, err := cleanup(ctx, pool, cutoff, false, batchSize)
	require.NoError(t, err)

	assert.Equal(t, expired, total, "every expired user must be processed")
	assert.Equal(t, before-expired, countUsers(t, pool),
		"no user may be skipped or deleted twice")
}

// deleted_at is not unique — SoftDeleteUser stamps a wall-clock time, so many
// accounts can share one. A keyset of (deleted_at, user_id) must page past a
// run of identical timestamps without losing rows; a keyset of deleted_at alone
// would drop them at the batch boundary.
func TestCleanup_PagesPastIdenticalDeletedAtTimestamps(t *testing.T) {
	pool, cleanupDB := testutils.SetupTestPostgresDB(t)
	defer cleanupDB()

	ctx := context.Background()
	cutoff := time.Now().Add(-time.Hour)
	// A single shared timestamp for every row: the worst case for paging.
	shared := cutoff.Add(-24 * time.Hour)

	const (
		expired   = 10
		batchSize = 4
	)
	seedExpiredUsers(t, pool, "sametime", expired, shared)
	before := countUsers(t, pool)

	total, err := cleanup(ctx, pool, cutoff, false, batchSize)
	require.NoError(t, err)

	assert.Equal(t, expired, total)
	assert.Equal(t, before-expired, countUsers(t, pool),
		"rows sharing a deleted_at timestamp must not be skipped")
}

// Users soft-deleted after the cutoff are out of scope and must survive.
func TestCleanup_LeavesUnexpiredAndLiveUsersAlone(t *testing.T) {
	pool, cleanupDB := testutils.SetupTestPostgresDB(t)
	defer cleanupDB()

	ctx := context.Background()
	cutoff := time.Now().Add(-30 * 24 * time.Hour)

	expired := seedExpiredUsers(t, pool, "oldexpired", 3, cutoff.Add(-24*time.Hour))
	recent := seedExpiredUsers(t, pool, "recent", 3, time.Now().Add(-24*time.Hour))

	// A live (never soft-deleted) account.
	var liveID int
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, role, status, profile, created_at, updated_at)
		VALUES ('liveuser', 'liveuser@test.com', 'hash', 'athlete', 'active', '{}'::jsonb, NOW(), NOW())
		RETURNING user_id`).Scan(&liveID))

	total, err := cleanup(ctx, pool, cutoff, false, 2)
	require.NoError(t, err)
	assert.Equal(t, 3, total)

	var survivors int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE user_id = ANY($1)`, toInt32(recent)).Scan(&survivors))
	assert.Equal(t, len(recent), survivors, "recently soft-deleted users must survive")

	var gone int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE user_id = ANY($1)`, toInt32(expired)).Scan(&gone))
	assert.Zero(t, gone, "expired users must be removed")

	var live int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE user_id = $1`, liveID).Scan(&live))
	assert.Equal(t, 1, live, "a live account must never be touched")
}

func toInt32(ids []int) []int32 {
	out := make([]int32, len(ids))
	for i, id := range ids {
		out[i] = int32(id)
	}
	return out
}
