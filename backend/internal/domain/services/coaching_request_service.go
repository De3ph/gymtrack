package services

import (
	"context"
	"errors"
	"fmt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

type CoachingRequestService struct {
	coachingRequestRepo repositories.CoachingRequestRepository
	userRepo            repositories.UserRepository
	relationships       *RelationshipService
	transactions        repositories.TransactionManager
	clock               utils.Clock
}

func NewCoachingRequestService(
	coachingRequestRepo repositories.CoachingRequestRepository,
	userRepo repositories.UserRepository,
	relationships *RelationshipService,
	transactions repositories.TransactionManager,
	clock utils.Clock,
) *CoachingRequestService {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &CoachingRequestService{
		coachingRequestRepo: coachingRequestRepo,
		userRepo:            userRepo,
		relationships:       relationships,
		transactions:        transactionManagerOrDefault(transactions),
		clock:               clock,
	}
}

func (s *CoachingRequestService) CreateCoachingRequest(ctx context.Context, athleteID int, trainerID int, message string) (*models.CoachingRequest, error) {
	hasActiveTrainer, err := s.relationships.HasActiveTrainer(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	}
	if hasActiveTrainer {
		return nil, ErrAlreadyHasActiveTrainer
	}

	// A duplicate pending request between the pair is an indexed EXISTS, not a
	// scan of the athlete's whole request history in Go.
	pendingExists, err := s.coachingRequestRepo.HasPendingRequestBetween(ctx, athleteID, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing requests: %w", err)
	}
	if pendingExists {
		return nil, ErrPendingCoachingRequestExists
	}

	trainer, err := s.userRepo.GetUserByID(ctx, trainerID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrCoachTargetNotFound
		}
		return nil, fmt.Errorf("failed to get trainer: %w", err)
	}
	if trainer.Role != "trainer" {
		return nil, ErrCoachTargetNotTrainer
	}

	// Create the coaching request
	request := &models.CoachingRequest{
		RequestID: 0,
		AthleteID: athleteID,
		TrainerID: trainerID,
		Message:   message,
		Status:    models.CoachingRequestStatusPending,
	}

	err = s.coachingRequestRepo.Create(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to create coaching request: %w", err)
	}

	return request, nil
}

func (s *CoachingRequestService) AcceptCoachingRequest(ctx context.Context, requestID int, trainerID int) (*models.Relationship, error) {
	// Get the coaching request
	request, err := s.coachingRequestRepo.GetByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrCoachingRequestNotFound
		}
		return nil, fmt.Errorf("failed to get coaching request: %w", err)
	}

	if request.TrainerID != trainerID {
		return nil, ErrNotCoachingRequestOwner
	}

	if request.Status != models.CoachingRequestStatusPending {
		return nil, &CoachingRequestResolvedError{Status: string(request.Status)}
	}

	// Accepting is one unit of work: the relationship, the trainer projection
	// on the athlete's profile, and the request status all commit together.
	// Either the athlete is connected and the request is accepted, or nothing
	// changed and the trainer can retry.
	var relationship *models.Relationship
	err = s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error {
		// Claim the pending row first. The conditional UPDATE is the
		// serialization point: a concurrent accept or reject matches zero rows
		// and loses, and the relationship insert below never runs for it. If a
		// later step fails, the status change rolls back with the rest.
		applied, err := s.coachingRequestRepo.UpdateStatus(txCtx, requestID,
			models.CoachingRequestStatusPending, models.CoachingRequestStatusAccepted, s.clock.Now())
		if err != nil {
			return fmt.Errorf("failed to update coaching request: %w", err)
		}
		if !applied {
			return s.resolvedError(txCtx, requestID)
		}

		rel, err := s.relationships.Activate(txCtx, trainerID, request.AthleteID)
		if err != nil {
			if errors.Is(err, ErrAlreadyHasActiveTrainer) {
				return ErrAthleteAlreadyHasActiveTrainer
			}
			return err
		}

		relationship = rel
		return nil
	})
	if err != nil {
		return nil, err
	}

	return relationship, nil
}

