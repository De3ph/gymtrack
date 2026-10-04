package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

// errPlanBoom is a plain (non-ServiceError) fault: every handler must map it to
// a generic 500 rather than leak it to the client.
var errPlanBoom = errors.New("connection refused")

// planHarness wires a WorkoutPlanHandler to a full set of fakes. The handler
// holds a concrete *services.WorkoutPlanService, so the repository boundary is
// the only seam a test can control; the harness keeps every fake reachable.
type planHarness struct {
	plans         *fakePlanRepo
	assignments   *fakePlanAssignmentRepo
	relationships *fakePlanRelationshipRepo
	workouts      *fakePlanWorkoutRepo
	users         *fakePlanUserRepo
	handler       *WorkoutPlanHandler
}

func newPlanHarness(t *testing.T) *planHarness {
	t.Helper()
	gin.SetMode(gin.TestMode)

	// The write-side maps are initialized because tests seed them directly, e.g.
	// h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{
	//     models.NewWorkoutPlanAssignment(5, 9, 1),
	// }. Reads from a nil map are safe, but seeding one panics.
	h := &planHarness{
		plans:         &fakePlanRepo{plans: map[int]*models.WorkoutPlan{}},
		assignments:   &fakePlanAssignmentRepo{byPlan: map[int][]*models.WorkoutPlanAssignment{}, byAthlete: map[int][]*models.WorkoutPlanAssignment{}},
		relationships: &fakePlanRelationshipRepo{active: map[[2]int]bool{}},
		workouts:      &fakePlanWorkoutRepo{},
		users:         &fakePlanUserRepo{byUsername: map[string]*models.User{}},
	}

	service := services.NewWorkoutPlanService(h.plans, h.assignments, h.relationships, h.workouts)
	h.handler = NewWorkoutPlanHandler(service, h.users)
	return h
}

// newPlanCtx reuses the package-shared context helper and injects the auth
// session keys the handlers read. An empty userID or nil role means the key is
// deliberately absent, which is how the missing-session branches are reached.
func newPlanCtx(method, path, body, userID string, role *models.UserRole) (*gin.Context, *httptest.ResponseRecorder) {
	c, w := newTrainerCtx(method, path, body)
	if userID != "" {
		c.Set("userID", userID)
	}
	if role != nil {
		c.Set("userRole", *role)
	}
	return c, w
}

func newTrainerPlanCtx(method, path, body, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	role := models.RoleTrainer
	return newPlanCtx(method, path, body, userID, &role)
}

func newAthletePlanCtx(method, path, body, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	role := models.RoleAthlete
	return newPlanCtx(method, path, body, userID, &role)
}

// newAdminPlanCtx returns an authenticated but non-coaching session, which
// every workout-plan route must refuse.
func newAdminPlanCtx(method, path, body, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	role := models.RoleAdmin
	return newPlanCtx(method, path, body, userID, &role)
}

// bindPlanParam sets a gin path param, standing in for the router binding.
func bindPlanParam(c *gin.Context, key, value string) *gin.Context {
	c.Params = gin.Params{{Key: key, Value: value}}
	return c
}

// The three path-aware constructors pair a session with a bound path param
// (:id, :username) in one call.
func newTrainerPlanPathCtx(method, path, body, userID, key, value string) (*gin.Context, *httptest.ResponseRecorder) {
	c, w := newTrainerPlanCtx(method, path, body, userID)
	return bindPlanParam(c, key, value), w
}

func newAthletePlanPathCtx(method, path, body, userID, key, value string) (*gin.Context, *httptest.ResponseRecorder) {
	c, w := newAthletePlanCtx(method, path, body, userID)
	return bindPlanParam(c, key, value), w
}

func newAdminPlanPathCtx(method, path, body, userID, key, value string) (*gin.Context, *httptest.ResponseRecorder) {
	c, w := newAdminPlanCtx(method, path, body, userID)
	return bindPlanParam(c, key, value), w
}

