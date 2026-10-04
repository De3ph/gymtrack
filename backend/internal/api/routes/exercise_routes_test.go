package routes

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

// The exercise route table is a contract: a typo in a method or path silently 404s
// for every client, and the public/authenticated split decides whether a request is
// rejected before it reaches a handler. These tests assert both.

// stubExerciseService satisfies services.ExerciseService with empty results so the
// public read routes can be exercised without reaching a database. Only the methods
// the registered routes call are needed to return data; the rest panic loudly so an
// unexpected new route is noticed rather than silently answered.
type stubExerciseService struct {
	services.ExerciseService
}

func (stubExerciseService) GetAllMuscleGroups(context.Context) ([]models.MuscleGroupDefinition, error) {
	return []models.MuscleGroupDefinition{}, nil
}

func (stubExerciseService) GetAllEquipment(context.Context) ([]models.EquipmentDefinition, error) {
	return []models.EquipmentDefinition{}, nil
}

func (stubExerciseService) GetAllExercises(context.Context) ([]models.Exercise, error) {
	return []models.Exercise{}, nil
}

func (stubExerciseService) GetExerciseByID(context.Context, int) (*models.Exercise, error) {
	return nil, nil
}

func (stubExerciseService) GetExercisesByMuscleGroup(context.Context, int) ([]models.Exercise, error) {
	return []models.Exercise{}, nil
}

func (stubExerciseService) GetExercisesByEquipment(context.Context, int) ([]models.Exercise, error) {
	return []models.Exercise{}, nil
}

func (stubExerciseService) SearchExercises(context.Context, string, *int, *int) ([]models.Exercise, error) {
	return []models.Exercise{}, nil
}

func newExerciseRoutesRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	authMw := func(c *gin.Context) { c.Next() }

	handler := handlers.NewExerciseHandler(stubExerciseService{})
	RegisterExerciseRoutes(router, handler, authMw)
	return router
}

func TestRegisterExerciseRoutes_RegistersEveryEndpoint(t *testing.T) {
	router := newExerciseRoutesRouter()

	routes := router.Routes()
	out := make([]string, 0, len(routes))
	for _, route := range routes {
		out = append(out, route.Method+" "+route.Path)
	}
	sort.Strings(out)

	expected := []string{
		"GET /api/equipment",
		"GET /api/exercises",
		"GET /api/exercises/:id",
		"GET /api/exercises/equipment/:id",
		"GET /api/exercises/muscle-group/:id",
		"GET /api/exercises/search",
		"GET /api/muscle-groups",
		"POST /api/exercises",
	}

	assert.Equal(t, expected, out,
		"the exercise route table must match the documented API surface exactly")
}

// TestRegisterExerciseRoutes_OnlyCreateRequiresAuth pins the public/authenticated
// split. Read routes are browsable without a session by design, so moving POST
// /exercises into the public group would silently expose custom-exercise creation.
func TestRegisterExerciseRoutes_OnlyCreateRequiresAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	authMw := func(c *gin.Context) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
	}
	RegisterExerciseRoutes(router, handlers.NewExerciseHandler(stubExerciseService{}), authMw)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/muscle-groups"},
		{http.MethodGet, "/api/equipment"},
		{http.MethodGet, "/api/exercises"},
		{http.MethodGet, "/api/exercises/1"},
		{http.MethodGet, "/api/exercises/muscle-group/1"},
		{http.MethodGet, "/api/exercises/equipment/1"},
		{http.MethodGet, "/api/exercises/search?query=press"},
	}

	for _, tc := range tests {
		t.Run("public "+tc.method+" "+tc.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest(tc.method, tc.path, nil)
			router.ServeHTTP(w, req)

			// Any status other than 401 proves the request got past the auth middleware
			// and into the handler. The exact code is not the point: the stub returns
			// empty results, so GET /exercises/:id legitimately answers 404 for a
			// nil exercise.
			assert.NotEqual(t, http.StatusUnauthorized, w.Code,
				"read routes must be reachable without a session")
		})
	}

	t.Run("protected POST /api/exercises", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/exercises", nil)
		router.ServeHTTP(w, req)

		require.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
