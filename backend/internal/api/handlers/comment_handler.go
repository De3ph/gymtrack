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

// CreateCommentRequest is the request body for creating a comment.
type CreateCommentRequest struct {
	TargetType      models.TargetType `json:"targetType" binding:"required"`
	TargetID        string            `json:"targetId" binding:"required"`
	Content         string            `json:"content" binding:"required,min=1,max=2000"`
	ParentCommentID *string           `json:"parentCommentId,omitempty"`
}

// UpdateCommentRequest is the request body for updating a comment.
type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

// CreateComment handles POST /api/comments
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

// GetComments handles GET /api/comments?targetId=&targetType=
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
