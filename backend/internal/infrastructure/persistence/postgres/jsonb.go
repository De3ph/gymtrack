package postgres

import (
	"bytes"
	"fmt"

	"gymtrack-backend/internal/domain/models"
)

// Typed JSONB deserialization layer.
//
// The tables below store flexible embedded data as PostgreSQL JSONB:
//   - workouts.exercises       -> []models.WorkoutExercise        (NOT NULL)
//   - meals.items              -> []models.FoodItem               (NOT NULL)
//   - body_measurements.parts  -> map[string]BodyMeasurementPart  (NOT NULL DEFAULT '{}')
//   - workout_plans.exercises  -> []models.WorkoutPlanExercise    (NOT NULL DEFAULT '[]')
//   - users.profile            -> models.UserProfile              (NOT NULL DEFAULT '{}')
//
// Repositories scan the JSONB column into a raw []byte and then call the
// typed Unmarshal* helper for that column; on write they call the matching
// Marshal* helper. This keeps all []byte handling in one place so callers
// only ever deal with domain structs. The low-level MarshalToJSONB /
// UnmarshalFromJSONB primitives in helpers.go remain for generic use.

var (
	nullJSON = []byte("null")
	emptyArr = []byte("[]")
	emptyObj = []byte("{}")
)

func isNullOrEmpty(data []byte) bool {
	if len(data) == 0 {
		return true
	}
	trimmed := bytes.TrimSpace(data)
	return len(trimmed) == 0 || bytes.Equal(trimmed, nullJSON)
}

// MarshalWorkoutExercises serializes workout exercises for workouts.exercises.
// Nil slices are stored as '[]' (matching frontend expectations of an array,
// never JSON null).
func MarshalWorkoutExercises(v []models.WorkoutExercise) ([]byte, error) {
	if v == nil {
		return append([]byte(nil), emptyArr...), nil
	}
	data, err := MarshalToJSONB(v)
	if err != nil {
		return nil, fmt.Errorf("marshal workout exercises: %w", err)
	}
	return data, nil
}

// UnmarshalWorkoutExercises deserializes workouts.exercises into typed structs.
// NULL / empty / 'null' payloads yield an empty non-nil slice.
func UnmarshalWorkoutExercises(data []byte, dest *[]models.WorkoutExercise) error {
	if isNullOrEmpty(data) {
		*dest = []models.WorkoutExercise{}
		return nil
	}
	if err := UnmarshalFromJSONB(data, dest); err != nil {
		return fmt.Errorf("unmarshal workout exercises: %w", err)
	}
	if *dest == nil {
		*dest = []models.WorkoutExercise{}
	}
	return nil
}

// MarshalMealItems serializes meal items for meals.items.
// Nil slices are stored as '[]'.
func MarshalMealItems(v []models.FoodItem) ([]byte, error) {
	if v == nil {
		return append([]byte(nil), emptyArr...), nil
	}
	data, err := MarshalToJSONB(v)
	if err != nil {
		return nil, fmt.Errorf("marshal meal items: %w", err)
	}
	return data, nil
}

// UnmarshalMealItems deserializes meals.items into typed structs.
// NULL / empty / 'null' payloads yield an empty non-nil slice.
func UnmarshalMealItems(data []byte, dest *[]models.FoodItem) error {
	if isNullOrEmpty(data) {
		*dest = []models.FoodItem{}
		return nil
	}
	if err := UnmarshalFromJSONB(data, dest); err != nil {
		return fmt.Errorf("unmarshal meal items: %w", err)
	}
	if *dest == nil {
		*dest = []models.FoodItem{}
	}
	return nil
}

// MarshalBodyParts serializes body part measurements for body_measurements.parts.
// Nil maps are stored as '{}' (matching the column DEFAULT).
func MarshalBodyParts(v map[string]models.BodyMeasurementPart) ([]byte, error) {
	if v == nil {
		return append([]byte(nil), emptyObj...), nil
	}
	data, err := MarshalToJSONB(v)
	if err != nil {
		return nil, fmt.Errorf("marshal body parts: %w", err)
	}
	return data, nil
}

// UnmarshalBodyParts deserializes body_measurements.parts into a typed map.
// NULL / empty / 'null' payloads yield an empty non-nil map.
func UnmarshalBodyParts(data []byte, dest *map[string]models.BodyMeasurementPart) error {
	if isNullOrEmpty(data) {
		*dest = map[string]models.BodyMeasurementPart{}
		return nil
	}
	if err := UnmarshalFromJSONB(data, dest); err != nil {
		return fmt.Errorf("unmarshal body parts: %w", err)
	}
	if *dest == nil {
		*dest = map[string]models.BodyMeasurementPart{}
	}
	return nil
}

// MarshalPlanExercises serializes plan exercises for workout_plans.exercises.
// Nil slices are stored as '[]' (matching the column DEFAULT).
func MarshalPlanExercises(v []models.WorkoutPlanExercise) ([]byte, error) {
	if v == nil {
		return append([]byte(nil), emptyArr...), nil
	}
	data, err := MarshalToJSONB(v)
	if err != nil {
		return nil, fmt.Errorf("marshal plan exercises: %w", err)
	}
	return data, nil
}

// UnmarshalPlanExercises deserializes workout_plans.exercises into typed structs.
// NULL / empty / 'null' payloads yield an empty non-nil slice.
func UnmarshalPlanExercises(data []byte, dest *[]models.WorkoutPlanExercise) error {
	if isNullOrEmpty(data) {
		*dest = []models.WorkoutPlanExercise{}
		return nil
	}
	if err := UnmarshalFromJSONB(data, dest); err != nil {
		return fmt.Errorf("unmarshal plan exercises: %w", err)
	}
	if *dest == nil {
		*dest = []models.WorkoutPlanExercise{}
	}
	return nil
}

// MarshalUserProfile serializes a user profile for users.profile.
func MarshalUserProfile(v models.UserProfile) ([]byte, error) {
	data, err := MarshalToJSONB(v)
	if err != nil {
		return nil, fmt.Errorf("marshal user profile: %w", err)
	}
	return data, nil
}

// UnmarshalUserProfile deserializes users.profile into a typed struct.
// NULL / empty / 'null' payloads leave the zero-value profile untouched.
func UnmarshalUserProfile(data []byte, dest *models.UserProfile) error {
	if isNullOrEmpty(data) {
		return nil
	}
	if err := UnmarshalFromJSONB(data, dest); err != nil {
		return fmt.Errorf("unmarshal user profile: %w", err)
	}
	return nil
}
