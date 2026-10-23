package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// RelationshipRepository defines data access for trainer-athlete relationships.
type RelationshipRepository interface {
	Create(ctx context.Context, relationship *models.Relationship) error
	GetByID(ctx context.Context, relationshipID int) (*models.Relationship, error)
	GetByTrainerID(ctx context.Context, trainerID int) ([]*models.Relationship, error)
	// GetActiveByTrainerID pages the trainer's active clients; a limit <= 0
	// returns the full roster. CountActiveByTrainerID sizes the complete set.
	GetActiveByTrainerID(ctx context.Context, trainerID int, limit, offset int) ([]*models.Relationship, error)
	CountActiveByTrainerID(ctx context.Context, trainerID int) (int, error)
	GetActiveByAthleteID(ctx context.Context, athleteID int) (*models.Relationship, error)
	// GetByTrainerAndAthlete returns the pair's current open relationship
	// (pending or active), or ErrNotFound when the pair has only history.
	GetByTrainerAndAthlete(ctx context.Context, trainerID int, athleteID int) (*models.Relationship, error)
	GetPendingByAthleteID(ctx context.Context, athleteID int) ([]*models.Relationship, error)
	HasActiveRelationship(ctx context.Context, trainerID int, athleteID int) (bool, error)
	Update(ctx context.Context, relationship *models.Relationship) error
	Delete(ctx context.Context, relationshipID int) error
}