func (s *CoachingRequestService) RejectCoachingRequest(ctx context.Context, requestID int, trainerID int) error {
	request, err := s.coachingRequestRepo.GetByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrCoachingRequestNotFound
		}
		return fmt.Errorf("failed to get coaching request: %w", err)
	}

	if request.TrainerID != trainerID {
		return ErrNotCoachingRequestOwner
	}

	if request.Status != models.CoachingRequestStatusPending {
		return &CoachingRequestResolvedError{Status: string(request.Status)}
	}

	// The conditional write, not the read above, decides the winner. A
	// concurrent accept between the read and this UPDATE makes it match zero
	// rows; report the status the request actually has instead of overwriting
	// an accepted request with "rejected".
	applied, err := s.coachingRequestRepo.UpdateStatus(ctx, requestID,
		models.CoachingRequestStatusPending, models.CoachingRequestStatusRejected, s.clock.Now())
	if err != nil {
		return fmt.Errorf("failed to update coaching request: %w", err)
	}
	if !applied {
		return s.resolvedError(ctx, requestID)
	}

	return nil
}

// resolvedError explains why a conditional status update matched no row.
func (s *CoachingRequestService) resolvedError(ctx context.Context, requestID int) error {
	current, err := s.coachingRequestRepo.GetByID(ctx, requestID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrCoachingRequestNotFound
		}
		return fmt.Errorf("failed to get coaching request: %w", err)
	}
	return &CoachingRequestResolvedError{Status: string(current.Status)}
}

// CoachingRequestsPage is one page of enriched coaching requests plus the
// total number of rows matching the query (not the size of this page).
type CoachingRequestsPage struct {
	Requests []*models.CoachingRequestWithDetails
	Count    int
}

func (s *CoachingRequestService) GetMyRequests(ctx context.Context, userID int, userRole string, limit, offset int) (*CoachingRequestsPage, error) {
	var requests []*models.CoachingRequest
	var count int
	var err error

	switch models.UserRole(userRole) {
	case models.RoleAthlete:
		requests, err = s.coachingRequestRepo.GetByAthleteID(ctx, userID, limit, offset)
		if err != nil {
			break
		}
		count, err = s.coachingRequestRepo.CountByAthleteID(ctx, userID)
	case models.RoleTrainer:
		requests, err = s.coachingRequestRepo.GetByTrainerID(ctx, userID, limit, offset)
		if err != nil {
			break
		}
		count, err = s.coachingRequestRepo.CountByTrainerID(ctx, userID)
	default:
		return nil, fmt.Errorf("your account role is invalid. Please contact support")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get coaching requests: %w", err)
	}

	requestsWithDetails, err := s.enrichAll(ctx, requests)
	if err != nil {
		return nil, err
	}

	return &CoachingRequestsPage{Requests: requestsWithDetails, Count: count}, nil
}

// enrichAll loads athlete and trainer details for a whole page in one batched
// query instead of two GetUserByID calls per request. Details for accounts
// that no longer exist degrade to their zero value.
func (s *CoachingRequestService) enrichAll(ctx context.Context, requests []*models.CoachingRequest) ([]*models.CoachingRequestWithDetails, error) {
	userIDs := make([]int, 0, 2*len(requests))
	seen := make(map[int]struct{}, 2*len(requests))
	for _, req := range requests {
		for _, id := range []int{req.AthleteID, req.TrainerID} {
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			userIDs = append(userIDs, id)
		}
	}

	users, err := s.userRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to load user details: %w", err)
	}

	requestsWithDetails := make([]*models.CoachingRequestWithDetails, 0, len(requests))
	for _, req := range requests {
		requestsWithDetails = append(requestsWithDetails, &models.CoachingRequestWithDetails{
			CoachingRequest: req,
			Athlete:         users[req.AthleteID],
			Trainer:         users[req.TrainerID],
		})
	}
	return requestsWithDetails, nil
}

func (s *CoachingRequestService) GetPendingRequestsForTrainer(ctx context.Context, trainerID int, limit, offset int) (*CoachingRequestsPage, error) {
	requests, err := s.coachingRequestRepo.GetPendingByTrainerID(ctx, trainerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending coaching requests: %w", err)
	}

	count, err := s.coachingRequestRepo.CountPendingByTrainerID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to count pending coaching requests: %w", err)
	}

	requestsWithDetails, err := s.enrichAll(ctx, requests)
	if err != nil {
		return nil, err
	}

	return &CoachingRequestsPage{Requests: requestsWithDetails, Count: count}, nil
}
