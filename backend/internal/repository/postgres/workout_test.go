package postgres

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresWorkoutRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresWorkoutRepository(pool)
	ctx := context.Background()

	createUser := func(t *testing.T, username string, role models.UserRole) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			"INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id",
			username, username+"@test.com", "hash", string(role), `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID, Username: username, Role: role}
	}

	athlete := createUser(t, "wk_athlete", models.RoleAthlete)

	makeExercises := func() []models.WorkoutExercise {
		return []models.WorkoutExercise{
			{
				ExerciseID: 1, Name: "Bench Press",
				Sets: []models.ExerciseSet{
					{SetID: "s1", Weight: 80, WeightUnit: models.WeightUnitKg, Reps: 10, RestTime: 90, Completed: true},
					{SetID: "s2", Weight: 85, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90, Completed: false},
				},
				Notes: "Warm up first",
			},
			{
				ExerciseID: 2, Name: "Squats",
				Sets: []models.ExerciseSet{
					{SetID: "s3", Weight: 100, WeightUnit: models.WeightUnitKg, Reps: 5, RestTime: 120, Completed: true},
				},
			},
		}
	}

	t.Run("Create", func(t *testing.T) {
		w := &models.Workout{
			AthleteID: athlete.UserID,
			Date:      time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC),
			Exercises: makeExercises(),
		}
		err := repo.Create(ctx, w)
		require.NoError(t, err)
		assert.NotZero(t, w.WorkoutID)
		assert.Equal(t, "workout", w.Type)
		assert.False(t, w.CreatedAt.IsZero())
		assert.False(t, w.UpdatedAt.IsZero())
	})

	t.Run("GetByID", func(t *testing.T) {
		exercises := makeExercises()
		w := &models.Workout{
			AthleteID: athlete.UserID,
			Date:      time.Date(2024, 7, 1, 0, 0, 0, 0, time.UTC),
			Exercises: exercises,
		}
		require.NoError(t, repo.Create(ctx, w))

		fetched, err := repo.GetByID(ctx, w.WorkoutID)
		require.NoError(t, err)
		assert.Equal(t, w.WorkoutID, fetched.WorkoutID)
		assert.Equal(t, athlete.UserID, fetched.AthleteID)
		assert.Equal(t, "workout", fetched.Type)
		assert.Equal(t, 0, fetched.PlanID) // no plan
		assert.Len(t, fetched.Exercises, 2)
		assert.Equal(t, "Bench Press", fetched.Exercises[0].Name)
		assert.Len(t, fetched.Exercises[0].Sets, 2)
		assert.Equal(t, 80.0, fetched.Exercises[0].Sets[0].Weight)
		assert.Equal(t, models.WeightUnitKg, fetched.Exercises[0].Sets[0].WeightUnit)
		assert.True(t, fetched.Exercises[0].Sets[0].Completed)
		assert.Equal(t, "Warm up first", fetched.Exercises[0].Notes)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByAthleteID_Pagination", func(t *testing.T) {
		for _, day := range []int{10, 11, 12} {
			w := &models.Workout{
				AthleteID: athlete.UserID,
				Date:      time.Date(2024, 8, day, 0, 0, 0, 0, time.UTC),
				Exercises: makeExercises(),
			}
			require.NoError(t, repo.Create(ctx, w))
		}
		page1, err := repo.GetByAthleteID(ctx, athlete.UserID, 2, 0)
		require.NoError(t, err)
		assert.Len(t, page1, 2)
		for _, w := range page1 {
			assert.Equal(t, "workout", w.Type)
			assert.Equal(t, athlete.UserID, w.AthleteID)
		}
		page2, err := repo.GetByAthleteID(ctx, athlete.UserID, 2, 2)
		require.NoError(t, err)
		assert.NotEmpty(t, page2)
	})

	t.Run("GetByAthleteID_Empty", func(t *testing.T) {
		emptyUser := createUser(t, "wk_empty_athlete", models.RoleAthlete)
		workouts, err := repo.GetByAthleteID(ctx, emptyUser.UserID, 10, 0)
		require.NoError(t, err)
		assert.Empty(t, workouts)
	})

	t.Run("GetByAthleteDateRange", func(t *testing.T) {
		for _, day := range []int{5, 15, 25} {
			w := &models.Workout{
				AthleteID: athlete.UserID,
				Date:      time.Date(2024, 9, day, 0, 0, 0, 0, time.UTC),
				Exercises: makeExercises(),
			}
			require.NoError(t, repo.Create(ctx, w))
		}
		start := time.Date(2024, 9, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 9, 20, 0, 0, 0, 0, time.UTC)
		workouts, err := repo.GetByAthleteDateRange(ctx, athlete.UserID, start, end)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(workouts), 2)
		for _, w := range workouts {
			assert.Equal(t, "workout", w.Type)
			assert.False(t, w.Date.Before(start))
			assert.False(t, w.Date.After(end))
		}
	})

	t.Run("GetByAthleteDateRange_Empty", func(t *testing.T) {
		start := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)
		emptyUser := createUser(t, "wk_empty_range", models.RoleAthlete)
		workouts, err := repo.GetByAthleteDateRange(ctx, emptyUser.UserID, start, end)
		require.NoError(t, err)
		assert.Empty(t, workouts)
	})

	t.Run("Update", func(t *testing.T) {
		w := &models.Workout{
			AthleteID: athlete.UserID,
			Date:      time.Date(2024, 10, 1, 0, 0, 0, 0, time.UTC),
			Exercises: makeExercises(),
		}
		require.NoError(t, repo.Create(ctx, w))
		originalUpdatedAt := w.UpdatedAt

		w.Exercises[0].Name = "Incline Bench Press"
		w.Exercises[0].Sets[0].Weight = 90
		w.Date = time.Date(2024, 10, 2, 0, 0, 0, 0, time.UTC)
		err := repo.Update(ctx, w)
		require.NoError(t, err)
		assert.True(t, w.UpdatedAt.After(originalUpdatedAt))

		fetched, err := repo.GetByID(ctx, w.WorkoutID)
		require.NoError(t, err)
		assert.Equal(t, "Incline Bench Press", fetched.Exercises[0].Name)
		assert.Equal(t, 90.0, fetched.Exercises[0].Sets[0].Weight)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		w := &models.Workout{
			WorkoutID: 999999, AthleteID: athlete.UserID,
			Date: time.Now(), Exercises: makeExercises(),
		}
		err := repo.Update(ctx, w)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		w := &models.Workout{
			AthleteID: athlete.UserID,
			Date:      time.Date(2024, 11, 1, 0, 0, 0, 0, time.UTC),
			Exercises: makeExercises(),
		}
		require.NoError(t, repo.Create(ctx, w))
		err := repo.Delete(ctx, w.WorkoutID)
		require.NoError(t, err)
		_, err = repo.GetByID(ctx, w.WorkoutID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("JSONB_ComplexRoundTrip", func(t *testing.T) {
		exercises := []models.WorkoutExercise{
			{
				ExerciseID: 10, Name: "Deadlift",
				Sets: []models.ExerciseSet{
					{SetID: "d1", Weight: 120.5, WeightUnit: models.WeightUnitKg, Reps: 5, RestTime: 180, Completed: true},
					{SetID: "d2", Weight: 130.0, WeightUnit: models.WeightUnitKg, Reps: 3, RestTime: 180, Completed: true},
					{SetID: "d3", Weight: 140.5, WeightUnit: models.WeightUnitKg, Reps: 1, RestTime: 240, Completed: false},
				},
				Notes: "Focus on form",
			},
			{
				ExerciseID: 11, Name: "Pull-ups",
				Sets: []models.ExerciseSet{
					{SetID: "p1", Weight: 0, WeightUnit: models.WeightUnitKg, Reps: 12, RestTime: 60, Completed: true},
					{SetID: "p2", Weight: 10, WeightUnit: models.WeightUnitLbs, Reps: 8, RestTime: 60, Completed: false},
				},
			},
		}
		w := &models.Workout{
			AthleteID: athlete.UserID,
			Date:      time.Date(2024, 12, 25, 0, 0, 0, 0, time.UTC),
			Exercises: exercises,
		}
		require.NoError(t, repo.Create(ctx, w))

		fetched, err := repo.GetByID(ctx, w.WorkoutID)
		require.NoError(t, err)
		assert.Len(t, fetched.Exercises, 2)
		assert.Equal(t, "Deadlift", fetched.Exercises[0].Name)
		assert.Len(t, fetched.Exercises[0].Sets, 3)
		assert.Equal(t, 120.5, fetched.Exercises[0].Sets[0].Weight)
		assert.Equal(t, 140.5, fetched.Exercises[0].Sets[2].Weight)
		assert.Equal(t, "Focus on form", fetched.Exercises[0].Notes)
		assert.True(t, fetched.Exercises[0].Sets[0].Completed)
		assert.False(t, fetched.Exercises[0].Sets[2].Completed)
		assert.Equal(t, "Pull-ups", fetched.Exercises[1].Name)
		assert.Equal(t, models.WeightUnitLbs, fetched.Exercises[1].Sets[1].WeightUnit)
		assert.Equal(t, 10.0, fetched.Exercises[1].Sets[1].Weight)
	})
}