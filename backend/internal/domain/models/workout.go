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

type Workout struct {
	Type      string            `json:"type"` // Always "workout"
	WorkoutID string            `json:"workoutId"`
	AthleteID string            `json:"athleteId" validate:"required"`
	Date      time.Time         `json:"date" validate:"required"`
	Exercises []WorkoutExercise `json:"exercises" validate:"required,min=1,dive"`
	PlanID    string            `json:"planId,omitempty"` // Set when started from a plan
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

// NewWorkout creates a new workout with generated IDs and timestamps
func NewWorkout(athleteID string, date time.Time, exercises []WorkoutExercise, planID string) *Workout {
	now := time.Now()
	workoutID := uuid.New().String()

	// Generate IDs for workout exercises and sets if not provided
	for i := range exercises {
		if exercises[i].ExerciseID == "" {
			exercises[i].ExerciseID = uuid.New().String()
		}
		for j := range exercises[i].Sets {
			if exercises[i].Sets[j].SetID == "" {
				exercises[i].Sets[j].SetID = uuid.New().String()
			}
		}
	}

	return &Workout{
		Type:      "workout",
		WorkoutID: workoutID,
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
