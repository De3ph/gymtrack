package services

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type ExerciseService interface {
	CreateExercise(ctx context.Context, name, category string, muscleGroupID, equipmentID int, createdBy string) (*models.Exercise, error)
	GetExerciseByID(ctx context.Context, exerciseID string) (*models.Exercise, error)
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

func (s *ExerciseServiceImpl) CreateExercise(ctx context.Context, name, category string, muscleGroupID, equipmentID int, createdBy string) (*models.Exercise, error) {
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

func (s *ExerciseServiceImpl) GetExerciseByID(ctx context.Context, exerciseID string) (*models.Exercise, error) {
	exercise, err := s.exerciseRepo.GetExerciseByID(ctx, exerciseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get exercise: %w", err)
	}
	if exercise == nil {
		return nil, nil
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
	// Validate muscle group exists
	_, err := s.muscleGroupRepo.GetMuscleGroupByID(ctx, muscleGroupID)
	if err != nil {
		return nil, fmt.Errorf("invalid muscle group ID: %w", err)
	}

	exercises, err := s.exerciseRepo.GetExercisesByMuscleGroup(ctx, muscleGroupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get exercises by muscle group: %w", err)
	}

	return exercises, nil
}

func (s *ExerciseServiceImpl) GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error) {
	// Validate equipment exists
	_, err := s.equipmentRepo.GetEquipmentByID(ctx, equipmentID)
	if err != nil {
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
			return nil, fmt.Errorf("invalid muscle group ID: %w", err)
		}
	}

	if equipmentID != nil {
		_, err := s.equipmentRepo.GetEquipmentByID(ctx, *equipmentID)
		if err != nil {
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
