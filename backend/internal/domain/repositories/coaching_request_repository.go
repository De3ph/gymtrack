package repositories

import (
	"context"
	"time"

	"gymtrack-backend/internal/domain/models"
)

// CoachingRequestRepository defines data access for coaching requests.
type CoachingRequestRepository interface {
	Create(ctx context.Context, request *models.CoachingRequest) error
	GetByID(ctx context.Context, requestID int) (*models.CoachingRequest, error)
	GetByAthleteID(ctx context.Context, athleteID int) ([]*models.CoachingRequest, error)
	GetByTrainerID(ctx context.Context, trainerID int) ([]*models.CoachingRequest, error)
	Update(ctx context.Context, request *models.CoachingRequest) error
	// UpdateStatus applies a status transition only while the request is still
	// in the from state, and reports whether it applied.
	//
	// The conditional write is the serialization point for concurrent
	// accept/reject: both callers may have read "pending", but only one UPDATE
	// can match. Callers must not re-check status in Go and then write
	// unconditionally, which is the check-then-act race this replaces.
	UpdateStatus(ctx context.Context, requestID int, from models.CoachingRequestStatus, to models.CoachingRequestStatus, updatedAt time.Time) (bool, error)
	Delete(ctx context.Context, requestID int) error
	GetPendingByTrainerID(ctx context.Context, trainerID int) ([]*models.CoachingRequest, error)
}
