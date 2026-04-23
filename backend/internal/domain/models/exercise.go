package models

import (
	"time"

	"github.com/google/uuid"
)

type Exercise struct {
	ExerciseID   string    `json:"exerciseId"`
	Name         string    `json:"name" validate:"required"`
	Category     string    `json:"category"` // strength, cardio, flexibility
	MuscleGroupID int      `json:"muscleGroupId"`
	EquipmentID  int       `json:"equipmentId"`
	Instructions string    `json:"instructions"`
	CreatedBy    string    `json:"createdBy,omitempty"` // athlete ID for custom exercises
	CreatedAt    time.Time `json:"createdAt"`
}

type ExerciseSet struct {
	SetID      string     `json:"setId"`
	Weight     float64    `json:"weight" validate:"gte=0"`
	WeightUnit WeightUnit `json:"weightUnit" validate:"required,oneof=kg lbs"`
	Reps       int        `json:"reps" validate:"gt=0"`
	RestTime   int        `json:"restTime" validate:"gte=0"` // in seconds
	Completed bool       `json:"completed"` // for workout tracking
}

type WorkoutExercise struct {
	ExerciseID string        `json:"exerciseId"`
	Name       string        `json:"name"` // denormalized for convenience
	Sets       []ExerciseSet `json:"sets" validate:"required,min=1,dive"`
	Notes      string        `json:"notes,omitempty"`
}

// NewExercise creates a new exercise with generated ID and timestamp
func NewExercise(name, category string, muscleGroupID, equipmentID int, createdBy string) *Exercise {
	now := time.Now()
	exerciseID := uuid.New().String()

	return &Exercise{
		ExerciseID:   exerciseID,
		Name:         name,
		Category:     category,
		MuscleGroupID: muscleGroupID,
		EquipmentID:  equipmentID,
		CreatedBy:    createdBy,
		CreatedAt:    now,
	}
}

// NewExerciseSet creates a new exercise set with generated ID
func NewExerciseSet(weight float64, weightUnit WeightUnit, reps, restTime int) *ExerciseSet {
	setID := uuid.New().String()

	return &ExerciseSet{
		SetID:      setID,
		Weight:     weight,
		WeightUnit: weightUnit,
		Reps:       reps,
		RestTime:   restTime,
		Completed: false,
	}
}

// CompleteSet marks the set as completed
func (es *ExerciseSet) CompleteSet() {
	es.Completed = true
}
