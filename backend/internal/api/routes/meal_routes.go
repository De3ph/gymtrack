package routes

import (
	"gymtrack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func MealRoutes(router *gin.RouterGroup, mealHandler *handlers.MealHandler, authMw gin.HandlerFunc) {
	meals := router.Group("/meals")
	meals.Use(authMw)
	{
		meals.POST("", mealHandler.CreateMeal)
		meals.GET("", mealHandler.GetMeals)
		meals.GET("/:id", mealHandler.GetMeal)
		meals.PUT("/:id", mealHandler.UpdateMeal)
		meals.DELETE("/:id", mealHandler.DeleteMeal)
	}

	// Trainer client view routes
	clients := router.Group("/clients")
	clients.Use(authMw)
	{
		clients.GET("/:username/meals", mealHandler.GetClientMeals)
	}
}
