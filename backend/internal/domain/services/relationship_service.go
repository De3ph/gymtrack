package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

const relationshipRollbackTimeout = 5 * time.Second

// RelationshipService owns the trainer-athlete connection aggregate:
// establishing an active relationship, terminating it, and querying the active
// connection between two users.
type RelationshipService struct {
	relationshipRepo repositories.RelationshipRepository
	userRepo         repositories.UserRepository
	clock            utils.Clock
}

// NewRelationshipService creates a RelationshipService.
func NewRelationshipService(
	relationshipRepo repositories.RelationshipRepository,
	userRepo repositories.UserRepository,
	clock utils.Clock,
) *RelationshipService {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &RelationshipService{
		relationshipRepo: relationshipRepo,
		userRepo:         userRepo,
		clock:            clock,
	}
}

// ActiveTrainer is an athlete's active relationship projected with the
// trainer's profile.
type ActiveTrainer struct {
	Relationship *models.Relationship
	Trainer      *models.User
}

// ActiveClient is a trainer's active relationship projected with the
// athlete's profile.
type ActiveClient struct {
	Relationship *models.Relationship
	Athlete      *models.User
}

// HasActiveTrainer reports whether the athlete currently has an active
// relationship with any trainer.
func (s *RelationshipService) HasActiveTrainer(ctx context.Context, athleteID int) (bool, error) {
	_, err := s.relationshipRepo.GetActiveByAthleteID(ctx, athleteID)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check active relationship: %w", err)
	}
	return true, nil
}

// GetPendingInvitations returns the athlete's pending invitation relationships.
func (s *RelationshipService) GetPendingInvitations(ctx context.Context, athleteID int) ([]*models.Relationship, error) {
	invitations, err := s.relationshipRepo.GetPendingByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending invitations: %w", err)
	}
	return invitations, nil
}

// GetActiveTrainer returns the athlete's active relationship and trainer, or
// nil when there is none.
func (s *RelationshipService) GetActiveTrainer(ctx context.Context, athleteID int) (*ActiveTrainer, error) {
	relationship, err := s.relationshipRepo.GetActiveByAthleteID(ctx, athleteID)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve active relationship: %w", err)
	}

	trainer, err := s.userRepo.GetUserByID(ctx, relationship.TrainerID)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve trainer: %w", err)
	}

	return &ActiveTrainer{Relationship: relationship, Trainer: trainer}, nil
}

// GetActiveClients returns the trainer's active relationships with their
// athlete profiles. Athletes whose profile cannot be found are skipped, so one
// deleted account does not hide the trainer's whole roster.
func (s *RelationshipService) GetActiveClients(ctx context.Context, trainerID int) ([]*ActiveClient, error) {
	relationships, err := s.relationshipRepo.GetActiveByTrainerID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve active relationships: %w", err)
	}

	athleteIDs := make([]int, 0, len(relationships))
	seen := make(map[int]struct{}, len(relationships))
	for _, relationship := range relationships {
		if _, ok := seen[relationship.AthleteID]; ok {
			continue
		}
		seen[relationship.AthleteID] = struct{}{}
		athleteIDs = append(athleteIDs, relationship.AthleteID)
	}

	athletes, err := s.userRepo.GetUsersByIDs(ctx, athleteIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve athletes: %w", err)
	}

	clients := make([]*ActiveClient, 0, len(relationships))
	for _, relationship := range relationships {
		athlete, ok := athletes[relationship.AthleteID]
		if !ok {
			continue
		}
		clients = append(clients, &ActiveClient{Relationship: relationship, Athlete: athlete})
	}
	return clients, nil
}

// GetActiveClientRelationship returns the active relationship between the
// trainer and athlete, or ErrNoActiveCoachingRelationship when they are not
// connected.
func (s *RelationshipService) GetActiveClientRelationship(ctx context.Context, trainerID, athleteID int) (*models.Relationship, error) {
	relationship, err := s.relationshipRepo.GetActiveByAthleteID(ctx, athleteID)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return nil, ErrNoActiveCoachingRelationship
	}
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve active relationship: %w", err)
	}
	if relationship.TrainerID != trainerID {
		return nil, ErrNoActiveCoachingRelationship
	}
	return relationship, nil
}

