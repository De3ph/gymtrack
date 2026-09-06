package handlers

import (
	"context"
	"net/http"
	"strconv"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"gymtrack-backend/internal/domain/services"
)

// CommentHandler handles HTTP requests for comments.
type CommentServiceInterface interface {
	CanCreateComment(ctx context.Context, userID int, userRole models.UserRole, targetType models.TargetType, targetID int, parentCommentID *int) error
	CanAccessComments(ctx context.Context, userID int, userRole models.UserRole, targetType models.TargetType, targetID int) error
	CanEditOrDeleteComment(ctx context.Context, userID int, commentID int) error
}

type CommentHandler struct {
	commentRepo repositories.CommentRepository
	commentSvc  CommentServiceInterface
	validator   *validator.Validate
}

// NewCommentHandler creates a new CommentHandler.
func NewCommentHandler(
	commentRepo repositories.CommentRepository,
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
// @Failure 401 {object} map[string]string "You need to log in to continue. Please log in and try again"
// @Failure 403 {object} map[string]string "Access denied or cannot comment on this target"
// @Failure 404 {object} map[string]string "Target (workout or meal) not found"
// @Failure 500 {object} map[string]string "Failed to create comment"
// @Router /comments [post]
func (h *CommentHandler) CreateComment(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}
	userRole, ok := c.Get("userRole")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session is missing role information. Please log in again"})
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment data. Please check the content and try again"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed. Please check the comment content (1-2000 characters) and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	targetIDInt, err := strconv.Atoi(req.TargetID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID. Please check the workout or meal ID and try again"})
		return
	}

	var parentCommentIDInt *int
	if req.ParentCommentID != nil && *req.ParentCommentID != "" {
		id, err := strconv.Atoi(*req.ParentCommentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent comment ID. Please check the reply reference and try again"})
			return
		}
		parentCommentIDInt = &id
	}

	if err := h.commentSvc.CanCreateComment(c, userIDInt, userRole.(models.UserRole), req.TargetType, targetIDInt, parentCommentIDInt); err != nil {
		if handleCommentServiceError(c, err) {
			return
		}
		handleInternalError(c, err, "failed to create comment")
		return
	}

	if parentCommentIDInt != nil {
		parent, err := h.commentRepo.GetByID(c.Request.Context(), *parentCommentIDInt)
		if err != nil || parent == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent comment not found. It may have been deleted"})
			return
		}
		if parent.TargetID != targetIDInt || parent.TargetType != req.TargetType {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This reply doesn't belong to the selected workout or meal. Please check and try again"})
			return
		}
	}

	authorRole := models.AuthorRoleTrainer
	if userRole.(models.UserRole) == models.RoleAthlete {
		authorRole = models.AuthorRoleAthlete
	}
	comment := models.NewComment(req.TargetType, targetIDInt, userIDInt, authorRole, req.Content, parentCommentIDInt)
	if err := h.commentRepo.Create(c.Request.Context(), comment); err != nil {
		handleInternalError(c, err, "failed to create comment")
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
// @Success 200 {object} map[string]any "Comments retrieved successfully"
// @Failure 400 {object} map[string]string "Missing or invalid query parameters"
// @Failure 401 {object} map[string]string "You need to log in to continue. Please log in and try again"
// @Failure 403 {object} map[string]string "Access denied"
// @Failure 404 {object} map[string]string "Target not found"
// @Failure 500 {object} map[string]string "Failed to retrieve comments"
// @Router /comments [get]
func (h *CommentHandler) GetComments(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}
	userRole, ok := c.Get("userRole")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your session is missing role information. Please log in again"})
		return
	}

	targetTypeStr := c.Query("targetType")
	targetIDStr := c.Query("targetId")
	if targetTypeStr == "" || targetIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide both targetType (workout or meal) and targetId"})
		return
	}
	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID. Please check the workout or meal ID and try again"})
		return
	}
	targetType := models.TargetType(targetTypeStr)
	if targetType != models.TargetTypeWorkout && targetType != models.TargetTypeMeal {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target type. Must be \"workout\" or \"meal\""})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	if err := h.commentSvc.CanAccessComments(c.Request.Context(), userIDInt, userRole.(models.UserRole), targetType, targetID); err != nil {
		if handleCommentServiceError(c, err) {
			return
		}
		handleInternalError(c, err, "failed to verify comment access")
		return
	}

	comments, err := h.commentRepo.GetByTarget(c.Request.Context(), targetType, targetID)
	if err != nil {
		handleInternalError(c, err, "failed to load comments")
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
// @Failure 401 {object} map[string]string "You need to log in to continue. Please log in and try again"
// @Failure 403 {object} map[string]string "Only the comment author can edit it"
// @Failure 404 {object} map[string]string "Comment not found"
// @Failure 500 {object} map[string]string "Failed to update comment"
// @Router /comments/{id} [put]
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID. Please check the URL and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	if err := h.commentSvc.CanEditOrDeleteComment(c.Request.Context(), userIDInt, commentID); err != nil {
		if handleCommentServiceError(c, err) {
			return
		}
		handleInternalError(c, err, "failed to update comment")
		return
	}

	var req UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment data. Please check the content and try again"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed. Please check the comment content (1-2000 characters) and try again"})
		return
	}

	comment, err := h.commentRepo.GetByID(c.Request.Context(), commentID)
	if err != nil || comment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found. It may have been deleted"})
		return
	}
	comment.Edit(req.Content)
	if err := h.commentRepo.Update(c.Request.Context(), comment); err != nil {
		handleInternalError(c, err, "failed to update comment")
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
// @Failure 401 {object} map[string]string "You need to log in to continue. Please log in and try again"
// @Failure 403 {object} map[string]string "Only the comment author can delete it"
// @Failure 404 {object} map[string]string "Comment not found"
// @Failure 500 {object} map[string]string "Failed to delete comment"
// @Router /comments/{id} [delete]
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID. Please check the URL and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	if err := h.commentSvc.CanEditOrDeleteComment(c.Request.Context(), userIDInt, commentID); err != nil {
		if handleCommentServiceError(c, err) {
			return
		}
		handleInternalError(c, err, "failed to delete comment")
		return
	}

	if err := h.commentRepo.Delete(c.Request.Context(), commentID); err != nil {
		handleInternalError(c, err, "failed to delete comment")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
}
