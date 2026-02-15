package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func WorkoutRoutes(router *gin.RouterGroup, workoutHandler *handlers.WorkoutHandler) {
	workouts := router.Group("/workouts")
	workouts.Use(middleware.JWTAuthMiddleware())
	{
		workouts.POST("", workoutHandler.CreateWorkout)
		workouts.GET("", workoutHandler.GetWorkouts)
		workouts.GET("/:id", workoutHandler.GetWorkout)
		workouts.PUT("/:id", workoutHandler.UpdateWorkout)
		workouts.DELETE("/:id", workoutHandler.DeleteWorkout)
	}

	// Trainer client view routes
	clients := router.Group("/clients")
	clients.Use(middleware.JWTAuthMiddleware())
	{
		clients.GET("/:id/workouts", workoutHandler.GetClientWorkouts)
	}
}
