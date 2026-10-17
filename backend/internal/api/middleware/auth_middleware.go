package middleware

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
)

func JWTAuthMiddleware(cfg *config.Config, authService *services.AuthService, userRepo repositories.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required. Please log in and include your Bearer token"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header. Expected format: Bearer <token>"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		claims, err := authService.ValidateToken(c.Request.Context(), tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session token is invalid or expired. Please log in again"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userRole", claims.Role)

		if userRepo == nil {
			c.Next()
			return
		}

		// The JWT is only an authenticator — role, status, and token version
		// (revocation) are re-checked against the database on every request
		// (security audit finding 3). Without this, a demoted admin could
		// keep using an access token carrying the stale admin role, and a
		// password change would not revoke outstanding tokens.
		userID, err := strconv.Atoi(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session token is invalid or expired. Please log in again"})
			c.Abort()
			return
		}

		user, err := userRepo.GetUserByID(c.Request.Context(), userID)
		if err != nil {
			if errors.Is(err, domainerrors.ErrNotFound) {
				// The account no longer exists; its tokens are dead.
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session token is invalid or expired. Please log in again"})
				c.Abort()
				return
			}
			// Transient lookup failure: fall back to the claims rather than
			// failing every request on a DB hiccup; status/revocation checks
			// resume as soon as reads succeed.
			c.Next()
			return
		}

		// Revoked token: issued before the user's token version was bumped
		// (password change/reset or role change).
		if user.TokenVersion != claims.TokenVersion {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session has been revoked. Please log in again"})
			c.Abort()
			return
		}

		// Suspended/banned/deleted accounts are blocked.
		if user.Status != "" && user.Status != models.UserStatusActive {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Your account is " + string(user.Status) + " and can't access the app right now. Please contact support",
				"status": string(user.Status),
			})
			c.Abort()
			return
		}

		// DB-authoritative role: a role change takes effect on the very next
		// request instead of when the access token expires.
		c.Set("userRole", user.Role)

		c.Next()
	}
}
