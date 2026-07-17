package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// MuscleGroupRepository defines data access for muscle group definitions.
type MuscleGroupRepository interface {
	GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error)
	GetMuscleGroupByID(ctx context.Context, id int) (*models.MuscleGroupDefinition, error)
}
