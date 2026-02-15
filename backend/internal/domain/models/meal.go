package models

import (
	"time"

	"github.com/google/uuid"
)

type MealType string

const (
	MealTypeBreakfast MealType = "breakfast"
	MealTypeLunch     MealType = "lunch"
	MealTypeDinner    MealType = "dinner"
	MealTypeSnack     MealType = "snack"
)

type Macros struct {
	Protein float64 `json:"protein" validate:"gte=0"`
	Carbs   float64 `json:"carbs" validate:"gte=0"`
	Fats    float64 `json:"fats" validate:"gte=0"`
}

type FoodItem struct {
	Food     string  `json:"food" validate:"required"`
	Quantity string  `json:"quantity" validate:"required"`
	Calories float64 `json:"calories,omitempty" validate:"gte=0"`
	Macros   Macros  `json:"macros,omitempty"`
}

type Meal struct {
	Type      string     `json:"type"` // Always "meal"
	MealID    string     `json:"mealId"`
	AthleteID string     `json:"athleteId" validate:"required"`
	Date      time.Time  `json:"date" validate:"required"`
	MealType  MealType   `json:"mealType" validate:"required,oneof=breakfast lunch dinner snack"`
	Items     []FoodItem `json:"items" validate:"required,min=1,dive"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// NewMeal creates a new meal with generated ID and timestamps
func NewMeal(athleteID string, date time.Time, mealType MealType, items []FoodItem) *Meal {
	now := time.Now()
	mealID := uuid.New().String()

	return &Meal{
		Type:      "meal",
		MealID:    mealID,
		AthleteID: athleteID,
		Date:      date,
		MealType:  mealType,
		Items:     items,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// CanEdit checks if the meal can be edited (within 24 hours of creation)
func (m *Meal) CanEdit() bool {
	return time.Since(m.CreatedAt) < 24*time.Hour
}

// CalculateTotalCalories sums up calories from all food items
func (m *Meal) CalculateTotalCalories() float64 {
	total := 0.0
	for _, item := range m.Items {
		total += item.Calories
	}
	return total
}

// CalculateTotalMacros sums up macros from all food items
func (m *Meal) CalculateTotalMacros() Macros {
	total := Macros{}
	for _, item := range m.Items {
		total.Protein += item.Macros.Protein
		total.Carbs += item.Macros.Carbs
		total.Fats += item.Macros.Fats
	}
	return total
}
