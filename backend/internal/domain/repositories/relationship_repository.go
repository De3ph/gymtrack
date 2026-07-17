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
	GetByAthleteID(ctx context.Context, athleteID int) (*models.Relationship, error)
	GetPendingByAthleteID(ctx context.Context, athleteID int) ([]*models.Relationship, error)
	HasActiveRelationship(ctx context.Context, trainerID int, athleteID int) (bool, error)
	Update(ctx context.Context, relationship *models.Relationship) error
	Delete(ctx context.Context, relationshipID int) error
}