// Activate establishes an active relationship and projects the trainer onto
// the athlete's profile. It refuses to create a second active relationship for
// the same athlete, closing the race between the caller's pre-check and this
// write.
func (s *RelationshipService) Activate(ctx context.Context, trainerID, athleteID int) (*models.Relationship, error) {
	exists, err := s.HasActiveTrainer(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrAlreadyHasActiveTrainer
	}

	now := s.clock.Now()
	existing, err := s.relationshipRepo.GetByTrainerAndAthlete(ctx, trainerID, athleteID)
	if err == nil {
		return s.reactivate(ctx, existing, now)
	}
	if !errors.Is(err, domainerrors.ErrNotFound) {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	}

	relationship := models.NewRelationship(trainerID, athleteID)
	relationship.CreatedAt = now
	relationship.Accept()
	relationship.UpdatedAt = now
	if err := s.relationshipRepo.Create(ctx, relationship); err != nil {
		if errors.Is(err, domainerrors.ErrConflict) {
			// A concurrent activation won the partial unique index race. Report
			// the business outcome, not a generic write conflict.
			if active, checkErr := s.HasActiveTrainer(ctx, athleteID); checkErr == nil && active {
				return nil, ErrAlreadyHasActiveTrainer
			}
		}
		return nil, fmt.Errorf("failed to create relationship: %w", err)
	}

	if err := s.setTrainerAssignment(ctx, athleteID, trainerID); err != nil {
		if rollbackErr := s.rollbackRelationship(ctx, relationship.RelationshipID); rollbackErr != nil {
			return nil, fmt.Errorf("%w (failed to roll back relationship: %v)", err, rollbackErr)
		}
		return nil, err
	}
	return relationship, nil
}

// reactivate reuses the existing row for a trainer-athlete pair. The schema
// keeps one row per pair, so reconnecting after termination must update that row
// instead of inserting a duplicate.
func (s *RelationshipService) reactivate(ctx context.Context, relationship *models.Relationship, now time.Time) (*models.Relationship, error) {
	if relationship.IsActive() {
		return nil, ErrAlreadyHasActiveTrainer
	}

	previousStatus := relationship.Status
	relationship.Status = models.RelationshipStatusActive
	relationship.UpdatedAt = now
	if err := s.relationshipRepo.Update(ctx, relationship); err != nil {
		if errors.Is(err, domainerrors.ErrConflict) {
			return nil, ErrAlreadyHasActiveTrainer
		}
		return nil, fmt.Errorf("failed to reactivate relationship: %w", err)
	}

	if err := s.setTrainerAssignment(ctx, relationship.AthleteID, relationship.TrainerID); err != nil {
		relationship.Status = previousStatus
		relationship.UpdatedAt = now
		if restoreErr := s.relationshipRepo.Update(ctx, relationship); restoreErr != nil {
			return nil, fmt.Errorf("%w (failed to restore relationship status: %v)", err, restoreErr)
		}
		return nil, err
	}
	return relationship, nil
}

// Terminate ends a relationship on behalf of one of its participants and clears
// the trainer assignment from the athlete's profile. Re-terminating an already
// terminated relationship succeeds, preserving the API's idempotent behaviour.
func (s *RelationshipService) Terminate(ctx context.Context, relationshipID, actorID int, actorRole models.UserRole) (*models.Relationship, error) {
	relationship, err := s.relationshipRepo.GetByID(ctx, relationshipID)
	if err != nil {
		return nil, err
	}
	if !canTerminate(relationship, actorID, actorRole) {
		return nil, ErrRelationshipTerminationForbidden
	}

	relationship.Terminate()
	if err := s.relationshipRepo.Update(ctx, relationship); err != nil {
		return nil, fmt.Errorf("failed to terminate relationship: %w", err)
	}

	if err := s.clearTrainerAssignment(ctx, relationship.AthleteID, relationship.TrainerID); err != nil {
		return nil, err
	}
	return relationship, nil
}

func canTerminate(relationship *models.Relationship, actorID int, actorRole models.UserRole) bool {
	switch actorRole {
	case models.RoleTrainer:
		return relationship.TrainerID == actorID
	case models.RoleAthlete:
		return relationship.AthleteID == actorID
	default:
		return false
	}
}

func (s *RelationshipService) setTrainerAssignment(ctx context.Context, athleteID, trainerID int) error {
	athlete, err := s.userRepo.GetUserByID(ctx, athleteID)
	if err != nil {
		return fmt.Errorf("failed to get athlete: %w", err)
	}

	athlete.Profile.TrainerAssignment = trainerID
	if err := s.userRepo.UpdateUser(ctx, athlete); err != nil {
		return fmt.Errorf("failed to update athlete profile: %w", err)
	}
	return nil
}

// clearTrainerAssignment clears the projection only when it still points at the
// trainer being terminated. Re-terminating an old relationship must not wipe a
// newer trainer's assignment.
func (s *RelationshipService) clearTrainerAssignment(ctx context.Context, athleteID, trainerID int) error {
	athlete, err := s.userRepo.GetUserByID(ctx, athleteID)
	if err != nil {
		return fmt.Errorf("failed to get athlete: %w", err)
	}
	if athlete.Profile.TrainerAssignment != trainerID {
		return nil
	}

	athlete.Profile.TrainerAssignment = 0
	if err := s.userRepo.UpdateUser(ctx, athlete); err != nil {
		return fmt.Errorf("failed to update athlete profile: %w", err)
	}
	return nil
}

// rollbackRelationship compensates for a profile-projection failure after the
// relationship row was inserted. The request context may already be cancelled,
// so the delete runs detached with its own deadline.
func (s *RelationshipService) rollbackRelationship(ctx context.Context, relationshipID int) error {
	rollbackCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), relationshipRollbackTimeout)
	defer cancel()

	return s.relationshipRepo.Delete(rollbackCtx, relationshipID)
}
