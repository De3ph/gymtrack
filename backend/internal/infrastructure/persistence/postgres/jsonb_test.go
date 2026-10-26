package postgres

import (
	"testing"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorkoutExercises_RoundTrip(t *testing.T) {
	original := []models.WorkoutExercise{
		{
			ExerciseID: 1, Name: "Bench Press",
			Sets: []models.ExerciseSet{
				{SetID: "s1", Weight: 80, WeightUnit: models.WeightUnitKg, Reps: 10, RestTime: 90, Completed: true},
			},
			Notes: "warm up",
		},
	}
	data, err := MarshalWorkoutExercises(original)
	require.NoError(t, err)

	var decoded []models.WorkoutExercise
	require.NoError(t, UnmarshalWorkoutExercises(data, &decoded))
	assert.Equal(t, original, decoded)
}

func TestWorkoutExercises_NullEmpty(t *testing.T) {
	for _, payload := range [][]byte{nil, {}, []byte("null"), []byte("  null  ")} {
		var decoded []models.WorkoutExercise
		require.NoError(t, UnmarshalWorkoutExercises(payload, &decoded))
		require.NotNil(t, decoded)
		assert.Empty(t, decoded)
	}

	data, err := MarshalWorkoutExercises(nil)
	require.NoError(t, err)
	assert.JSONEq(t, `[]`, string(data))
}

func TestMealItems_RoundTrip(t *testing.T) {
	original := []models.FoodItem{
		{Food: "Rice", Quantity: "150g", Calories: 195, Macros: models.Macros{Protein: 4.3, Carbs: 42, Fats: 0.4}},
	}
	data, err := MarshalMealItems(original)
	require.NoError(t, err)

	var decoded []models.FoodItem
	require.NoError(t, UnmarshalMealItems(data, &decoded))
	assert.Equal(t, original, decoded)
}

func TestMealItems_NullEmpty(t *testing.T) {
	var decoded []models.FoodItem
	require.NoError(t, UnmarshalMealItems(nil, &decoded))
	require.NotNil(t, decoded)

	data, err := MarshalMealItems(nil)
	require.NoError(t, err)
	assert.JSONEq(t, `[]`, string(data))
}

func TestBodyParts_RoundTrip(t *testing.T) {
	original := map[string]models.BodyMeasurementPart{
		"chest": {Value: 100}, "waist": {Value: 82},
	}
	data, err := MarshalBodyParts(original)
	require.NoError(t, err)

	var decoded map[string]models.BodyMeasurementPart
	require.NoError(t, UnmarshalBodyParts(data, &decoded))
	assert.Equal(t, original, decoded)
}

func TestBodyParts_NullEmpty(t *testing.T) {
	for _, payload := range [][]byte{nil, {}, []byte("null")} {
		var decoded map[string]models.BodyMeasurementPart
		require.NoError(t, UnmarshalBodyParts(payload, &decoded))
		require.NotNil(t, decoded)
		assert.Empty(t, decoded)
	}

	data, err := MarshalBodyParts(nil)
	require.NoError(t, err)
	assert.JSONEq(t, `{}`, string(data))
}

func TestPlanExercises_RoundTrip(t *testing.T) {
	original := []models.WorkoutPlanExercise{
		{
			ExerciseID: 1,
			Name:       "Squat",
			Sets: []models.WorkoutPlanSet{
				// A set written without a type roundtrips as the empty string —
				// read-side normalization is out of scope; consumers fall back
				// to "working" via `|| "working"` / COALESCE.
				{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120},
				{Type: models.SetTypeWarmup, Weight: 60, WeightUnit: "kg", Reps: 8, RestTime: 120},
			},
			Order: 1,
		},
	}
	data, err := MarshalPlanExercises(original)
	require.NoError(t, err)

	var decoded []models.WorkoutPlanExercise
	require.NoError(t, UnmarshalPlanExercises(data, &decoded))
	assert.Equal(t, original, decoded)
	assert.Empty(t, decoded[0].Sets[0].Type)
	assert.Equal(t, models.SetTypeWarmup, decoded[0].Sets[1].Type)

	// The empty-string type survives the JSON text, so the frontend can
	// distinguish "explicit working" from "not set" if it ever needs to.
	assert.Contains(t, string(data), `"setType":""`)
}

func TestPlanExercises_NullEmpty(t *testing.T) {
	var decoded []models.WorkoutPlanExercise
	require.NoError(t, UnmarshalPlanExercises([]byte("null"), &decoded))
	require.NotNil(t, decoded)

	data, err := MarshalPlanExercises(nil)
	require.NoError(t, err)
	assert.JSONEq(t, `[]`, string(data))
}

func TestUserProfile_RoundTrip(t *testing.T) {
	original := models.UserProfile{Name: "Ada", Bio: "coach", Languages: []string{"en", "tr"}}
	data, err := MarshalUserProfile(original)
	require.NoError(t, err)

	var decoded models.UserProfile
	require.NoError(t, UnmarshalUserProfile(data, &decoded))
	assert.Equal(t, original, decoded)
}

func TestUserProfile_NullEmpty(t *testing.T) {
	original := models.UserProfile{Name: "keep"}
	require.NoError(t, UnmarshalUserProfile(nil, &original))
	assert.Equal(t, "keep", original.Name)
	require.NoError(t, UnmarshalUserProfile([]byte("null"), &original))
	assert.Equal(t, "keep", original.Name)
}

func TestJSONB_InvalidPayload(t *testing.T) {
	bad := []byte("{invalid json")
	var ex []models.WorkoutExercise
	assert.Error(t, UnmarshalWorkoutExercises(bad, &ex))
	var items []models.FoodItem
	assert.Error(t, UnmarshalMealItems(bad, &items))
	var parts map[string]models.BodyMeasurementPart
	assert.Error(t, UnmarshalBodyParts(bad, &parts))
	var plan []models.WorkoutPlanExercise
	assert.Error(t, UnmarshalPlanExercises(bad, &plan))
	var profile models.UserProfile
	assert.Error(t, UnmarshalUserProfile(bad, &profile))
}
