package postgres

import (
	"context"

	"golang.org/x/sync/singleflight"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
)

// CachedEquipmentRepository wraps EquipmentRepository with in-process caching.
// Read-only interface; staleness managed by TTL expiry.
var _ repositories.EquipmentRepository = (*CachedEquipmentRepository)(nil)

type CachedEquipmentRepository struct {
	inner repositories.EquipmentRepository
	cache cache.Cache[[]models.EquipmentDefinition]
	sf    singleflight.Group
}

// NewCachedEquipmentRepository creates a CachedEquipmentRepository.
func NewCachedEquipmentRepository(inner repositories.EquipmentRepository, cache cache.Cache[[]models.EquipmentDefinition]) *CachedEquipmentRepository {
	return &CachedEquipmentRepository{inner: inner, cache: cache}
}

func (r *CachedEquipmentRepository) GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error) {
	key := "equipment:all"

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetAllEquipment(ctx)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]models.EquipmentDefinition), nil
}

func (r *CachedEquipmentRepository) GetEquipmentByID(ctx context.Context, id int) (*models.EquipmentDefinition, error) {
	return r.inner.GetEquipmentByID(ctx, id)
}
