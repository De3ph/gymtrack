package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

// errWorkoutBoom is a plain (non-ServiceError) fault: every handler must map it
// to a generic 500 rather than leak it to the client.
var errWorkoutBoom = errors.New("connection refused")

// workoutHarness wires a WorkoutHandler to fakes. The handler holds a concrete
// *services.WorkoutService, so the repository boundary is the only seam a test
// can control; the harness keeps every fake reachable.
type workoutHarness struct {
	workouts *fakeWorkoutRepo
	users    *fakePlanUserRepo
	handler  *WorkoutHandler
}

func newWorkoutHarness(t *testing.T) *workoutHarness {
	t.Helper()
	gin.SetMode(gin.TestMode)

	h := &workoutHarness{
		workouts: &fakeWorkoutRepo{workouts: map[int]*models.Workout{}},
		users:    &fakePlanUserRepo{byUsername: map[string]*models.User{}},
	}
	// The workout service only uses the relationship repo in the trainer
	// client-view path, which these tests do not exercise.
	service := services.NewWorkoutService(h.workouts, &fakePlanRelationshipRepo{active: map[[2]int]bool{}})
	h.handler = NewWorkoutHandler(service, h.users)
	return h
}

// newWorkoutCtx injects the auth session keys the handlers read. An empty
// userID or nil role means the key is deliberately absent, which is how the
// missing-session branches are reached.
func newWorkoutCtx(method, path, body, userID string, role *models.UserRole) (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, path, strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	if userID != "" {
		c.Set("userID", userID)
	}
	if role != nil {
		c.Set("userRole", *role)
	}
	return c, w
}

func newWorkoutAthleteCtx(method, path, body, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	role := models.RoleAthlete
	return newWorkoutCtx(method, path, body, userID, &role)
}

func newWorkoutTrainerCtx(method, path, body, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	role := models.RoleTrainer
	return newWorkoutCtx(method, path, body, userID, &role)
}

// bindWorkoutID sets the :id path param, standing in for the router binding.
func bindWorkoutID(c *gin.Context, value string) *gin.Context {
	c.Params = gin.Params{{Key: "id", Value: value}}
	return c
}

// workoutUpdateBody is a valid update payload: one exercise with one valid set,
// satisfying both request binding and the service's validation rules. It
// mirrors what the mobile client sends on Finish.
const workoutUpdateBody = `{"date":"2026-10-10T10:00:00Z","exercises":[` +
	`{"exerciseId":12,"name":"Bench Press","sets":[{"weight":60,"weightUnit":"kg","reps":8,"restTime":90}]}]}`

// storedWorkout is models.NewWorkout with an explicit id and creation time so
// tests can control the 24h edit window.
func storedWorkout(workoutID, athleteID int, createdAt time.Time) *models.Workout {
	workout := models.NewWorkout(athleteID, time.Now(), []models.WorkoutExercise{{
		ExerciseID: 12,
		Name:       "Bench Press",
		Sets:       []models.ExerciseSet{{Weight: 60, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90}},
	}}, 0)
	workout.WorkoutID = workoutID
	workout.CreatedAt = createdAt
	return workout
}

// ---------------------------------------------------------------------------
// UpdateWorkout — PUT /api/workouts/:id
// ---------------------------------------------------------------------------

func TestWorkoutHandler_UpdateWorkout_RequiresUserID(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "", nil)
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Nil(t, h.workouts.updated)
}

