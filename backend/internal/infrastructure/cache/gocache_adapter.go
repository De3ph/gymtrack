package cache

import (
	"bytes"
	"encoding/gob"
	"math/rand/v2"
	"time"

	gocache "github.com/patrickmn/go-cache"
	"go.uber.org/zap"
)

// GoCacheAdapter wraps github.com/patrickmn/go-cache to implement Cache[T].
// All cached model fields must stay exported for gob encode/decode.
// Interface-typed fields require gob.Register.
type GoCacheAdapter[T any] struct {
	inner      *gocache.Cache
	maxEntries int
	metrics    *CacheMetrics
}

// NewGoCache creates a GoCacheAdapter[T] with the given default TTL, cleanup interval,
// and Prometheus metrics. Returns nil if enabled is false (caller should use NoOpCache).
func NewGoCache[T any](defaultTTL, cleanupInterval time.Duration, maxEntries int, metrics *CacheMetrics) *GoCacheAdapter[T] {
	c := gocache.New(defaultTTL, cleanupInterval)
	if metrics != nil {
		// Use a goroutine to periodically sync size to Prometheus.
		// go-cache lacks a mutation hook for fine-grained updates.
		go func() {
			ticker := time.NewTicker(cleanupInterval)
			defer ticker.Stop()
			for range ticker.C {
				metrics.SetSize(c.ItemCount())
			}
		}()
	}
	return &GoCacheAdapter[T]{inner: c, maxEntries: maxEntries, metrics: metrics}
}

// Get returns a deep copy of the cached value for key.
// Returns the zero value of T and false if the key is missing, expired, holds
// the wrong type, or cannot be deep-copied. A miss is recorded for every
// non-hit outcome so hit/miss metrics stay accurate.
func (c *GoCacheAdapter[T]) Get(key string) (T, bool) {
	val, ok := c.inner.Get(key)
	if !ok {
		if c.metrics != nil {
			c.metrics.RecordMiss()
		}
		var zero T
		return zero, false
	}

	typed, ok := val.(T)
	if !ok {
		if c.metrics != nil {
			c.metrics.RecordMiss()
		}
		var zero T
		return zero, false
	}

	copied, err := deepCopy(typed)
	if err != nil {
		zap.L().Warn("cache deep-copy failed",
			zap.String("op", "get"),
			zap.String("key", key),
			zap.Error(err))
		if c.metrics != nil {
			c.metrics.RecordMiss()
		}
		var zero T
		return zero, false
	}

	if c.metrics != nil {
		c.metrics.RecordHit()
	}
	return copied, true
}

// Set stores a deep copy of value under key with the default TTL.
// If the deep copy fails (e.g. gob cannot encode the value) the entry is not
// stored and a warning is logged, so a subsequent Get returns a clean miss
// rather than a corrupted zero-value "hit". When maxEntries is set, an entry
// is evicted via random-2 eviction before storing once the bound is reached.
func (c *GoCacheAdapter[T]) Set(key string, value T) {
	copied, err := deepCopy(value)
	if err != nil {
		zap.L().Warn("cache deep-copy failed",
			zap.String("op", "set"),
			zap.String("key", key),
			zap.Error(err))
		return
	}
	if c.maxEntries > 0 && c.inner.ItemCount() >= c.maxEntries {
		c.evictRandom2()
	}
	c.inner.SetDefault(key, copied)
}

func (c *GoCacheAdapter[T]) SetWithTTL(key string, value T, ttl time.Duration) {
	copied, err := deepCopy(value)
	if err != nil {
		zap.L().Warn("cache deep-copy failed",
			zap.String("op", "set"),
			zap.String("key", key),
			zap.Error(err))
		return
	}
	if c.maxEntries > 0 && c.inner.ItemCount() >= c.maxEntries {
		c.evictRandom2()
	}
	c.inner.Set(key, copied, ttl)
}

func (c *GoCacheAdapter[T]) Invalidate(key string) {
	c.inner.Delete(key)
}

// InvalidatePrefix removes all keys with the given prefix.
// Iterates go-cache's internal items map; O(N) where N is total cached entries.
func (c *GoCacheAdapter[T]) InvalidatePrefix(prefix string) {
	for k := range c.inner.Items() {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			c.inner.Delete(k)
		}
	}
}

// evictRandom2 implements a random-2 eviction policy: sample two random entries
// from the cache snapshot and delete the one whose TTL expires sooner
// (approximate least-remaining-lifetime), preserving entries that are meant to
// be durable. Increments the eviction counter once per call. O(N) over the
// snapshot with O(1) extra space (reservoir sampling, no full sort).
func (c *GoCacheAdapter[T]) evictRandom2() {
	items := c.inner.Items()
	if len(items) == 0 {
		return
	}

	// Reservoir-sample up to two distinct keys from the snapshot.
	var k1, k2 string
	have2 := false
	i := 0
	for key := range items {
		j := rand.IntN(i + 1)
		switch j {
		case 0:
			k1 = key
		case 1:
			k2 = key
			have2 = true
		}
		i++
	}

	// Evict the entry with the older (sooner) expiry. Entries with no expiry
	// (Expiration == 0) are treated as having the longest remaining lifetime so
	// durable entries are preserved; if both have no expiry, either is fine.
	victim := k1
	if have2 {
		e1 := items[k1].Expiration
		e2 := items[k2].Expiration
		switch {
		case e1 == 0:
			victim = k2
		case e2 == 0:
			victim = k1
		case e2 < e1:
			victim = k2
		default:
			victim = k1
		}
	}

	c.inner.Delete(victim)
	if c.metrics != nil {
		c.metrics.RecordEviction()
	}
}

// deepCopy serializes and deserializes value via encoding/gob to produce an
// independent copy. All cached model fields must be exported for gob to
// encode/decode them correctly. Interface-typed fields require gob.Register
// (see gob_register.go).
//
// Unlike the previous swallow-and-continue implementation, deepCopy returns
// any encode/decode error so callers can avoid storing or returning a
// possibly-zero value as a cache "hit".
func deepCopy[T any](value T) (T, error) {
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	dec := gob.NewDecoder(&buf)

	if err := enc.Encode(value); err != nil {
		var zero T
		return zero, err
	}

	var copy T
	if err := dec.Decode(&copy); err != nil {
		var zero T
		return zero, err
	}
	return copy, nil
}