// planBody is a valid create/update payload: one exercise with one valid set,
// satisfying both request binding and the service's validation rules.
const planBody = `{"name":"Push Day","description":"Chest focus","exercises":[` +
	`{"exerciseId":12,"name":"Bench Press","sets":[{"weight":60,"weightUnit":"kg","reps":8,"restTime":90}],"order":0}]}`

// storedPlan is models.NewWorkoutPlan with an explicit id. The constructor
// always leaves PlanID at 0 because the database assigns it, so any fixture
// that asserts on the id must set it.
func storedPlan(planID, creatorID int, name, description string) *models.WorkoutPlan {
	plan := models.NewWorkoutPlan(creatorID, name, description, []models.WorkoutPlanExercise{planExercise()})
	plan.PlanID = planID
	return plan
}

func planExercise() models.WorkoutPlanExercise {
	return models.WorkoutPlanExercise{
		ExerciseID: 12,
		Name:       "Bench Press",
		Sets:       []models.WorkoutPlanSet{{SetID: "s1", Weight: 60, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90}},
		Order:      0,
	}
}

// ---------------------------------------------------------------------------
// CreatePlan — POST /api/workout-plans
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_CreatePlan_RequiresUserID(t *testing.T) {
	h := newPlanHarness(t)

	// No session key at all: the handler must reject before touching the body.
	ctx, w := newPlanCtx(http.MethodPost, "/api/workout-plans", planBody, "", nil)
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, responseError(t, w), "log in")
	assert.Nil(t, h.plans.created, "no plan may be persisted for an anonymous caller")
}

func TestWorkoutPlanHandler_CreatePlan_RequiresUserRole(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newPlanCtx(http.MethodPost, "/api/workout-plans", planBody, "1", nil)
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, responseError(t, w), "role information")
}

func TestWorkoutPlanHandler_CreatePlan_RejectsAdmin(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAdminPlanCtx(http.MethodPost, "/api/workout-plans", planBody, "1")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "trainer or athlete")
}

func TestWorkoutPlanHandler_CreatePlan_RejectsMalformedJSON(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanCtx(http.MethodPost, "/api/workout-plans", `{"name":`, "1")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan data")
}

func TestWorkoutPlanHandler_CreatePlan_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanCtx(http.MethodPost, "/api/workout-plans", planBody, "not-a-number")
	h.handler.CreatePlan(ctx)

	// A corrupt session is not a bad request: 500, not 400.
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, responseError(t, w), "session is invalid")
}

func TestWorkoutPlanHandler_CreatePlan_EmptyNameIsValidationError(t *testing.T) {
	h := newPlanHarness(t)

	body := `{"name":"","exercises":[{"exerciseId":12,"name":"Bench Press","sets":[{"weight":60,"weightUnit":"kg","reps":8,"restTime":90}]}]}`
	ctx, w := newTrainerPlanCtx(http.MethodPost, "/api/workout-plans", body, "1")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "Please give your workout plan a name", responseError(t, w))
}

func TestWorkoutPlanHandler_CreatePlan_NoExercisesIsValidationError(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanCtx(http.MethodPost, "/api/workout-plans", `{"name":"Push Day","exercises":[]}`, "1")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "at least one exercise")
}

func TestWorkoutPlanHandler_CreatePlan_TrainerSuccess(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanCtx(http.MethodPost, "/api/workout-plans", planBody, "7")
	h.handler.CreatePlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)

	var plan models.WorkoutPlan
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &plan))
	assert.Equal(t, "workout_plan", plan.Type)
	assert.Equal(t, "Push Day", plan.Name)
	assert.Equal(t, "Chest focus", plan.Description)
	require.Len(t, plan.Exercises, 1)
	assert.Equal(t, "Bench Press", plan.Exercises[0].Name)

	require.NotNil(t, h.plans.created)
	assert.Equal(t, 7, h.plans.created.CreatorID, "the plan is owned by the session user")
	assert.Equal(t, "Push Day", h.plans.created.Name)
}

