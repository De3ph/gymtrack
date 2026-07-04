package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type AvailabilityRepository interface {
	GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error)
	GetBySlotID(ctx context.Context, slotID string) (*models.TrainerAvailability, error)
	UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error
	DeleteAvailability(ctx context.Context, slotID string) error
	GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error)
	BookSlotAtomic(ctx context.Context, slotID string) error
	CleanupExpiredSlots(ctx context.Context, retentionDays int) error
}

type CouchbaseAvailabilityRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewCouchbaseAvailabilityRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseAvailabilityRepository {
	return &CouchbaseAvailabilityRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

func (r *CouchbaseAvailabilityRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'availability' AND a.trainerId = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query availability: %w", err)
	}
	defer rows.Close()

	var slots []models.TrainerAvailability
	for rows.Next() {
		var slot models.TrainerAvailability
		if err := rows.Row(&slot); err != nil {
			return nil, fmt.Errorf("failed to unmarshal availability: %w", err)
		}
		slots = append(slots, slot)
	}

	return slots, nil
}

func (r *CouchbaseAvailabilityRepository) GetBySlotID(ctx context.Context, slotID string) (*models.TrainerAvailability, error) {
	var slot models.TrainerAvailability
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	getResult, err := collection.Get(slotID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get availability slot: %w", err)
	}

	err = getResult.Content(&slot)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal slot: %w", err)
	}

	return &slot, nil
}

func (r *CouchbaseAvailabilityRepository) UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error {
	slot.Type = "availability"
	slot.UpdatedAt = time.Now()
	if slot.CreatedAt.IsZero() {
		slot.CreatedAt = time.Now()
	}

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Upsert(slot.AvailabilityID, slot, &gocb.UpsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to upsert availability: %w", err)
	}
	return nil
}

func (r *CouchbaseAvailabilityRepository) DeleteAvailability(ctx context.Context, slotID string) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	_, err := collection.Remove(slotID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete availability: %w", err)
	}
	return nil
}

func (r *CouchbaseAvailabilityRepository) GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'availability' AND a.trainerId = $1 AND a.dayOfWeek = $2 AND a.isBooked = false",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID, dayOfWeek},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query available slots: %w", err)
	}
	defer rows.Close()

	var slots []models.TrainerAvailability
	for rows.Next() {
		var slot models.TrainerAvailability
		if err := rows.Row(&slot); err != nil {
			return nil, fmt.Errorf("failed to unmarshal slot: %w", err)
		}
		slots = append(slots, slot)
	}

	return slots, nil
}

func (r *CouchbaseAvailabilityRepository) BookSlotAtomic(ctx context.Context, slotID string) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	_, err := collection.MutateIn(slotID, []gocb.MutateInSpec{
		gocb.UpsertSpec("isBooked", true, nil),
		gocb.UpsertSpec("updatedAt", time.Now(), nil),
	}, &gocb.MutateInOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to book slot atomically: %w", err)
	}
	return nil
}

func (r *CouchbaseAvailabilityRepository) CleanupExpiredSlots(ctx context.Context, retentionDays int) error {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	query := fmt.Sprintf("SELECT a.availabilityId FROM `%s`.`%s`.`%s` a WHERE a.type = 'availability' AND a.createdAt < $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{cutoff},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return fmt.Errorf("failed to query expired slots: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var slotID string
		if err := rows.Row(&slotID); err != nil {
			continue
		}
		collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
		_, _ = collection.Remove(slotID, &gocb.RemoveOptions{Context: ctx})
	}

	return nil
}
