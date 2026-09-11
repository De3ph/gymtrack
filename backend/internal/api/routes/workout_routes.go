package routes

import (
	"gymtrack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func WorkoutRoutes(router *gin.RouterGroup, workoutHandler *handlers.WorkoutHandler, authMw gin.HandlerFunc) {
	workouts := router.Group("/workouts")
	workouts.Use(authMw)
	{
		workouts.POST("", workoutHandler.CreateWorkout)
		workouts.GET("", workoutHandler.GetWorkouts)
		workouts.GET("/:id", workoutHandler.GetWorkout)
	}

	// Trainer client view routes
	clients := router.Group("/clients")
	clients.Use(authMw)
	{
		clients.GET("/:username/workouts", workoutHandler.GetClientWorkouts)
	}
}
