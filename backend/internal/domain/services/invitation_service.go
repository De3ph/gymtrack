package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/couchbase/gocb/v2"
)

type InvitationMethod interface {
	GenerateInvitation(trainerID string, athleteID string) (*models.Invitation, error)
	ValidateInvitation(code string) (*models.Invitation, error)
	MarkInvitationUsed(invitationID string) error
}

type InvitationGetResult interface {
	Content(valuePtr interface{}) error
	Cas() gocb.Cas
}

type InvitationCollection interface {
	Insert(id string, value interface{}, opts *gocb.InsertOptions) (*gocb.MutationResult, error)
	Get(id string, opts *gocb.GetOptions) (InvitationGetResult, error)
	Replace(id string, value interface{}, opts *gocb.ReplaceOptions) (*gocb.MutationResult, error)
}

// GocbCollectionAdapter adapts gocb.Collection to InvitationCollection interface
type GocbCollectionAdapter struct {
	collection *gocb.Collection
}

func NewGocbCollectionAdapter(collection *gocb.Collection) InvitationCollection {
	return &GocbCollectionAdapter{collection: collection}
}

func (a *GocbCollectionAdapter) Insert(id string, value interface{}, opts *gocb.InsertOptions) (*gocb.MutationResult, error) {
	return a.collection.Insert(id, value, opts)
}

func (a *GocbCollectionAdapter) Get(id string, opts *gocb.GetOptions) (InvitationGetResult, error) {
	return a.collection.Get(id, opts)
}

func (a *GocbCollectionAdapter) Replace(id string, value interface{}, opts *gocb.ReplaceOptions) (*gocb.MutationResult, error) {
	return a.collection.Replace(id, value, opts)
}

// CodeBasedInvitation implements InvitationMethod using unique codes
type CodeBasedInvitation struct {
	collection InvitationCollection
}

// NewCodeBasedInvitation creates a new code-based invitation service
func NewCodeBasedInvitation(collection InvitationCollection) *CodeBasedInvitation {
	return &CodeBasedInvitation{
		collection: collection,
	}
}

// generateUUIDSafe generates a UUID with error handling
var generateUUIDSafe = func(ctx context.Context) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to read random bytes: %w", err)
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:]), nil
}

// GenerateInvitation creates a new invitation code
func (c *CodeBasedInvitation) GenerateInvitation(trainerID string, athleteID string) (*models.Invitation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	code, err := generateRandomCode(ctx, 8)
	if err != nil {
		return nil, fmt.Errorf("failed to generate invitation code: %w", err)
	}

	invitationID, err := generateUUIDSafe(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate invitation UUID: %w", err)
	}

	invitation := &models.Invitation{
		Type:         "invitation",
		InvitationID: invitationID,
		TrainerID:    trainerID,
		Code:         code,
		Status:       "pending",
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour), // 7 days expiry
	}

	_, err = c.collection.Insert(invitation.InvitationID, invitation, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to save invitation: %w", err)
	}

	return invitation, nil
}

// ValidateInvitation checks if an invitation code is valid
func (c *CodeBasedInvitation) ValidateInvitation(code string) (*models.Invitation, error) {
	if code == "" {
		return nil, fmt.Errorf("code cannot be empty")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Query to find invitation by code using GlobalCluster
	query := fmt.Sprintf("SELECT i.* FROM `%s`.`%s`.`%s` i WHERE i.type = 'invitation' AND i.code = $1 LIMIT 1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionInvitations)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{code},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query invitation: %w", err)
	}
	defer result.Close()

	var invitation models.Invitation
	if result.Next() {
		if err := result.Row(&invitation); err != nil {
			return nil, fmt.Errorf("failed to decode invitation: %w", err)
		}
	} else {
		return nil, fmt.Errorf("invalid invitation code")
	}

	// Check if invitation is still valid
	if invitation.Status != "pending" {
		return nil, fmt.Errorf("invitation has already been used")
	}

	if time.Now().After(invitation.ExpiresAt) {
		return nil, fmt.Errorf("invitation has expired")
	}

	return &invitation, nil
}

// MarkInvitationUsed marks an invitation as used with concurrency safety
func (c *CodeBasedInvitation) MarkInvitationUsed(invitationID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := c.collection.Get(invitationID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to get invitation: %w", err)
	}

	var invitation models.Invitation
	if err := result.Content(&invitation); err != nil {
		return fmt.Errorf("failed to decode invitation: %w", err)
	}

	if invitation.Status != "pending" {
		return fmt.Errorf("invitation already used or not pending")
	}

	invitation.Status = "used"
	invitation.UsedAt = time.Now()

	_, err = c.collection.Replace(invitationID, invitation, &gocb.ReplaceOptions{
		Context: ctx,
		Cas:     result.Cas(),
	})
	if err != nil {
		return fmt.Errorf("failed to update invitation: %w", err)
	}

	return nil
}

// generateRandomCode generates a random hex code of specified length with context timeout
func generateRandomCode(ctx context.Context, length int) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}
	bytes := make([]byte, length/2)
	n, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("failed to read random bytes: %w", err)
	}
	if n == 0 {
		return "", fmt.Errorf("no random bytes read")
	}
	return hex.EncodeToString(bytes), nil
}

// InvitationService manages invitations using an adapter pattern
type InvitationService struct {
	method           InvitationMethod
	relationshipRepo repositories.RelationshipRepository
	userRepo         repositories.UserRepository
}

// NewInvitationService creates a new invitation service
func NewInvitationService(
	method InvitationMethod,
	relationshipRepo repositories.RelationshipRepository,
	userRepo repositories.UserRepository,
) *InvitationService {
	return &InvitationService{
		method:           method,
		relationshipRepo: relationshipRepo,
		userRepo:         userRepo,
	}
}

// GenerateInvitation creates a new invitation for a trainer
func (s *InvitationService) GenerateInvitation(trainerID string) (*models.Invitation, error) {
	return s.method.GenerateInvitation(trainerID, "")
}

// AcceptInvitation allows an athlete to accept an invitation
func (s *InvitationService) AcceptInvitation(code string, athleteID string) (*models.Relationship, error) {
	// Validate the invitation code
	invitation, err := s.method.ValidateInvitation(code)
	if err != nil {
		return nil, err
	}

	// Check if athlete already has an active trainer
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
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
	if err := s.method.MarkInvitationUsed(invitation.InvitationID); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Warning: failed to mark invitation as used: %v\n", err)
	}

	return relationship, nil
}

// GetPendingInvitations gets pending invitations for an athlete
func (s *InvitationService) GetPendingInvitations(athleteID string) ([]*models.Relationship, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	relationships, err := s.relationshipRepo.GetPendingByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending invitations: %w", err)
	}
	return relationships, nil
}
