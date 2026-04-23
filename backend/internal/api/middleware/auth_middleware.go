package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/services"
)

var (
	appConfig   *config.Config
	authService *services.AuthService
)

func InitAuthMiddleware(cfg *config.Config, service *services.AuthService) {
	appConfig = cfg
	authService = service
}

func JWTAuthMiddleware() gin.HandlerFunc {
	if appConfig == nil {
		panic("Auth middleware not initialized. Call InitAuthMiddleware first.")
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token using auth service
		claims, err := authService.ValidateToken(c.Request.Context(), tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": err.Error()})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}
