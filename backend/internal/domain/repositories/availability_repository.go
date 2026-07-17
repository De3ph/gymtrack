package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// AvailabilityRepository defines data access for trainer availability slots.
type AvailabilityRepository interface {
	GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerAvailability, error)
	GetBySlotID(ctx context.Context, slotID int) (*models.TrainerAvailability, error)
	UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error
	DeleteAvailability(ctx context.Context, slotID int) error
	GetAvailableSlots(ctx context.Context, trainerID int, dayOfWeek int) ([]models.TrainerAvailability, error)
	BookSlotAtomic(ctx context.Context, slotID int) error
	CleanupExpiredSlots(ctx context.Context, retentionDays int) error
}
