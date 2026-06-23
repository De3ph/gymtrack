package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminService *services.AdminService
}

func NewAdminHandler(adminService *services.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

// AdminUserResponse represents a user in admin responses (excludes sensitive fields).
type AdminUserResponse struct {
	UserID    string `json:"userId"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// @Summary List all users (Admin only)
// @Description Retrieve a list of all registered users. Requires admin role.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {array} handlers.AdminUserResponse "List of all users"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin role required"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/users [get]
func (h *AdminHandler) ListAllUsers(c *gin.Context) {
	users, err := h.adminService.GetAllUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve users"})
		return
	}

	response := make([]AdminUserResponse, 0, len(users))
	for _, user := range users {
		response = append(response, AdminUserResponse{
			UserID:    user.UserID,
			Username:  user.Username,
			Email:     user.Email,
			Role:      string(user.Role),
			CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Get user detail (Admin only)
// @Description Retrieve detailed information about a specific user by ID. Requires admin role.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} handlers.AdminUserResponse "User details"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin role required"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/users/{id} [get]
func (h *AdminHandler) GetUserDetail(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user ID is required"})
		return
	}

	user, err := h.adminService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "USER_NOT_FOUND" {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user"})
		return
	}

	response := AdminUserResponse{
		UserID:    user.UserID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      string(user.Role),
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, response)
}
