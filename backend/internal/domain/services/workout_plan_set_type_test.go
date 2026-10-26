package services

import (
	"context"
	"testing"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorkoutPlanService_CreatePlan_DefaultsMissingSetType(t *testing.T) {
	repo := newFakePlanRepo()
	svc := newTestWorkoutPlanService(repo)
	ctx := context.Background()

	exercises := []models.WorkoutPlanExercise{
		{
			ExerciseID: 1,
			Name:       "Squat",
			// No Type: the service must default it to working.
			Sets:  []models.WorkoutPlanSet{{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}},
			Order: 1,
		},
	}

	plan, err := svc.CreatePlan(ctx, 1, models.RoleTrainer, "Plan", "", exercises)
	require.NoError(t, err)
	require.Len(t, plan.Exercises, 1)
	require.Len(t, plan.Exercises[0].Sets, 1)
	assert.Equal(t, models.SetTypeWorking, plan.Exercises[0].Sets[0].Type)
}

func TestWorkoutPlanService_CreatePlan_KeepsExplicitSetType(t *testing.T) {
	repo := newFakePlanRepo()
	svc := newTestWorkoutPlanService(repo)
	ctx := context.Background()

	exercises := []models.WorkoutPlanExercise{
		{
			ExerciseID: 1,
			Name:       "Squat",
			Sets: []models.WorkoutPlanSet{
				{Type: models.SetTypeWarmup, Weight: 60, WeightUnit: "kg", Reps: 8, RestTime: 120},
				{Type: models.SetTypeBackoff, Weight: 90, WeightUnit: "kg", Reps: 6, RestTime: 120},
			},
			Order: 1,
		},
	}

	plan, err := svc.CreatePlan(ctx, 1, models.RoleTrainer, "Plan", "", exercises)
	require.NoError(t, err)
	sets := plan.Exercises[0].Sets
	require.Len(t, sets, 2)
	assert.Equal(t, models.SetTypeWarmup, sets[0].Type)
	assert.Equal(t, models.SetTypeBackoff, sets[1].Type)
}

func TestWorkoutPlanService_CreatePlan_RejectsInvalidSetType(t *testing.T) {
	repo := newFakePlanRepo()
	svc := newTestWorkoutPlanService(repo)
	ctx := context.Background()

	exercises := []models.WorkoutPlanExercise{
		{
			ExerciseID: 1,
			Name:       "Squat",
			Sets:       []models.WorkoutPlanSet{{Type: "pyramid", Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}},
			Order:      1,
		},
	}

	_, err := svc.CreatePlan(ctx, 1, models.RoleTrainer, "Plan", "", exercises)
	require.Error(t, err)
	var svcErr *ServiceError
	require.ErrorAs(t, err, &svcErr)
	assert.Equal(t, "VALIDATION", svcErr.Code)
}

func TestConvertPlanExercisesToWorkout_CarriesSetType(t *testing.T) {
	planExercises := []models.WorkoutPlanExercise{
		{
			ExerciseID: 1,
			Name:       "Squat",
			Sets: []models.WorkoutPlanSet{
				{Type: models.SetTypeWarmup, Weight: 60, WeightUnit: "kg", Reps: 8, RestTime: 120},
				// Missing type defaults to working on conversion.
				{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120},
			},
			Notes: "keep bar speed fast",
		},
	}

	workoutExercises := convertPlanExercisesToWorkout(planExercises)
	require.Len(t, workoutExercises, 1)
	sets := workoutExercises[0].Sets
	require.Len(t, sets, 2)
	assert.Equal(t, models.SetTypeWarmup, sets[0].Type)
	assert.Equal(t, models.SetTypeWorking, sets[1].Type)
	assert.Equal(t, "keep bar speed fast", workoutExercises[0].Notes)
}
