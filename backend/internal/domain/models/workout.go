package models

import (
	"time"

	"github.com/google/uuid"
)

type WeightUnit string

const (
	WeightUnitKg  WeightUnit = "kg"
	WeightUnitLbs WeightUnit = "lbs"
)

type Exercise struct {
	ExerciseID string     `json:"exerciseId"`
	Name       string     `json:"name" validate:"required"`
	Weight     float64    `json:"weight" validate:"required,gte=0"`
	WeightUnit WeightUnit `json:"weightUnit" validate:"required,oneof=kg lbs"`
	Sets       int        `json:"sets" validate:"required,gt=0"`
	Reps       []int      `json:"reps" validate:"required,min=1,dive,gt=0"`
	RestTime   int        `json:"restTime" validate:"gte=0"` // in seconds
}

type Workout struct {
	Type      string     `json:"type"` // Always "workout"
	WorkoutID string     `json:"workoutId"`
	AthleteID string     `json:"athleteId" validate:"required"`
	Date      time.Time  `json:"date" validate:"required"`
	Exercises []Exercise `json:"exercises" validate:"required,min=1,dive"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// NewWorkout creates a new workout with generated IDs and timestamps
func NewWorkout(athleteID string, date time.Time, exercises []Exercise) *Workout {
	now := time.Now()
	workoutID := uuid.New().String()

	// Generate IDs for exercises if not provided
	for i := range exercises {
		if exercises[i].ExerciseID == "" {
			exercises[i].ExerciseID = uuid.New().String()
		}
	}

	return &Workout{
		Type:      "workout",
		WorkoutID: workoutID,
		AthleteID: athleteID,
		Date:      date,
		Exercises: exercises,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// CanEdit checks if the workout can be edited (within 24 hours of creation)
func (w *Workout) CanEdit() bool {
	return time.Since(w.CreatedAt) < 24*time.Hour
}
