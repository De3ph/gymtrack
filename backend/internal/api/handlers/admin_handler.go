package handlers

import (
	"net/http"
	"strconv"

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
	UserID    int                `json:"userId"`
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
// @Description Retrieve a list of all registered users. Requires admin role. Supports pagination, role filter, and search.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size (default 25)"
// @Param offset query int false "Page offset"
// @Param role query string false "Filter by role (trainer, athlete, admin)"
// @Param search query string false "Search by username or email"
// @Success 200 {object} handlers.AdminUserListResponse "List of users with pagination"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Forbidden - admin role required"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/users [get]
func (h *AdminHandler) ListAllUsers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	role := c.Query("role")
	search := c.Query("search")

	users, total, err := h.adminService.GetAllUsersFiltered(c.Request.Context(), role, search, limit, offset)
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
		Total:  total,
		Limit:  limit,
		Offset: offset,
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
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Forbidden - admin role required"
// @Failure 404 {object} map[string]any "User not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/users/{id} [get]
func (h *AdminHandler) GetUserDetail(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := h.adminService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if handleServiceError(c, err) {
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
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Forbidden - admin role required"
// @Failure 500 {object} map[string]any "Internal server error"
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
// @Failure 400 {object} map[string]any "Invalid request"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/profile/password [put]
func (h *AdminHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found in context"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	err = h.adminService.ChangePassword(c.Request.Context(), services.ChangePasswordRequest{
		UserID:      userIDInt,
		OldPassword: req.OldPassword,
		NewPassword: req.NewPassword,
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to change password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// UpdateRoleRequest is the request body for changing a user's role.
type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=trainer athlete admin"`
}

// @Summary Update user role (Admin only)
// @Description Change a user's role. Admin cannot change own role or demote last admin.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Param request body handlers.UpdateRoleRequest true "New role"
// @Success 200 {object} map[string]string "Role updated successfully"
// @Failure 400 {object} map[string]any "Invalid request"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Forbidden"
// @Failure 404 {object} map[string]any "User not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/users/{id}/role [put]
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	userIDStr := c.Param("id")
	targetUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	adminIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found in context"})
		return
	}
	adminID, err := strconv.Atoi(adminIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid admin identity"})
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	err = h.adminService.UpdateUserRole(c.Request.Context(), adminID, targetUserID, models.UserRole(req.Role))
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role updated successfully"})
}

// UpdateStatusRequest is the request body for changing a user's account status.
type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active suspended banned"`
}

// @Summary Update user status (Admin only)
// @Description Suspend, ban, or reactivate a user account.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Param request body handlers.UpdateStatusRequest true "New status"
// @Success 200 {object} map[string]string "Status updated successfully"
// @Failure 400 {object} map[string]any "Invalid request"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Forbidden"
// @Failure 404 {object} map[string]any "User not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/users/{id}/status [put]
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	userIDStr := c.Param("id")
	targetUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	err = h.adminService.UpdateUserStatus(c.Request.Context(), targetUserID, models.UserStatus(req.Status))
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

// AdminCommentListItem is the comment object returned in admin list endpoints.
type AdminCommentListItem struct {
	CommentID        int                 `json:"commentId"`
	TargetType       string              `json:"targetType"`
	TargetID         int                 `json:"targetId"`
	AuthorID         int                 `json:"authorId"`
	AuthorRole       string              `json:"authorRole"`
	Content          string              `json:"content"`
	ParentCommentID  *int                `json:"parentCommentId,omitempty"`
	CreatedAt        string              `json:"createdAt"`
	EditedAt         *string             `json:"editedAt,omitempty"`
}

// AdminCommentListResponse wraps a list of comments with pagination metadata.
type AdminCommentListResponse struct {
	Comments []AdminCommentListItem `json:"comments"`
	Total    int                      `json:"total"`
	Limit    int                      `json:"limit"`
	Offset   int                      `json:"offset"`
}

// @Summary List all comments (Admin only)
// @Description List all comments with pagination and target type filter.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Page size (default 25)"
// @Param offset query int false "Page offset"
// @Param targetType query string false "Filter by target type (workout, meal)"
// @Success 200 {object} handlers.AdminCommentListResponse "List of comments"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/comments [get]
func (h *AdminHandler) ListAllComments(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	targetType := c.Query("targetType")

	comments, total, err := h.adminService.GetAllComments(c.Request.Context(), targetType, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve comments"})
		return
	}

	items := make([]AdminCommentListItem, 0, len(comments))
	for _, comment := range comments {
		item := AdminCommentListItem{
			CommentID:       comment.CommentID,
			TargetType:      string(comment.TargetType),
			TargetID:        comment.TargetID,
			AuthorID:        comment.AuthorID,
			AuthorRole:      string(comment.AuthorRole),
			Content:         comment.Content,
			ParentCommentID: comment.ParentCommentID,
			CreatedAt:       comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if comment.EditedAt != nil {
			s := comment.EditedAt.Format("2006-01-02T15:04:05Z07:00")
			item.EditedAt = &s
		}
		items = append(items, item)
	}

	c.JSON(http.StatusOK, AdminCommentListResponse{
		Comments: items,
		Total:    total,
		Limit:    limit,
		Offset:   offset,
	})
}

// @Summary Delete comment (Admin only)
// @Description Force-delete any comment without ownership check.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Comment ID"
// @Success 200 {object} map[string]string "Comment deleted successfully"
// @Failure 400 {object} map[string]any "Invalid comment id"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 404 {object} map[string]any "Comment not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/comments/{id} [delete]
func (h *AdminHandler) DeleteComment(c *gin.Context) {
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	err = h.adminService.DeleteComment(c.Request.Context(), commentID)
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}

// @Summary Verify exercise (Admin only)
// @Description Mark an exercise as verified/canonical.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Exercise ID"
// @Success 200 {object} map[string]string "Exercise verified successfully"
// @Failure 400 {object} map[string]any "Invalid exercise id"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 404 {object} map[string]any "Exercise not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/exercises/{id}/verify [put]
func (h *AdminHandler) VerifyExercise(c *gin.Context) {
	exerciseIDStr := c.Param("id")
	exerciseID, err := strconv.Atoi(exerciseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid exercise id"})
		return
	}

	err = h.adminService.VerifyExercise(c.Request.Context(), exerciseID)
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify exercise"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exercise verified successfully"})
}

// @Summary Delete exercise (Admin only)
// @Description Force-delete an exercise.
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Exercise ID"
// @Success 200 {object} map[string]string "Exercise deleted successfully"
// @Failure 400 {object} map[string]any "Invalid exercise id"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 404 {object} map[string]any "Exercise not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /admin/exercises/{id} [delete]
func (h *AdminHandler) DeleteExercise(c *gin.Context) {
	exerciseIDStr := c.Param("id")
	exerciseID, err := strconv.Atoi(exerciseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid exercise id"})
		return
	}

	err = h.adminService.DeleteExercise(c.Request.Context(), exerciseID)
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete exercise"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exercise deleted successfully"})
}
