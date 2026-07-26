package cache

import (
	"bytes"
	"encoding/gob"
	"time"

	gocache "github.com/patrickmn/go-cache"
)

// GoCacheAdapter wraps github.com/patrickmn/go-cache to implement Cache[T].
// All cached model fields must stay exported for gob encode/decode.
// Interface-typed fields require gob.Register.
type GoCacheAdapter[T any] struct {
	inner   *gocache.Cache
	metrics *CacheMetrics
}

// NewGoCache creates a GoCacheAdapter[T] with the given default TTL, cleanup interval,
// and Prometheus metrics. Returns nil if enabled is false (caller should use NoOpCache).
func NewGoCache[T any](defaultTTL, cleanupInterval time.Duration, metrics *CacheMetrics) *GoCacheAdapter[T] {
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
	return &GoCacheAdapter[T]{inner: c, metrics: metrics}
}

// Get returns a deep copy of the cached value for key.
// Returns the zero value of T and false if the key is missing or expired.
func (c *GoCacheAdapter[T]) Get(key string) (T, bool) {
	val, ok := c.inner.Get(key)
	if !ok {
		if c.metrics != nil {
			c.metrics.RecordMiss()
		}
		var zero T
		return zero, false
	}

	if c.metrics != nil {
		c.metrics.RecordHit()
	}

	typed, ok := val.(T)
	if !ok {
		var zero T
		return zero, false
	}
	return deepCopy(typed), true
}

// Set stores a deep copy of value under key with the default TTL.
func (c *GoCacheAdapter[T]) Set(key string, value T) {
	c.inner.SetDefault(key, deepCopy(value))
}

// SetWithTTL stores a value with a specific TTL.
func (c *GoCacheAdapter[T]) SetWithTTL(key string, value T, ttl time.Duration) {
	c.inner.Set(key, deepCopy(value), ttl)
}

// Invalidate removes a single key from the cache.
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

// deepCopy serializes and deserializes value via encoding/gob to produce an independent copy.
// All cached model fields must be exported for gob to encode/decode them correctly.
func deepCopy[T any](value T) T {
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	dec := gob.NewDecoder(&buf)

	// Ignore encoding errors — if gob fails, caller gets zero value,
	// consistent with a cache miss rather than a corrupted read.
	_ = enc.Encode(value)

	var copy T
	_ = dec.Decode(&copy)
	return copy
}
