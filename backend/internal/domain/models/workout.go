package models

import (
	"time"
)

type WeightUnit string

const (
	WeightUnitKg  WeightUnit = "kg"
	WeightUnitLbs WeightUnit = "lbs"
)

type Workout struct {
	Type      string            `json:"type"` // Always "workout"
	WorkoutID int               `json:"workoutId" example:"1"`
	AthleteID int               `json:"athleteId" validate:"required" example:"1"`
	Date      time.Time         `json:"date" validate:"required"`
	Exercises []WorkoutExercise `json:"exercises" validate:"required,min=1,dive"`
	PlanID    int               `json:"planId,omitempty" example:"1"` // Set when started from a plan
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

// NewWorkout creates a new workout with timestamps
func NewWorkout(athleteID int, date time.Time, exercises []WorkoutExercise, planID int) *Workout {
	now := time.Now()

	return &Workout{
		Type:      "workout",
		WorkoutID: 0,
		AthleteID: athleteID,
		Date:      date,
		Exercises: exercises,
		PlanID:    planID,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// CanEdit checks if the workout can be edited (within 24 hours of creation)
func (w *Workout) CanEdit() bool {
	return time.Since(w.CreatedAt) < 24*time.Hour
}
