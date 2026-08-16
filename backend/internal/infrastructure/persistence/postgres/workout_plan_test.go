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

	createPlanUser := func(t *testing.T, username, role string) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", role, `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID}
	}

	trainer := createPlanUser(t, "plan_trainer", "trainer")
	athlete := createPlanUser(t, "plan_athlete", "athlete")

	makeExercises := func() []models.WorkoutPlanExercise {
		return []models.WorkoutPlanExercise{
			{ExerciseID: 1, Name: "Squat", Sets: []models.WorkoutPlanSet{{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}}, Order: 1},
			{ExerciseID: 2, Name: "Bench Press", Sets: []models.WorkoutPlanSet{{Weight: 80, WeightUnit: "kg", Reps: 8, RestTime: 90}}, Order: 2},
		}
	}

	t.Run("Create", func(t *testing.T) {
		plan := &models.WorkoutPlan{CreatorID: trainer.UserID, Name: "Strength A", Description: "Heavy compound", Exercises: makeExercises()}
		err := repo.Create(ctx, plan)
		require.NoError(t, err)
		assert.NotZero(t, plan.PlanID)
		assert.Equal(t, "workout_plan", plan.Type)
	})

	t.Run("GetByID", func(t *testing.T) {
		plan := &models.WorkoutPlan{CreatorID: trainer.UserID, Name: "Hypertrophy", Description: "Volume work", Exercises: makeExercises()}
		require.NoError(t, repo.Create(ctx, plan))

		fetched, err := repo.GetByID(ctx, plan.PlanID)
		require.NoError(t, err)
		assert.Equal(t, plan.PlanID, fetched.PlanID)
		assert.Equal(t, trainer.UserID, fetched.CreatorID)
		assert.Equal(t, "Hypertrophy", fetched.Name)
		assert.Len(t, fetched.Exercises, 2)
		assert.Equal(t, "Squat", fetched.Exercises[0].Name)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByCreatorID", func(t *testing.T) {
		plans, err := repo.GetByCreatorID(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(plans), 2)
		for _, p := range plans {
			assert.Equal(t, trainer.UserID, p.CreatorID)
		}
	})

	t.Run("GetByCreatorID_FiltersByCreator", func(t *testing.T) {
		athletePlan := &models.WorkoutPlan{CreatorID: athlete.UserID, Name: "Athlete Plan", Exercises: makeExercises()}
		require.NoError(t, repo.Create(ctx, athletePlan))

		trainerPlans, err := repo.GetByCreatorID(ctx, trainer.UserID)
		require.NoError(t, err)
		for _, p := range trainerPlans {
			assert.Equal(t, trainer.UserID, p.CreatorID)
		}

		athletePlans, err := repo.GetByCreatorID(ctx, athlete.UserID)
		require.NoError(t, err)
		require.Len(t, athletePlans, 1)
		assert.Equal(t, athlete.UserID, athletePlans[0].CreatorID)
		assert.Equal(t, "Athlete Plan", athletePlans[0].Name)
	})

	t.Run("CountByCreatorID", func(t *testing.T) {
		other := createPlanUser(t, "plan_counter", "athlete")

		count, err := repo.CountByCreatorID(ctx, other.UserID)
		require.NoError(t, err)
		assert.Zero(t, count)

		for i := 0; i < 3; i++ {
			plan := &models.WorkoutPlan{CreatorID: other.UserID, Name: "Counted Plan", Exercises: makeExercises()}
			require.NoError(t, repo.Create(ctx, plan))
		}

		count, err = repo.CountByCreatorID(ctx, other.UserID)
		require.NoError(t, err)
		assert.Equal(t, 3, count)
	})

	t.Run("Update", func(t *testing.T) {
		plan := &models.WorkoutPlan{CreatorID: trainer.UserID, Name: "Original", Exercises: makeExercises()}
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
		plan := &models.WorkoutPlan{PlanID: 999999, CreatorID: trainer.UserID, Name: "Ghost", Exercises: makeExercises()}
		err := repo.Update(ctx, plan)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		plan := &models.WorkoutPlan{CreatorID: trainer.UserID, Name: "To Delete", Exercises: makeExercises()}
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
