package cache

import "time"

// Cache is the abstraction for all cache backends.
// Cached repositories depend on this interface, never on a concrete implementation.
// Swap backends by changing one line in the factory — no changes to cached repos.
type Cache[T any] interface {
	// Get returns a deep copy of the value for key.
	// Returns the zero value of T and false if key is missing or expired.
	Get(key string) (T, bool)

	// Set stores a deep copy of value under key with the default TTL.
	Set(key string, value T)

	// SetWithTTL stores a value with a specific TTL.
	SetWithTTL(key string, value T, ttl time.Duration)

	// Invalidate removes a single key from the cache.
	Invalidate(key string)

	// InvalidatePrefix removes all keys with the given prefix.
	InvalidatePrefix(prefix string)
}
