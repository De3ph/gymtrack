package handlers

import (
	"context"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
)

// Fakes for the three repositories behind ExerciseService. Handlers hold a
// concrete services.ExerciseService, so the repository boundary is the only seam
// that needs no production change: each fake records the arguments it was called
// with and returns a canned result or error.

type fakeExerciseRepo struct {
	exercises []models.Exercise
	byID      map[int]*models.Exercise

	created *models.Exercise

	listErr     error
	getErr      error
	createErr   error
	muscleErr   error
	equipErr    error
	searchErr   error
	searchSeen  searchCall
	muscleCalls []int
	equipCalls  []int
}

type searchCall struct {
	query         string
	muscleGroupID *int
	equipmentID   *int
}

func (f *fakeExerciseRepo) CreateExercise(ctx context.Context, exercise *models.Exercise) error {
	if f.createErr != nil {
		return f.createErr
	}
	stored := *exercise
	f.created = &stored
	return nil
}

func (f *fakeExerciseRepo) GetExerciseByID(ctx context.Context, exerciseID int) (*models.Exercise, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	exercise, ok := f.byID[exerciseID]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return exercise, nil
}

func (f *fakeExerciseRepo) GetAllExercises(ctx context.Context) ([]models.Exercise, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.exercises, nil
}

// muscleCalls / equipCalls record which IDs reached the listing queries, so a test can
// assert that an unknown filter short-circuits before any rows are read.
func (f *fakeExerciseRepo) GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error) {
	f.muscleCalls = append(f.muscleCalls, muscleGroupID)
	if f.muscleErr != nil {
		return nil, f.muscleErr
	}
	return f.exercises, nil
}

func (f *fakeExerciseRepo) GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error) {
	f.equipCalls = append(f.equipCalls, equipmentID)
	if f.equipErr != nil {
		return nil, f.equipErr
	}
	return f.exercises, nil
}

func (f *fakeExerciseRepo) SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error) {
	f.searchSeen = searchCall{query: query, muscleGroupID: muscleGroupID, equipmentID: equipmentID}
	if f.searchErr != nil {
		return nil, f.searchErr
	}
	return f.exercises, nil
}

// UpdateExercise and DeleteExercise belong to the admin moderation path, not to
// any handler registered in exercise_routes.go; they exist to satisfy the
// interface and panic loudly if a future change routes them through this fake.
func (f *fakeExerciseRepo) UpdateExercise(ctx context.Context, exercise *models.Exercise) error {
	panic("fakeExerciseRepo: UpdateExercise not used by exercise routes")
}

func (f *fakeExerciseRepo) DeleteExercise(ctx context.Context, exerciseID int) error {
	panic("fakeExerciseRepo: DeleteExercise not used by exercise routes")
}

type fakeMuscleGroupRepo struct {
	groups []models.MuscleGroupDefinition
	byID   map[int]*models.MuscleGroupDefinition

	listErr error
	getErr  error

	// getCalls counts GetMuscleGroupByID hits so a test can assert the service
	// validated the ID before hitting the exercise repository.
	getCalls []int
}

func (f *fakeMuscleGroupRepo) GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.groups, nil
}

func (f *fakeMuscleGroupRepo) GetMuscleGroupByID(ctx context.Context, id int) (*models.MuscleGroupDefinition, error) {
	f.getCalls = append(f.getCalls, id)
	if f.getErr != nil {
		return nil, f.getErr
	}
	group, ok := f.byID[id]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return group, nil
}

type fakeEquipmentRepo struct {
	equipment []models.EquipmentDefinition
	byID      map[int]*models.EquipmentDefinition

	listErr error
	getErr  error

	getCalls []int
}

func (f *fakeEquipmentRepo) GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.equipment, nil
}

func (f *fakeEquipmentRepo) GetEquipmentByID(ctx context.Context, id int) (*models.EquipmentDefinition, error) {
	f.getCalls = append(f.getCalls, id)
	if f.getErr != nil {
		return nil, f.getErr
	}
	equipment, ok := f.byID[id]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return equipment, nil
}
