package handlers

import (
	"errors"
	"net/http"
	"strings"

	"go.uber.org/zap"

	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

func handleServiceError(c *gin.Context, err error) bool {
	svcErr, ok := err.(*services.ServiceError)
	if !ok {
		return false
	}
	switch svcErr.Code {
	case "FORBIDDEN", "ACCOUNT_DELETED", "ADMIN_DELETE_FORBIDDEN", "ACCOUNT_INACTIVE",
		"ACCOUNT_NOT_DELETED", "RESTORE_EXPIRED":
		c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
	case "INVALID_CREDENTIALS", "INVALID_TOKEN", "TOKEN_EXPIRED", "INVALID_TOKEN_TYPE":
		c.JSON(http.StatusUnauthorized, gin.H{"error": svcErr.Message})
	case "VALIDATION", "INVALID_DATE", "INVALID_PASSWORD",
		"SELF_ROLE_CHANGE", "LAST_ADMIN", "INVALID_RESET_TOKEN",
		"USER_EXISTS", "USERNAME_EXISTS":
		if svcErr.Code == "USER_EXISTS" || svcErr.Code == "USERNAME_EXISTS" {
			c.JSON(http.StatusConflict, gin.H{"error": svcErr.Message})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
		}
	case "WORKOUT_NOT_FOUND", "MEAL_NOT_FOUND", "WORKOUT_PLAN_NOT_FOUND",
		"BODY_MEASUREMENT_NOT_FOUND", "USER_NOT_FOUND",
		"COMMENT_NOT_FOUND", "EXERCISE_NOT_FOUND":
		c.JSON(http.StatusNotFound, gin.H{"error": svcErr.Message})
	case "HAS_ASSIGNMENTS", "PLAN_LIMIT_REACHED":
		c.JSON(http.StatusConflict, gin.H{"error": svcErr.Message})
	default:
		return false
	}
	return true
}

func handleCommentServiceError(c *gin.Context, err error) bool {
	switch {
	case errors.Is(err, services.ErrTargetNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrNotAuthor):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrAccessDenied):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		return false
	}
	return true
}

func handleBusinessError(c *gin.Context, err error) {
	msg := err.Error()
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "not found"):
		c.JSON(http.StatusNotFound, gin.H{"error": msg})
	case strings.Contains(lower, "only ") && (strings.Contains(lower, "own") || strings.Contains(lower, "athlete") || strings.Contains(lower, "trainer") || strings.Contains(lower, "author")),
		strings.Contains(lower, "permission"),
		strings.Contains(lower, "not for you"),
		strings.Contains(lower, "active coaching relationship"),
		strings.Contains(lower, "already have an active trainer"):
		if strings.Contains(lower, "already have") || strings.Contains(lower, "already been") || strings.Contains(lower, "already reviewed") || strings.Contains(lower, "already have a pending") {
			c.JSON(http.StatusConflict, gin.H{"error": msg})
		} else {
			c.JSON(http.StatusForbidden, gin.H{"error": msg})
		}
	case strings.Contains(lower, "already"):
		c.JSON(http.StatusConflict, gin.H{"error": msg})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
	}
}

func handleInternalError(c *gin.Context, err error, msg string) {
	zap.L().Error(msg,
		zap.String("path", c.Request.URL.Path),
		zap.String("method", c.Request.Method),
		zap.Error(err),
	)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong while processing your request. Please try again later"})
}