func TestWorkoutPlanHandler_CreatePlan_AthleteSuccessChecksQuota(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.count = 2 // one slot left in the 3-plan athlete allowance

	ctx, w := newAthletePlanCtx(http.MethodPost, "/api/workout-plans", planBody, "9")
	h.handler.CreatePlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)
	assert.Equal(t, 9, h.plans.countSeen, "the quota is checked against the athlete's own id")
	require.NotNil(t, h.plans.created)
	assert.Equal(t, 9, h.plans.created.CreatorID)
}

func TestWorkoutPlanHandler_CreatePlan_AthletePlanLimitIsConflict(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.count = 3

	ctx, w := newAthletePlanCtx(http.MethodPost, "/api/workout-plans", planBody, "9")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Contains(t, responseError(t, w), "limit of 3 workout plans")
	assert.Nil(t, h.plans.created, "a rejected create must not reach the repository")
}

func TestWorkoutPlanHandler_CreatePlan_QuotaLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.countErr = errPlanBoom

	ctx, w := newAthletePlanCtx(http.MethodPost, "/api/workout-plans", planBody, "9")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_CreatePlan_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.createErr = errPlanBoom

	ctx, w := newTrainerPlanCtx(http.MethodPost, "/api/workout-plans", planBody, "1")
	h.handler.CreatePlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "Something went wrong while processing your request. Please try again later", responseError(t, w))
}

// ---------------------------------------------------------------------------
// GetPlans — GET /api/workout-plans
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_GetPlans_RejectsAdmin(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAdminPlanCtx(http.MethodGet, "/api/workout-plans", "", "1")
	h.handler.GetPlans(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "trainer or athlete")
}

func TestWorkoutPlanHandler_GetPlans_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanCtx(http.MethodGet, "/api/workout-plans", "", "abc")
	h.handler.GetPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_GetPlans_TrainerSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.byCreator = []*models.WorkoutPlan{
		storedPlan(1, 1, "Push Day", "Chest"),
		storedPlan(1, 1, "Pull Day", "Back"),
	}

	ctx, w := newTrainerPlanCtx(http.MethodGet, "/api/workout-plans", "", "1")
	h.handler.GetPlans(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Plans []models.WorkoutPlan `json:"plans"`
		Count int                  `json:"count"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 1, h.plans.creatorSeen, "the listing must be scoped to the session user")
	assert.Equal(t, 2, body.Count)
	require.Len(t, body.Plans, 2)
	assert.Equal(t, "Push Day", body.Plans[0].Name)
	assert.Equal(t, "Pull Day", body.Plans[1].Name)
}

func TestWorkoutPlanHandler_GetPlans_AthleteEmptyList(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans", "", "9")
	h.handler.GetPlans(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"count":0`)
}

func TestWorkoutPlanHandler_GetPlans_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.listErr = errPlanBoom

	ctx, w := newTrainerPlanCtx(http.MethodGet, "/api/workout-plans", "", "1")
	h.handler.GetPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// GetPlan — GET /api/workout-plans/:id
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_GetPlan_RejectsNonNumericPlanID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/abc", "", "1", "id", "abc")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan ID")
}

func TestWorkoutPlanHandler_GetPlan_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "abc", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_GetPlan_TrainerOwnerSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.GetPlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var plan models.WorkoutPlan
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &plan))
	assert.Equal(t, 5, plan.PlanID)
	assert.Equal(t, "Push Day", plan.Name)
}

func TestWorkoutPlanHandler_GetPlan_AthleteAssignedSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newAthletePlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "9", "id", "5")
	h.handler.GetPlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"planId":5`)
}

func TestWorkoutPlanHandler_GetPlan_AthleteOwnPlanNeedsNoAssignment(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 9, "Self Made", "")

	ctx, w := newAthletePlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "9", "id", "5")
	h.handler.GetPlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"name":"Self Made"`)
}

