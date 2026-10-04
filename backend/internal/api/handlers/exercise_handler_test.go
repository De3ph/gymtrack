package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

func newExerciseHandler(exerciseRepo *fakeExerciseRepo, muscleGroupRepo *fakeMuscleGroupRepo, equipmentRepo *fakeEquipmentRepo) *ExerciseHandler {
	return NewExerciseHandler(services.NewExerciseService(exerciseRepo, muscleGroupRepo, equipmentRepo))
}

// knownLookups returns fakes preloaded with the muscle-group and equipment rows
// the service insists on validating, so a test only states what it wants missing.
func knownLookups() (*fakeMuscleGroupRepo, *fakeEquipmentRepo) {
	muscleGroups := &fakeMuscleGroupRepo{
		groups: []models.MuscleGroupDefinition{
			{ID: 1, Code: "chest", Description: "Chest"},
			{ID: 2, Code: "back", Description: "Back"},
		},
		byID: map[int]*models.MuscleGroupDefinition{
			1: {ID: 1, Code: "chest", Description: "Chest"},
			2: {ID: 2, Code: "back", Description: "Back"},
		},
	}
	equipment := &fakeEquipmentRepo{
		equipment: []models.EquipmentDefinition{
			{ID: 1, Code: "barbell", Description: "Barbell"},
			{ID: 2, Code: "dumbbell", Description: "Dumbbell"},
		},
		byID: map[int]*models.EquipmentDefinition{
			1: {ID: 1, Code: "barbell", Description: "Barbell"},
			2: {ID: 2, Code: "dumbbell", Description: "Dumbbell"},
		},
	}
	return muscleGroups, equipment
}

