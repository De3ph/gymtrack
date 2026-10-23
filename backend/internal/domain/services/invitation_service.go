package services

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

// InvitationMethod defines the storage interface for invitation codes.
type InvitationMethod interface {
	GenerateInvitation(ctx context.Context, trainerID int, athleteID int) (*models.Invitation, error)

	// ClaimInvitation atomically takes ownership of a pending, unexpired code
	// and returns it.
	//
	// Validation and consumption must be a single operation. Reading the code
	// and marking it used as two separate steps leaves a window in which two
	// concurrent accepts both observe "pending" and both succeed.
	//
	// An implementation backed by a transaction-aware repository joins the
	// caller's transaction, so a failed accept rolls the claim back with it.
	ClaimInvitation(ctx context.Context, code string) (*models.Invitation, error)
}

// InvitationService manages invitations using an adapter pattern.
type InvitationService struct {
	method        InvitationMethod
	relationships *RelationshipService
	transactions  repositories.TransactionManager
}

// NewInvitationService creates a new invitation service.
func NewInvitationService(
	method InvitationMethod,
	relationships *RelationshipService,
	transactions repositories.TransactionManager,
) *InvitationService {
	return &InvitationService{
		method:        method,
		relationships: relationships,
		transactions:  transactionManagerOrDefault(transactions),
	}
}

// GenerateInvitation creates a new invitation for a trainer.
func (s *InvitationService) GenerateInvitation(ctx context.Context, trainerID int) (*models.Invitation, error) {
	return s.method.GenerateInvitation(ctx, trainerID, 0)
}

// AcceptInvitation allows an athlete to accept an invitation.
//
// The claim, the relationship, and the trainer projection on the athlete's
// profile are one transaction. A failure at any step rolls the whole accept
// back, including the claim, so the code stays usable and the athlete can
// retry. Splitting them would allow an active relationship the athlete never
// finished accepting, or a burned code with no relationship behind it.
func (s *InvitationService) AcceptInvitation(ctx context.Context, code string, athleteID int) (*models.Relationship, error) {
	// Check whether the athlete can accept anything at all before touching the
	// code. Doing this first means an athlete who already has a trainer never
	// claims a code at all, so a third party redeeming that same code during
	// this request cannot be told it is already used.
	hasActiveTrainer, err := s.relationships.HasActiveTrainer(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	}
	if hasActiveTrainer {
		return nil, ErrAlreadyHasActiveTrainer
	}

	var relationship *models.Relationship
	err = s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error {
		// Claiming is the serialization point for concurrent accepts of the
		// same code: only the transaction that wins the UPDATE proceeds.
		invitation, err := s.method.ClaimInvitation(txCtx, code)
		if err != nil {
			return err
		}

		rel, err := s.relationships.Activate(txCtx, invitation.TrainerID, athleteID)
		if err != nil {
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
