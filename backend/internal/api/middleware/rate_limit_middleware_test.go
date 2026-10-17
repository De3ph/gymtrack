package middleware

import (
	"sync"
	"testing"
	"time"

	"golang.org/x/time/rate"
)

func TestRateLimiterStopIsIdempotent(t *testing.T) {
	rl := NewRateLimiter(rate.Limit(1000), 1000)
	for i := 0; i < 3; i++ {
		rl.Allow("10.0.0.1")
	}

	// Stop before/after traffic must not panic; double Stop is a no-op.
	rl.Stop()
	rl.Stop()

	select {
	case <-rl.done:
	default:
		t.Fatalf("Stop did not close the cleanup channel")
	}
}

func TestRateLimiterTracksPerKey(t *testing.T) {
	rl := NewRateLimiter(rate.Limit(1000), 1000)
	defer rl.Stop()

	for i := 0; i < 10; i++ {
		rl.Allow("10.0.0.1")
	}

	rl.mu.Lock()
	n := len(rl.limiters)
	rl.mu.Unlock()
	if n != 1 {
		t.Fatalf("entries = %d, want 1", n)
	}
}

func TestRateLimiterConcurrentAllow(t *testing.T) {
	rl := NewRateLimiter(rate.Limit(1e6), 1e6)
	defer rl.Stop()

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rl.Allow("10.0.0.2")
		}()
	}
	wg.Wait()

	rl.mu.Lock()
	n := len(rl.limiters)
	rl.mu.Unlock()
	if n != 1 {
		t.Fatalf("entries = %d, want 1", n)
	}
}

// TestRateLimiterCleanupRemovesIdleEntries pins the pruning behaviour that the
// cleanup goroutine relies on: entries idle longer than maxIdleTime are dropped
// so the map cannot grow without bound.
func TestRateLimiterCleanupRemovesIdleEntries(t *testing.T) {
	rl := NewRateLimiter(rate.Limit(1), 1)
	defer rl.Stop()

	rl.mu.Lock()
	rl.limiters["idle"] = &limiterEntry{
		limiter:    rate.NewLimiter(1, 1),
		lastAccess: time.Now().Add(-2 * maxIdleTime),
	}
	rl.mu.Unlock()

	rl.pruneIdle(time.Now())

	rl.mu.Lock()
	n := len(rl.limiters)
	rl.mu.Unlock()
	if n != 0 {
		t.Fatalf("idle entry was not pruned, entries = %d", n)
	}
}
