package postgres

import "sync"

// cacheInvalidationBus coordinates invalidation between cached repository
// decorators that cache different projections of the same database row.
//
// The users.profile column is written by two different repositories:
// PostgresUserRepository.UpdateUser and
// PostgresTrainerProfileRepository.UpdateTrainerProfile. The resulting row is
// then cached under two unrelated key namespaces:
//
//	CachedUserRepository          user:id:N, user:email:…, user:username:…
//	CachedTrainerProfileRepository trainer:id:N, trainer:public:…
//
// Without coordination a write through either decorator leaves the other
// namespace stale for its full TTL — a trainer editing their bio kept serving
// a stale bio through GetUserByID for up to five minutes, and a user updating
// their profile left the public catalog stale.
//
// The decorators cannot call each other directly: they are separate fx
// providers, and a mutual reference would be a dependency cycle. Each instead
// subscribes a hook here and notifies it on write, so both namespaces are
// dropped regardless of which repository performed the update.
type CacheInvalidationBus struct {
	mu    sync.RWMutex
	hooks []func(userID int)
}

func NewCacheInvalidationBus() *CacheInvalidationBus {
	return &CacheInvalidationBus{}
}

// subscribe registers a hook to run whenever any cached decorator writes the
// users row for userID. Hooks must be idempotent and cheap: a decorator
// receives its own writes too.
func (b *CacheInvalidationBus) subscribe(h func(userID int)) {
	if b == nil || h == nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.hooks = append(b.hooks, h)
}

// notify drops every cached copy of the given users row. A nil bus is a no-op
// so decorators remain usable without one (as in unit tests).
func (b *CacheInvalidationBus) notify(userID int) {
	if b == nil {
		return
	}
	b.mu.RLock()
	hooks := make([]func(int), len(b.hooks))
	copy(hooks, b.hooks)
	b.mu.RUnlock()

	for _, h := range hooks {
		h(userID)
	}
}
