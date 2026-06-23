package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/models"
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

// AdminUserListItem is the user object returned in list endpoints.
type AdminUserListItem struct {
	UserID    string             `json:"userId"`
	Username  string             `json:"username"`
	Email     string             `json:"email"`
	Role      models.UserRole    `json:"role"`
	Profile   models.UserProfile `json:"profile"`
	CreatedAt string             `json:"createdAt"`
	UpdatedAt string             `json:"updatedAt"`
}

// AdminUserListResponse wraps a list of users with pagination metadata.
type AdminUserListResponse struct {
	Users  []AdminUserListItem `json:"users"`
	Total  int                 `json:"total"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

// @Summary List all users (Admin only)
// @Description Retrieve a list of all registered users. Requires admin role.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} handlers.AdminUserListResponse "List of all users"
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

	items := make([]AdminUserListItem, 0, len(users))
	for _, user := range users {
		items = append(items, AdminUserListItem{
			UserID:    user.UserID,
			Username:  user.Username,
			Email:     user.Email,
			Role:      user.Role,
			Profile:   user.Profile,
			CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	c.JSON(http.StatusOK, AdminUserListResponse{
		Users:  items,
		Total:  len(items),
		Limit:  0,
		Offset: 0,
	})
}

// @Summary Get user detail (Admin only)
// @Description Retrieve detailed information about a specific user by ID. Requires admin role.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} handlers.AdminUserListItem "User details with profile"
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

	response := AdminUserListItem{
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

// @Summary Get dashboard stats (Admin only)
// @Description Retrieve aggregate platform statistics. Requires admin role.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} services.DashboardStats "Dashboard statistics"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin role required"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/stats [get]
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.adminService.GetDashboardStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve dashboard stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ChangePasswordRequest is the request body for admin password change.
type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

// @Summary Change own password (Admin only)
// @Description Admin can change their own password by providing old + new password.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body handlers.ChangePasswordRequest true "Password change request"
// @Success 200 {object} map[string]string "Password changed successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/profile/password [put]
func (h *AdminHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found in context"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.adminService.ChangePassword(c.Request.Context(), services.ChangePasswordRequest{
		UserID:      userID.(string),
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "INVALID_PASSWORD" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "current password is incorrect"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to change password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
