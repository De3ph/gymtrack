package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

// clientStatsPageSize bounds the history scanned for statistics. The endpoints
// remain capped until aggregation moves into SQL.
const clientStatsPageSize = 1000

// ClientActivityStats summarises an athlete's activity for the current week.
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

// GetActivity returns the athlete's workout and meal counts for the current
// week.
func (s *ClientStatsService) GetActivity(ctx context.Context, athleteID int) (*ClientActivityStats, error) {
	workouts, err := s.workoutRepo.GetByAthleteID(ctx, athleteID, clientStatsPageSize, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve workouts: %w", err)
	}
	meals, err := s.mealRepo.GetByAthleteID(ctx, athleteID, clientStatsPageSize, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve meals: %w", err)
	}

	now := s.clock.Now()
	weekStart := now.AddDate(0, 0, -int(now.Weekday())).Truncate(24 * time.Hour)

	stats := &ClientActivityStats{}
	for _, workout := range workouts {
		if workout.Date.After(weekStart) {
			stats.WorkoutsThisWeek++
		}
	}
	for _, meal := range meals {
		if meal.Date.After(weekStart) {
			stats.MealsThisWeek++
		}
	}
	return stats, nil
}

// GetDetailedStats returns the athlete's workout and meal analytics.
func (s *ClientStatsService) GetDetailedStats(ctx context.Context, athleteID int) (*WorkoutStats, *MealStats, error) {
	workouts, err := s.workoutRepo.GetByAthleteID(ctx, athleteID, clientStatsPageSize, 0)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve workouts: %w", err)
	}
	meals, err := s.mealRepo.GetByAthleteID(ctx, athleteID, clientStatsPageSize, 0)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve meals: %w", err)
	}
	return calculateWorkoutStats(workouts), calculateMealStats(meals), nil
}

func calculateWorkoutStats(workouts []*models.Workout) *WorkoutStats {
	var totalVolume float64
	exerciseMap := make(map[string]*ExerciseStat)
	weeklyData := make([]WeeklyVolumePoint, 0)

	// Group workouts by week
	weekMap := make(map[string][]*models.Workout)

	for _, w := range workouts {
		// Calculate volume (sets * reps * weight)
		for _, e := range w.Exercises {
			for _, set := range e.Sets {
				volume := set.Weight * float64(set.Reps)
				totalVolume += volume
			}

			// Exercise breakdown
			if _, ok := exerciseMap[e.Name]; !ok {
				exerciseMap[e.Name] = &ExerciseStat{Name: e.Name}
			}
			exerciseMap[e.Name].TotalSets += len(e.Sets)
			for _, set := range e.Sets {
				if set.Weight > exerciseMap[e.Name].MaxWeight {
					exerciseMap[e.Name].MaxWeight = set.Weight
				}
				exerciseMap[e.Name].TotalReps += set.Reps
			}
		}

		// Group by week
		year, week := w.Date.ISOWeek()
		weekKey := fmt.Sprintf("%d-W%02d", year, week)
		weekMap[weekKey] = append(weekMap[weekKey], w)
	}

	// Calculate weekly volume
	for week, ws := range weekMap {
		var weekVol float64
		for _, w := range ws {
			for _, e := range w.Exercises {
				for _, set := range e.Sets {
					weekVol += set.Weight * float64(set.Reps)
				}
			}
		}
		weeklyData = append(weeklyData, WeeklyVolumePoint{
			Week:     week,
			Volume:   weekVol,
			Workouts: len(ws),
		})
	}

	// Calculate consistency (percentage of weeks with at least 3 workouts)
	weeksWithWorkouts := 0
	totalWeeks := len(weeklyData)
	if totalWeeks > 0 {
		for _, wd := range weeklyData {
			if wd.Workouts >= 3 {
				weeksWithWorkouts++
			}
		}
	}

	var consistency float64
	if totalWeeks > 0 {
		consistency = float64(weeksWithWorkouts) / float64(totalWeeks) * 100
	}

	// Map iteration order is random; sort the response slices for stable JSON.
	sort.Slice(weeklyData, func(i, j int) bool { return weeklyData[i].Week < weeklyData[j].Week })

	// Convert exercise map to slice
	exerciseBreakdown := make([]ExerciseStat, 0)
	for _, es := range exerciseMap {
		exerciseBreakdown = append(exerciseBreakdown, *es)
	}
	sort.Slice(exerciseBreakdown, func(i, j int) bool { return exerciseBreakdown[i].Name < exerciseBreakdown[j].Name })

	return &WorkoutStats{
		TotalVolume:       totalVolume,
		WeeklyVolume:      weeklyData,
		ExerciseBreakdown: exerciseBreakdown,
		Consistency:       consistency,
	}
}

