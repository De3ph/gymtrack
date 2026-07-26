package postgres

import (
	"context"
	"fmt"
	"strconv"

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
}

// NewCachedTrainerProfileRepository creates a CachedTrainerProfileRepository.
func NewCachedTrainerProfileRepository(
	inner repositories.TrainerProfileRepository,
	byIDCache cache.Cache[*models.TrainerWithProfile],
	listCache cache.Cache[[]models.TrainerWithProfile],
) *CachedTrainerProfileRepository {
	return &CachedTrainerProfileRepository{
		inner:     inner,
		byIDCache: byIDCache,
		listCache: listCache,
	}
}

func (r *CachedTrainerProfileRepository) GetPublicTrainers(ctx context.Context, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	key := fmt.Sprintf("trainer:public:%v:%d:%d", filters, limit, offset)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.listCache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetPublicTrainers(ctx, filters, limit, offset)
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
		v, err := r.inner.GetTrainerByID(ctx, trainerID)
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

func (r *CachedTrainerProfileRepository) UpdateTrainerProfile(ctx context.Context, trainerID int, profile *models.TrainerProfile) error {
	err := r.inner.UpdateTrainerProfile(ctx, trainerID, profile)
	if err == nil {
		r.byIDCache.InvalidatePrefix("trainer:")
		r.listCache.InvalidatePrefix("trainer:")
	}
	return err
}

func (r *CachedTrainerProfileRepository) SearchTrainers(ctx context.Context, query string, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	return r.inner.SearchTrainers(ctx, query, filters, limit, offset)
}

func (r *CachedTrainerProfileRepository) CountTrainers(ctx context.Context, filters *repositories.TrainerFilters) (int, error) {
	return r.inner.CountTrainers(ctx, filters)
}