func TestWorkoutHandler_UpdateWorkout_RequiresUserRole(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "9", nil)
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestWorkoutHandler_UpdateWorkout_RejectsInvalidID(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/abc", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "abc")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWorkoutHandler_UpdateWorkout_RejectsMalformedBody(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/7", `{"date":`, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWorkoutHandler_UpdateWorkout_RejectsInvalidPayload(t *testing.T) {
	h := newWorkoutHarness(t)

	// Exercises fail dive validation (missing name and an invalid unit).
	body := `{"date":"2026-10-10T10:00:00Z","exercises":[` +
		`{"sets":[{"weight":60,"weightUnit":"tons","reps":8}]}]}`
	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/7", body, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWorkoutHandler_UpdateWorkout_RejectsNonAthlete(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 9, time.Now())

	ctx, w := newWorkoutTrainerCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Nil(t, h.workouts.updated)
}

func TestWorkoutHandler_UpdateWorkout_UnknownWorkoutIsNotFound(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/999", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "999")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutHandler_UpdateWorkout_RejectsOtherAthletesWorkout(t *testing.T) {
	h := newWorkoutHarness(t)
	// Owned by athlete 10; the session user is athlete 9.
	h.workouts.workouts[7] = storedWorkout(7, 10, time.Now())

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Nil(t, h.workouts.updated)
}

func TestWorkoutHandler_UpdateWorkout_RejectsExpiredEditWindow(t *testing.T) {
	h := newWorkoutHarness(t)
	created := time.Now().Add(-25 * time.Hour)
	h.workouts.workouts[7] = storedWorkout(7, 9, created)

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Nil(t, h.workouts.updated)
}

func TestWorkoutHandler_UpdateWorkout_UpdatesOwnWorkout(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 9, time.Now())

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	require.NotNil(t, h.workouts.updated)
	assert.Equal(t, 7, h.workouts.updated.WorkoutID)
	assert.Len(t, h.workouts.updated.Exercises, 1)
	assert.Equal(t, "Bench Press", h.workouts.updated.Exercises[0].Name)

	var resp models.Workout
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 7, resp.WorkoutID)
}

func TestWorkoutHandler_UpdateWorkout_RepoFailureIsInternalError(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 9, time.Now())
	h.workouts.updateErr = errWorkoutBoom

	ctx, w := newWorkoutAthleteCtx(http.MethodPut, "/api/workouts/7", workoutUpdateBody, "9")
	bindWorkoutID(ctx, "7")
	h.handler.UpdateWorkout(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

// ---------------------------------------------------------------------------
// DeleteWorkout — DELETE /api/workouts/:id
// ---------------------------------------------------------------------------

func TestWorkoutHandler_DeleteWorkout_RequiresUserID(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutCtx(http.MethodDelete, "/api/workouts/7", "", "", nil)
	bindWorkoutID(ctx, "7")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Empty(t, h.workouts.deleted)
}

func TestWorkoutHandler_DeleteWorkout_RejectsInvalidID(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutAthleteCtx(http.MethodDelete, "/api/workouts/abc", "", "9")
	bindWorkoutID(ctx, "abc")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWorkoutHandler_DeleteWorkout_RejectsNonAthlete(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 9, time.Now())

	ctx, w := newWorkoutTrainerCtx(http.MethodDelete, "/api/workouts/7", "", "9")
	bindWorkoutID(ctx, "7")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Empty(t, h.workouts.deleted)
}

func TestWorkoutHandler_DeleteWorkout_UnknownWorkoutIsNotFound(t *testing.T) {
	h := newWorkoutHarness(t)

	ctx, w := newWorkoutAthleteCtx(http.MethodDelete, "/api/workouts/999", "", "9")
	bindWorkoutID(ctx, "999")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutHandler_DeleteWorkout_RejectsOtherAthletesWorkout(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 10, time.Now())

	ctx, w := newWorkoutAthleteCtx(http.MethodDelete, "/api/workouts/7", "", "9")
	bindWorkoutID(ctx, "7")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Empty(t, h.workouts.deleted)
}

func TestWorkoutHandler_DeleteWorkout_RejectsExpiredEditWindow(t *testing.T) {
	h := newWorkoutHarness(t)
	created := time.Now().Add(-25 * time.Hour)
	h.workouts.workouts[7] = storedWorkout(7, 9, created)

	ctx, w := newWorkoutAthleteCtx(http.MethodDelete, "/api/workouts/7", "", "9")
	bindWorkoutID(ctx, "7")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Empty(t, h.workouts.deleted)
}

func TestWorkoutHandler_DeleteWorkout_DeletesOwnWorkout(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 9, time.Now())

	ctx, w := newWorkoutAthleteCtx(http.MethodDelete, "/api/workouts/7", "", "9")
	bindWorkoutID(ctx, "7")
	h.handler.DeleteWorkout(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, []int{7}, h.workouts.deleted)

	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp["message"])
}

func TestWorkoutHandler_DeleteWorkout_RepoFailureIsInternalError(t *testing.T) {
	h := newWorkoutHarness(t)
	h.workouts.workouts[7] = storedWorkout(7, 9, time.Now())
	h.workouts.deleteErr = errWorkoutBoom

	ctx, w := newWorkoutAthleteCtx(http.MethodDelete, "/api/workouts/7", "", "9")
	bindWorkoutID(ctx, "7")
	h.handler.DeleteWorkout(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Empty(t, h.workouts.deleted)
}
