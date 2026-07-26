package models

import (
	"time"
)

type Exercise struct {
	ExerciseID    int       `json:"exerciseId" example:"1"`
	Name          string    `json:"name" validate:"required"`
	Category      string    `json:"category"` // strength, cardio, flexibility
	MuscleGroupID int       `json:"muscleGroupId" example:"1"`
	EquipmentID   int       `json:"equipmentId" example:"1"`
	Instructions  string    `json:"instructions"`
	CreatedBy     int       `json:"createdBy,omitempty" example:"1"` // athlete ID for custom exercises
	IsVerified    bool      `json:"isVerified"`
	CreatedAt     time.Time `json:"createdAt"`
}

type ExerciseSet struct {
	SetID      string     `json:"setId"`
	Weight     float64    `json:"weight" validate:"gte=0"`
	WeightUnit WeightUnit `json:"weightUnit" validate:"required,oneof=kg lbs"`
	Reps       int        `json:"reps" validate:"gt=0"`
	RestTime   int        `json:"restTime" validate:"gte=0"` // in seconds
	Completed  bool       `json:"completed"`                 // for workout tracking
}

type WorkoutExercise struct {
	ExerciseID int           `json:"exerciseId" validate:"required" example:"1"`
	Name       string        `json:"name" validate:"required"` // denormalized for convenience
	Sets       []ExerciseSet `json:"sets" validate:"required,min=1,dive"`
	Notes      string        `json:"notes,omitempty"`
}

// NewExercise creates a new exercise with timestamp
func NewExercise(name, category string, muscleGroupID, equipmentID int, createdBy int) *Exercise {
	now := time.Now()

	return &Exercise{
		ExerciseID:    0,
		Name:          name,
		Category:      category,
		MuscleGroupID: muscleGroupID,
		EquipmentID:   equipmentID,
		CreatedBy:     createdBy,
		CreatedAt:     now,
	}
}

// NewExerciseSet creates a new exercise set
func NewExerciseSet(weight float64, weightUnit WeightUnit, reps, restTime int) *ExerciseSet {
	return &ExerciseSet{
		Weight:     weight,
		WeightUnit: weightUnit,
		Reps:       reps,
		RestTime:   restTime,
		Completed:  false,
	}
}

// CompleteSet marks the set as completed
func (es *ExerciseSet) CompleteSet() {
	es.Completed = true
}
