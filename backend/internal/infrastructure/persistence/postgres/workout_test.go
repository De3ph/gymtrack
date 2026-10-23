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
		workouts, err := repo.GetByAthleteDateRange(ctx, athlete.UserID, &start, &end, 50, 0)
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
		workouts, err := repo.GetByAthleteDateRange(ctx, emptyUser.UserID, &start, &end, 10, 0)
		require.NoError(t, err)
		assert.Empty(t, workouts)
	})

	t.Run("GetByAthleteDateRange_SingleBounds", func(t *testing.T) {
		bounded := createUser(t, "wk_bounded", models.RoleAthlete)
		for _, day := range []int{5, 15, 25} {
			w := &models.Workout{
				AthleteID: bounded.UserID,
				Date:      time.Date(2024, 9, day, 0, 0, 0, 0, time.UTC),
				Exercises: makeExercises(),
			}
			require.NoError(t, repo.Create(ctx, w))
		}

		from := time.Date(2024, 9, 15, 0, 0, 0, 0, time.UTC)
		fromOnly, err := repo.GetByAthleteDateRange(ctx, bounded.UserID, &from, nil, 50, 0)
		require.NoError(t, err)
		assert.Len(t, fromOnly, 2) // 15th and 25th

		until := time.Date(2024, 9, 15, 0, 0, 0, 0, time.UTC)
		untilOnly, err := repo.GetByAthleteDateRange(ctx, bounded.UserID, nil, &until, 50, 0)
		require.NoError(t, err)
		assert.Len(t, untilOnly, 2) // 5th and 15th

		// No bounds: limit still applies.
		limited, err := repo.GetByAthleteDateRange(ctx, bounded.UserID, nil, nil, 2, 0)
		require.NoError(t, err)
		assert.Len(t, limited, 2)

		count, err := repo.CountByAthlete(ctx, bounded.UserID, nil, nil)
		require.NoError(t, err)
		assert.Equal(t, 3, count)
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

	// The aggregate endpoints must agree with the legacy Go computation over
	// the same workouts: volume = weight * reps (units not converted), and
	// weeks keyed as ISO "YYYY-Www".
	t.Run("WeeklyVolume", func(t *testing.T) {
		statAthlete := createUser(t, "wk_stats", models.RoleAthlete)

		createWorkout := func(date time.Time, name string, sets ...models.ExerciseSet) {
			t.Helper()
			w := &models.Workout{
				AthleteID: statAthlete.UserID,
				Date:      date,
				Exercises: []models.WorkoutExercise{{ExerciseID: 1, Name: name, Sets: sets}},
			}
			require.NoError(t, repo.Create(ctx, w))
		}
		monday := func(week int) time.Time { // 2024-W<week> Monday, ISO weeks
			firstMonday := time.Date(2024, 6, 3, 0, 0, 0, 0, time.UTC) // 2024-W23
			return firstMonday.AddDate(0, 0, 7*(week-23))
		}

		createWorkout(monday(23), "Bench Press",
			models.ExerciseSet{Weight: 80, Reps: 10},
			models.ExerciseSet{Weight: 85, Reps: 8},
		)
		createWorkout(monday(23).AddDate(0, 0, 2), "Squats",
			models.ExerciseSet{Weight: 100, Reps: 5},
		)
		// Week 24 workout with only zero-weight sets still counts as a workout.
		createWorkout(monday(24), "Pull-ups",
			models.ExerciseSet{Weight: 0, Reps: 12},
		)

		weeks, err := repo.WeeklyVolume(ctx, statAthlete.UserID)
		require.NoError(t, err)
		require.Len(t, weeks, 2)
		assert.Equal(t, "2024-W23", weeks[0].Week)
		assert.InDelta(t, 80*10+85*8+100*5, weeks[0].Volume, 0.01)
		assert.Equal(t, 2, weeks[0].Workouts)
		assert.Equal(t, "2024-W24", weeks[1].Week)
		assert.InDelta(t, 0.0, weeks[1].Volume, 0.01)
		assert.Equal(t, 1, weeks[1].Workouts)
	})

	t.Run("ExerciseAggregates", func(t *testing.T) {
		statAthlete := createUser(t, "wk_stats_agg", models.RoleAthlete)

		one := time.Date(2024, 6, 3, 0, 0, 0, 0, time.UTC)
		other := time.Date(2024, 6, 10, 0, 0, 0, 0, time.UTC)
		require.NoError(t, repo.Create(ctx, &models.Workout{
			AthleteID: statAthlete.UserID, Date: one,
			Exercises: []models.WorkoutExercise{{
				ExerciseID: 1, Name: "Bench Press",
				Sets: []models.ExerciseSet{{Weight: 80, Reps: 10}, {Weight: 85, Reps: 8}},
			}},
		}))
		require.NoError(t, repo.Create(ctx, &models.Workout{
			AthleteID: statAthlete.UserID, Date: other,
			Exercises: []models.WorkoutExercise{{
				ExerciseID: 1, Name: "Bench Press",
				Sets: []models.ExerciseSet{{Weight: 90, Reps: 5}},
			}},
		}))

		aggregates, err := repo.ExerciseAggregates(ctx, statAthlete.UserID)
		require.NoError(t, err)
		require.Len(t, aggregates, 1)
		assert.Equal(t, "Bench Press", aggregates[0].Name)
		assert.Equal(t, 3, aggregates[0].TotalSets)
		assert.Equal(t, 23, aggregates[0].TotalReps)
		assert.InDelta(t, 90.0, aggregates[0].MaxWeight, 0.01)
	})

	t.Run("CountByAthleteSince", func(t *testing.T) {
		sinceAthlete := createUser(t, "wk_stats_since", models.RoleAthlete)
		require.NoError(t, repo.Create(ctx, &models.Workout{
			AthleteID: sinceAthlete.UserID,
			Date:      time.Date(2024, 6, 3, 0, 0, 0, 0, time.UTC),
			Exercises: []models.WorkoutExercise{{
				ExerciseID: 1, Name: "Bench Press",
				Sets: []models.ExerciseSet{{Weight: 50, Reps: 5}},
			}},
		}))

		since := time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC)
		count, err := repo.CountByAthleteSince(ctx, sinceAthlete.UserID, since)
		require.NoError(t, err)
		assert.Equal(t, 0, count) // the only workout is on 2024-06-03, not after

		added := time.Date(2024, 6, 6, 0, 0, 0, 0, time.UTC)
		require.NoError(t, repo.Create(ctx, &models.Workout{
			AthleteID: sinceAthlete.UserID,
			Date:      added,
			Exercises: []models.WorkoutExercise{{
				ExerciseID: 2, Name: "Squats",
				Sets: []models.ExerciseSet{{Weight: 60, Reps: 5}},
			}},
		}))
		count, err = repo.CountByAthleteSince(ctx, sinceAthlete.UserID, since)
		require.NoError(t, err)
		assert.Equal(t, 1, count) // only 2024-06-06 is strictly after 2024-06-05
	})
}
