package models

import (
	"time"
)

type WorkoutPlan struct {
	Type        string                `json:"type"` // Always "workout_plan"
	PlanID      int                   `json:"planId"`
	TrainerID   int                   `json:"trainerId"`
	Name        string                `json:"name"`
	Description string                `json:"description,omitempty"`
	Exercises   []WorkoutPlanExercise `json:"exercises"`
	CreatedAt   time.Time             `json:"createdAt"`
	UpdatedAt   time.Time             `json:"updatedAt"`
}

type WorkoutPlanExercise struct {
	ExerciseID int              `json:"exerciseId"`
	Name       string           `json:"name"`
	Sets       []WorkoutPlanSet `json:"sets"`
	Notes      string           `json:"notes,omitempty"`
	Order      int              `json:"order"`
}

type WorkoutPlanSet struct {
	SetID      string     `json:"setId"`
	Weight     float64    `json:"weight"`
	WeightUnit WeightUnit `json:"weightUnit"`
	Reps       int        `json:"reps"`
	RestTime   int        `json:"restTime"` // in seconds
}

type WorkoutPlanAssignment struct {
	Type         string    `json:"type"` // Always "workout_plan_assignment"
	AssignmentID int       `json:"assignmentId"`
	PlanID       int       `json:"planId"`
	AthleteID    int       `json:"athleteId"`
	TrainerID    int       `json:"trainerId"`
	Status       string    `json:"status"` // "active" (reusable — never transitions)
	CreatedAt    time.Time `json:"createdAt"`
}

func NewWorkoutPlan(trainerID int, name, description string, exercises []WorkoutPlanExercise) *WorkoutPlan {
	now := time.Now()

	return &WorkoutPlan{
		Type:        "workout_plan",
		PlanID:      0,
		TrainerID:   trainerID,
		Name:        name,
		Description: description,
		Exercises:   exercises,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func NewWorkoutPlanExercise(exerciseID int, name string, sets []WorkoutPlanSet, notes string, order int) WorkoutPlanExercise {
	return WorkoutPlanExercise{
		ExerciseID: exerciseID,
		Name:       name,
		Sets:       sets,
		Notes:      notes,
		Order:      order,
	}
}

func NewWorkoutPlanSet(weight float64, weightUnit WeightUnit, reps, restTime int) WorkoutPlanSet {
	return WorkoutPlanSet{
		Weight:     weight,
		WeightUnit: weightUnit,
		Reps:       reps,
		RestTime:   restTime,
	}
}

func NewWorkoutPlanAssignment(planID, athleteID, trainerID int) *WorkoutPlanAssignment {
	return &WorkoutPlanAssignment{
		Type:         "workout_plan_assignment",
		AssignmentID: 0,
		PlanID:       planID,
		AthleteID:    athleteID,
		TrainerID:    trainerID,
		Status:       "active",
		CreatedAt:    time.Now(),
	}
}
