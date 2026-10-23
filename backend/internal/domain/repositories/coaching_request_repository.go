package repositories

import (
	"context"
	"time"

	"gymtrack-backend/internal/domain/models"
)

// CoachingRequestRepository defines data access for coaching requests.
//
// List methods are paginated: a limit <= 0 returns the full result set, any
// positive limit bounds it. Callers that show a page must pair the list call
// with the matching Count method so clients can size the result set.
type CoachingRequestRepository interface {
	Create(ctx context.Context, request *models.CoachingRequest) error
	GetByID(ctx context.Context, requestID int) (*models.CoachingRequest, error)
	GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.CoachingRequest, error)
	CountByAthleteID(ctx context.Context, athleteID int) (int, error)
	GetByTrainerID(ctx context.Context, trainerID int, limit, offset int) ([]*models.CoachingRequest, error)
	CountByTrainerID(ctx context.Context, trainerID int) (int, error)
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
	GetPendingByTrainerID(ctx context.Context, trainerID int, limit, offset int) ([]*models.CoachingRequest, error)
	CountPendingByTrainerID(ctx context.Context, trainerID int) (int, error)
	// HasPendingRequestBetween answers "does the athlete have a pending
	// request to this trainer?" with an indexed EXISTS instead of scanning the
	// athlete's whole request history in Go.
	HasPendingRequestBetween(ctx context.Context, athleteID, trainerID int) (bool, error)
}