// An athlete who was never assigned the plan gets 403, not 500. The fake answers
// ErrNotFound for the missing assignment row — as the repository does — so this
// covers the branch the service reaches by treating "not assigned yet" as a normal
// state rather than a storage fault.
func TestWorkoutPlanHandler_GetPlan_AthleteUnassignedIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	// byAthlete[9] is deliberately empty.

	ctx, w := newAthletePlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "9", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "hasn't been assigned")
}

func TestWorkoutPlanHandler_GetPlan_TrainerNonOwnerIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 3, "Their Plan", "")

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "only view workout plans you created")
}

func TestWorkoutPlanHandler_GetPlan_AdminRoleIsForbidden(t *testing.T) {
	// The handler refuses the role before the plan is loaded, so the gate is the
	// same one its siblings use rather than the service's default branch.
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newAdminPlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "trainer or athlete")
}

// The role gate must fire before any repository access, so an admin cannot probe
// whether a plan exists by reading the error.
func TestWorkoutPlanHandler_GetPlan_AdminRoleRejectedBeforeLookup(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.getErr = errPlanBoom

	ctx, w := newAdminPlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_GetPlan_MissingPlanIsNotFound(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/404", "", "1", "id", "404")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.NotContains(t, responseError(t, w), "ErrNotFound")
}

// A genuine storage fault while checking the assignment is not the same as "not
// assigned" and must not be reported as a permissions problem.
func TestWorkoutPlanHandler_GetPlan_AssignmentLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.pairErr = errPlanBoom

	ctx, w := newAthletePlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "9", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_GetPlan_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.getErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.GetPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "Failed to retrieve workout plan", responseError(t, w))
}

// ---------------------------------------------------------------------------
// UpdatePlan — PUT /api/workout-plans/:id
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_UpdatePlan_RejectsNonNumericPlanID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/xyz", planBody, "1", "id", "xyz")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan ID")
}

func TestWorkoutPlanHandler_UpdatePlan_RejectsAdmin(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAdminPlanPathCtx(http.MethodPut, "/api/workout-plans/5", planBody, "1", "id", "5")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "created the plan")
}

func TestWorkoutPlanHandler_UpdatePlan_RejectsMalformedJSON(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/5", `{"name":`, "1", "id", "5")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan data")
}

func TestWorkoutPlanHandler_UpdatePlan_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/5", planBody, "abc", "id", "5")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_UpdatePlan_OwnerSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/5", planBody, "1", "id", "5")
	h.handler.UpdatePlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var plan models.WorkoutPlan
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &plan))
	assert.Equal(t, "Push Day", plan.Name)
	assert.Equal(t, "Chest focus", plan.Description)

	require.NotNil(t, h.plans.updated)
	assert.Equal(t, 5, h.plans.updated.PlanID)
	assert.Equal(t, "Chest focus", h.plans.updated.Description)
}

func TestWorkoutPlanHandler_UpdatePlan_EmptyNameIsValidationError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	body := `{"name":"","exercises":[{"exerciseId":12,"name":"Bench Press","sets":[{"weight":60,"weightUnit":"kg","reps":8,"restTime":90}]}]}`
	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/5", body, "1", "id", "5")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "Please give your workout plan a name", responseError(t, w))
	assert.Nil(t, h.plans.updated, "a rejected update must not reach the repository")
}

func TestWorkoutPlanHandler_UpdatePlan_NonOwnerIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 3, "Their Plan", "")

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/5", planBody, "1", "id", "5")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "only edit workout plans you created")
	assert.Nil(t, h.plans.updated)
}

func TestWorkoutPlanHandler_UpdatePlan_MissingPlanIsNotFound(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/404", planBody, "1", "id", "404")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutPlanHandler_UpdatePlan_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.plans.updateErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodPut, "/api/workout-plans/5", planBody, "1", "id", "5")
	h.handler.UpdatePlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// DeletePlan — DELETE /api/workout-plans/:id
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_DeletePlan_RejectsNonNumericPlanID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/xyz", "", "1", "id", "xyz")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan ID")
}

