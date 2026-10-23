package services

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubWorkoutRepo struct {
	workout *models.Workout
}

func (s *stubWorkoutRepo) GetByID(_ context.Context, id int) (*models.Workout, error) {
	if s.workout == nil || s.workout.WorkoutID != id {
		return nil, domainerrors.ErrNotFound
	}
	return s.workout, nil
}

func (s *stubWorkoutRepo) Create(context.Context, *models.Workout) error { return nil }
func (s *stubWorkoutRepo) GetByAthleteID(context.Context, int, int, int) ([]*models.Workout, error) {
	return nil, nil
}
func (s *stubWorkoutRepo) GetByAthleteDateRange(context.Context, int, *time.Time, *time.Time, int, int) ([]*models.Workout, error) {
	return nil, nil
}
func (s *stubWorkoutRepo) CountByAthlete(context.Context, int, *time.Time, *time.Time) (int, error) {
	return 0, nil
}
func (s *stubWorkoutRepo) CountAll(context.Context) (int, error)         { return 0, nil }
func (s *stubWorkoutRepo) Update(context.Context, *models.Workout) error { return nil }
func (s *stubWorkoutRepo) Delete(context.Context, int) error             { return nil }
func (s *stubWorkoutRepo) WeeklyVolume(context.Context, int) ([]repositories.VolumeWeekRow, error) {
	return nil, nil
}
func (s *stubWorkoutRepo) ExerciseAggregates(context.Context, int) ([]repositories.ExerciseAggregateRow, error) {
	return nil, nil
}
func (s *stubWorkoutRepo) CountByAthleteSince(context.Context, int, time.Time) (int, error) {
	return 0, nil
}

func TestGetWorkoutAccessControl(t *testing.T) {
	const (
		athleteID    = 10
		otherAthlete = 20
		trainerID    = 30
		otherTrainer = 31
		workoutID    = 42
	)

	newService := func(relActive bool) *WorkoutService {
		repo := &stubWorkoutRepo{workout: &models.Workout{WorkoutID: workoutID, AthleteID: athleteID}}
		if relActive {
			return NewWorkoutService(repo, alwaysRelationshipRepo{})
		}
		return NewWorkoutService(repo, noRelationshipRepo{})
	}

	t.Run("athlete can view own workout", func(t *testing.T) {
		svc := newService(false)
		w, err := svc.GetWorkout(context.Background(), GetWorkoutInput{
			WorkoutID: workoutID, RequesterID: athleteID, RequesterRole: models.RoleAthlete,
		})
		require.NoError(t, err)
		assert.Equal(t, workoutID, w.WorkoutID)
	})

	t.Run("athlete cannot view another athlete's workout", func(t *testing.T) {
		svc := newService(false)
		_, err := svc.GetWorkout(context.Background(), GetWorkoutInput{
			WorkoutID: workoutID, RequesterID: otherAthlete, RequesterRole: models.RoleAthlete,
		})
		require.Error(t, err)
		var svcErr *ServiceError
		require.ErrorAs(t, err, &svcErr)
		assert.Equal(t, "FORBIDDEN", svcErr.Code)
	})

	t.Run("trainer with active relationship can view client workout", func(t *testing.T) {
		svc := newService(true)
		w, err := svc.GetWorkout(context.Background(), GetWorkoutInput{
			WorkoutID: workoutID, RequesterID: trainerID, RequesterRole: models.RoleTrainer,
		})
		require.NoError(t, err)
		assert.Equal(t, workoutID, w.WorkoutID)
	})

	// Regression test for cross-tenant read via IDOR: a trainer who does not
	// coach an athlete must not be able to fetch that athlete's workout by ID.
	t.Run("trainer without active relationship cannot view workout", func(t *testing.T) {
		svc := newService(false)
		_, err := svc.GetWorkout(context.Background(), GetWorkoutInput{
			WorkoutID: workoutID, RequesterID: otherTrainer, RequesterRole: models.RoleTrainer,
		})
		require.Error(t, err)
		var svcErr *ServiceError
		require.ErrorAs(t, err, &svcErr)
		assert.Equal(t, "FORBIDDEN", svcErr.Code)
	})

	t.Run("relationship lookup failure propagates as error", func(t *testing.T) {
		repo := &stubWorkoutRepo{workout: &models.Workout{WorkoutID: workoutID, AthleteID: athleteID}}
		svc := NewWorkoutService(repo, noRelationshipRepo{err: domainerrors.ErrUnauthorized})
		_, err := svc.GetWorkout(context.Background(), GetWorkoutInput{
			WorkoutID: workoutID, RequesterID: trainerID, RequesterRole: models.RoleTrainer,
		})
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrUnauthorized)
	})
}
