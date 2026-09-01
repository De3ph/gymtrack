package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(router *gin.RouterGroup, authHandler *handlers.AuthHandler, pwResetHandler *handlers.PasswordResetHandler) {
	auth := router.Group("/auth")
	auth.Use(middleware.AuthLimiter().Middleware()) // per-IP rate limit
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
		auth.POST("/restore", authHandler.RestoreAccount)
		auth.POST("/password-reset/request", pwResetHandler.RequestPasswordReset)
		auth.POST("/password-reset/confirm", pwResetHandler.ConfirmPasswordReset)
	}
}