func TestWorkoutPlanHandler_DeletePlan_RejectsAdmin(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAdminPlanPathCtx(http.MethodDelete, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "plans you created")
}

func TestWorkoutPlanHandler_DeletePlan_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/5", "", "abc", "id", "5")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_DeletePlan_Success(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.DeletePlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Message string `json:"message"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "Workout plan deleted successfully", body.Message,
		"delete answers with a message envelope, not the error envelope")
	assert.Equal(t, []int{5}, h.plans.deleted)
}

func TestWorkoutPlanHandler_DeletePlan_StillAssignedIsConflict(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byPlan[5] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Contains(t, responseError(t, w), "still assigned to 1 athlete")
	assert.Empty(t, h.plans.deleted, "a conflicting delete must not remove the plan")
}

func TestWorkoutPlanHandler_DeletePlan_ForceRemovesAssignmentsFirst(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byPlan[5] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/5?force=true", "", "1", "id", "5")
	h.handler.DeletePlan(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, []int{5}, h.assignments.deletedPlanIDs, "force=true cascades to the assignments")
	assert.Equal(t, []int{5}, h.plans.deleted)
}

func TestWorkoutPlanHandler_DeletePlan_NonOwnerIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 3, "Their Plan", "")

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "only delete workout plans you created")
	assert.Empty(t, h.plans.deleted)
}

func TestWorkoutPlanHandler_DeletePlan_MissingPlanIsNotFound(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/404", "", "1", "id", "404")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutPlanHandler_DeletePlan_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.plans.deleteErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodDelete, "/api/workout-plans/5", "", "1", "id", "5")
	h.handler.DeletePlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// AssignPlan — POST /api/workout-plans/:id/assign (trainer only)
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_AssignPlan_RejectsNonNumericPlanID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/xyz/assign", `{"athleteIds":["9"]}`, "1", "id", "xyz")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan ID")
}

func TestWorkoutPlanHandler_AssignPlan_RejectsAthlete(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "9", "id", "5")
	h.handler.AssignPlan(ctx)

	// The role gate fires before the body is even read.
	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "Only trainers can assign")
	assert.Empty(t, h.assignments.created)
}

func TestWorkoutPlanHandler_AssignPlan_RejectsMalformedJSON(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan data")
}

