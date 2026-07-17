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

func TestPostgresExerciseRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresExerciseRepository(pool)
	ctx := context.Background()

	createExUser := func(t *testing.T, username string) int {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", "athlete", `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return userID
	}

	creatorID := createExUser(t, "ex_creator")

	t.Run("CreateExercise", func(t *testing.T) {
		ex := &models.Exercise{Name: "Barbell Squat", Category: "strength", MuscleGroupID: 6, EquipmentID: 1, Instructions: "Keep back straight", CreatedBy: creatorID}
		err := repo.CreateExercise(ctx, ex)
		require.NoError(t, err)
		assert.NotZero(t, ex.ExerciseID)
	})

	t.Run("GetExerciseByID", func(t *testing.T) {
		ex := &models.Exercise{Name: "Bench Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 1}
		require.NoError(t, repo.CreateExercise(ctx, ex))

		fetched, err := repo.GetExerciseByID(ctx, ex.ExerciseID)
		require.NoError(t, err)
		require.NotNil(t, fetched)
		assert.Equal(t, "Bench Press", fetched.Name)
		assert.Equal(t, 1, fetched.MuscleGroupID)
	})

	t.Run("GetExerciseByID_NotFound", func(t *testing.T) {
		ex, err := repo.GetExerciseByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
		assert.Nil(t, ex)
	})

	t.Run("GetAllExercises", func(t *testing.T) {
		exercises, err := repo.GetAllExercises(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(exercises), 2)
	})

	t.Run("GetExercisesByMuscleGroup", func(t *testing.T) {
		exercises, err := repo.GetExercisesByMuscleGroup(ctx, 1)
		require.NoError(t, err)
		assert.NotEmpty(t, exercises)
		for _, ex := range exercises {
			assert.Equal(t, 1, ex.MuscleGroupID)
		}
	})

	t.Run("GetExercisesByEquipment", func(t *testing.T) {
		exercises, err := repo.GetExercisesByEquipment(ctx, 1)
		require.NoError(t, err)
		assert.NotEmpty(t, exercises)
		for _, ex := range exercises {
			assert.Equal(t, 1, ex.EquipmentID)
		}
	})

	t.Run("SearchExercises", func(t *testing.T) {
		exercises, err := repo.SearchExercises(ctx, "bench", nil, nil)
		require.NoError(t, err)
		assert.NotEmpty(t, exercises)
		assert.Equal(t, "Bench Press", exercises[0].Name)
	})

	t.Run("SearchExercises_WithFilters", func(t *testing.T) {
		mgID := 1
		eqID := 1
		exercises, err := repo.SearchExercises(ctx, "bench", &mgID, &eqID)
		require.NoError(t, err)
		assert.NotEmpty(t, exercises)
	})

	t.Run("SearchExercises_NoResults", func(t *testing.T) {
		exercises, err := repo.SearchExercises(ctx, "nonexistent_xyz", nil, nil)
		require.NoError(t, err)
		assert.Empty(t, exercises)
	})

	t.Run("CreateExercise_UniqueName", func(t *testing.T) {
		ex1 := &models.Exercise{Name: "Unique Exercise ABC", Category: "cardio", MuscleGroupID: 1, EquipmentID: 1}
		require.NoError(t, repo.CreateExercise(ctx, ex1))
		assert.NotZero(t, ex1.ExerciseID)
	})

	_ = domainerrors.ErrNotFound // ensure import used
}
