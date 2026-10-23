package services

import (
	"context"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// statsRepoFake embeds the repository interface so only the aggregate methods
// the ClientStatsService reads need implementing; everything else would panic,
// which is fine because those paths are not exercised here.
type statsWorkoutRepo struct {
	repositories.WorkoutRepository

	weekly      []repositories.VolumeWeekRow
	exercises   []repositories.ExerciseAggregateRow
	countSince  int
	countSinceT time.Time
}

func (r *statsWorkoutRepo) WeeklyVolume(context.Context, int) ([]repositories.VolumeWeekRow, error) {
	return r.weekly, nil
}

func (r *statsWorkoutRepo) ExerciseAggregates(context.Context, int) ([]repositories.ExerciseAggregateRow, error) {
	return r.exercises, nil
}

func (r *statsWorkoutRepo) CountByAthleteSince(_ context.Context, _ int, since time.Time) (int, error) {
	r.countSinceT = since
	return r.countSince, nil
}

type statsMealRepo struct {
	repositories.MealRepository

	averages    *repositories.NutritionAveragesRow
	weekly      []repositories.WeeklyNutritionRow
	mealTypes   []repositories.MealTypeCountRow
	countSince  int
	countSinceT time.Time
}

func (r *statsMealRepo) NutritionAverages(context.Context, int) (*repositories.NutritionAveragesRow, error) {
	return r.averages, nil
}

func (r *statsMealRepo) WeeklyNutrition(context.Context, int) ([]repositories.WeeklyNutritionRow, error) {
	return r.weekly, nil
}

func (r *statsMealRepo) MealTypeCounts(context.Context, int) ([]repositories.MealTypeCountRow, error) {
	return r.mealTypes, nil
}

func (r *statsMealRepo) CountByAthleteSince(_ context.Context, _ int, since time.Time) (int, error) {
	r.countSinceT = since
	return r.countSince, nil
}

func TestClientStatsService_GetActivity(t *testing.T) {
	workoutRepo := &statsWorkoutRepo{countSince: 3}
	mealRepo := &statsMealRepo{countSince: 5}
	svc := NewClientStatsService(workoutRepo, mealRepo, utils.RealClock{})

	ctx := context.Background()
	stats, err := svc.GetActivity(ctx, 7)
	require.NoError(t, err)
	assert.Equal(t, 3, stats.WorkoutsThisWeek)
	assert.Equal(t, 5, stats.MealsThisWeek)

	// Both repos sampled the same week start, computed from the clock.
	require.False(t, workoutRepo.countSinceT.IsZero())
	assert.Equal(t, workoutRepo.countSinceT, mealRepo.countSinceT)
}

func TestClientStatsService_GetDetailedStats_Workouts(t *testing.T) {
	workoutRepo := &statsWorkoutRepo{
		weekly: []repositories.VolumeWeekRow{
			{Week: "2026-W02", Volume: 300, Workouts: 3},
			{Week: "2026-W03", Volume: 100, Workouts: 1},
		},
		exercises: []repositories.ExerciseAggregateRow{
			{Name: "Bench Press", TotalSets: 4, TotalReps: 40, MaxWeight: 100},
			{Name: "Squat", TotalSets: 2, TotalReps: 10, MaxWeight: 140},
		},
	}
	svc := NewClientStatsService(workoutRepo, &statsMealRepo{}, utils.RealClock{})

	ctx := context.Background()
	stats, meals, err := svc.GetDetailedStats(ctx, 7)
	require.NoError(t, err)
	require.NotNil(t, meals)

	// Rows arrive ordered by week from SQL; totals sum across them.
	assert.InDelta(t, 400.0, stats.TotalVolume, 0.01)
	require.Len(t, stats.WeeklyVolume, 2)
	assert.Equal(t, "2026-W02", stats.WeeklyVolume[0].Week)
	assert.Equal(t, "2026-W03", stats.WeeklyVolume[1].Week)

	// Consistency: 1 of 2 weeks had at least 3 workouts.
	assert.InDelta(t, 50.0, stats.Consistency, 0.01)

	require.Len(t, stats.ExerciseBreakdown, 2)
	assert.Equal(t, "Bench Press", stats.ExerciseBreakdown[0].Name)
	assert.Equal(t, 40, stats.ExerciseBreakdown[0].TotalReps)
	assert.InDelta(t, 140.0, stats.ExerciseBreakdown[1].MaxWeight, 0.01)
}

func TestClientStatsService_GetDetailedStats_Meals(t *testing.T) {
	mealRepo := &statsMealRepo{
		averages: &repositories.NutritionAveragesRow{
			Meals: 5, Calories: 2200, Protein: 130, Carbs: 210, Fats: 70,
		},
		weekly: []repositories.WeeklyNutritionRow{
			{Week: "2026-W02", Calories: 2000, Protein: 120, Carbs: 200, Fats: 60},
			{Week: "2026-W03", Calories: 2400, Protein: 140, Carbs: 220, Fats: 80},
		},
		mealTypes: []repositories.MealTypeCountRow{
			{MealType: "breakfast", Count: 2},
			{MealType: "lunch", Count: 3},
		},
	}
	svc := NewClientStatsService(&statsWorkoutRepo{}, mealRepo, utils.RealClock{})

	ctx := context.Background()
	workouts, meals, err := svc.GetDetailedStats(ctx, 7)
	require.NoError(t, err)
	require.NotNil(t, workouts)

	assert.InDelta(t, 2200.0, meals.AverageCalories, 0.01)
	assert.InDelta(t, 130.0, meals.AverageProtein, 0.01)
	require.Len(t, meals.WeeklyAverages, 2)
	assert.Equal(t, "2026-W02", meals.WeeklyAverages[0].Week)
	require.Len(t, meals.MealTypeBreakdown, 2)
	assert.Equal(t, "breakfast", meals.MealTypeBreakdown[0].MealType)
	assert.Equal(t, 2, meals.MealTypeBreakdown[0].Count)
}

func TestClientStatsService_GetDetailedStats_Empty(t *testing.T) {
	svc := NewClientStatsService(&statsWorkoutRepo{}, &statsMealRepo{averages: &repositories.NutritionAveragesRow{}}, utils.RealClock{})

	workouts, meals, err := svc.GetDetailedStats(context.Background(), 7)
	require.NoError(t, err)
	require.NotNil(t, workouts)
	require.NotNil(t, meals)
	assert.InDelta(t, 0.0, workouts.TotalVolume, 0.01)
	assert.InDelta(t, 0.0, workouts.Consistency, 0.01)
	require.Empty(t, workouts.WeeklyVolume)
	require.Empty(t, meals.MealTypeBreakdown)
}