func TestWorkoutPlanHandler_AssignPlan_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "abc", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_AssignPlan_RejectsNonNumericAthleteID(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["bob"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid athlete ID")
	assert.Equal(t, 0, h.relationships.hasCalls, "a malformed athlete id is rejected before any lookup")
}

func TestWorkoutPlanHandler_AssignPlan_TrainerSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.relationships.active[[2]int{1, 9}] = true
	h.relationships.active[[2]int{1, 10}] = true

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9","10"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)

	var body struct {
		Assignments []models.WorkoutPlanAssignment `json:"assignments"`
		Count       int                            `json:"count"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 2, body.Count)
	require.Len(t, body.Assignments, 2)
	assert.Equal(t, "active", body.Assignments[0].Status)
	assert.Equal(t, 5, body.Assignments[0].PlanID)
	assert.Equal(t, 9, body.Assignments[0].AthleteID)
	assert.Equal(t, 1, body.Assignments[0].TrainerID)
	assert.Equal(t, 10, body.Assignments[1].AthleteID)

	assert.Equal(t, [][2]int{{1, 9}, {1, 10}}, h.relationships.hasSeen,
		"each athlete is relationship-checked individually")
	assert.Len(t, h.assignments.created, 2)
}

func TestWorkoutPlanHandler_AssignPlan_SkipsAthleteWithoutRelationship(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	// Only athlete 9 is coached by trainer 1.
	h.relationships.active[[2]int{1, 9}] = true

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9","42"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)
	assert.Contains(t, w.Body.String(), `"count":1`, "a non-client athlete is skipped, not an error")
	require.Len(t, h.assignments.created, 1)
	assert.Equal(t, 9, h.assignments.created[0].AthleteID)
}

func TestWorkoutPlanHandler_AssignPlan_IsIdempotent(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.relationships.active[[2]int{1, 9}] = true
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)
	assert.Contains(t, w.Body.String(), `"count":0`, "an existing assignment is not duplicated")
	assert.Empty(t, h.assignments.created)
}

// The first assignment to an athlete requires no existing assignment, so the
// repository's ErrNotFound must not abort the request.
func TestWorkoutPlanHandler_AssignPlan_FirstAssignmentSucceeds(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.relationships.active[[2]int{1, 9}] = true

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)
	require.Len(t, h.assignments.created, 1)
	assert.Equal(t, 9, h.assignments.created[0].AthleteID)
}

func TestWorkoutPlanHandler_AssignPlan_ExistingAssignmentLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.relationships.active[[2]int{1, 9}] = true
	h.assignments.pairErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
	assert.Empty(t, h.assignments.created)
}

func TestWorkoutPlanHandler_AssignPlan_NonOwnerIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 3, "Their Plan", "")

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "only assign workout plans you created")
}

func TestWorkoutPlanHandler_AssignPlan_MissingPlanIsNotFound(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/404/assign", `{"athleteIds":["9"]}`, "1", "id", "404")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutPlanHandler_AssignPlan_RelationshipLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.relationships.hasErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_AssignPlan_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.relationships.active[[2]int{1, 9}] = true
	h.assignments.createErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/assign", `{"athleteIds":["9"]}`, "1", "id", "5")
	h.handler.AssignPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// GetAssignments — GET /api/workout-plans/:id/assignments (trainer only)
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_GetAssignments_RejectsNonNumericPlanID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/xyz/assignments", "", "1", "id", "xyz")
	h.handler.GetAssignments(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan ID")
}

func TestWorkoutPlanHandler_GetAssignments_RejectsAthlete(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byPlan[5] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newAthletePlanPathCtx(http.MethodGet, "/api/workout-plans/5/assignments", "", "9", "id", "5")
	h.handler.GetAssignments(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "Only trainers can view plan assignments")
}

func TestWorkoutPlanHandler_GetAssignments_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5/assignments", "", "abc", "id", "5")
	h.handler.GetAssignments(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_GetAssignments_OwnerSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byPlan[5] = []*models.WorkoutPlanAssignment{
		models.NewWorkoutPlanAssignment(5, 9, 1),
		models.NewWorkoutPlanAssignment(5, 10, 1),
	}

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5/assignments", "", "1", "id", "5")
	h.handler.GetAssignments(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Assignments []models.WorkoutPlanAssignment `json:"assignments"`
		Count       int                            `json:"count"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 2, body.Count)
	require.Len(t, body.Assignments, 2)
	assert.Equal(t, 9, body.Assignments[0].AthleteID)
	assert.Equal(t, 10, body.Assignments[1].AthleteID)
}

