package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func MealRoutes(router *gin.RouterGroup, mealHandler *handlers.MealHandler) {
	meals := router.Group("/meals")
	meals.Use(middleware.JWTAuthMiddleware())
	{
		meals.POST("", mealHandler.CreateMeal)
		meals.GET("", mealHandler.GetMeals)
		meals.GET("/:id", mealHandler.GetMeal)
		meals.PUT("/:id", mealHandler.UpdateMeal)
		meals.DELETE("/:id", mealHandler.DeleteMeal)
	}

	// Trainer client view routes
	clients := router.Group("/clients")
	clients.Use(middleware.JWTAuthMiddleware())
	{
		clients.GET("/:id/meals", mealHandler.GetClientMeals)
	}
}
