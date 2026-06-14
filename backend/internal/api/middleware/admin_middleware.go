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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user role not found in context"})
			c.Abort()
			return
		}

		role, ok := userRole.(models.UserRole)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user role format"})
			c.Abort()
			return
		}

		if role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
