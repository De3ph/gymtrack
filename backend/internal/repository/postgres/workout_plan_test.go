package postgres

import (
	"context"
	"testing"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresWorkoutPlanRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresWorkoutPlanRepository(pool)
	ctx := context.Background()

	createPlanUser := func(t *testing.T, username string) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", "trainer", `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID}
	}

	trainer := createPlanUser(t, "plan_trainer")

	makeExercises := func() []models.WorkoutPlanExercise {
		return []models.WorkoutPlanExercise{
			{ExerciseID: 1, Name: "Squat", Sets: []models.WorkoutPlanSet{{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}}, Order: 1},
			{ExerciseID: 2, Name: "Bench Press", Sets: []models.WorkoutPlanSet{{Weight: 80, WeightUnit: "kg", Reps: 8, RestTime: 90}}, Order: 2},
		}
	}

	t.Run("Create", func(t *testing.T) {
		plan := &models.WorkoutPlan{TrainerID: trainer.UserID, Name: "Strength A", Description: "Heavy compound", Exercises: makeExercises()}
		err := repo.Create(ctx, plan)
		require.NoError(t, err)
		assert.NotZero(t, plan.PlanID)
		assert.Equal(t, "workout_plan", plan.Type)
	})

	t.Run("GetByID", func(t *testing.T) {
		plan := &models.WorkoutPlan{TrainerID: trainer.UserID, Name: "Hypertrophy", Description: "Volume work", Exercises: makeExercises()}
		require.NoError(t, repo.Create(ctx, plan))

		fetched, err := repo.GetByID(ctx, plan.PlanID)
		require.NoError(t, err)
		assert.Equal(t, plan.PlanID, fetched.PlanID)
		assert.Equal(t, "Hypertrophy", fetched.Name)
		assert.Len(t, fetched.Exercises, 2)
		assert.Equal(t, "Squat", fetched.Exercises[0].Name)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByTrainerID", func(t *testing.T) {
		plans, err := repo.GetByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(plans), 2)
	})

	t.Run("Update", func(t *testing.T) {
		plan := &models.WorkoutPlan{TrainerID: trainer.UserID, Name: "Original", Exercises: makeExercises()}
		require.NoError(t, repo.Create(ctx, plan))

		plan.Name = "Updated"
		plan.Exercises = append(plan.Exercises, models.WorkoutPlanExercise{ExerciseID: 3, Name: "Deadlift", Order: 3})
		require.NoError(t, repo.Update(ctx, plan))

		fetched, err := repo.GetByID(ctx, plan.PlanID)
		require.NoError(t, err)
		assert.Equal(t, "Updated", fetched.Name)
		assert.Len(t, fetched.Exercises, 3)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		plan := &models.WorkoutPlan{PlanID: 999999, TrainerID: trainer.UserID, Name: "Ghost", Exercises: makeExercises()}
		err := repo.Update(ctx, plan)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		plan := &models.WorkoutPlan{TrainerID: trainer.UserID, Name: "To Delete", Exercises: makeExercises()}
		require.NoError(t, repo.Create(ctx, plan))
		require.NoError(t, repo.Delete(ctx, plan.PlanID))
		_, err := repo.GetByID(ctx, plan.PlanID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})
}
