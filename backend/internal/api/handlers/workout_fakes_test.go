package handlers

import (
	"context"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

// fakeWorkoutRepo implements repositories.WorkoutRepository for the workout
// handler tests. WorkoutHandler holds a concrete *services.WorkoutService, so
// the repository boundary is the only seam a test can control; each fake
// records its call arguments and returns a canned result or error.
type fakeWorkoutRepo struct {
	workouts map[int]*models.Workout

	getErr    error
	updateErr error
	deleteErr error

	updated *models.Workout
	deleted []int
}

func (f *fakeWorkoutRepo) Create(ctx context.Context, workout *models.Workout) error {
	return nil
}

func (f *fakeWorkoutRepo) GetByID(ctx context.Context, workoutID int) (*models.Workout, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	workout, ok := f.workouts[workoutID]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return workout, nil
}

func (f *fakeWorkoutRepo) GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.Workout, error) {
	return nil, nil
}

func (f *fakeWorkoutRepo) GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate *time.Time, limit, offset int) ([]*models.Workout, error) {
	return nil, nil
}

func (f *fakeWorkoutRepo) CountByAthlete(ctx context.Context, athleteID int, startDate, endDate *time.Time) (int, error) {
	return 0, nil
}

func (f *fakeWorkoutRepo) CountAll(ctx context.Context) (int, error) {
	return 0, nil
}

func (f *fakeWorkoutRepo) WeeklyVolume(ctx context.Context, athleteID int) ([]repositories.VolumeWeekRow, error) {
	return nil, nil
}

func (f *fakeWorkoutRepo) ExerciseAggregates(ctx context.Context, athleteID int) ([]repositories.ExerciseAggregateRow, error) {
	return nil, nil
}

func (f *fakeWorkoutRepo) CountByAthleteSince(ctx context.Context, athleteID int, since time.Time) (int, error) {
	return 0, nil
}

func (f *fakeWorkoutRepo) Update(ctx context.Context, workout *models.Workout) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	f.updated = workout
	return nil
}

func (f *fakeWorkoutRepo) Delete(ctx context.Context, workoutID int) error {
	if f.deleteErr != nil {
		return f.deleteErr
	}
	f.deleted = append(f.deleted, workoutID)
	return nil
}
