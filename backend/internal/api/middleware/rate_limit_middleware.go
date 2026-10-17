package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// limiterEntry wraps a rate.Limiter with a last-access timestamp for cleanup.
type limiterEntry struct {
	limiter    *rate.Limiter
	lastAccess time.Time
}

// cleanupInterval is how often idle entries are pruned.
const cleanupInterval = 5 * time.Minute

// maxIdleTime is how long an entry can go without access before removal.
const maxIdleTime = 15 * time.Minute

// RateLimiter implements a per-IP token-bucket rate limiter for Gin.
// Uses in-memory tracking; sufficient for single-instance deployments.
// For multi-instance, replace with a Redis-backed limiter.
//
// A background goroutine prunes idle entries every cleanupInterval to prevent
// unbounded memory growth from one-off IPs.
type RateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*limiterEntry
	rate     rate.Limit
	burst    int

	// The cleanup goroutine is started lazily on the first Allow call so an
	// unused limiter does not spawn one, and stopped via Stop on shutdown.
	startOnce sync.Once
	stopOnce  sync.Once
	done      chan struct{}
}

// NewRateLimiter creates a per-IP rate limiter with automatic cleanup.
// r: requests per second allowed (e.g. 5).
// burst: max burst size (e.g. 10).
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*limiterEntry),
		rate:     r,
		burst:    burst,
		done:     make(chan struct{}),
	}
}

// Stop terminates the background cleanup goroutine. It is idempotent and safe
// to call before any request has been served.
func (rl *RateLimiter) Stop() {
	rl.stopOnce.Do(func() {
		close(rl.done)
	})
}

// ensureCleanup starts the pruning goroutine exactly once.
func (rl *RateLimiter) ensureCleanup() {
	rl.startOnce.Do(func() {
		go rl.cleanupLoop()
	})
}

// Allow returns true if the request from the given key is allowed.
func (rl *RateLimiter) Allow(key string) bool {
	rl.ensureCleanup()

	rl.mu.Lock()
	entry, exists := rl.limiters[key]
	if !exists {
		entry = &limiterEntry{
			limiter:    rate.NewLimiter(rl.rate, rl.burst),
			lastAccess: time.Now(),
		}
		rl.limiters[key] = entry
	} else {
		entry.lastAccess = time.Now()
	}
	lim := entry.limiter
	rl.mu.Unlock()
	return lim.Allow()
}

// cleanupLoop periodically removes entries that have been idle for over maxIdleTime.
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()
	for {
		select {
		case <-rl.done:
			return
		case <-ticker.C:
			rl.pruneIdle(time.Now())
		}
	}
}

// pruneIdle removes entries not accessed since now-maxIdleTime.
func (rl *RateLimiter) pruneIdle(now time.Time) {
	cutoff := now.Add(-maxIdleTime)
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for key, entry := range rl.limiters {
		if entry.lastAccess.Before(cutoff) {
			delete(rl.limiters, key)
		}
	}
}

// Middleware returns a Gin handler that rate-limits by client IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.Allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please try again later",
			})
			return
		}
		c.Next()
	}
}

// AuthLimiter returns a rate limiter tuned for auth endpoints.
// 5 req/s with burst 10 — allows fast retries but blocks sustained brute-force.
func AuthLimiter() *RateLimiter {
	return NewRateLimiter(5, 10)
}
