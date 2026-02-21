package services

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/google/uuid"
)

type CoachingRequestService struct {
	coachingRequestRepo repositories.CoachingRequestRepository
	userRepo            repositories.UserRepository
	relationshipRepo    *repositories.RelationshipRepository
}

func NewCoachingRequestService(
	coachingRequestRepo repositories.CoachingRequestRepository,
	userRepo repositories.UserRepository,
	relationshipRepo *repositories.RelationshipRepository,
) *CoachingRequestService {
	return &CoachingRequestService{
		coachingRequestRepo: coachingRequestRepo,
		userRepo:            userRepo,
		relationshipRepo:    relationshipRepo,
	}
}

func (s *CoachingRequestService) CreateCoachingRequest(ctx context.Context, athleteID string, trainerID string, message string) (*models.CoachingRequest, error) {
	// Check if athlete already has an active relationship
	activeRelationship, err := s.relationshipRepo.GetByAthleteID(athleteID)
	if err == nil && activeRelationship != nil {
		return nil, fmt.Errorf("athlete already has an active trainer")
	}

	// Check if there's already a pending request between these users
	existingRequests, err := s.coachingRequestRepo.GetByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing requests: %w", err)
	}

	for _, req := range existingRequests {
		if req.TrainerID == trainerID && req.Status == models.CoachingRequestStatusPending {
			return nil, fmt.Errorf("already have a pending request to this trainer")
		}
	}

	// Verify trainer exists and is actually a trainer
	trainer, err := s.userRepo.GetUserByID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("trainer not found: %w", err)
	}
	if trainer.Role != "trainer" {
		return nil, fmt.Errorf("user is not a trainer")
	}

	// Create the coaching request
	request := &models.CoachingRequest{
		RequestID: uuid.New().String(),
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

func (s *CoachingRequestService) AcceptCoachingRequest(ctx context.Context, requestID string, trainerID string) (*models.Relationship, error) {
	// Get the coaching request
	request, err := s.coachingRequestRepo.GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("coaching request not found: %w", err)
	}

	// Verify the trainer owns this request
	if request.TrainerID != trainerID {
		return nil, fmt.Errorf("unauthorized: this request is not for you")
	}

	// Check if request is still pending
	if request.Status != models.CoachingRequestStatusPending {
		return nil, fmt.Errorf("request has already been %s", request.Status)
	}

	// Check if athlete already has an active relationship
	activeRelationship, err := s.relationshipRepo.GetByAthleteID(request.AthleteID)
	if err == nil && activeRelationship != nil {
		return nil, fmt.Errorf("athlete already has an active trainer")
	}

	// Create the relationship
	relationship := &models.Relationship{
		RelationshipID: uuid.New().String(),
		TrainerID:      trainerID,
		AthleteID:      request.AthleteID,
		Status:         models.RelationshipStatusActive,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err = s.relationshipRepo.Create(relationship)
	if err != nil {
		return nil, fmt.Errorf("failed to create relationship: %w", err)
	}

	// Update athlete's profile to include trainer assignment
	athlete, err := s.userRepo.GetUserByID(ctx, request.AthleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get athlete: %w", err)
	}

	athlete.Profile.TrainerAssignment = trainerID
	err = s.userRepo.UpdateUser(ctx, athlete)
	if err != nil {
		return nil, fmt.Errorf("failed to update athlete profile: %w", err)
	}

	// Update the coaching request status
	request.Status = models.CoachingRequestStatusAccepted
	request.UpdatedAt = time.Now()
	err = s.coachingRequestRepo.Update(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to update coaching request: %w", err)
	}

	return relationship, nil
}

func (s *CoachingRequestService) RejectCoachingRequest(ctx context.Context, requestID string, trainerID string) error {
	// Get the coaching request
	request, err := s.coachingRequestRepo.GetByID(ctx, requestID)
	if err != nil {
		return fmt.Errorf("coaching request not found: %w", err)
	}

	// Verify the trainer owns this request
	if request.TrainerID != trainerID {
		return fmt.Errorf("unauthorized: this request is not for you")
	}

	// Check if request is still pending
	if request.Status != models.CoachingRequestStatusPending {
		return fmt.Errorf("request has already been %s", request.Status)
	}

	// Update the coaching request status
	request.Status = models.CoachingRequestStatusRejected
	request.UpdatedAt = time.Now()
	err = s.coachingRequestRepo.Update(ctx, request)
	if err != nil {
		return fmt.Errorf("failed to update coaching request: %w", err)
	}

	return nil
}

func (s *CoachingRequestService) GetMyRequests(ctx context.Context, userID string, userRole string) ([]*models.CoachingRequestWithDetails, error) {
	var requests []*models.CoachingRequest
	var err error

	if userRole == "athlete" {
		requests, err = s.coachingRequestRepo.GetByAthleteID(ctx, userID)
	} else if userRole == "trainer" {
		requests, err = s.coachingRequestRepo.GetByTrainerID(ctx, userID)
	} else {
		return nil, fmt.Errorf("invalid user role")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get coaching requests: %w", err)
	}

	// Enrich with user details
	var requestsWithDetails []*models.CoachingRequestWithDetails
	for _, req := range requests {
		requestWithDetails := &models.CoachingRequestWithDetails{
			CoachingRequest: req,
		}

		// Get athlete details
		athlete, err := s.userRepo.GetUserByID(ctx, req.AthleteID)
		if err == nil {
			requestWithDetails.Athlete = athlete
		}

		// Get trainer details
		trainer, err := s.userRepo.GetUserByID(ctx, req.TrainerID)
		if err == nil {
			requestWithDetails.Trainer = trainer
		}

		requestsWithDetails = append(requestsWithDetails, requestWithDetails)
	}

	return requestsWithDetails, nil
}

func (s *CoachingRequestService) GetPendingRequestsForTrainer(ctx context.Context, trainerID string) ([]*models.CoachingRequestWithDetails, error) {
	requests, err := s.coachingRequestRepo.GetPendingByTrainerID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending coaching requests: %w", err)
	}

	// Enrich with athlete details
	var requestsWithDetails []*models.CoachingRequestWithDetails
	for _, req := range requests {
		requestWithDetails := &models.CoachingRequestWithDetails{
			CoachingRequest: req,
		}

		// Get athlete details
		athlete, err := s.userRepo.GetUserByID(ctx, req.AthleteID)
		if err == nil {
			requestWithDetails.Athlete = athlete
		}

		requestsWithDetails = append(requestsWithDetails, requestWithDetails)
	}

	return requestsWithDetails, nil
}
