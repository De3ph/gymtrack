package routes

import (
	"github.com/gin-gonic/gin"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
)

func RegisterExerciseRoutes(router *gin.Engine, exerciseHandler *handlers.ExerciseHandler) {
	// Public routes (no authentication required)
	publicRoutes := router.Group("/api")
	{
		publicRoutes.GET("/muscle-groups", exerciseHandler.GetAllMuscleGroups)
		publicRoutes.GET("/equipment", exerciseHandler.GetAllEquipment)
		publicRoutes.GET("/exercises", exerciseHandler.GetAllExercises)
		publicRoutes.GET("/exercises/:id", exerciseHandler.GetExerciseByID)
		publicRoutes.GET("/exercises/muscle-group/:id", exerciseHandler.GetExercisesByMuscleGroup)
		publicRoutes.GET("/exercises/equipment/:id", exerciseHandler.GetExercisesByEquipment)
		publicRoutes.GET("/exercises/search", exerciseHandler.SearchExercises)
	}

	// Authenticated routes (require JWT)
	authRoutes := router.Group("/api")
	authRoutes.Use(middleware.JWTAuthMiddleware())
	{
		authRoutes.POST("/exercises", exerciseHandler.CreateExercise)
	}
}