func TestWorkoutPlanHandler_GetAssignments_NoAssignmentsIsZeroCount(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5/assignments", "", "1", "id", "5")
	h.handler.GetAssignments(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"count":0`)
}

func TestWorkoutPlanHandler_GetAssignments_NonOwnerIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 3, "Their Plan", "")

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5/assignments", "", "1", "id", "5")
	h.handler.GetAssignments(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "only view assignments for workout plans you created")
}

func TestWorkoutPlanHandler_GetAssignments_MissingPlanIsNotFound(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/404/assignments", "", "1", "id", "404")
	h.handler.GetAssignments(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutPlanHandler_GetAssignments_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.listErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/workout-plans/5/assignments", "", "1", "id", "5")
	h.handler.GetAssignments(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// GetMyPlans — GET /api/workout-plans/assigned (athlete only)
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_GetMyPlans_RejectsTrainer(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newTrainerPlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "1")
	h.handler.GetMyPlans(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "Only athletes")
}

func TestWorkoutPlanHandler_GetMyPlans_RejectsAdmin(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAdminPlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "1")
	h.handler.GetMyPlans(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestWorkoutPlanHandler_GetMyPlans_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "abc")
	h.handler.GetMyPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_GetMyPlans_Success(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.plans.plans[6] = storedPlan(6, 1, "Pull Day", "Back")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{
		models.NewWorkoutPlanAssignment(5, 9, 1),
		models.NewWorkoutPlanAssignment(6, 9, 1),
	}

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "9")
	h.handler.GetMyPlans(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Plans []models.WorkoutPlan `json:"plans"`
		Count int                  `json:"count"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 2, body.Count)
	require.Len(t, body.Plans, 2)
	assert.Equal(t, 5, body.Plans[0].PlanID)
	assert.Equal(t, 6, body.Plans[1].PlanID)
}

// Only a missing plan is skipped. Any other fault must surface, otherwise a database
// outage would be reported to the athlete as a successful but empty list.
func TestWorkoutPlanHandler_GetMyPlans_PlanLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{
		models.NewWorkoutPlanAssignment(5, 9, 1),
	}
	h.plans.getErr = errPlanBoom

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "9")
	h.handler.GetMyPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_GetMyPlans_SkipsDeletedPlan(t *testing.T) {
	// An assignment pointing at a plan that no longer resolves must not break
	// the whole list: the service skips it.
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{
		models.NewWorkoutPlanAssignment(5, 9, 1),
		models.NewWorkoutPlanAssignment(99, 9, 1),
	}

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "9")
	h.handler.GetMyPlans(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"count":1`)
}

func TestWorkoutPlanHandler_GetMyPlans_NoAssignmentsIsZeroCount(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "9")
	h.handler.GetMyPlans(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"count":0`)
}

func TestWorkoutPlanHandler_GetMyPlans_RepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.assignments.byAthleteErr = errPlanBoom

	ctx, w := newAthletePlanCtx(http.MethodGet, "/api/workout-plans/assigned", "", "9")
	h.handler.GetMyPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// StartWorkoutFromPlan — POST /api/workout-plans/:id/start (athlete only)
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_StartWorkoutFromPlan_RejectsNonNumericPlanID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/xyz/start", "", "9", "id", "xyz")
	h.handler.StartWorkoutFromPlan(ctx)

	// The id is validated before the role, so even an athlete sees 400 first.
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, responseError(t, w), "Invalid workout plan ID")
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_RejectsTrainer(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newTrainerPlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "1", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "Only athletes can start")
	assert.Nil(t, h.workouts.created)
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "abc", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_AssignedAthleteSuccess(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "9", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)

	var workout models.Workout
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &workout))
	assert.Equal(t, "workout", workout.Type)
	assert.Equal(t, 9, workout.AthleteID)
	assert.Equal(t, 5, workout.PlanID, "the logged workout links back to its plan")
	require.Len(t, workout.Exercises, 1)
	assert.Equal(t, "Bench Press", workout.Exercises[0].Name)
	require.Len(t, workout.Exercises[0].Sets, 1)
	assert.Equal(t, 60.0, workout.Exercises[0].Sets[0].Weight)
	assert.Equal(t, 8, workout.Exercises[0].Sets[0].Reps)
	assert.False(t, workout.Exercises[0].Sets[0].Completed,
		"sets copied from a plan template start uncompleted")

	require.NotNil(t, h.workouts.created)
	assert.Equal(t, 5, h.workouts.created.PlanID)
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_PlanCreatorNeedsNoAssignment(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 9, "Self Made", "")

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "9", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	require.Equal(t, http.StatusCreated, w.Code)
	assert.Contains(t, w.Body.String(), `"athleteId":9`)
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_UnassignedAthleteIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "9", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "hasn't been assigned to you yet")
	assert.Nil(t, h.workouts.created)
}

