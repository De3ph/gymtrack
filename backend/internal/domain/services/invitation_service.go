package services

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

// InvitationMethod defines the storage interface for invitation codes.
type InvitationMethod interface {
	GenerateInvitation(ctx context.Context, trainerID int, athleteID int) (*models.Invitation, error)
	ValidateInvitation(ctx context.Context, code string) (*models.Invitation, error)
	MarkInvitationUsed(ctx context.Context, invitationID int) error
}

// InvitationService manages invitations using an adapter pattern.
type InvitationService struct {
	method           InvitationMethod
	relationshipRepo repositories.RelationshipRepository
	userRepo         repositories.UserRepository
	clock            utils.Clock
}

// NewInvitationService creates a new invitation service.
func NewInvitationService(
	method InvitationMethod,
	relationshipRepo repositories.RelationshipRepository,
	userRepo repositories.UserRepository,
	clock utils.Clock,
) *InvitationService {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &InvitationService{
		method:           method,
		relationshipRepo: relationshipRepo,
		userRepo:         userRepo,
		clock:            clock,
	}
}

// GenerateInvitation creates a new invitation for a trainer.
func (s *InvitationService) GenerateInvitation(ctx context.Context, trainerID int) (*models.Invitation, error) {
	return s.method.GenerateInvitation(ctx, trainerID, 0)
}

// AcceptInvitation allows an athlete to accept an invitation.
func (s *InvitationService) AcceptInvitation(ctx context.Context, code string, athleteID int) (*models.Relationship, error) {
	// Validate the invitation code
	invitation, err := s.method.ValidateInvitation(ctx, code)
	if err != nil {
		return nil, err
	}

	// Check if athlete already has an active trainer
	existingRelationship, err := s.relationshipRepo.GetByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	}
	if existingRelationship != nil && existingRelationship.IsActive() {
		return nil, fmt.Errorf("you already have an active trainer")
	}

	// Create new relationship
	relationship := models.NewRelationship(invitation.TrainerID, athleteID)
	relationship.Accept() // Set as active immediately

	// Save relationship
	if err := s.relationshipRepo.Create(ctx, relationship); err != nil {
		return nil, fmt.Errorf("failed to create relationship: %w", err)
	}

	// Update athlete's profile with trainer assignment
	athlete, err := s.userRepo.GetUserByID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get athlete: %w", err)
	}
	athlete.Profile.TrainerAssignment = invitation.TrainerID
	if err := s.userRepo.UpdateUser(ctx, athlete); err != nil {
		return nil, fmt.Errorf("failed to update athlete profile: %w", err)
	}

	// Mark invitation as used with concurrency safety
	if err := s.method.MarkInvitationUsed(ctx, invitation.InvitationID); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Warning: failed to mark invitation as used: %v\n", err)
	}

	return relationship, nil
}

// GetPendingInvitations gets pending invitations for an athlete.
func (s *InvitationService) GetPendingInvitations(ctx context.Context, athleteID int) ([]*models.Relationship, error) {
	relationships, err := s.relationshipRepo.GetPendingByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending invitations: %w", err)
	}
	return relationships, nil
}
