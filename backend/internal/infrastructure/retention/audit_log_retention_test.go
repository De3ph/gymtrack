package retention

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// stubExecutor records the SQL/args it was called with and returns a canned
// result or error.
type stubExecutor struct {
	mu     sync.Mutex
	calls  int
	sql    string
	args   []any
	result pgconn.CommandTag
	err    error
}

func (s *stubExecutor) Exec(_ context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls++
	s.sql = sql
	s.args = args
	return s.result, s.err
}

func (s *stubExecutor) callCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls
}

func TestAuditLogRetention_Prune(t *testing.T) {
	t.Run("deletes rows older than the window and reports the count", func(t *testing.T) {
		stub := &stubExecutor{result: pgconn.NewCommandTag("DELETE 7")}
		job := NewAuditLogRetention(stub, 30)

		if got := job.Prune(context.Background()); got != 7 {
			t.Fatalf("Prune() = %d, want 7", got)
		}
		if !strings.Contains(stub.sql, "user_audit_logs") {
			t.Fatalf("SQL = %q, want it to target user_audit_logs", stub.sql)
		}
		if !strings.Contains(stub.sql, "make_interval(days => $1)") {
			t.Fatalf("SQL = %q, want the retention window as a parameter", stub.sql)
		}
		if len(stub.args) != 1 || stub.args[0] != 30 {
			t.Fatalf("args = %v, want [30]", stub.args)
		}
	})

	t.Run("disabled job never touches the database", func(t *testing.T) {
		stub := &stubExecutor{result: pgconn.NewCommandTag("DELETE 7")}
		job := NewAuditLogRetention(stub, 0)

		if job.Enabled() {
			t.Fatal("job with 0-day retention must be disabled")
		}
		if got := job.Prune(context.Background()); got != 0 {
			t.Fatalf("Prune() = %d, want 0", got)
		}
		if stub.callCount() != 0 {
			t.Fatalf("Exec called %d times, want 0", stub.callCount())
		}
	})

	t.Run("database error is swallowed and reported as zero", func(t *testing.T) {
		stub := &stubExecutor{err: errors.New("boom")}
		job := NewAuditLogRetention(stub, 365)

		if got := job.Prune(context.Background()); got != 0 {
			t.Fatalf("Prune() = %d, want 0 on error", got)
		}
	})
}

func TestAuditLogRetention_StartStopIdempotent(t *testing.T) {
	stub := &stubExecutor{result: pgconn.NewCommandTag("DELETE 0")}
	job := NewAuditLogRetention(stub, 7)

	job.Start()
	job.Start() // second start must not spawn a second goroutine
	job.Stop()
	job.Stop() // second stop must not panic on a closed channel
}

func TestAuditLogRetention_DisabledStartStop(t *testing.T) {
	stub := &stubExecutor{}
	job := NewAuditLogRetention(stub, 0)

	job.Start()
	job.Stop()

	if stub.callCount() != 0 {
		t.Fatalf("disabled job executed %d queries, want 0", stub.callCount())
	}
}

// blockingExecutor blocks inside Exec until the context is cancelled, standing
// in for a slow query that is still running when the app shuts down.
type blockingExecutor struct {
	started chan struct{}
	mu      sync.Mutex
	calls   int
}

func (b *blockingExecutor) Exec(ctx context.Context, _ string, _ ...any) (pgconn.CommandTag, error) {
	b.mu.Lock()
	b.calls++
	b.mu.Unlock()

	select {
	case b.started <- struct{}{}:
	default:
	}

	<-ctx.Done()
	return pgconn.CommandTag{}, ctx.Err()
}

// TestAuditLogRetention_StopCancelsInFlightPrune covers the shutdown path: Stop
// must cancel the running query and wait for the goroutine to exit, so it does
// not return while the pool is still being used.
func TestAuditLogRetention_StopCancelsInFlightPrune(t *testing.T) {
	stub := &blockingExecutor{started: make(chan struct{}, 1)}
	job := NewAuditLogRetention(stub, 30)

	job.Start()

	select {
	case <-stub.started:
	case <-time.After(5 * time.Second):
		t.Fatal("prune never started")
	}

	stopped := make(chan struct{})
	go func() {
		job.Stop()
		close(stopped)
	}()

	select {
	case <-stopped:
	case <-time.After(5 * time.Second):
		t.Fatal("Stop did not return; the in-flight prune was not cancelled")
	}
}
