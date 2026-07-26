package routes

import (
	"gymtrack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func UserRoutes(router *gin.RouterGroup, userHandler *handlers.UserHandler, authMw gin.HandlerFunc) {
	user := router.Group("/users")
	user.Use(authMw)
	{
		user.GET("/me", userHandler.GetCurrentUser)
		user.PUT("/me", userHandler.UpdateCurrentUser)
	}
}
