# Backend Cache Layer Remediation Plan

## TL;DR

> **Quick Summary**: Fix the correctness, concurrency, and memory-bound gaps found in the existing `internal/infrastructure/cache` layer without changing the public `Cache[T]` interface or any cached-repo decorator. Four targeted fixes: (1) make `deepCopy` fail-safe so gob encode/decode errors can never silently store the zero value, (2) add `gob.Register` safety net for the cached types, (3) make `CacheMetrics` counters atomic to eliminate the data race, and (4) implement the `maxEntries` + random-2 eviction bound that the original plan promised but was never built.
>
> **Deliverables**:
> - `GoCacheAdapter.deepCopy` returns errors instead of swallowing them; callers store a miss on copy failure
> - `gob.Register` registrations for all cached concrete types (single init guard)
> - `CacheMetrics.Hits/Misses` use `atomic.Uint64`; `HitRatio` reads atomically
> - `GoCacheAdapter` enforces `maxEntries` with random-2 eviction; `Evictions` counter incremented on eviction
> - Unit tests for every behavior change; existing tests stay green
>
> **Estimated Effort**: Small–Medium (~250 lines new/changed, ~150 lines test)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: atomic metrics → gob fail-safe + registration → eviction bound → verification

---

## Context

### Original Request
Inspect the backend cache layer (`internal/infrastructure/cache`) and create a remediation plan for the issues found.

### Findings (cache-layer only, `seed.go` excluded per request)
The cache layer is well-designed (adapter + decorator pattern, deep-copy via gob, singleflight, NoOp kill switch, per-domain Prometheus metrics, interface-only deps). The core `cache/` package builds and tests green. The following gaps were identified during inspection:

1. **`deepCopy` silently stores the zero value on gob failure** — `gocache_adapter.go:84-97` discards both `enc.Encode` and `dec.Decode` errors. On `Set`, if gob can't encode the value, `deepCopy` returns the zero value and it gets stored. Subsequent `Get`s return `zero, true` — a "hit" serving garbage instead of a miss.

2. **No `gob.Register()` calls exist** — the adapter comment warns "interface-typed fields require `gob.Register`," but none are registered. If any cached model ever gains an interface/`any` field, the cache silently serves empty data. Latent landmine.

3. **Data race on metrics `hits`/`misses`** — `metrics.go:57-66` uses plain `m.hits++` (non-atomic `uint64`) while `HitRatio` `GaugeFunc` reads `m.hits + m.misses` from the Prometheus scrape goroutine without synchronization. Race by inspection.

4. **Memory bounds NOT implemented (deviation from original plan)** — `plans/done/backend-cache-layer.md:48` promised "Unbounded cache growth under load. Solved: `maxEntries` with random-2 eviction." Never built; `patrickmn/go-cache` only does TTL. The `Evictions` Prometheus counter (`metrics.go:34`) is dead — never incremented.

### Guardrails (Must NOT change)
- The public `Cache[T]` interface (`types.go`) stays as-is — **no new methods**. Cached repo decorators are untouched.
- No Redis/external infra (that's the future adapter's job).
- No changes to domain models, handlers, or services.
- No changes to DI wiring signatures in `module.go` (factory constructor signatures may add params but DI providers adapt).
- Deep-copy-via-gob strategy is retained (not swapped for a different mechanism) to keep the change minimal.

---

## Implementation

### Wave 1 — Concurrency & Correctness (parallel-safe, independent files)

- [ ] 1. **Make `CacheMetrics` counters atomic**

  **What to do**:
  - In `internal/infrastructure/cache/metrics.go`:
    - Change `hits uint64` / `misses uint64` fields to `hits atomic.Uint64` / `misses atomic.Uint64`.
    - `RecordHit()`: `m.hits.Add(1)` then `m.Hits.Inc()`.
    - `RecordMiss()`: `m.misses.Add(1)` then `m.Misses.Inc()`.
    - `HitRatio` `GaugeFunc` closure: `h := m.hits.Load(); ms := m.misses.Load(); total := h + ms; if total == 0 return 0; return float64(h)/float64(total)`.
  - Add a `RecordEviction()` method (used by Wave 2): `m.Evictions.Inc()`.

  **Files**:
  - `backend/internal/infrastructure/cache/metrics.go` (modify)
  - `backend/internal/infrastructure/cache/cache_test.go` (add `TestCacheMetrics_AtomicConcurrent` — hammer `RecordHit`/`RecordMiss` from N goroutines, assert no panic and counter integrity; add `TestCacheMetrics_HitRatio` covering zero-divisor and non-zero cases)

  **Parallelization**: YES — independent of other Wave-1 tasks (only touches metrics.go)
  **Blocked By**: nothing

