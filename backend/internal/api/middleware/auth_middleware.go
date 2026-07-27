package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

func JWTAuthMiddleware(cfg *config.Config, authService *services.AuthService, userRepo repositories.UserRepository) gin.HandlerFunc {
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

		// Check user account status (suspended/banned users blocked)
		if userRepo != nil {
			userID, err := strconv.Atoi(claims.UserID)
			if err == nil {
				user, err := userRepo.GetUserByID(c.Request.Context(), userID)
				isNonActiveUser := err == nil && user != nil && user.Status != "" && user.Status != models.UserStatusActive
				if isNonActiveUser {
					c.JSON(http.StatusForbidden, gin.H{
						"error":  "account is " + string(user.Status),
						"status": string(user.Status),
					})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	}
}
