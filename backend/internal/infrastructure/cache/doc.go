// Package cache holds the in-memory caching adapters used by the read
// repositories (users, exercises, equipment, muscle groups, relationships and
// trainer profiles) plus their Prometheus metrics.
//
// # Ops note: the cache is per-instance, not shared
//
// Every adapter in this package (GoCache, NoOpCache) keeps its entries in the
// process heap. Two consequences when the API runs with more than one replica:
//
//   - A write handled by instance A does not invalidate the copy cached by
//     instance B, so B can serve a stale value for up to that entry's TTL.
//   - CacheInvalidationBus only clears sibling projections (user:* vs
//     trainer:*) inside the process that performed the write.
//
// TTLs are deliberately short (1-30 minutes) to bound how long any stale value
// can survive, and reference data (exercises, equipment, muscle groups) is
// effectively read-only. The current deployment is single-instance, so this is
// acceptable.
//
// Before scaling the API horizontally, either move this layer to a shared store
// (e.g. Redis) or set CACHE_ENABLED=false so every read goes straight to
// PostgreSQL. Deployment note is mirrored in .env.example and backend/AGENTS.md.
package cache