- [ ] 2. **Make `deepCopy` fail-safe**

  **What to do**:
  - In `internal/infrastructure/cache/gocache_adapter.go`:
    - Change `deepCopy` signature to `deepCopy[T any](value T) (T, error)`.
    - Return the encode/decode errors instead of `_ =`. On encode error: return `var zero T` + the error. On decode error: return zero + the error.
    - `Set(key, value)`: `copied, err := deepCopy(value); if err != nil { /* log at Warn via zap.L(); do not store */ return }; c.inner.SetDefault(key, copied)`. Never store a possibly-zero value.
    - `SetWithTTL(key, value, ttl)`: same pattern with `c.inner.Set(key, copied, ttl)`.
    - `Get(key)`: after `val.(T)` success, `copied, err := deepCopy(typed); if err != nil { RecordMiss(); return zero, false }; RecordHit(); return copied, true`. This also fixes the pre-existing "records Hit before type assertion" inconsistency — now a failed assertion counts a miss and returns `(zero, false)`.
  - Use `zap.L().Warn("cache deep-copy failed", zap.String("op","set"/"get"), zap.Error(err))` for observability. Logging is independent of the metrics guard.

  **Files**:
  - `backend/internal/infrastructure/cache/gocache_adapter.go` (modify `deepCopy`, `Get`, `Set`, `SetWithTTL`)
  - `backend/internal/infrastructure/cache/cache_test.go` (add `TestCache_DeepCopyError_NoStore` — register a type that gob cannot encode [e.g. contains a `chan` or unexported field], assert `Set` is a no-op and subsequent `Get` returns miss; add `TestCache_Get_TypeAssertionMiss` sanity)

  **Parallelization**: YES — independent of task 1 (only touches gocache_adapter.go)
  **Blocked By**: nothing

- [ ] 3. **Register cached types with `gob`**

  **What to do**:
  - Create `backend/internal/infrastructure/cache/gob_register.go` with an `init()` that calls `gob.Register` for every concrete type that flows through the cache. Derive the exact set from `factory.go`:
    - `*models.User`
    - `[]models.Exercise`
    - `[]models.MuscleGroupDefinition`
    - `[]models.EquipmentDefinition`
    - `[]*models.Relationship`
    - `*models.TrainerWithProfile`
    - `[]models.TrainerWithProfile`
  - Inspect `models.UserProfile`, `models.TrainerProfile`, `models.Relationship`, `models.TrainerWithProfile` for `any`/interface-typed fields (JSONB `[]byte` is fine; only interface-typed fields need registration). If none currently exist, still register the top-level types defensively and add a `// NOTE: add registrations here when models gain interface-typed fields` comment.
  - `gob.Register` on the same type twice is a no-op, so a plain `init()` is safe — prefer `init()` for simplicity over a `sync.Once` function.

  **Files**:
  - `backend/internal/infrastructure/cache/gob_register.go` (new)
  - (inspection only) `backend/internal/domain/models/*.go` — confirm field types

  **Parallelization**: YES — new file, independent
  **Blocked By**: nothing (independent of tasks 1 & 2; task 2's error handling complements this but they don't block each other)

---
### Wave 2 — Memory Bound (depends on Wave 1 metrics `RecordEviction`)

