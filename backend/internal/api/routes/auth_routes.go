package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

// AuthRoutes registers the auth endpoints behind a per-IP rate limiter. The
// limiter is passed in (rather than created here) so the caller owns its
// lifetime and can stop the cleanup goroutine on shutdown.
func AuthRoutes(router *gin.RouterGroup, authHandler *handlers.AuthHandler, pwResetHandler *handlers.PasswordResetHandler, limiter *middleware.RateLimiter) {
	auth := router.Group("/auth")
	auth.Use(limiter.Middleware()) // per-IP rate limit
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
