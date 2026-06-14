package models

import (
	"time"

	"github.com/google/uuid"
)

type WorkoutPlan struct {
	Type        string               `json:"type"` // Always "workout_plan"
	PlanID      string               `json:"planId"`
	TrainerID   string               `json:"trainerId"`
	Name        string               `json:"name"`
	Description string               `json:"description,omitempty"`
	Exercises   []WorkoutPlanExercise `json:"exercises"`
	CreatedAt   time.Time            `json:"createdAt"`
	UpdatedAt   time.Time            `json:"updatedAt"`
}

type WorkoutPlanExercise struct {
	ExerciseID string           `json:"exerciseId"`
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
	AssignmentID string    `json:"assignmentId"`
	PlanID       string    `json:"planId"`
	AthleteID    string    `json:"athleteId"`
	TrainerID    string    `json:"trainerId"`
	Status       string    `json:"status"` // "active" (reusable — never transitions)
	CreatedAt    time.Time `json:"createdAt"`
}

func NewWorkoutPlan(trainerID, name, description string, exercises []WorkoutPlanExercise) *WorkoutPlan {
	now := time.Now()

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

	return &WorkoutPlan{
		Type:        "workout_plan",
		PlanID:      uuid.New().String(),
		TrainerID:   trainerID,
		Name:        name,
		Description: description,
		Exercises:   exercises,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func NewWorkoutPlanExercise(exerciseID, name string, sets []WorkoutPlanSet, notes string, order int) WorkoutPlanExercise {
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
		SetID:      uuid.New().String(),
		Weight:     weight,
		WeightUnit: weightUnit,
		Reps:       reps,
		RestTime:   restTime,
	}
}

func NewWorkoutPlanAssignment(planID, athleteID, trainerID string) *WorkoutPlanAssignment {
	return &WorkoutPlanAssignment{
		Type:         "workout_plan_assignment",
		AssignmentID: uuid.New().String(),
		PlanID:       planID,
		AthleteID:    athleteID,
		TrainerID:    trainerID,
		Status:       "active",
		CreatedAt:    time.Now(),
	}
}
