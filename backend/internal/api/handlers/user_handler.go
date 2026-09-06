package handlers

import (
	"net/http"
	"strconv"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type UserHandler struct {
	userService *services.UserService
	validator   *validator.Validate
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
		validator:   validator.New(),
	}
}

type UserResponse struct {
	UserID    int                `json:"userId"`
	Username  string             `json:"username"`
	Email     string             `json:"email"`
	Role      models.UserRole    `json:"role"`
	Profile   models.UserProfile `json:"profile"`
	CreatedAt string             `json:"createdAt"`
	UpdatedAt string             `json:"updatedAt"`
}

// @Summary Get current user profile
// @Description Retrieve profile information for the authenticated user
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} handlers.UserResponse "User profile retrieved successfully"
// @Failure 401 {object} map[string]any "Unauthorized - user not authenticated"
// @Failure 404 {object} map[string]any "User not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /users/me [get]
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session is invalid or expired. Please log in again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), userIDInt)
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user"})
		return
	}

	response := UserResponse{
		UserID:    user.UserID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		Profile:   user.Profile,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, response)
}

type UpdateProfileRequest struct {
	Profile models.UserProfile `json:"profile" binding:"required"`
}

// @Summary Update current user profile
// @Description Update profile information for the authenticated user
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param profile body handlers.UpdateProfileRequest true "Profile update data"
// @Success 200 {object} handlers.UserResponse "User profile updated successfully"
// @Failure 400 {object} map[string]any "Invalid request body"
// @Failure 401 {object} map[string]any "Unauthorized - user not authenticated"
// @Failure 404 {object} map[string]any "User not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /users/me [put]
func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session is invalid or expired. Please log in again"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile data. Please check the submitted fields and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	user, err := h.userService.UpdateUserProfile(c.Request.Context(), userIDInt, req.Profile)
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	response := UserResponse{
		UserID:    user.UserID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		Profile:   user.Profile,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, response)
}

type DeleteAccountRequest struct {
	Password string `json:"password" validate:"required" example:"password123"`
}

// DeleteCurrentUser godoc
// @Summary Delete current user account
// @Description Soft-delete the authenticated user's account. Admin accounts cannot be deleted. Requires password confirmation.
// @Tags Users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body handlers.DeleteAccountRequest true "Delete account request"
// @Success 200 {object} map[string]string "Account deleted successfully"
// @Failure 400 {object} map[string]any "Invalid request"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Admin accounts cannot be deleted / Account already deleted"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /users/me [delete]
func (h *UserHandler) DeleteCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session is invalid or expired. Please log in again"})
		return
	}

	var req DeleteAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please check the submitted data and try again"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please check the submitted data and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	if err := h.userService.DeleteAccount(c.Request.Context(), userIDInt, req.Password); err != nil {
		if handleServiceError(c, err) {
			return
		}
		handleInternalError(c, err, "failed to delete account")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}
