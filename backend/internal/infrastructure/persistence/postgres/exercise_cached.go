package postgres

import (
	"context"
	"strconv"

	"golang.org/x/sync/singleflight"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
)

// CachedExerciseRepository wraps ExerciseRepository with in-process caching.
// Reference data; invalidated on any write.
var _ repositories.ExerciseRepository = (*CachedExerciseRepository)(nil)

type CachedExerciseRepository struct {
	inner repositories.ExerciseRepository
	cache cache.Cache[[]models.Exercise]
	sf    singleflight.Group
}

// NewCachedExerciseRepository creates a CachedExerciseRepository.
func NewCachedExerciseRepository(inner repositories.ExerciseRepository, cache cache.Cache[[]models.Exercise]) *CachedExerciseRepository {
	return &CachedExerciseRepository{inner: inner, cache: cache}
}

func (r *CachedExerciseRepository) CreateExercise(ctx context.Context, exercise *models.Exercise) error {
	err := r.inner.CreateExercise(ctx, exercise)
	if err == nil {
		r.cache.InvalidatePrefix("exercise:")
	}
	return err
}

func (r *CachedExerciseRepository) GetExerciseByID(ctx context.Context, exerciseID int) (*models.Exercise, error) {
	return r.inner.GetExerciseByID(ctx, exerciseID)
}

func (r *CachedExerciseRepository) GetAllExercises(ctx context.Context) ([]models.Exercise, error) {
	key := "exercise:all"

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetAllExercises(ctx)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]models.Exercise), nil
}

func (r *CachedExerciseRepository) GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error) {
	key := "exercise:muscle:" + strconv.Itoa(muscleGroupID)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetExercisesByMuscleGroup(ctx, muscleGroupID)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]models.Exercise), nil
}

func (r *CachedExerciseRepository) GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error) {
	key := "exercise:equipment:" + strconv.Itoa(equipmentID)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetExercisesByEquipment(ctx, equipmentID)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]models.Exercise), nil
}

func (r *CachedExerciseRepository) SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error) {
	return r.inner.SearchExercises(ctx, query, muscleGroupID, equipmentID)
}

func (r *CachedExerciseRepository) UpdateExercise(ctx context.Context, exercise *models.Exercise) error {
	err := r.inner.UpdateExercise(ctx, exercise)
	if err == nil {
		r.cache.InvalidatePrefix("exercise:")
	}
	return err
}

func (r *CachedExerciseRepository) DeleteExercise(ctx context.Context, exerciseID int) error {
	err := r.inner.DeleteExercise(ctx, exerciseID)
	if err == nil {
		r.cache.InvalidatePrefix("exercise:")
	}
	return err
}
