package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gymtrack-backend/internal/domain/models"
)

// AdminOnlyMiddleware restricts access to users with the admin role.
// Must be used after JWTAuthMiddleware so that userRole is set in context.
func AdminOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session is missing role information. Please log in again"})
			c.Abort()
			return
		}

		role, ok := userRole.(models.UserRole)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session role is invalid. Please log in again"})
			c.Abort()
			return
		}

		if role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access is required. You don't have permission to perform this action"})
			c.Abort()
			return
		}

		c.Next()
	}
}