- [ ] 4. **Implement `maxEntries` + random-2 eviction in `GoCacheAdapter`**

  **What to do**:
  - In `internal/infrastructure/cache/gocache_adapter.go`:
    - Add `maxEntries int` field to `GoCacheAdapter[T]` (0 = unbounded, preserves current behavior).
    - `NewGoCache[T](defaultTTL, cleanupInterval, metrics)` — add `maxEntries int` param: `NewGoCache[T](defaultTTL, cleanupInterval time.Duration, maxEntries int, metrics *CacheMetrics)`. Update all `factory.go` callers to pass a sensible cap per domain:
      - User: 1000, Exercise: 50, MuscleGroup: 50, Equipment: 50, Relationship: 500, TrainerID: 200, TrainerPublic: 200.
      - (Choose caps relative to expected cardinality; reference data is tiny, user/relationship keyed by ID can grow.)
    - In `Set`/`SetWithTTL`, before storing: `if c.maxEntries > 0 && c.inner.ItemCount() >= c.maxEntries { c.evictRandom2() }`.
    - Implement `evictRandom2()`: pick 2 random keys from `c.inner.Items()` (use `math/rand/v2` — project is Go 1.25, so `math/rand/v2` is goroutine-safe without a mutex), delete whichever has the **older expiry** (compare via the `gocache.Item`'s `Expiration` field; if both no-expiry, delete either). Increment `metrics.RecordEviction()` once per eviction. Keep it O(1)-ish (don't sort the whole map).
  - Update `cache_test.go` `newTestCache` helper to pass `0` (unbounded) so existing tests are unaffected, and any other `NewGoCache` call sites inside tests.

  **Files**:
  - `backend/internal/infrastructure/cache/gocache_adapter.go` (modify struct + constructor + Set/SetWithTTL; add `evictRandom2`)
  - `backend/internal/infrastructure/cache/factory.go` (modify all 7 `NewGoCache` calls to pass `maxEntries`)
  - `backend/internal/infrastructure/cache/cache_test.go` (update `newTestCache` + any `NewGoCache` calls; add `TestCache_Eviction_RespectsMaxEntries` — set cap=2, insert 3, assertItemCount==2 and `Evictions` counter incremented; add `TestCache_Eviction_ZeroIsUnbounded` — cap=0, insert many, no eviction)

  **Parallelization**: NO (single integrated change across adapter+factory+tests)
  **Blocked By**: task 1 (needs `RecordEviction`)

- [ ] 5. **Wire the eviction counter into the metrics path**

  **What to do**:
  - Already covered by task 1's `RecordEviction()` and task 4 calling it. This task is verification-only: confirm `metrics.Evictions` is now non-dead by grepping for `RecordEviction` calls and checking `curl localhost:8080/metrics | grep evictions_total` shows a counter after load.

  **Files**: none (verification)
  **Parallelization**: NO
  **Blocked By**: tasks 1, 4

---

## Cleanup (optional, low-risk, can run in parallel with Wave 1)

- [ ] 6. **Delete dead stub files**
  - Remove `backend/internal/infrastructure/cache/go_cache.go` (15 B, `package cache` only).
  - Remove `backend/internal/infrastructure/persistence/postgres/cached_{equipment,exercise,muscle_group,relationship,trainer_profile,user}.go` (6 empty `package postgres` stubs, 17-18 B each).
  - These sit alongside the real `*_cached.go` files and are leftover from a refactor.

  **Files**: deletions only
  **Parallelization**: YES
  **Blocked By**: nothing

- [ ] 7. **Fix stale Couchbase reference in `postgres/doc.go`**
  - `doc.go:19-32` still says Couchbase repos are "kept for rollback" — Couchbase is gone (PostgreSQL migration complete). Update the comment to reflect PostgreSQL-only reality and reference the cache decorators.

  **Files**: `backend/internal/infrastructure/persistence/postgres/doc.go` (comment edit)
  **Parallelization**: YES
  **Blocked By**: nothing

---

## Final Verification Wave

