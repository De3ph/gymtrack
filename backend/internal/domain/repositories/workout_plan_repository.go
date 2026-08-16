package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// WorkoutPlanRepository defines data access for workout plans.
type WorkoutPlanRepository interface {
	Create(ctx context.Context, plan *models.WorkoutPlan) error
	GetByID(ctx context.Context, planID int) (*models.WorkoutPlan, error)
	GetByCreatorID(ctx context.Context, creatorID int) ([]*models.WorkoutPlan, error)
	CountByCreatorID(ctx context.Context, creatorID int) (int, error)
	Update(ctx context.Context, plan *models.WorkoutPlan) error
	Delete(ctx context.Context, planID int) error
}

// WorkoutPlanAssignmentRepository defines data access for plan assignments.
type WorkoutPlanAssignmentRepository interface {
	Create(ctx context.Context, assignment *models.WorkoutPlanAssignment) error
	GetByPlanID(ctx context.Context, planID int) ([]*models.WorkoutPlanAssignment, error)
	GetByAthleteID(ctx context.Context, athleteID int) ([]*models.WorkoutPlanAssignment, error)
	GetByAthleteAndPlan(ctx context.Context, athleteID int, planID int) (*models.WorkoutPlanAssignment, error)
	GetByTrainerID(ctx context.Context, trainerID int) ([]*models.WorkoutPlanAssignment, error)
	DeleteByPlanID(ctx context.Context, planID int) error
}
