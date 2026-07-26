package postgres

import (
	"context"
	"strconv"

	"golang.org/x/sync/singleflight"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
)

// CachedRelationshipRepository wraps RelationshipRepository with in-process caching.
// Most frequently called method is GetByTrainerID; invalidated on create/update/delete.
var _ repositories.RelationshipRepository = (*CachedRelationshipRepository)(nil)

type CachedRelationshipRepository struct {
	inner repositories.RelationshipRepository
	cache cache.Cache[[]*models.Relationship]
	sf    singleflight.Group
}

// NewCachedRelationshipRepository creates a CachedRelationshipRepository.
func NewCachedRelationshipRepository(inner repositories.RelationshipRepository, cache cache.Cache[[]*models.Relationship]) *CachedRelationshipRepository {
	return &CachedRelationshipRepository{inner: inner, cache: cache}
}

func (r *CachedRelationshipRepository) Create(ctx context.Context, relationship *models.Relationship) error {
	err := r.inner.Create(ctx, relationship)
	if err == nil {
		r.cache.InvalidatePrefix("relationship:trainer:")
	}
	return err
}

func (r *CachedRelationshipRepository) GetByID(ctx context.Context, relationshipID int) (*models.Relationship, error) {
	return r.inner.GetByID(ctx, relationshipID)
}

func (r *CachedRelationshipRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.Relationship, error) {
	key := "relationship:trainer:" + strconv.Itoa(trainerID)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetByTrainerID(ctx, trainerID)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.([]*models.Relationship), nil
}

func (r *CachedRelationshipRepository) GetByAthleteID(ctx context.Context, athleteID int) (*models.Relationship, error) {
	return r.inner.GetByAthleteID(ctx, athleteID)
}

func (r *CachedRelationshipRepository) GetPendingByAthleteID(ctx context.Context, athleteID int) ([]*models.Relationship, error) {
	return r.inner.GetPendingByAthleteID(ctx, athleteID)
}

func (r *CachedRelationshipRepository) HasActiveRelationship(ctx context.Context, trainerID int, athleteID int) (bool, error) {
	return r.inner.HasActiveRelationship(ctx, trainerID, athleteID)
}

func (r *CachedRelationshipRepository) Update(ctx context.Context, relationship *models.Relationship) error {
	err := r.inner.Update(ctx, relationship)
	if err == nil {
		r.cache.InvalidatePrefix("relationship:trainer:")
	}
	return err
}

func (r *CachedRelationshipRepository) Delete(ctx context.Context, relationshipID int) error {
	err := r.inner.Delete(ctx, relationshipID)
	if err == nil {
		r.cache.InvalidatePrefix("relationship:trainer:")
	}
	return err
}
