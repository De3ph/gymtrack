package services

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/domain/models"

	"go.uber.org/zap"
	logger "gymtrack-backend/internal/infrastructure/log"
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
	ClaimInvitation(ctx context.Context, code string) (*models.Invitation, error)

	// ReleaseClaim returns a code claimed by ClaimInvitation to the pending
	// state, so an accept that failed after claiming can be retried.
	//
	// The claimed invitation is passed back whole so the storage layer can
	// match on the timestamp its claim wrote; a release can therefore never
	// resurrect a code consumed by a successful accept.
	ReleaseClaim(ctx context.Context, invitation *models.Invitation) error
}

// InvitationService manages invitations using an adapter pattern.
type InvitationService struct {
	method        InvitationMethod
	relationships *RelationshipService
}

// NewInvitationService creates a new invitation service.
func NewInvitationService(method InvitationMethod, relationships *RelationshipService) *InvitationService {
	return &InvitationService{
		method:        method,
		relationships: relationships,
	}
}

// GenerateInvitation creates a new invitation for a trainer.
func (s *InvitationService) GenerateInvitation(ctx context.Context, trainerID int) (*models.Invitation, error) {
	return s.method.GenerateInvitation(ctx, trainerID, 0)
}

// claimReleaseTimeout bounds the compensating release of an invitation claim.
const claimReleaseTimeout = 5 * time.Second

// AcceptInvitation allows an athlete to accept an invitation.
//
// The code is claimed atomically before it is redeemed, so exactly one
// concurrent accept can proceed. If a later step fails the claim is released,
// leaving the code usable rather than burned.
func (s *InvitationService) AcceptInvitation(ctx context.Context, code string, athleteID int) (*models.Relationship, error) {
	// Check whether the athlete can accept anything at all before touching the
	// code. Doing this first means an athlete who already has a trainer never
	// claims a code at all, so a third party redeeming that same code during
	// this request cannot be told it is already used.
	//
	// An athlete with an active trainer must not claim a code at all. The
	// RelationshipService reports "no active relationship" as false, which is
	// the normal case for a first-time acceptance.
	hasActiveTrainer, err := s.relationships.HasActiveTrainer(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	}
	if hasActiveTrainer {
		return nil, ErrAlreadyHasActiveTrainer
	}

	// Claim the code. This both validates it and consumes it in one statement,
	// so a second concurrent accept of the same code loses here with
	// ErrInvitationAlreadyUsed instead of racing on to create a second
	// relationship.
	invitation, err := s.method.ClaimInvitation(ctx, code)
	if err != nil {
		return nil, err
	}

	// From here the code is held. Any failure must give it back, otherwise a
	// transient database error would permanently invalidate a code the athlete
	// never actually used.
	release := func() {
		// Deliberately not the request context. The failures that reach here
		// most often *are* context cancellation — a client disconnecting
		// mid-request aborts the write below and would abort the release on the
		// same dead context, burning the code anyway. Detaching keeps the
		// request's values (trace span, logger) while dropping its
		// cancellation, bounded by a fresh timeout.
		releaseCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), claimReleaseTimeout)
		defer cancel()

		if relErr := s.method.ReleaseClaim(releaseCtx, invitation); relErr != nil {
			logger.From(ctx).Error("failed to release invitation claim; code is now unusable",
				zap.Int("invitationId", invitation.InvitationID),
				zap.Error(relErr),
			)
		}
	}

	relationship, err := s.relationships.Activate(ctx, invitation.TrainerID, athleteID)
	if err != nil {
		// The relationship row may already be committed and cannot be unwound
		// here: the accept is not atomic across the relationship and profile
		// writes. Releasing keeps the athlete from being locked out by a spent
		// code, and the relationship created above remains the source of
		// truth. A retry reaches the check at the top of this function and is
		// rejected with ErrAlreadyHasActiveTrainer, which is the accurate
		// answer for their state.
		release()
		return nil, err
	}

	// The relationship now exists, so the claim stands and the code is spent.
	return relationship, nil
}
