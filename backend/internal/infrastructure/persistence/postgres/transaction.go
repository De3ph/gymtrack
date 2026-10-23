package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// querier is the subset of pgx that both a pool and a transaction implement.
// Repositories resolve it per call, so a statement issued while a transaction
// is active runs on that transaction's connection and participates in the same
// commit or rollback.
type querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type transactionContextKey struct{}

// transactionState is the value carried by the context while a transaction is
// open. afterCommit holds work (cache invalidation) that must not run before
// the commit succeeds.
type transactionState struct {
	tx          pgx.Tx
	afterCommit []func()
}

const (
	transactionCommitTimeout   = 10 * time.Second
	transactionRollbackTimeout = 5 * time.Second
)

// PostgresTransactionManager runs units of work in a PostgreSQL transaction.
type PostgresTransactionManager struct {
	pool *pgxpool.Pool
}

// NewPostgresTransactionManager creates a transaction manager backed by pool.
func NewPostgresTransactionManager(pool *pgxpool.Pool) *PostgresTransactionManager {
	return &PostgresTransactionManager{pool: pool}
}

// WithinTransaction runs fn in a transaction and commits it when fn succeeds.
// When ctx already carries an open transaction the call joins it, so a service
// used from two entry points (accepting a request and accepting a code) can
// share one atomic unit without nested transactions.
func (m *PostgresTransactionManager) WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	if state, ok := ctx.Value(transactionContextKey{}).(*transactionState); ok && state != nil {
		return fn(ctx)
	}

	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	state := &transactionState{tx: tx}
	txCtx := context.WithValue(ctx, transactionContextKey{}, state)

	committed := false
	defer func() {
		if committed {
			return
		}
		// The request context is usually the reason we are here (cancellation
		// or a failed statement), so rolling back on it would fail immediately
		// and leave the connection holding locks until the pool reclaims it.
		rollbackCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), transactionRollbackTimeout)
		defer cancel()
		_ = tx.Rollback(rollbackCtx)
	}()

	if err := fn(txCtx); err != nil {
		return err
	}

	// Committing on the request context would throw away a unit of work that
	// already succeeded whenever the client disconnects between the last
	// statement and the commit, reporting a failure for writes that never land.
	commitCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), transactionCommitTimeout)
	defer cancel()
	if err := tx.Commit(commitCtx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	committed = true

	for _, hook := range state.afterCommit {
		hook()
	}
	return nil
}

// isWithinTransaction reports whether ctx carries an open transaction managed
// by this package.
//
// Cache decorators use it to bypass the shared cache: a miss inside a
// transaction would run the SELECT on the transaction connection and publish
// the result (including the caller's uncommitted writes) to every other
// reader, surviving a rollback for the full TTL.
func isWithinTransaction(ctx context.Context) bool {
	state, ok := ctx.Value(transactionContextKey{}).(*transactionState)
	return ok && state != nil
}

// querierFor returns the transaction carried by ctx, or the pool when the
// caller is not inside one.
func querierFor(ctx context.Context, pool *pgxpool.Pool) querier {
	if state, ok := ctx.Value(transactionContextKey{}).(*transactionState); ok && state != nil {
		return state.tx
	}
	return pool
}

// afterTransaction runs fn immediately outside a transaction, and after a
// successful commit inside one.
//
// Cache invalidation belongs here: running it before the commit lets another
// reader miss the key, read the not-yet-committed state, and cache it for the
// full TTL.
func afterTransaction(ctx context.Context, fn func()) {
	if state, ok := ctx.Value(transactionContextKey{}).(*transactionState); ok && state != nil {
		state.afterCommit = append(state.afterCommit, fn)
		return
	}
	fn()
}
