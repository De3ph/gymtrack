package handlers

import (
	"net/http"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestWorkoutPlanHandler_UpdatePlan_KeepsSetType proves the setType sent in the
// JSON body survives binding, service normalization, and storage: the stored
// plan keeps an explicit warmup set and defaults a missing type to working.
func TestWorkoutPlanHandler_UpdatePlan_KeepsSetType(t *testing.T) {
	h := newPlanHarness(t)

	existing := models.NewWorkoutPlan(1, "Push Day", "", []models.WorkoutPlanExercise{
		{
			ExerciseID: 3,
			Name:       "Overhead Press",
			Sets: []models.WorkoutPlanSet{
				{SetID: "s1", Weight: 40, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90},
			},
			Order: 0,
		},
	})
	existing.PlanID = 5
	existing.CreatedAt = time.Now()
	h.plans.plans[5] = existing

	body := `{
		"name": "Push Day",
		"description": "",
		"exercises": [{
			"exerciseId": 3,
			"name": "Overhead Press",
			"sets": [
				{"setId": "s1", "setType": "warmup", "weight": 40, "weightUnit": "kg", "reps": 8, "restTime": 90},
				{"setId": "s2", "weight": 50, "weightUnit": "kg", "reps": 5, "restTime": 120}
			],
			"order": 0
		}]
	}`

	role := models.RoleTrainer
	ctx, w := newPlanCtx(http.MethodPut, "/api/workout-plans/5", body, "1", &role)
	bindPlanParam(ctx, "id", "5")
	h.handler.UpdatePlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	require.NotNil(t, h.plans.updated, "plan update with new sets must reach the repository")

	sets := h.plans.updated.Exercises[0].Sets
	require.Len(t, sets, 2)
	assert.Equal(t, models.SetTypeWarmup, sets[0].Type, "explicit setType must be stored")
	assert.Equal(t, models.SetTypeWorking, sets[1].Type, "missing setType defaults to working")
}
