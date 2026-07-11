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

func TestPostgresWorkoutPlanAssignmentRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresWorkoutPlanAssignmentRepository(pool)
	ctx := context.Background()

 createUser := func(t *testing.T, username string, role models.UserRole) int {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", string(role), `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return userID
	}

 createPlan := func(t *testing.T, trainerID int) int {
		t.Helper()
		var planID int
		err := pool.QueryRow(ctx,
			`INSERT INTO workout_plans (trainer_id, name, exercises) VALUES ($1,$2,$3) RETURNING id`,
			trainerID, "Test Plan", `[]`,
		).Scan(&planID)
		require.NoError(t, err)
		return planID
	}

	trainerID := createUser(t, "wpa_trainer", models.RoleTrainer)
	athleteID := createUser(t, "wpa_athlete", models.RoleAthlete)
	athlete2ID := createUser(t, "wpa_athlete2", models.RoleAthlete)
	planID := createPlan(t, trainerID)
	plan2ID := createPlan(t, trainerID)

	t.Run("Create", func(t *testing.T) {
		a := &models.WorkoutPlanAssignment{PlanID: planID, AthleteID: athleteID, TrainerID: trainerID, Status: "active"}
		err := repo.Create(ctx, a)
		require.NoError(t, err)
		assert.NotZero(t, a.AssignmentID)
		assert.Equal(t, "workout_plan_assignment", a.Type)
	})

	t.Run("GetByPlanID", func(t *testing.T) {
		a := &models.WorkoutPlanAssignment{PlanID: planID, AthleteID: athlete2ID, TrainerID: trainerID, Status: "active"}
		require.NoError(t, repo.Create(ctx, a))

		asns, err := repo.GetByPlanID(ctx, planID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(asns), 2)
	})

	t.Run("GetByAthleteID", func(t *testing.T) {
		asns, err := repo.GetByAthleteID(ctx, athleteID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(asns), 1)
		for _, a := range asns {
			assert.Equal(t, athleteID, a.AthleteID)
			assert.Equal(t, "active", a.Status)
		}
	})

	t.Run("GetByAthleteAndPlan", func(t *testing.T) {
		a, err := repo.GetByAthleteAndPlan(ctx, athleteID, planID)
		require.NoError(t, err)
		assert.Equal(t, athleteID, a.AthleteID)
		assert.Equal(t, planID, a.PlanID)
	})

	t.Run("GetByAthleteAndPlan_NotFound", func(t *testing.T) {
		_, err := repo.GetByAthleteAndPlan(ctx, athleteID, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByTrainerID", func(t *testing.T) {
		asns, err := repo.GetByTrainerID(ctx, trainerID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(asns), 2)
	})

	t.Run("DeleteByPlanID", func(t *testing.T) {
		a := &models.WorkoutPlanAssignment{PlanID: plan2ID, AthleteID: athleteID, TrainerID: trainerID, Status: "active"}
		require.NoError(t, repo.Create(ctx, a))
		require.NoError(t, repo.DeleteByPlanID(ctx, plan2ID))

		asns, err := repo.GetByPlanID(ctx, plan2ID)
		require.NoError(t, err)
		assert.Empty(t, asns)
	})
}