func calculateMealStats(meals []*models.Meal) *MealStats {
	var totalCalories, totalProtein, totalCarbs, totalFats float64
	mealTypeMap := make(map[models.MealType]int)
	weeklyMap := make(map[string][]*models.Meal)

	for _, m := range meals {
		// Calculate totals
		for _, item := range m.Items {
			if item.Calories > 0 {
				totalCalories += item.Calories
			}
			hasAnyMacros := item.Macros.Protein > 0 || item.Macros.Carbs > 0 || item.Macros.Fats > 0
			if hasAnyMacros {
				totalProtein += item.Macros.Protein
				totalCarbs += item.Macros.Carbs
				totalFats += item.Macros.Fats
			}
		}

		// Meal type breakdown
		mealTypeMap[m.MealType]++

		// Weekly averages
		year, week := m.Date.ISOWeek()
		weekKey := fmt.Sprintf("%d-W%02d", year, week)
		weeklyMap[weekKey] = append(weeklyMap[weekKey], m)
	}

	// Calculate averages
	mealCount := float64(len(meals))
	var avgCalories, avgProtein, avgCarbs, avgFats float64
	if mealCount > 0 {
		avgCalories = totalCalories / mealCount
		avgProtein = totalProtein / mealCount
		avgCarbs = totalCarbs / mealCount
		avgFats = totalFats / mealCount
	}

	// Calculate weekly averages
	weeklyAverages := make([]WeeklyMealAvg, 0)
	for week, ws := range weeklyMap {
		var weekCalories, weekProtein, weekCarbs, weekFats float64
		mealCountInWeek := float64(len(ws))
		for _, m := range ws {
			for _, item := range m.Items {
				if item.Calories > 0 {
					weekCalories += item.Calories
				}
				hasAnyMacros := item.Macros.Protein > 0 || item.Macros.Carbs > 0 || item.Macros.Fats > 0
				if hasAnyMacros {
					weekProtein += item.Macros.Protein
					weekCarbs += item.Macros.Carbs
					weekFats += item.Macros.Fats
				}
			}
		}
		if mealCountInWeek > 0 {
			weeklyAverages = append(weeklyAverages, WeeklyMealAvg{
				Week:     week,
				Calories: weekCalories / mealCountInWeek,
				Protein:  weekProtein / mealCountInWeek,
				Carbs:    weekCarbs / mealCountInWeek,
				Fats:     weekFats / mealCountInWeek,
			})
		}
	}

	sort.Slice(weeklyAverages, func(i, j int) bool { return weeklyAverages[i].Week < weeklyAverages[j].Week })

	// Convert meal type map to slice
	mealTypeBreakdown := make([]MealTypeStat, 0)
	for mt, count := range mealTypeMap {
		mealTypeBreakdown = append(mealTypeBreakdown, MealTypeStat{
			MealType: string(mt),
			Count:    count,
		})
	}
	sort.Slice(mealTypeBreakdown, func(i, j int) bool { return mealTypeBreakdown[i].MealType < mealTypeBreakdown[j].MealType })

	return &MealStats{
		AverageCalories:   avgCalories,
		AverageProtein:    avgProtein,
		AverageCarbs:      avgCarbs,
		AverageFats:       avgFats,
		WeeklyAverages:    weeklyAverages,
		MealTypeBreakdown: mealTypeBreakdown,
	}
}
