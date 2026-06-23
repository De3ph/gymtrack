package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func AdminRoutes(router *gin.RouterGroup, adminHandler *handlers.AdminHandler) {
	admin := router.Group("/admin")
	admin.Use(middleware.JWTAuthMiddleware())
	admin.Use(middleware.AdminOnlyMiddleware())
	{
		admin.GET("/stats", adminHandler.GetDashboardStats)
		admin.GET("/users", adminHandler.ListAllUsers)
		admin.GET("/users/:id", adminHandler.GetUserDetail)
		admin.PUT("/profile/password", adminHandler.ChangePassword)
	}
}
