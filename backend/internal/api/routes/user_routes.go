package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func UserRoutes(router *gin.RouterGroup, userHandler *handlers.UserHandler) {
	user := router.Group("/users")
	user.Use(middleware.JWTAuthMiddleware())
	{
		user.GET("/me", userHandler.GetCurrentUser)
		user.PUT("/me", userHandler.UpdateCurrentUser)
	}
}
