package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterWorkoutPlanRoutes(router *gin.RouterGroup, handler *handlers.WorkoutPlanHandler) {
	plans := router.Group("/workout-plans")
	plans.Use(middleware.JWTAuthMiddleware())
	{
		// Static routes must be registered before /:id
		plans.GET("/assigned", handler.GetMyPlans) // athlete only

		// CRUD
		plans.POST("", handler.CreatePlan)       // trainer only
		plans.GET("", handler.GetPlans)          // trainer only
		plans.GET("/:id", handler.GetPlan)       // trainer (own) or athlete (assigned)
		plans.PUT("/:id", handler.UpdatePlan)    // trainer only
		plans.DELETE("/:id", handler.DeletePlan) // trainer only

		// Assignment
		plans.POST("/:id/assign", handler.AssignPlan)      // trainer only
		plans.GET("/:id/assignments", handler.GetAssignments) // trainer only
		plans.POST("/:id/start", handler.StartWorkoutFromPlan) // athlete only
	}

	// Trainer views client's plans
	clients := router.Group("/clients")
	clients.Use(middleware.JWTAuthMiddleware())
	{
		clients.GET("/:username/workout-plans", handler.GetClientPlans) // trainer only
	}
}
