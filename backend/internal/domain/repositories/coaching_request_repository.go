package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// CoachingRequestRepository defines data access for coaching requests.
type CoachingRequestRepository interface {
	Create(ctx context.Context, request *models.CoachingRequest) error
	GetByID(ctx context.Context, requestID int) (*models.CoachingRequest, error)
	GetByAthleteID(ctx context.Context, athleteID int) ([]*models.CoachingRequest, error)
	GetByTrainerID(ctx context.Context, trainerID int) ([]*models.CoachingRequest, error)
	Update(ctx context.Context, request *models.CoachingRequest) error
	Delete(ctx context.Context, requestID int) error
	GetPendingByTrainerID(ctx context.Context, trainerID int) ([]*models.CoachingRequest, error)
}
