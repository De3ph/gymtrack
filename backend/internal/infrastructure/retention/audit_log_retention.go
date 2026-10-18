// Package retention runs periodic data-cleanup jobs against the database.
//
// The jobs are provided through uber-go/fx (see internal/app/module.go) and
// started/stopped by the application lifecycle.
package retention

import (
	"context"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"go.uber.org/zap"
)

// deleteAuditLogsSQL removes audit rows older than $1 days. make_interval keeps
// the window an integer parameter (never formatted into the SQL string) and
// compares against the database clock, so instances with skewed clocks cannot
// prune the wrong range.
const deleteAuditLogsSQL = `DELETE FROM user_audit_logs WHERE changed_at < now() - make_interval(days => $1)`

// pruneTimeout bounds a single prune so a stalled database cannot wedge the
// retention goroutine.
const pruneTimeout = 30 * time.Second

// PruneInterval is how often the retention job runs after its initial pass.
const PruneInterval = 24 * time.Hour

// executor is the slice of pgxpool.Pool the job needs. Narrowing it keeps the
// job unit-testable without a live database.
type executor interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

// AuditLogRetention prunes user_audit_logs, which stores a full JSONB snapshot
// of every user row change (minus the password hash). Without a retention
// policy that table grows without bound and keeps personal data indefinitely.
//
// The job prunes once on Start and then every PruneInterval. A retention window
// of 0 days disables it.
type AuditLogRetention struct {
	db       executor
	days     int
	interval time.Duration

	startOnce sync.Once
	stopOnce  sync.Once
	// ctx is cancelled by Stop; it is the loop's context, so an in-flight
	// prune is cancelled and Stop can join the goroutine instead of racing the
	// pool close that follows it during shutdown.
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewAuditLogRetention builds the retention job. days is the retention window
// in days; 0 or negative disables pruning.
func NewAuditLogRetention(db executor, days int) *AuditLogRetention {
	ctx, cancel := context.WithCancel(context.Background())
	return &AuditLogRetention{
		db:       db,
		days:     days,
		interval: PruneInterval,
		ctx:      ctx,
		cancel:   cancel,
	}
}

// Enabled reports whether the job will prune anything.
func (r *AuditLogRetention) Enabled() bool { return r.days > 0 }

// Start launches the background goroutine. It is idempotent and a no-op when
// the job is disabled.
func (r *AuditLogRetention) Start() {
	if !r.Enabled() {
		zap.L().Info("audit log retention disabled (AUDIT_LOG_RETENTION_DAYS=0)")
		return
	}
	r.startOnce.Do(func() {
		r.wg.Add(1)
		go func() {
			defer r.wg.Done()
			r.loop()
		}()
	})
}

// Stop cancels the goroutine and waits for it to exit, including any prune that
// is already running, so the connection pool is not closed underneath an active
// query. It is idempotent and safe to call before Start.
func (r *AuditLogRetention) Stop() {
	r.stopOnce.Do(r.cancel)
	r.wg.Wait()
}

// loop prunes immediately so a long-running deployment does not wait a full
// interval before the first cleanup, then on every tick.
func (r *AuditLogRetention) loop() {
	r.Prune(r.ctx)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-r.ctx.Done():
			return
		case <-ticker.C:
			r.Prune(r.ctx)
		}
	}
}

// Prune deletes audit rows older than the retention window and returns the
// number of rows removed. Exported so tests and one-off tooling can run it
// without the goroutine. Errors are logged, not returned: retention is
// best-effort and must never affect request handling.
func (r *AuditLogRetention) Prune(ctx context.Context) int64 {
	if !r.Enabled() {
		return 0
	}

	ctx, cancel := context.WithTimeout(ctx, pruneTimeout)
	defer cancel()

	cmd, err := r.db.Exec(ctx, deleteAuditLogsSQL, r.days)
	if err != nil {
		// Shutdown: Stop cancelled the context (or the pool closed underneath
		// us). Not a retention failure, so do not log it as one.
		if r.ctx.Err() != nil {
			return 0
		}
		zap.L().Error("audit log retention: prune failed", zap.Int("retention_days", r.days), zap.Error(err))
		return 0
	}

	rows := cmd.RowsAffected()
	if rows > 0 {
		zap.L().Info("audit log retention: pruned rows",
			zap.Int64("rows", rows), zap.Int("retention_days", r.days))
	}
	return rows
}
