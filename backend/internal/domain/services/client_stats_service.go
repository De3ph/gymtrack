package services

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

// GetActivity returns the athlete's workout and meal counts for the current
// week.
func (s *ClientStatsService) GetActivity(ctx context.Context, athleteID int) (*ClientActivityStats, error) {
	// Week start comes from the injected clock, so these counters stay
	// testable; the DB only counts rows dated after it.
	now := s.clock.Now()
	weekStart := now.AddDate(0, 0, -int(now.Weekday())).Truncate(24 * time.Hour)

	workoutsThisWeek, err := s.workoutRepo.CountByAthleteSince(ctx, athleteID, weekStart)
	if err != nil {
		return nil, fmt.Errorf("failed to count workouts this week: %w", err)
	}
	mealsThisWeek, err := s.mealRepo.CountByAthleteSince(ctx, athleteID, weekStart)
	if err != nil {
		return nil, fmt.Errorf("failed to count meals this week: %w", err)
	}

	return &ClientActivityStats{
		WorkoutsThisWeek: workoutsThisWeek,
		MealsThisWeek:    mealsThisWeek,
	}, nil
}

// GetDetailedStats returns the athlete's workout and meal analytics. The
// aggregations run in SQL (see WorkoutRepository.WeeklyVolume and
// MealRepository.WeeklyNutrition); this service only computes the consistency
// score, which needs a pass over the weekly rows it already holds.
func (s *ClientStatsService) GetDetailedStats(ctx context.Context, athleteID int) (*WorkoutStats, *MealStats, error) {
	weekly, err := s.workoutRepo.WeeklyVolume(ctx, athleteID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve workout stats: %w", err)
	}
	exercises, err := s.workoutRepo.ExerciseAggregates(ctx, athleteID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve exercise breakdown: %w", err)
	}
	averages, err := s.mealRepo.NutritionAverages(ctx, athleteID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve meal stats: %w", err)
	}
	weeklyNutrition, err := s.mealRepo.WeeklyNutrition(ctx, athleteID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve weekly nutrition: %w", err)
	}
	mealTypes, err := s.mealRepo.MealTypeCounts(ctx, athleteID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve meal type breakdown: %w", err)
	}

	return workoutStatsFromRows(weekly, exercises), mealStatsFromRows(averages, weeklyNutrition, mealTypes), nil
}

func workoutStatsFromRows(weekly []repositories.VolumeWeekRow, exercises []repositories.ExerciseAggregateRow) *WorkoutStats {
	var totalVolume float64
	weeklyVolume := make([]WeeklyVolumePoint, 0, len(weekly))
	weeksWithWorkouts := 0
	for _, week := range weekly {
		totalVolume += week.Volume
		weeklyVolume = append(weeklyVolume, WeeklyVolumePoint{
			Week:     week.Week,
			Volume:   week.Volume,
			Workouts: week.Workouts,
		})
		if week.Workouts >= 3 {
			weeksWithWorkouts++
		}
	}

	var consistency float64
	if len(weekly) > 0 {
		consistency = float64(weeksWithWorkouts) / float64(len(weekly)) * 100
	}

	exerciseBreakdown := make([]ExerciseStat, 0, len(exercises))
	for _, exercise := range exercises {
		exerciseBreakdown = append(exerciseBreakdown, ExerciseStat{
			Name:      exercise.Name,
			TotalSets: exercise.TotalSets,
			TotalReps: exercise.TotalReps,
			MaxWeight: exercise.MaxWeight,
		})
	}

	return &WorkoutStats{
		TotalVolume:       totalVolume,
		WeeklyVolume:      weeklyVolume,
		ExerciseBreakdown: exerciseBreakdown,
		Consistency:       consistency,
	}
}

