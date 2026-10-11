package postgres

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/sync/singleflight"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
)

// CachedTrainerProfileRepository wraps TrainerProfileRepository with in-process caching.
// Two cache instances: byIDCache for GetTrainerByID, listCache for GetPublicTrainers.
var _ repositories.TrainerProfileRepository = (*CachedTrainerProfileRepository)(nil)

type CachedTrainerProfileRepository struct {
	inner     repositories.TrainerProfileRepository
	byIDCache cache.Cache[*models.TrainerWithProfile]
	listCache cache.Cache[[]models.TrainerWithProfile]
	sf        singleflight.Group
	bus       *CacheInvalidationBus
}

// NewCachedTrainerProfileRepository creates a CachedTrainerProfileRepository.
//
// bus may be nil, in which case cross-decorator invalidation is disabled.
func NewCachedTrainerProfileRepository(
	inner repositories.TrainerProfileRepository,
	byIDCache cache.Cache[*models.TrainerWithProfile],
	listCache cache.Cache[[]models.TrainerWithProfile],
	bus *CacheInvalidationBus,
) *CachedTrainerProfileRepository {
	r := &CachedTrainerProfileRepository{
		inner:     inner,
		byIDCache: byIDCache,
		listCache: listCache,
		bus:       bus,
	}
	bus.subscribe(func(userID int) {
		// UpdateTrainerProfile writes users.profile, which CachedUserRepository
		// also caches; and a plain user update can change fields this catalog
		// renders. Drop both trainer namespaces so neither projection of the
		// row is left stale.
		r.byIDCache.Invalidate("trainer:id:" + strconv.Itoa(userID))
		r.listCache.InvalidatePrefix("trainer:public:")
	})
	return r
}

func (r *CachedTrainerProfileRepository) GetPublicTrainers(ctx context.Context, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	key := publicTrainerCacheKey(filters, limit, offset)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.listCache.Get(key); ok {
			return v, nil
		}
		loadCtx, cancel := cacheLoadContext(ctx)
		defer cancel()
		v, err := r.inner.GetPublicTrainers(loadCtx, filters, limit, offset)
		if err != nil {
			return nil, err
		}
		r.listCache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]models.TrainerWithProfile), nil
}

func (r *CachedTrainerProfileRepository) GetTrainerByID(ctx context.Context, trainerID int) (*models.TrainerWithProfile, error) {
	key := "trainer:id:" + strconv.Itoa(trainerID)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.byIDCache.Get(key); ok {
			return v, nil
		}
		loadCtx, cancel := cacheLoadContext(ctx)
		defer cancel()
		v, err := r.inner.GetTrainerByID(loadCtx, trainerID)
		if err != nil {
			return nil, err
		}
		r.byIDCache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.(*models.TrainerWithProfile), nil
}

// cacheKeyFieldSep delimits fields in a composite cache key. It is escaped out
// of every value before joining so that distinct filter sets cannot collide:
// with a bare separator, {Specialization: "a", Location: "b|c"} and
// {Specialization: "a|b", Location: "c"} would produce the same key.
const cacheKeyFieldSep = "\x1f" // ASCII unit separator: not valid in a query value

func escapeCacheKeyField(s string) string {
	return strings.ReplaceAll(s, cacheKeyFieldSep, `\x1f`)
}

// publicTrainerCacheKey builds a stable cache key for a catalog query.
//
// The key must be built from value fields only. Formatting the filter struct
// directly with %v prints the *bool AvailableForNewClients as its heap address
// (fmt dereferences the outer struct but renders nested pointers by
// reference), so every request carrying that filter produced a brand-new key:
// a 0% hit rate plus a fresh entry per call, which degenerates the bounded
// cache into pure eviction churn.
func publicTrainerCacheKey(filters *repositories.TrainerFilters, limit, offset int) string {
	if filters == nil {
		return "trainer:public:nil" + cacheKeyFieldSep + strconv.Itoa(limit) + cacheKeyFieldSep + strconv.Itoa(offset)
	}

	available := "any"
	if filters.AvailableForNewClients != nil {
		available = strconv.FormatBool(*filters.AvailableForNewClients)
	}

	// %.4f normalises MinRating so that values differing only past the
	// filter's real precision share one entry.
	return strings.Join([]string{
		"trainer:public",
		escapeCacheKeyField(filters.Specialization),
		escapeCacheKeyField(filters.Location),
		fmt.Sprintf("%.4f", filters.MinRating),
		available,
		strconv.Itoa(limit),
		strconv.Itoa(offset),
	}, cacheKeyFieldSep)
}

func (r *CachedTrainerProfileRepository) UpdateTrainerProfile(ctx context.Context, trainerID int, profile *models.TrainerProfile) error {
	err := r.inner.UpdateTrainerProfile(ctx, trainerID, profile)
	if err == nil {
		r.byIDCache.InvalidatePrefix("trainer:")
		r.listCache.InvalidatePrefix("trainer:")
		// The same users.profile column is cached by CachedUserRepository under
		// user:id:N; drop it so a profile edit is visible through GetUserByID
		// as well as through the catalog.
		r.bus.notify(trainerID)
	}
	return err
}

func (r *CachedTrainerProfileRepository) SearchTrainers(ctx context.Context, query string, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	return r.inner.SearchTrainers(ctx, query, filters, limit, offset)
}

func (r *CachedTrainerProfileRepository) CountTrainers(ctx context.Context, filters *repositories.TrainerFilters) (int, error) {
	return r.inner.CountTrainers(ctx, filters)
}
