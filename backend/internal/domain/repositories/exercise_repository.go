package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// ExerciseRepository defines data access for exercises.
type ExerciseRepository interface {
	CreateExercise(ctx context.Context, exercise *models.Exercise) error
	GetExerciseByID(ctx context.Context, exerciseID int) (*models.Exercise, error)
	GetAllExercises(ctx context.Context) ([]models.Exercise, error)
	GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error)
	GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error)
	SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error)
	UpdateExercise(ctx context.Context, exercise *models.Exercise) error
	DeleteExercise(ctx context.Context, exerciseID int) error

}
