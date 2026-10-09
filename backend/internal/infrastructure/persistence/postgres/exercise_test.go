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

	// --- media columns ---

	t.Run("CreateExercise_RoundTripsMedia", func(t *testing.T) {
		ex, err := models.NewExerciseWithMedia("Kettlebell Swing", "strength", 1, 1, creatorID,
			"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg", models.MediaTypeImage)
		require.NoError(t, err)
		require.NoError(t, repo.CreateExercise(ctx, ex))

		fetched, err := repo.GetExerciseByID(ctx, ex.ExerciseID)
		require.NoError(t, err)
		assert.Equal(t, ex.MediaURL, fetched.MediaURL)
		assert.Equal(t, models.MediaTypeImage, fetched.MediaType)
	})

	// The exercise library page renders a placeholder when media_url is NULL.
	// Storing '' instead would make "no media" indistinguishable from a
	// configured-but-broken asset, so an absent URL must land as SQL NULL.
	t.Run("CreateExercise_EmptyMediaBecomesNull", func(t *testing.T) {
		ex := &models.Exercise{Name: "No Media Exercise", Category: "flexibility", MuscleGroupID: 1, EquipmentID: 1}
		require.NoError(t, repo.CreateExercise(ctx, ex))

		fetched, err := repo.GetExerciseByID(ctx, ex.ExerciseID)
		require.NoError(t, err)
		assert.Empty(t, fetched.MediaURL)
		// MediaType is NOT NULL with a 'gif' default; an exercise built without
		// NewExerciseWithMedia carries Go's zero value and must still persist.
		assert.Equal(t, models.MediaTypeGIF, fetched.MediaType)

		var stored *string
		err = pool.QueryRow(ctx, `SELECT media_url FROM exercises WHERE id = $1`, ex.ExerciseID).Scan(&stored)
		require.NoError(t, err)
		assert.Nil(t, stored, "an empty media URL must be stored as NULL, not ''")
	})

	// The backfill in migration 009 installs media_url rows. Reading them back is
	// what proves the column list, scan order, and backfill agree with each other.
	t.Run("GetAllExercises_ReadsBackfilledMedia", func(t *testing.T) {
		var backfilled int
		err := pool.QueryRow(ctx,
			`SELECT count(*) FROM exercises WHERE media_url LIKE 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%' AND media_type = 'image'`,
		).Scan(&backfilled)
		require.NoError(t, err)

		exercises, err := repo.GetAllExercises(ctx)
		require.NoError(t, err)

		seen := 0
		for _, ex := range exercises {
			if ex.MediaURL == "" {
				continue
			}
			seen++
			assert.Equal(t, models.MediaTypeImage, ex.MediaType,
				"a backfilled row must come back as an image, got %q for %s", ex.MediaType, ex.Name)
		}
		// Every non-empty URL the repository returned must correspond to a row the
		// backfill (or an explicit write) actually installed.
		assert.Equal(t, backfilled, seen)
	})

	// An unrelated field edit must not silently drop the demonstration asset:
	// UpdateExercise writes the media columns from the struct, so a caller that
	// loaded the row first has to round-trip them.
	t.Run("UpdateExercise_PreservesMedia", func(t *testing.T) {
		ex, err := models.NewExerciseWithMedia("Landmine Press", "strength", 1, 1, creatorID,
			"https://example.com/landmine.gif", models.MediaTypeGIF)
		require.NoError(t, err)
		require.NoError(t, repo.CreateExercise(ctx, ex))

		ex.Instructions = "Press up and slightly forward"
		require.NoError(t, repo.UpdateExercise(ctx, ex))

		fetched, err := repo.GetExerciseByID(ctx, ex.ExerciseID)
		require.NoError(t, err)
		assert.Equal(t, "Press up and slightly forward", fetched.Instructions)
		assert.Equal(t, "https://example.com/landmine.gif", fetched.MediaURL)
		assert.Equal(t, models.MediaTypeGIF, fetched.MediaType)
	})

	_ = domainerrors.ErrNotFound // ensure import used
}
