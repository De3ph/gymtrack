package postgres

import (
	"context"

	"golang.org/x/sync/singleflight"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
)

// CachedMuscleGroupRepository wraps MuscleGroupRepository with in-process caching.
// Read-only interface; staleness managed by TTL expiry.
var _ repositories.MuscleGroupRepository = (*CachedMuscleGroupRepository)(nil)

type CachedMuscleGroupRepository struct {
	inner repositories.MuscleGroupRepository
	cache cache.Cache[[]models.MuscleGroupDefinition]
	sf    singleflight.Group
}

// NewCachedMuscleGroupRepository creates a CachedMuscleGroupRepository.
func NewCachedMuscleGroupRepository(inner repositories.MuscleGroupRepository, cache cache.Cache[[]models.MuscleGroupDefinition]) *CachedMuscleGroupRepository {
	return &CachedMuscleGroupRepository{inner: inner, cache: cache}
}

func (r *CachedMuscleGroupRepository) GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error) {
	key := "muscle_group:all"

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetAllMuscleGroups(ctx)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]models.MuscleGroupDefinition), nil
}

func (r *CachedMuscleGroupRepository) GetMuscleGroupByID(ctx context.Context, id int) (*models.MuscleGroupDefinition, error) {
	return r.inner.GetMuscleGroupByID(ctx, id)
}