// A fault while checking the assignment is not "not assigned", and must not be
// reported as a permissions problem.
func TestWorkoutPlanHandler_StartWorkoutFromPlan_AssignmentLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.pairErr = errPlanBoom

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "9", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
	assert.Nil(t, h.workouts.created)
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_MissingPlanIsNotFound(t *testing.T) {
	h := newPlanHarness(t)

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/404/start", "", "9", "id", "404")
	h.handler.StartWorkoutFromPlan(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestWorkoutPlanHandler_StartWorkoutFromPlan_WorkoutRepositoryFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.plans.plans[5] = storedPlan(5, 9, "Self Made", "")
	h.workouts.createErr = errPlanBoom

	ctx, w := newAthletePlanPathCtx(http.MethodPost, "/api/workout-plans/5/start", "", "9", "id", "5")
	h.handler.StartWorkoutFromPlan(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

// ---------------------------------------------------------------------------
// GetClientPlans — GET /api/clients/:username/workout-plans (trainer only)
// ---------------------------------------------------------------------------

func TestWorkoutPlanHandler_GetClientPlans_RejectsAthlete(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}

	ctx, w := newAthletePlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "9", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "Only trainers")
	assert.Empty(t, h.users.lookupSeenAs, "the client lookup must not run for a rejected role")
}

func TestWorkoutPlanHandler_GetClientPlans_RejectsAdmin(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}

	ctx, w := newAdminPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "1", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestWorkoutPlanHandler_GetClientPlans_UnknownClientIsNotFound(t *testing.T) {
	h := newPlanHarness(t)
	// The fake answers ErrNotFound for an unknown username, as the repository does,
	// so this reaches the handler's 404 branch rather than the generic 500 path.
	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/nobody/workout-plans", "", "1", "username", "nobody")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, responseError(t, w), "Client not found")
}

func TestWorkoutPlanHandler_GetClientPlans_ClientLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.users.lookupErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "1", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_GetClientPlans_RejectsNonNumericSessionID(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "abc", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestWorkoutPlanHandler_GetClientPlans_Success(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}
	h.relationships.active[[2]int{1, 9}] = true
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "1", "username", "bob")
	h.handler.GetClientPlans(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Plans []models.WorkoutPlan `json:"plans"`
		Count int                  `json:"count"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 1, body.Count)
	require.Len(t, body.Plans, 1)
	assert.Equal(t, 5, body.Plans[0].PlanID)
	assert.Equal(t, "Push Day", body.Plans[0].Name)

	assert.Equal(t, []string{"bob"}, h.users.lookupSeenAs, "the path param drives the client lookup")
	assert.Equal(t, [][2]int{{1, 9}}, h.relationships.hasSeen,
		"the relationship is checked between the session trainer and the resolved athlete id")
}

func TestWorkoutPlanHandler_GetClientPlans_PlanLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}
	h.relationships.active[[2]int{1, 9}] = true
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{
		models.NewWorkoutPlanAssignment(5, 9, 1),
	}
	h.plans.getErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "1", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestWorkoutPlanHandler_GetClientPlans_WithoutRelationshipIsForbidden(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}
	h.plans.plans[5] = storedPlan(5, 1, "Push Day", "Chest")
	h.assignments.byAthlete[9] = []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)}

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "1", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, responseError(t, w), "active coaching relationship")
}

func TestWorkoutPlanHandler_GetClientPlans_RelationshipLookupFailureIsInternalError(t *testing.T) {
	h := newPlanHarness(t)
	h.users.byUsername["bob"] = &models.User{UserID: 9, Username: "bob", Role: models.RoleAthlete}
	h.relationships.hasErr = errPlanBoom

	ctx, w := newTrainerPlanPathCtx(http.MethodGet, "/api/clients/bob/workout-plans", "", "1", "username", "bob")
	h.handler.GetClientPlans(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}
