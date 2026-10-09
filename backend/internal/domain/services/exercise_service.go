package services

import (
	"context"
	"errors"
	"fmt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type ExerciseService interface {
	CreateExercise(ctx context.Context, name, category string, muscleGroupID, equipmentID int, createdBy int) (*models.Exercise, error)
	CreateExerciseWithMedia(ctx context.Context, name, category string, muscleGroupID, equipmentID int, createdBy int, mediaURL, mediaType string) (*models.Exercise, error)
	GetExerciseByID(ctx context.Context, exerciseID int) (*models.Exercise, error)
	GetAllExercises(ctx context.Context) ([]models.Exercise, error)
	GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error)
	GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error)
	SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error)
	GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error)
	GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error)
}

type ExerciseServiceImpl struct {
	exerciseRepo    repositories.ExerciseRepository
	muscleGroupRepo repositories.MuscleGroupRepository
	equipmentRepo   repositories.EquipmentRepository
}

func NewExerciseService(
	exerciseRepo repositories.ExerciseRepository,
	muscleGroupRepo repositories.MuscleGroupRepository,
	equipmentRepo repositories.EquipmentRepository,
) *ExerciseServiceImpl {
	return &ExerciseServiceImpl{
		exerciseRepo:    exerciseRepo,
		muscleGroupRepo: muscleGroupRepo,
		equipmentRepo:   equipmentRepo,
	}
}

func (s *ExerciseServiceImpl) CreateExercise(ctx context.Context, name, category string, muscleGroupID, equipmentID int, createdBy int) (*models.Exercise, error) {
	// Validate muscle group exists
	_, err := s.muscleGroupRepo.GetMuscleGroupByID(ctx, muscleGroupID)
	if err != nil {
		return nil, fmt.Errorf("invalid muscle group ID: %w", err)
	}

	// Validate equipment exists
	_, err = s.equipmentRepo.GetEquipmentByID(ctx, equipmentID)
	if err != nil {
		return nil, fmt.Errorf("invalid equipment ID: %w", err)
	}

	exercise := models.NewExercise(name, category, muscleGroupID, equipmentID, createdBy)
	err = s.exerciseRepo.CreateExercise(ctx, exercise)
	if err != nil {
		return nil, fmt.Errorf("failed to create exercise: %w", err)
	}

	return exercise, nil
}

// CreateExerciseWithMedia is CreateExercise plus an optional demonstration
// asset. The media columns are validated by the model before any write, so an
// unsupported media type or a non-https URL never reaches the database - the
// catalog would otherwise gain a row the exercise library page cannot render.
func (s *ExerciseServiceImpl) CreateExerciseWithMedia(ctx context.Context, name, category string, muscleGroupID, equipmentID, createdBy int, mediaURL, mediaType string) (*models.Exercise, error) {
	// Validate muscle group exists
	_, err := s.muscleGroupRepo.GetMuscleGroupByID(ctx, muscleGroupID)
	if err != nil {
		return nil, fmt.Errorf("invalid muscle group ID: %w", err)
	}

	// Validate equipment exists
	if _, err = s.equipmentRepo.GetEquipmentByID(ctx, equipmentID); err != nil {
		return nil, fmt.Errorf("invalid equipment ID: %w", err)
	}

	exercise, err := models.NewExerciseWithMedia(name, category, muscleGroupID, equipmentID, createdBy, mediaURL, mediaType)
	if err != nil {
		// The sentinel is preserved unwrapped: the handler must be able to answer
		// 400 for bad input rather than 500.
		return nil, err
	}

	err = s.exerciseRepo.CreateExercise(ctx, exercise)
	if err != nil {
		return nil, fmt.Errorf("failed to create exercise: %w", err)
	}

	return exercise, nil
}

func (s *ExerciseServiceImpl) GetExerciseByID(ctx context.Context, exerciseID int) (*models.Exercise, error) {
	exercise, err := s.exerciseRepo.GetExerciseByID(ctx, exerciseID)
	if err != nil {
		// Preserve service-layer contract: missing exercise is not an error here,
		// handlers translate (nil, nil) to HTTP 404.
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get exercise: %w", err)
	}
	return exercise, nil
}

func (s *ExerciseServiceImpl) GetAllExercises(ctx context.Context) ([]models.Exercise, error) {
	exercises, err := s.exerciseRepo.GetAllExercises(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get exercises: %w", err)
	}

	return exercises, nil
}

func (s *ExerciseServiceImpl) GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error) {
	// An unknown muscle group is the caller's mistake, not a server fault, so the
	// sentinel is returned unwrapped: the handler needs to tell it apart from a
	// genuine repository error in order to answer 400 rather than 500.
	_, err := s.muscleGroupRepo.GetMuscleGroupByID(ctx, muscleGroupID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("invalid muscle group ID: %w", err)
	}

	exercises, err := s.exerciseRepo.GetExercisesByMuscleGroup(ctx, muscleGroupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get exercises by muscle group: %w", err)
	}

	return exercises, nil
}

func (s *ExerciseServiceImpl) GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error) {
	// As above: an unknown equipment id is reported as ErrNotFound so the handler
	// can answer 400 instead of 500.
	_, err := s.equipmentRepo.GetEquipmentByID(ctx, equipmentID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("invalid equipment ID: %w", err)
	}

	exercises, err := s.exerciseRepo.GetExercisesByEquipment(ctx, equipmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get exercises by equipment: %w", err)
	}

	return exercises, nil
}

func (s *ExerciseServiceImpl) SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error) {
	// Validate filters if provided
	if muscleGroupID != nil {
		_, err := s.muscleGroupRepo.GetMuscleGroupByID(ctx, *muscleGroupID)
		if err != nil {
			if errors.Is(err, domainerrors.ErrNotFound) {
				return nil, domainerrors.ErrNotFound
			}
			return nil, fmt.Errorf("invalid muscle group ID: %w", err)
		}
	}

	if equipmentID != nil {
		_, err := s.equipmentRepo.GetEquipmentByID(ctx, *equipmentID)
		if err != nil {
			if errors.Is(err, domainerrors.ErrNotFound) {
				return nil, domainerrors.ErrNotFound
			}
			return nil, fmt.Errorf("invalid equipment ID: %w", err)
		}
	}

	exercises, err := s.exerciseRepo.SearchExercises(ctx, query, muscleGroupID, equipmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to search exercises: %w", err)
	}

	return exercises, nil
}

func (s *ExerciseServiceImpl) GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error) {
	muscleGroups, err := s.muscleGroupRepo.GetAllMuscleGroups(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get muscle groups: %w", err)
	}

	return muscleGroups, nil
}

func (s *ExerciseServiceImpl) GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error) {
	equipment, err := s.equipmentRepo.GetAllEquipment(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get equipment: %w", err)
	}

	return equipment, nil
}
