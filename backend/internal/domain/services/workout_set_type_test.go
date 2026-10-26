package services

import (
	"context"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// capturingWorkoutRepo records the workout handed to Create so tests can
// inspect what the service actually stored.
type capturingWorkoutRepo struct {
	stubWorkoutRepo
	created *models.Workout
}

func (r *capturingWorkoutRepo) Create(_ context.Context, w *models.Workout) error {
	r.created = w
	return nil
}

func TestCreateWorkoutDefaultsMissingSetType(t *testing.T) {
	repo := &capturingWorkoutRepo{}
	svc := NewWorkoutService(repo, alwaysRelationshipRepo{})

	input := CreateWorkoutInput{
		AthleteID: 1,
		Date:      time.Now(),
		UserRole:  models.RoleAthlete,
		Exercises: []models.WorkoutExercise{
			{
				ExerciseID: 1,
				Name:       "Squat",
				Sets: []models.ExerciseSet{
					// No Type: the service must default it to working.
					{Weight: 100, WeightUnit: models.WeightUnitKg, Reps: 5},
				},
			},
		},
	}

	_, err := svc.CreateWorkout(context.Background(), input)
	require.NoError(t, err)
	require.NotNil(t, repo.created)
	require.Len(t, repo.created.Exercises, 1)
	require.Len(t, repo.created.Exercises[0].Sets, 1)
	assert.Equal(t, models.SetTypeWorking, repo.created.Exercises[0].Sets[0].Type)
}

func TestCreateWorkoutKeepsExplicitSetType(t *testing.T) {
	repo := &capturingWorkoutRepo{}
	svc := NewWorkoutService(repo, alwaysRelationshipRepo{})

	input := CreateWorkoutInput{
		AthleteID: 1,
		Date:      time.Now(),
		UserRole:  models.RoleAthlete,
		Exercises: []models.WorkoutExercise{
			{
				ExerciseID: 1,
				Name:       "Squat",
				Sets: []models.ExerciseSet{
					{Type: models.SetTypeWarmup, Weight: 60, WeightUnit: models.WeightUnitKg, Reps: 8},
					{Type: models.SetTypeDrop, Weight: 80, WeightUnit: models.WeightUnitKg, Reps: 6},
				},
			},
		},
	}

	_, err := svc.CreateWorkout(context.Background(), input)
	require.NoError(t, err)
	require.NotNil(t, repo.created)
	sets := repo.created.Exercises[0].Sets
	require.Len(t, sets, 2)
	assert.Equal(t, models.SetTypeWarmup, sets[0].Type)
	assert.Equal(t, models.SetTypeDrop, sets[1].Type)
}

func TestCreateWorkoutRejectsInvalidSetType(t *testing.T) {
	repo := &capturingWorkoutRepo{}
	svc := NewWorkoutService(repo, alwaysRelationshipRepo{})

	input := CreateWorkoutInput{
		AthleteID: 1,
		Date:      time.Now(),
		UserRole:  models.RoleAthlete,
		Exercises: []models.WorkoutExercise{
			{
				ExerciseID: 1,
				Name:       "Squat",
				Sets: []models.ExerciseSet{
					{Type: "superset", Weight: 100, WeightUnit: models.WeightUnitKg, Reps: 5},
				},
			},
		},
	}

	_, err := svc.CreateWorkout(context.Background(), input)
	require.Error(t, err)
	assert.Nil(t, repo.created)
}

func TestUpdateWorkoutDefaultsMissingSetType(t *testing.T) {
	repo := &stubWorkoutRepo{
		workout: &models.Workout{
			WorkoutID: 1,
			AthleteID: 1,
			CreatedAt: time.Now(),
		},
	}
	svc := NewWorkoutService(repo, alwaysRelationshipRepo{})

	_, err := svc.UpdateWorkout(context.Background(), UpdateWorkoutInput{
		WorkoutID: 1,
		AthleteID: 1,
		UserRole:  models.RoleAthlete,
		Date:      time.Now(),
		Exercises: []models.WorkoutExercise{
			{
				ExerciseID: 1,
				Name:       "Deadlift",
				Sets: []models.ExerciseSet{
					{Weight: 140, WeightUnit: models.WeightUnitKg, Reps: 3},
				},
			},
		},
	})
	require.NoError(t, err)
	require.Len(t, repo.workout.Exercises, 1)
	require.Len(t, repo.workout.Exercises[0].Sets, 1)
	assert.Equal(t, models.SetTypeWorking, repo.workout.Exercises[0].Sets[0].Type)
}