func sampleExercises() []models.Exercise {
	return []models.Exercise{
		{ExerciseID: 1, Name: "Bench Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 1, IsVerified: true},
		{ExerciseID: 2, Name: "Deadlift", Category: "strength", MuscleGroupID: 2, EquipmentID: 1, IsVerified: false},
	}
}

// The muscle-group route carries no auth middleware, so the handler itself must
// serve a request with no session in context.
func TestExerciseHandler_GetAllMuscleGroups_Success(t *testing.T) {
	muscleGroups, _ := knownLookups()
	handler := newExerciseHandler(&fakeExerciseRepo{}, muscleGroups, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/muscle-groups", "")
	handler.GetAllMuscleGroups(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body []models.MuscleGroupDefinition
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body, 2)
	assert.Equal(t, "chest", body[0].Code)
	assert.Equal(t, "Back", body[1].Description)
}

func TestExerciseHandler_GetAllMuscleGroups_RepositoryFailureIsGeneric500(t *testing.T) {
	muscleGroups, _ := knownLookups()
	muscleGroups.listErr = errors.New(`relation "muscle_groups" does not exist`)
	handler := newExerciseHandler(&fakeExerciseRepo{}, muscleGroups, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/muscle-groups", "")
	handler.GetAllMuscleGroups(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "muscle_groups")
}

func TestExerciseHandler_GetAllEquipment_Success(t *testing.T) {
	_, equipment := knownLookups()
	handler := newExerciseHandler(&fakeExerciseRepo{}, &fakeMuscleGroupRepo{}, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/equipment", "")
	handler.GetAllEquipment(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body []models.EquipmentDefinition
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body, 2)
	assert.Equal(t, "barbell", body[0].Code)
	assert.Equal(t, 2, body[1].ID)
}

func TestExerciseHandler_GetAllEquipment_RepositoryFailureIsGeneric500(t *testing.T) {
	_, equipment := knownLookups()
	equipment.listErr = errors.New("deadlock detected")
	handler := newExerciseHandler(&fakeExerciseRepo{}, &fakeMuscleGroupRepo{}, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/equipment", "")
	handler.GetAllEquipment(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "deadlock")
}

func TestExerciseHandler_GetAllExercises_Success(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises", "")
	handler.GetAllExercises(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body []models.Exercise
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body, 2)
	assert.Equal(t, "Bench Press", body[0].Name)
	assert.True(t, body[0].IsVerified)
	assert.False(t, body[1].IsVerified)
}

func TestExerciseHandler_GetAllExercises_RepositoryFailureIsGeneric500(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{listErr: errors.New("connection reset by peer")}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises", "")
	handler.GetAllExercises(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection reset")
}

func TestExerciseHandler_GetExerciseByID_InvalidID(t *testing.T) {
	handler := newExerciseHandler(&fakeExerciseRepo{}, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/abc", "")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.GetExerciseByID(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExerciseHandler_GetExerciseByID_Success(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{byID: map[int]*models.Exercise{
		7: {ExerciseID: 7, Name: "Squat", Category: "strength", MuscleGroupID: 2, EquipmentID: 1},
	}}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/7", "")
	ctx.Params = gin.Params{{Key: "id", Value: "7"}}
	handler.GetExerciseByID(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body models.Exercise
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 7, body.ExerciseID)
	assert.Equal(t, "Squat", body.Name)
}

// The service turns a repository ErrNotFound into (nil, nil) and the handler owns
// the translation to 404, so this pins that contract across the layer boundary.
func TestExerciseHandler_GetExerciseByID_NotFound(t *testing.T) {
	handler := newExerciseHandler(&fakeExerciseRepo{byID: map[int]*models.Exercise{}}, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/404", "")
	ctx.Params = gin.Params{{Key: "id", Value: "404"}}
	handler.GetExerciseByID(ctx)

	require.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "Exercise not found. It may have been deleted or the ID is incorrect", responseError(t, w))
}

// A sentinel behind a wrap — the way a storage layer that adds query context
// returns it — must still reach the 404 path rather than the 500 path.
func TestExerciseHandler_GetExerciseByID_WrappedNotFoundIsNotFound(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{getErr: fmt.Errorf("select exercise: %w", domainerrors.ErrNotFound)}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/404", "")
	ctx.Params = gin.Params{{Key: "id", Value: "404"}}
	handler.GetExerciseByID(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// A lookup failure must not be mistaken for "no such exercise": the repository
// error is not ErrNotFound, so the service wraps it and the handler 500s.
func TestExerciseHandler_GetExerciseByID_RepositoryFailureIsGeneric500(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{
		byID:   map[int]*models.Exercise{7: {ExerciseID: 7, Name: "Squat"}},
		getErr: errors.New(`permission denied for table "exercises"`),
	}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/7", "")
	ctx.Params = gin.Params{{Key: "id", Value: "7"}}
	handler.GetExerciseByID(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "permission denied")
}

func TestExerciseHandler_GetExercisesByMuscleGroup_InvalidID(t *testing.T) {
	handler := newExerciseHandler(&fakeExerciseRepo{}, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/muscle-group/abc", "")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.GetExercisesByMuscleGroup(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExerciseHandler_GetExercisesByMuscleGroup_Success(t *testing.T) {
	muscleGroups, _ := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/muscle-group/1", "")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.GetExercisesByMuscleGroup(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body []models.Exercise
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Len(t, body, 2)
	assert.Equal(t, []int{1}, muscleGroups.getCalls, "the muscle group ID must be validated before listing exercises")
}

// An unknown muscle group is a bad filter, not a server fault. The service reports
// the sentinel unwrapped so the handler can answer 400; the ID is never echoed back.
func TestExerciseHandler_GetExercisesByMuscleGroup_UnknownGroupIsBadRequest(t *testing.T) {
	muscleGroups, _ := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/muscle-group/999", "")
	ctx.Params = gin.Params{{Key: "id", Value: "999"}}
	handler.GetExercisesByMuscleGroup(ctx)

	require.Equal(t, http.StatusBadRequest, w.Code)
	assert.NotContains(t, responseError(t, w), "999")
	assert.Empty(t, exerciseRepo.muscleCalls,
		"an unknown group must short-circuit before listing exercises")
}

func TestExerciseHandler_GetExercisesByMuscleGroup_RepositoryFailureIsGeneric500(t *testing.T) {
	muscleGroups, _ := knownLookups()
	exerciseRepo := &fakeExerciseRepo{muscleErr: errors.New("deadlock detected")}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/muscle-group/1", "")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.GetExercisesByMuscleGroup(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "deadlock")
}

func TestExerciseHandler_GetExercisesByEquipment_InvalidID(t *testing.T) {
	handler := newExerciseHandler(&fakeExerciseRepo{}, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/equipment/abc", "")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.GetExercisesByEquipment(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExerciseHandler_GetExercisesByEquipment_Success(t *testing.T) {
	_, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/equipment/1", "")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.GetExercisesByEquipment(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body []models.Exercise
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Len(t, body, 2)
	assert.Equal(t, []int{1}, equipment.getCalls, "the equipment ID must be validated before listing exercises")
}

func TestExerciseHandler_GetExercisesByEquipment_UnknownEquipmentIsBadRequest(t *testing.T) {
	_, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/equipment/999", "")
	ctx.Params = gin.Params{{Key: "id", Value: "999"}}
	handler.GetExercisesByEquipment(ctx)

	require.Equal(t, http.StatusBadRequest, w.Code)
	assert.NotContains(t, responseError(t, w), "999")
	assert.Empty(t, exerciseRepo.equipCalls)
}

func TestExerciseHandler_GetExercisesByEquipment_RepositoryFailureIsGeneric500(t *testing.T) {
	_, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{equipErr: errors.New("statement timeout")}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/equipment/1", "")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.GetExercisesByEquipment(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "timeout")
}

func TestExerciseHandler_SearchExercises_BindingFailure(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/search?muscleGroupId=abc", "")
	handler.SearchExercises(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "Invalid search parameters. Please check the filters and try again", responseError(t, w))
	assert.Equal(t, searchCall{}, exerciseRepo.searchSeen, "an unbindable filter must not reach the repository")
}

func TestExerciseHandler_SearchExercises_NoFiltersPassesEmptyArguments(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/search", "")
	handler.SearchExercises(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, searchCall{}, exerciseRepo.searchSeen)
	assert.Empty(t, muscleGroups.getCalls, "absent filters must not be validated")
	assert.Empty(t, equipment.getCalls)
}

func TestExerciseHandler_SearchExercises_FiltersAreForwardedAndValidated(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/search?query=press&muscleGroupId=1&equipmentId=1", "")
	handler.SearchExercises(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body []models.Exercise
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Len(t, body, 2)
	require.NotNil(t, exerciseRepo.searchSeen.muscleGroupID)
	require.NotNil(t, exerciseRepo.searchSeen.equipmentID)
	assert.Equal(t, "press", exerciseRepo.searchSeen.query)
	assert.Equal(t, 1, *exerciseRepo.searchSeen.muscleGroupID)
	assert.Equal(t, 1, *exerciseRepo.searchSeen.equipmentID)
	assert.Equal(t, []int{1}, muscleGroups.getCalls)
	assert.Equal(t, []int{1}, equipment.getCalls)
}

// A supplied-but-unknown muscleGroupId must short-circuit before the search
// query runs, so no rows are returned for a filter that cannot exist.
// A filter naming a catalog item that does not exist is a bad request, and the
// search query must not run for a filter that cannot be satisfied.
func TestExerciseHandler_SearchExercises_UnknownMuscleGroupFilterIsBadRequest(t *testing.T) {
	muscleGroups, _ := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/search?muscleGroupId=999", "")
	handler.SearchExercises(ctx)

	require.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, searchCall{}, exerciseRepo.searchSeen)
}

func TestExerciseHandler_SearchExercises_UnknownEquipmentFilterIsBadRequest(t *testing.T) {
	_, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{exercises: sampleExercises()}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, equipment)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/search?equipmentId=999", "")
	handler.SearchExercises(ctx)

	require.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, searchCall{}, exerciseRepo.searchSeen)
}

func TestExerciseHandler_SearchExercises_RepositoryFailureIsGeneric500(t *testing.T) {
	exerciseRepo := &fakeExerciseRepo{searchErr: errors.New(`syntax error at or near "ILIKE"`)}
	handler := newExerciseHandler(exerciseRepo, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/exercises/search?query=x", "")
	handler.SearchExercises(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "ILIKE")
}

const validExerciseBody = `{"name":"Bench Press","category":"strength","muscleGroupId":1,"equipmentId":1}`

func TestExerciseHandler_CreateExercise_Success(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", validExerciseBody)
	ctx.Set("userID", "42")
	handler.CreateExercise(ctx)

	require.Equal(t, http.StatusCreated, w.Code)

	var body models.Exercise
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "Bench Press", body.Name)
	assert.Equal(t, "strength", body.Category)
	assert.Equal(t, 1, body.MuscleGroupID)
	assert.Equal(t, 1, body.EquipmentID)
	assert.Equal(t, 42, body.CreatedBy)
	assert.False(t, body.IsVerified, "custom exercises start unverified")

	require.NotNil(t, exerciseRepo.created)
	assert.Equal(t, 42, exerciseRepo.created.CreatedBy, "the session user must be recorded as the author")
	assert.Equal(t, []int{1}, muscleGroups.getCalls)
	assert.Equal(t, []int{1}, equipment.getCalls)
}

func TestExerciseHandler_CreateExercise_RequiresSession(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", validExerciseBody)
	handler.CreateExercise(ctx)

	require.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, "You need to log in to continue. Please log in and try again", responseError(t, w))
	assert.Nil(t, exerciseRepo.created, "an unauthenticated request must not create anything")
}

func TestExerciseHandler_CreateExercise_RejectsNonNumericSessionID(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", validExerciseBody)
	ctx.Set("userID", "abc")
	handler.CreateExercise(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "Your session is invalid. Please log in again", responseError(t, w))
	assert.Nil(t, exerciseRepo.created)
}

func TestExerciseHandler_CreateExercise_BindingFailure(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"malformed JSON", `{"name":`},
		{"empty body", ``},
		{"missing name", `{"category":"strength","muscleGroupId":1,"equipmentId":1}`},
		{"missing category", `{"name":"Bench Press","muscleGroupId":1,"equipmentId":1}`},
		{"missing muscleGroupId", `{"name":"Bench Press","category":"strength","equipmentId":1}`},
		{"missing equipmentId", `{"name":"Bench Press","category":"strength","muscleGroupId":1}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			muscleGroups, equipment := knownLookups()
			exerciseRepo := &fakeExerciseRepo{}
			handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

			ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", tt.body)
			ctx.Set("userID", "42")
			handler.CreateExercise(ctx)

			require.Equal(t, http.StatusBadRequest, w.Code)
			assert.Equal(t, "Invalid exercise data. Please check the submitted fields and try again", responseError(t, w))
			assert.Nil(t, exerciseRepo.created)
			assert.Empty(t, muscleGroups.getCalls, "an invalid body must be rejected before any lookup")
		})
	}
}

// The body is bound before the session is read, so a signed-out caller with a
// malformed payload gets 400 rather than 401.
func TestExerciseHandler_CreateExercise_BindingIsCheckedBeforeSession(t *testing.T) {
	handler := newExerciseHandler(&fakeExerciseRepo{}, &fakeMuscleGroupRepo{}, &fakeEquipmentRepo{})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", `{"name":`)
	handler.CreateExercise(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExerciseHandler_CreateExercise_UnknownMuscleGroupIsGeneric500(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", `{"name":"Bench Press","category":"strength","muscleGroupId":999,"equipmentId":1}`)
	ctx.Set("userID", "42")
	handler.CreateExercise(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Nil(t, exerciseRepo.created)
	assert.Empty(t, equipment.getCalls, "validation must stop at the first failing lookup")
}

func TestExerciseHandler_CreateExercise_UnknownEquipmentIsGeneric500(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", `{"name":"Bench Press","category":"strength","muscleGroupId":1,"equipmentId":999}`)
	ctx.Set("userID", "42")
	handler.CreateExercise(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Nil(t, exerciseRepo.created)
}

func TestExerciseHandler_CreateExercise_RepositoryFailureIsGeneric500(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{createErr: errors.New(`duplicate key value violates unique constraint "exercises_name_key"`)}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	ctx, w := newTrainerCtx(http.MethodPost, "/api/exercises", validExerciseBody)
	ctx.Set("userID", "42")
	handler.CreateExercise(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "duplicate key")
}

// Every handler reachable from exercise_routes.go, exercised once on its happy path.
// The companion in the routes package, TestRegisterExerciseRoutes_RegistersEveryEndpoint,
// reads router.Routes() and is what actually fails when a route is added or renamed —
// the table below is hardcoded and cannot detect that on its own, so the two are kept
// in step deliberately.
func TestExerciseHandler_EveryRegisteredRouteIsExercised(t *testing.T) {
	muscleGroups, equipment := knownLookups()
	exerciseRepo := &fakeExerciseRepo{
		exercises: sampleExercises(),
		byID:      map[int]*models.Exercise{1: {ExerciseID: 1, Name: "Bench Press"}},
	}
	handler := newExerciseHandler(exerciseRepo, muscleGroups, equipment)

	tests := []struct {
		name     string
		method   string
		path     string
		body     string
		paramID  string
		invoke   func(*gin.Context)
		wantCode int
	}{
		{"GET /api/muscle-groups", http.MethodGet, "/api/muscle-groups", "", "", handler.GetAllMuscleGroups, http.StatusOK},
		{"GET /api/equipment", http.MethodGet, "/api/equipment", "", "", handler.GetAllEquipment, http.StatusOK},
		{"GET /api/exercises", http.MethodGet, "/api/exercises", "", "", handler.GetAllExercises, http.StatusOK},
		{"GET /api/exercises/:id", http.MethodGet, "/api/exercises/1", "", "1", handler.GetExerciseByID, http.StatusOK},
		{"GET /api/exercises/muscle-group/:id", http.MethodGet, "/api/exercises/muscle-group/1", "", "1", handler.GetExercisesByMuscleGroup, http.StatusOK},
		{"GET /api/exercises/equipment/:id", http.MethodGet, "/api/exercises/equipment/1", "", "1", handler.GetExercisesByEquipment, http.StatusOK},
		{"GET /api/exercises/search", http.MethodGet, "/api/exercises/search?query=press", "", "", handler.SearchExercises, http.StatusOK},
		{"POST /api/exercises", http.MethodPost, "/api/exercises", validExerciseBody, "", handler.CreateExercise, http.StatusCreated},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, w := newTrainerCtx(tt.method, tt.path, tt.body)
			if tt.paramID != "" {
				ctx.Params = gin.Params{{Key: "id", Value: tt.paramID}}
			}
			if tt.method == http.MethodPost {
				ctx.Set("userID", "42")
			}

			tt.invoke(ctx)

			assert.Equal(t, tt.wantCode, w.Code, "body: %s", w.Body.String())
		})
	}
}
