package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type UserHandler struct {
	userRepo  repositories.UserRepository
	validator *validator.Validate
}

func NewUserHandler(userRepo repositories.UserRepository) *UserHandler {
	return &UserHandler{
		userRepo:  userRepo,
		validator: validator.New(),
	}
}

// UserResponse represents the user data returned in API responses.
// @Description UserResponse contains all user information except the password hash.
// @Schema UserResponse
type UserResponse struct {
	// UserID is the unique identifier for the user.
	// @Description The unique UUID of the user.
	// @Example 123e4567-e89b-12d3-a456-426614174000
	UserID string `json:"userId"`
	// Email is the user's email address.
	// @Description The user's registered email address.
	// @Example user@example.com
	Email string `json:"email"`
	// Role is the user's role in the system (trainer or athlete).
	// @Description The user's role determining their permissions and capabilities.
	// @Example athlete
	// @Enum trainer,athlete
	Role models.UserRole `json:"role"`
	// Profile contains user-specific profile information.
	// @Description The user's profile data including personal details and role-specific fields.
	Profile models.UserProfile `json:"profile"`
	// CreatedAt is the timestamp when the user account was created.
	// @Description The creation timestamp of the user account.
	// @Example 2024-01-01T00:00:00Z
	CreatedAt time.Time `json:"createdAt"`
	// UpdatedAt is the timestamp when the user was last updated.
	// @Description The last update timestamp of the user account.
	// @Example 2024-01-01T00:00:00Z
	UpdatedAt time.Time `json:"updatedAt"`
}

// GetCurrentUser retrieves the profile of the currently authenticated user.
// @Summary Get current user profile
// @Description Returns the profile information of the user associated with the provided JWT token.
// @Tags User
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} UserResponse "Successfully retrieved user profile"
// @Failure 401 {object} map[string]string "Unauthorized - Invalid or missing JWT token"
// @Failure 404 {object} map[string]string "User not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/me [get]
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found in context"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.userRepo.GetUserByID(ctx, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Return user without password hash
	response := UserResponse{
		UserID:    user.UserID,
		Email:     user.Email,
		Role:      user.Role,
		Profile:   user.Profile,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateProfileRequest contains the data for updating a user's profile.
// @Description UpdateProfileRequest is used to modify user profile information.
// @Schema UpdateProfileRequest
type UpdateProfileRequest struct {
	// Profile contains the updated profile information.
	// @Description The user's profile data including personal details and role-specific fields.
	Profile models.UserProfile `json:"profile" binding:"required"`
}

// UpdateCurrentUser updates the profile of the currently authenticated user.
// @Summary Update current user profile
// @Description Updates the profile information for the authenticated user. Returns the updated user data.
// @Tags User
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body UpdateProfileRequest true "Update profile request containing the updated profile data"
// @Success 200 {object} UserResponse "Successfully updated user profile"
// @Failure 400 {object} map[string]string "Bad request - Invalid input data"
// @Failure 401 {object} map[string]string "Unauthorized - Invalid or missing JWT token"
// @Failure 404 {object} map[string]string "User not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/me [put]
func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found in context"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Fetch existing user
	user, err := h.userRepo.GetUserByID(ctx, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update profile fields
	user.Profile = req.Profile
	user.UpdatedAt = time.Now()

	// Save updated user
	if err := h.userRepo.UpdateUser(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	// Return updated user without password hash
	response := UserResponse{
		UserID:    user.UserID,
		Email:     user.Email,
		Role:      user.Role,
		Profile:   user.Profile,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}
