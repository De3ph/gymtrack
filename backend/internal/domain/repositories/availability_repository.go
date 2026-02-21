package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type AvailabilityRepository interface {
	GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error)
	UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error
	DeleteAvailability(ctx context.Context, slotID string) error
	GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error)
}

type CouchbaseAvailabilityRepository struct {
	collection *gocb.Collection
}

func NewCouchbaseAvailabilityRepository(collection *gocb.Collection) *CouchbaseAvailabilityRepository {
	return &CouchbaseAvailabilityRepository{
		collection: collection,
	}
}

func (r *CouchbaseAvailabilityRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'availability' AND a.trainerId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
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

func (r *CouchbaseAvailabilityRepository) UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error {
	slot.Type = "availability"
	slot.UpdatedAt = time.Now()
	if slot.CreatedAt.IsZero() {
		slot.CreatedAt = time.Now()
	}

	_, err := r.collection.Upsert(slot.AvailabilityID, slot, &gocb.UpsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to upsert availability: %w", err)
	}
	return nil
}

func (r *CouchbaseAvailabilityRepository) DeleteAvailability(ctx context.Context, slotID string) error {
	_, err := r.collection.Remove(slotID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete availability: %w", err)
	}
	return nil
}

func (r *CouchbaseAvailabilityRepository) GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'availability' AND a.trainerId = $1 AND a.dayOfWeek = $2 AND a.isBooked = false",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID, dayOfWeek},
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
