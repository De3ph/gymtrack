package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// TrainerProfileRepository defines data access for trainer profiles.
type TrainerProfileRepository interface {
	GetPublicTrainers(ctx context.Context, filters *TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error)
	GetTrainerByID(ctx context.Context, trainerID int) (*models.TrainerWithProfile, error)
	UpdateTrainerProfile(ctx context.Context, trainerID int, profile *models.TrainerProfile) error
	SearchTrainers(ctx context.Context, query string, filters *TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error)
	CountTrainers(ctx context.Context, filters *TrainerFilters) (int, error)
}

// TrainerFilters narrows down trainer search results.
type TrainerFilters struct {
	Specialization         string
	Location               string
	MinRating              float64
	AvailableForNewClients *bool
}
