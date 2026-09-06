package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"gymtrack-backend/internal/domain/services"
)

type PasswordResetHandler struct {
	svc       *services.PasswordResetService
	validator *validator.Validate
}

func NewPasswordResetHandler(svc *services.PasswordResetService) *PasswordResetHandler {
	return &PasswordResetHandler{
		svc:       svc,
		validator: validator.New(),
	}
}

type RequestPasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// RequestPasswordReset godoc
// @Summary Request password reset
// @Description Send a password reset link to the given email address. Always returns 200 to prevent email enumeration.
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body handlers.RequestPasswordResetRequest true "Request Password Reset"
// @Success 200 {object} map[string]string "Reset link sent if account exists"
// @Failure 400 {object} map[string]any "Bad Request - Invalid input"
// @Failure 500 {object} map[string]any "Internal Server Error"
// @Router /auth/password-reset/request [post]
func (h *PasswordResetHandler) RequestPasswordReset(c *gin.Context) {
	var req RequestPasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please check the email address and try again"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please check the email address and try again"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.svc.RequestPasswordReset(ctx, req.Email); err != nil {
		handleInternalError(c, err, "failed to process password reset request")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "If an account with that email exists, a password reset link has been sent"})
}

type ConfirmPasswordResetRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"newPassword" validate:"required,min=8"`
}

// ConfirmPasswordReset godoc
// @Summary Confirm password reset
// @Description Reset password using a valid reset token.
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body handlers.ConfirmPasswordResetRequest true "Confirm Password Reset"
// @Success 200 {object} map[string]string "Password reset successfully"
// @Failure 400 {object} map[string]any "Bad Request - Invalid input or invalid/expired token"
// @Failure 500 {object} map[string]any "Internal Server Error"
// @Router /auth/password-reset/confirm [post]
func (h *PasswordResetHandler) ConfirmPasswordReset(c *gin.Context) {
	var req ConfirmPasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please check the email address and try again"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please check the email address and try again"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.svc.ConfirmPasswordReset(ctx, req.Token, req.NewPassword); err != nil {
		if handleServiceError(c, err) {
			return
		}
		handleInternalError(c, err, "failed to reset password")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password has been reset successfully"})
}
