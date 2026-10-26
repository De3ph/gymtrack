package models

import (
	"time"
)

type WeightUnit string

const (
	WeightUnitKg  WeightUnit = "kg"
	WeightUnitLbs WeightUnit = "lbs"
)

// SetType classifies an exercise set. "working" is the default: it is what a
// set means when the athlete has not said otherwise, and what the frontend
// sends for a plain set.
type SetType string

const (
	SetTypeWarmup  SetType = "warmup"
	SetTypeWorking SetType = "working"
	SetTypeBackoff SetType = "backoff"
	SetTypeDrop    SetType = "drop"
)

// OrDefault returns t unchanged when set, and SetTypeWorking when it is empty.
// Used on the write path so a client that omits setType still stores a usable
// value instead of an empty string.
func (t SetType) OrDefault() SetType {
	if t == "" {
		return SetTypeWorking
	}
	return t
}

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

// WorkoutEditWindow is how long after creation a workout may still be edited
// or deleted. Single source of truth for the domain rule; the API copy and
// the client-side gates are derived from it.
const WorkoutEditWindow = 24 * time.Hour

// CanEdit checks if the workout can be edited (within WorkoutEditWindow of creation).
func (w *Workout) CanEdit() bool {
	return time.Since(w.CreatedAt) < WorkoutEditWindow
}