func mealStatsFromRows(averages *repositories.NutritionAveragesRow, weekly []repositories.WeeklyNutritionRow, mealTypes []repositories.MealTypeCountRow) *MealStats {
	weeklyAverages := make([]WeeklyMealAvg, 0, len(weekly))
	for _, week := range weekly {
		weeklyAverages = append(weeklyAverages, WeeklyMealAvg{
			Week:     week.Week,
			Calories: week.Calories,
			Protein:  week.Protein,
			Carbs:    week.Carbs,
			Fats:     week.Fats,
		})
	}

	mealTypeBreakdown := make([]MealTypeStat, 0, len(mealTypes))
	for _, mealType := range mealTypes {
		mealTypeBreakdown = append(mealTypeBreakdown, MealTypeStat{
			MealType: mealType.MealType,
			Count:    mealType.Count,
		})
	}

	if averages == nil {
		averages = &repositories.NutritionAveragesRow{}
	}
	return &MealStats{
		AverageCalories:   averages.Calories,
		AverageProtein:    averages.Protein,
		AverageCarbs:      averages.Carbs,
		AverageFats:       averages.Fats,
		WeeklyAverages:    weeklyAverages,
		MealTypeBreakdown: mealTypeBreakdown,
	}
} // ClientActivityStats summarises an athlete's activity for the current week.
type ClientActivityStats struct {
	WorkoutsThisWeek int `json:"workoutsThisWeek"`
	MealsThisWeek    int `json:"mealsThisWeek"`
}

// WorkoutStats contains detailed workout statistics including volume trends,
// exercise breakdown, and consistency.
type WorkoutStats struct {
	TotalVolume       float64             `json:"totalVolume"`
	WeeklyVolume      []WeeklyVolumePoint `json:"weeklyVolume"`
	ExerciseBreakdown []ExerciseStat      `json:"exerciseBreakdown"`
	Consistency       float64             `json:"consistency"` // percentage
}

// WeeklyVolumePoint represents workout volume for a specific week.
type WeeklyVolumePoint struct {
	Week     string  `json:"week"`
	Volume   float64 `json:"volume"`
	Workouts int     `json:"workouts"`
}

// ExerciseStat contains statistics for a specific exercise.
type ExerciseStat struct {
	Name      string  `json:"name"`
	TotalSets int     `json:"totalSets"`
	TotalReps int     `json:"totalReps"`
	MaxWeight float64 `json:"maxWeight"`
}

// MealStats contains detailed meal and nutrition statistics including averages,
// weekly trends, and meal type breakdown.
type MealStats struct {
	AverageCalories   float64         `json:"averageCalories"`
	AverageProtein    float64         `json:"averageProtein"`
	AverageCarbs      float64         `json:"averageCarbs"`
	AverageFats       float64         `json:"averageFats"`
	WeeklyAverages    []WeeklyMealAvg `json:"weeklyAverages"`
	MealTypeBreakdown []MealTypeStat  `json:"mealTypeBreakdown"`
}

// WeeklyMealAvg represents average nutrition metrics for a specific week.
type WeeklyMealAvg struct {
	Week     string  `json:"week"`
	Calories float64 `json:"calories"`
	Protein  float64 `json:"protein"`
	Carbs    float64 `json:"carbs"`
	Fats     float64 `json:"fats"`
}

// MealTypeStat represents the count of meals for a specific meal type.
type MealTypeStat struct {
	MealType string `json:"mealType"`
	Count    int    `json:"count"`
}

// ClientStatsService calculates activity and nutrition statistics for an
// athlete on behalf of their trainer.
type ClientStatsService struct {
	workoutRepo repositories.WorkoutRepository
	mealRepo    repositories.MealRepository
	clock       utils.Clock
}

// NewClientStatsService creates a ClientStatsService.
func NewClientStatsService(
	workoutRepo repositories.WorkoutRepository,
	mealRepo repositories.MealRepository,
	clock utils.Clock,
) *ClientStatsService {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &ClientStatsService{
		workoutRepo: workoutRepo,
		mealRepo:    mealRepo,
		clock:       clock,
	}
}