- [ ] F1. **Build & vet clean**
  - `cd backend && go build ./...`
  - `cd backend && go vet ./internal/infrastructure/...`
  - Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | VERDICT`

- [ ] F2. **All cache unit tests pass**
  - `cd backend && go test -count=1 ./internal/infrastructure/cache/...`
  - If CGO available: `cd backend && go test -race -count=1 ./internal/infrastructure/cache/...` (note: `-race` requires CGO_ENABLED=1; current Windows env has CGO disabled — run in an env with cgo or CI to confirm the metrics race fix).
  - Output: `Tests [PASS/FAIL] | Race [PASS/SKIP] | VERDICT`

- [ ] F3. **Deep-copy fail-safe verified**
  - `TestCache_DeepCopyError_NoStore` passes — a gob-unencodable type does not get stored; `Get` returns miss.
  - `TestCache_DeepCopy` still passes — valid types deep-copy correctly.
  - Output: `Deep copy fail-safe [PASS/FAIL] | VERDICT`

- [ ] F4. **Eviction bound verified**
  - `TestCache_Eviction_RespectsMaxEntries` passes — cap enforced, `Evictions` counter incremented.
  - `TestCache_Eviction_ZeroIsUnbounded` passes — cap=0 disables eviction.
  - Output: `Eviction [PASS/FAIL] | VERDICT`

- [ ] F5. **Metrics atomicity verified**
  - `TestCacheMetrics_AtomicConcurrent` passes under concurrent load (and under `-race` if CGO available).
  - `TestCacheMetrics_HitRatio` passes (zero + non-zero cases).
  - Output: `Atomic metrics [PASS/FAIL] | VERDICT`

- [ ] F6. **Live metrics sanity**
  - Start server, warm caches, check `curl localhost:8080/metrics | grep cache_` shows `_hits_total`, `_misses_total`, `_evictions_total` (after eviction), `_hit_ratio`.
  - Output: `Metrics present [PASS/FAIL] | VERDICT`

- [ ] F7. **Existing integration tests unchanged**
  - `cd backend && go test ./internal/infrastructure/persistence/postgres/...` (needs `POSTGRES_TEST_DSN` / testcontainers).
  - `auth_cache_test.go` `AuthCacheHit` + `DeepCopyIsolation` still pass.
  - Output: `Integration [PASS/FAIL] | VERDICT`

---

## Commit Strategy

- **Wave 1 (tasks 1–3)**: `fix(cache): atomic metrics, fail-safe deep-copy, gob type registration`
- **Wave 2 (tasks 4–5)**: `fix(cache): enforce maxEntries bound with random-2 eviction`
- **Cleanup (tasks 6–7)**: `chore(cache): remove dead stubs and stale Couchbase doc`

---

## Success Criteria

### Final Checklist
- [ ] `Cache[T]` interface unchanged (no new public methods)
- [ ] No cached-repo decorator, handler, or service modified
- [ ] `go build ./...` clean
- [ ] `go vet ./internal/infrastructure/...` clean
- [ ] All cache unit tests pass (`-count=1`)
- [ ] Race check passes where CGO available (`-race`)
- [ ] `deepCopy` errors propagate — zero value never silently stored
- [ ] `gob.Register` covers all 7 cached concrete types
- [ ] `CacheMetrics` counters are atomic — no data race
- [ ] `maxEntries` enforced; `Evictions` counter non-dead
- [ ] Existing `auth_cache_test.go` integration tests still green
- [ ] Dead stub files removed; `doc.go` Couchbase reference corrected

### Must Have
- Atomic `hits`/`misses` in `CacheMetrics` (no plain `uint64` increments under concurrency)
- `deepCopy` returns errors; `Set`/`Get` never store or return a gob-failed zero value as a hit
- `gob.Register` for every concrete type passed through the cache
- `maxEntries` cap with random-2 eviction; `Evictions` Prometheus counter incremented on evict
- All existing tests remain green with no behavior regressions

### Must NOT Have (Guardrails)
- NO new methods on the `Cache[T]` interface
- NO changes to cached-repo decorators, handlers, or services
- NO swap of the deep-copy mechanism (keep gob; only make it fail-safe)
- NO Redis or external infrastructure
- NO unbounded goroutine creation beyond the existing per-instance metrics ticker
- NO removal of the NoOp kill switch or `CACHE_ENABLED` env flag

