package handlers

import (
	"errors"
	"net/http"

	"go.uber.org/zap"

	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

// handleServiceError checks if err is a ServiceError and writes the appropriate HTTP response.
// Returns true if the error was handled, false otherwise (caller should write 500).
func handleServiceError(c *gin.Context, err error) bool {
	svcErr, ok := err.(*services.ServiceError)
	if !ok {
		return false
	}
	switch svcErr.Code {
	case "FORBIDDEN":
		c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
	case "VALIDATION", "INVALID_DATE", "INVALID_PASSWORD",
		"SELF_ROLE_CHANGE", "LAST_ADMIN":
		c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
	case "WORKOUT_NOT_FOUND", "MEAL_NOT_FOUND", "WORKOUT_PLAN_NOT_FOUND",
		"BODY_MEASUREMENT_NOT_FOUND", "USER_NOT_FOUND",
		"COMMENT_NOT_FOUND", "EXERCISE_NOT_FOUND":
		c.JSON(http.StatusNotFound, gin.H{"error": svcErr.Message})
	case "HAS_ASSIGNMENTS":
		c.JSON(http.StatusConflict, gin.H{"error": svcErr.Message})
	default:
		return false
	}
	return true
}

// handleCommentServiceError checks if err is a comment-related sentinel error
// and writes the appropriate HTTP response.
// Returns true if the error was handled, false otherwise.
func handleCommentServiceError(c *gin.Context, err error) bool {
	switch {
	case errors.Is(err, services.ErrTargetNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Target not found"})
	case errors.Is(err, services.ErrNotAuthor):
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the comment author can perform this action"})
	case errors.Is(err, services.ErrAccessDenied):
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
	default:
		return false
	}
	return true
}

// handleInternalError logs the real error server-side and returns a generic 500 response.
// Use this instead of c.JSON(500, gin.H{"error": err.Error()}) to prevent
// internal error details from leaking to clients.
func handleInternalError(c *gin.Context, err error, msg string) {
	zap.L().Error(msg,
		zap.String("path", c.Request.URL.Path),
		zap.String("method", c.Request.Method),
		zap.Error(err),
	)
	c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
}

