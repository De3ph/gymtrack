package routes

import (
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/api/handlers"
)

// The route table is a contract: a typo in a method or a path silently 404s for
// every client. These tests assert the registered method+path pairs exactly, so
// a missing or renamed endpoint fails here rather than in production.

// newPlanRoutesRouter builds a router with the workout-plan routes registered
// behind a pass-through auth middleware. The handler is never invoked because the
// assertions inspect the routing table only.
func newPlanRoutesRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	api := router.Group("/api")
	authMw := func(c *gin.Context) { c.Next() }

	RegisterWorkoutPlanRoutes(api, &handlers.WorkoutPlanHandler{}, authMw)
	return router
}

// registeredRoutes returns the method+path pairs as sorted "METHOD PATH" strings.
func registeredRoutes(router *gin.Engine) []string {
	routes := router.Routes()
	out := make([]string, 0, len(routes))
	for _, route := range routes {
		out = append(out, route.Method+" "+route.Path)
	}
	sort.Strings(out)
	return out
}

func TestRegisterWorkoutPlanRoutes_RegistersEveryEndpoint(t *testing.T) {
	router := newPlanRoutesRouter()

	expected := []string{
		"DELETE /api/workout-plans/:id",
		"GET /api/clients/:username/workout-plans",
		"GET /api/workout-plans",
		"GET /api/workout-plans/:id",
		"GET /api/workout-plans/:id/assignments",
		"GET /api/workout-plans/assigned",
		"POST /api/workout-plans",
		"POST /api/workout-plans/:id/assign",
		"POST /api/workout-plans/:id/start",
		"PUT /api/workout-plans/:id",
	}

	assert.Equal(t, expected, registeredRoutes(router),
		"the workout-plan route table must match the documented API surface exactly")
}

// TestRegisterWorkoutPlanRoutes_AssignedResolvesToTheStaticRoute pins that a GET to
// /workout-plans/assigned reaches the static route rather than being absorbed by the
// /:id wildcard. The auth middleware snapshots c.Param("id"), which is the only
// externally observable difference between the two candidate matches.
//
// Note: this asserts behaviour, not registration order. Verified by mutating
// workout_plan_routes.go to register /assigned AFTER /:id — gin still routes it to the
// static handler, because its tree prefers a static segment over a wildcard at the
// same level. So the "must be registered before /:id" comment in the production file
// is not load-bearing; this test would not catch its removal. What it does catch is a
// change that removes /assigned entirely or binds it to the wildcard.
func TestRegisterWorkoutPlanRoutes_AssignedResolvesToTheStaticRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var gotID string
	var gotCount int

	router := gin.New()
	api := router.Group("/api")

	authMw := func(c *gin.Context) {
		gotCount++
		gotID = c.Param("id")
		c.AbortWithStatus(http.StatusUnauthorized)
	}
	RegisterWorkoutPlanRoutes(api, &handlers.WorkoutPlanHandler{}, authMw)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/workout-plans/assigned", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Equal(t, 1, gotCount, "the request must match exactly one route")
	assert.Empty(t, gotID,
		"the static /assigned route must win; a non-empty :id means the wildcard absorbed it")
}

// TestRegisterWorkoutPlanRoutes_AllRoutesShareTheAuthMiddleware proves the guard
// is group-scoped: the middleware aborts every request, so a handler that ran
// anyway would be impossible and no handler needs a live service.
func TestRegisterWorkoutPlanRoutes_AllRoutesShareTheAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	api := router.Group("/api")

	authMw := func(c *gin.Context) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
	}
	RegisterWorkoutPlanRoutes(api, &handlers.WorkoutPlanHandler{}, authMw)

	protected := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/workout-plans"},
		{http.MethodGet, "/api/workout-plans"},
		{http.MethodGet, "/api/workout-plans/assigned"},
		{http.MethodGet, "/api/workout-plans/1"},
		{http.MethodPut, "/api/workout-plans/1"},
		{http.MethodDelete, "/api/workout-plans/1"},
		{http.MethodPost, "/api/workout-plans/1/assign"},
		{http.MethodGet, "/api/workout-plans/1/assignments"},
		{http.MethodPost, "/api/workout-plans/1/start"},
		{http.MethodGet, "/api/clients/bob/workout-plans"},
	}

	for _, tc := range protected {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest(tc.method, tc.path, nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusUnauthorized, w.Code,
				"route must be unreachable without a session")
		})
	}
}
