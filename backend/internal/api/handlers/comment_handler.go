package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// CommentHandler handles HTTP requests for comments.
type CommentHandler struct {
	commentRepo *repositories.CommentRepository
	commentSvc  *services.CommentService
	validator   *validator.Validate
}

// NewCommentHandler creates a new CommentHandler.
func NewCommentHandler(
	commentRepo *repositories.CommentRepository,
	commentSvc *services.CommentService,
) *CommentHandler {
	return &CommentHandler{
		commentRepo: commentRepo,
		commentSvc:  commentSvc,
		validator:   validator.New(),
	}
}

// CreateCommentRequest represents the request body for creating a comment.
// @Description Request body for creating a new comment on a workout or meal.
// @Property targetType required true string "Type of target (workout or meal)" Enum(workout,meal)
// @Property targetId required true string "ID of the target (workout or meal) to comment on"
// @Property content required true string "Content of the comment (1-2000 characters)"
// @Property parentCommentId string "ID of parent comment for threaded replies (optional)"
type CreateCommentRequest struct {
	TargetType      models.TargetType `json:"targetType" binding:"required"`
	TargetID        string            `json:"targetId" binding:"required"`
	Content         string            `json:"content" binding:"required,min=1,max=2000"`
	ParentCommentID *string           `json:"parentCommentId,omitempty"`
}

// UpdateCommentRequest represents the request body for updating a comment.
// @Description Request body for updating an existing comment's content.
// @Property content required true string "Updated content of the comment (1-2000 characters)"
type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// CreateComment handles POST /api/comments
// @Summary Create a comment
// @Description Create a new comment on a workout or meal. The user must have permission to comment on the target.
// @Tags Comments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body handlers.CreateCommentRequest true "Create comment request"
// @Success 201 {object} models.Comment "Comment created successfully"
// @Failure 400 {object} map[string]string "Invalid request body or validation failed"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Access denied or cannot comment on this target"
// @Failure 404 {object} map[string]string "Target (workout or meal) not found"
// @Failure 500 {object} map[string]string "Failed to create comment"
// @Router /comments [post]
func (h *CommentHandler) CreateComment(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userRole, ok := c.Get("userRole")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	if err := h.commentSvc.CanCreateComment(userID.(string), userRole.(models.UserRole), req.TargetType, req.TargetID, req.ParentCommentID); err != nil {
		if err == services.ErrTargetNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workout or meal not found"})
			return
		}
		if err == services.ErrAccessDenied {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to comment on this"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.ParentCommentID != nil && *req.ParentCommentID != "" {
		parent, err := h.commentRepo.GetByID(*req.ParentCommentID)
		if err != nil || parent == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent comment not found"})
			return
		}
		if parent.TargetID != req.TargetID || parent.TargetType != req.TargetType {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent comment does not belong to this target"})
			return
		}
	}

	authorRole := models.AuthorRoleTrainer
	if userRole.(models.UserRole) == models.RoleAthlete {
		authorRole = models.AuthorRoleAthlete
	}
	comment := models.NewComment(req.TargetType, req.TargetID, userID.(string), authorRole, req.Content, req.ParentCommentID)
	if err := h.commentRepo.Create(comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment", "details": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, comment)
}

// GetComments handles GET /api/comments
// @Summary Get comments for a target
// @Description Retrieve all comments for a specific workout or meal. The user must have access to the target.
// @Tags Comments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param targetType query string true "Type of target (workout or meal)" Enum(workout,meal)
// @Param targetId query string true "ID of the target (workout or meal)"
// @Success 200 {object} map[string]interface{} "Comments retrieved successfully"
// @Failure 400 {object} map[string]string "Missing or invalid query parameters"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Access denied"
// @Failure 404 {object} map[string]string "Target not found"
// @Failure 500 {object} map[string]string "Failed to retrieve comments"
// @Router /comments [get]
func (h *CommentHandler) GetComments(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userRole, ok := c.Get("userRole")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	targetTypeStr := c.Query("targetType")
	targetID := c.Query("targetId")
	if targetTypeStr == "" || targetID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "targetType and targetId are required"})
		return
	}
	targetType := models.TargetType(targetTypeStr)
	if targetType != models.TargetTypeWorkout && targetType != models.TargetTypeMeal {
		c.JSON(http.StatusBadRequest, gin.H{"error": "targetType must be workout or meal"})
		return
	}

	if err := h.commentSvc.CanAccessComments(userID.(string), userRole.(models.UserRole), targetType, targetID); err != nil {
		if err == services.ErrTargetNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workout or meal not found"})
			return
		}
		if err == services.ErrAccessDenied {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	comments, err := h.commentRepo.GetByTarget(targetType, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load comments", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"comments": comments})
}

// UpdateComment handles PUT /api/comments/:id
// @Summary Update a comment
// @Description Update the content of an existing comment. Only the author can edit their comment.
// @Tags Comments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Comment ID"
// @Param request body handlers.UpdateCommentRequest true "Update comment request"
// @Success 200 {object} models.Comment "Comment updated successfully"
// @Failure 400 {object} map[string]string "Invalid request body or validation failed"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Only the comment author can edit it"
// @Failure 404 {object} map[string]string "Comment not found"
// @Failure 500 {object} map[string]string "Failed to update comment"
// @Router /comments/{id} [put]
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	commentID := c.Param("id")

	if err := h.commentSvc.CanEditOrDeleteComment(userID.(string), commentID); err != nil {
		if err == services.ErrTargetNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		if err == services.ErrNotAuthor {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the comment author can edit it"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var req UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	comment, err := h.commentRepo.GetByID(commentID)
	if err != nil || comment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}
	comment.Edit(req.Content)
	if err := h.commentRepo.Update(comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, comment)
}

// DeleteComment handles DELETE /api/comments/:id
// @Summary Delete a comment
// @Description Delete an existing comment. Only the author can delete their comment.
// @Tags Comments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Comment ID"
// @Success 200 {object} map[string]string "Comment deleted successfully"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Only the comment author can delete it"
// @Failure 404 {object} map[string]string "Comment not found"
// @Failure 500 {object} map[string]string "Failed to delete comment"
// @Router /comments/{id} [delete]
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	commentID := c.Param("id")

	if err := h.commentSvc.CanEditOrDeleteComment(userID.(string), commentID); err != nil {
		if err == services.ErrTargetNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		if err == services.ErrNotAuthor {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only the comment author can delete it"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.commentRepo.Delete(commentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
}
