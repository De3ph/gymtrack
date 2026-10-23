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

// RelationshipService owns the trainer-athlete connection aggregate:
// establishing an active relationship, terminating it, and querying the active
// connection between two users.
//
// Every write to the aggregate is one transaction: the relationships row and
// the trainerAssignment projection on users.profile must never be observable
// apart from each other.
type RelationshipService struct {
	relationshipRepo repositories.RelationshipRepository
	userRepo         repositories.UserRepository
	transactions     repositories.TransactionManager
	clock            utils.Clock
}

// NewRelationshipService creates a RelationshipService.
func NewRelationshipService(
	relationshipRepo repositories.RelationshipRepository,
	userRepo repositories.UserRepository,
	transactions repositories.TransactionManager,
	clock utils.Clock,
) *RelationshipService {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &RelationshipService{
		relationshipRepo: relationshipRepo,
		userRepo:         userRepo,
		transactions:     transactionManagerOrDefault(transactions),
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
// the athlete's profile in the same transaction. It refuses to create a second
// active relationship for the same athlete, closing the race between the
// caller's pre-check and this write.
func (s *RelationshipService) Activate(ctx context.Context, trainerID, athleteID int) (*models.Relationship, error) {
	exists, err := s.HasActiveTrainer(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrAlreadyHasActiveTrainer
	}

	now := s.clock.Now()

	var relationship *models.Relationship
	err = s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error {
		existing, err := s.relationshipRepo.GetByTrainerAndAthlete(txCtx, trainerID, athleteID)
		if err == nil {
			relationship, err = s.activatePending(txCtx, existing, now)
			return err
		}
		if !errors.Is(err, domainerrors.ErrNotFound) {
			return fmt.Errorf("failed to check existing relationship: %w", err)
		}

		created := models.NewRelationship(trainerID, athleteID)
		created.CreatedAt = now
		created.Accept()
		created.UpdatedAt = now
		if err := s.relationshipRepo.Create(txCtx, created); err != nil {
			if errors.Is(err, domainerrors.ErrActiveRelationshipExists) {
				// A concurrent activation won the partial unique index race.
				// Report the business outcome, not a generic write conflict.
				return ErrAlreadyHasActiveTrainer
			}
			return fmt.Errorf("failed to create relationship: %w", err)
		}

		if err := s.setTrainerAssignment(txCtx, athleteID, trainerID); err != nil {
			return err
		}
		relationship = created
		return nil
	})
	if err != nil {
		return nil, err
	}
	return relationship, nil
}

// activatePending promotes the pair's open pending row instead of inserting a
// second one, which the partial unique index on open pairs would reject.
// Terminated rows are history: GetByTrainerAndAthlete never returns them, so a
// reconnect after termination creates a new relationship row.
func (s *RelationshipService) activatePending(ctx context.Context, relationship *models.Relationship, now time.Time) (*models.Relationship, error) {
	if relationship.IsActive() {
		return nil, ErrAlreadyHasActiveTrainer
	}

	relationship.Status = models.RelationshipStatusActive
	relationship.UpdatedAt = now
	if err := s.relationshipRepo.Update(ctx, relationship); err != nil {
		if errors.Is(err, domainerrors.ErrActiveRelationshipExists) {
			return nil, ErrAlreadyHasActiveTrainer
		}
		return nil, fmt.Errorf("failed to activate relationship: %w", err)
	}

	// The caller's transaction also covers the profile projection, so a
	// failure here rolls the status change back with it.
	if err := s.setTrainerAssignment(ctx, relationship.AthleteID, relationship.TrainerID); err != nil {
		return nil, err
	}
	return relationship, nil
}

// Terminate ends a relationship on behalf of one of its participants and clears
// the trainer assignment from the athlete's profile in the same transaction.
// Re-terminating an already terminated relationship succeeds, preserving the
// API's idempotent behaviour.
func (s *RelationshipService) Terminate(ctx context.Context, relationshipID, actorID int, actorRole models.UserRole) (*models.Relationship, error) {
	var relationship *models.Relationship
	err := s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error {
		rel, err := s.relationshipRepo.GetByID(txCtx, relationshipID)
		if err != nil {
			return err
		}
		if !canTerminate(rel, actorID, actorRole) {
			return ErrRelationshipTerminationForbidden
		}

		rel.Terminate()
		if err := s.relationshipRepo.Update(txCtx, rel); err != nil {
			return fmt.Errorf("failed to terminate relationship: %w", err)
		}
		if err := s.clearTrainerAssignment(txCtx, rel.AthleteID, rel.TrainerID); err != nil {
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
	if err := s.userRepo.SetTrainerAssignment(ctx, athleteID, trainerID); err != nil {
		return fmt.Errorf("failed to update athlete profile: %w", err)
	}
	return nil
}

// clearTrainerAssignment clears the projection only when it still points at the
// trainer being terminated. The repository enforces that guard in the UPDATE
// itself, so a stale read cannot wipe a newer trainer's assignment.
func (s *RelationshipService) clearTrainerAssignment(ctx context.Context, athleteID, trainerID int) error {
	if err := s.userRepo.ClearTrainerAssignment(ctx, athleteID, trainerID); err != nil {
		return fmt.Errorf("failed to update athlete profile: %w", err)
	}
	return nil
}
