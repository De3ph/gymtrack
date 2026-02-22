package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

var _ = models.TrainerReview{}

type ReviewHandler struct {
	service *services.ReviewService
}

func NewReviewHandler(service *services.ReviewService) *ReviewHandler {
	return &ReviewHandler{
		service: service,
	}
}

// CreateReviewRequest represents the request body for creating a review.
// @Description Request body for creating a review for a trainer.
// @Property rating required true int "Rating (1-5)" Minimum(1) Maximum(5)
// @Property comment false string "Optional comment about the trainer"
type CreateReviewRequest struct {
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment"`
}

// UpdateReviewRequest represents the request body for updating a review.
// @Description Request body for updating an existing review.
// @Property rating required true int "Rating (1-5)" Minimum(1) Maximum(5)
// @Property comment false string "Optional updated comment"
type UpdateReviewRequest struct {
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment"`
}

// CreateReview handles POST /api/trainers/:id/reviews
// @Summary Create a review for a trainer
// @Description Allows an athlete to create a review for a specific trainer. Requires athlete role.
// @Tags Reviews
// @Accept json
// @Produce json
// @Param id path string true "Trainer ID"
// @Param request body handlers.CreateReviewRequest true "Create review request"
// @Success 201 {object} models.TrainerReview "Review created successfully"
// @Failure 400 {object} map[string]string "Invalid request body or validation failed"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Only athletes can create reviews"
// @Failure 500 {object} map[string]string "Failed to create review"
// @Security BearerAuth
// @Router /trainers/{id}/reviews [post]
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userRole, _ := c.Get("role")
	if userRole != "athlete" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only athletes can create reviews"})
		return
	}

	trainerID := c.Param("id")

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review, err := h.service.CreateReview(c.Request.Context(), trainerID, userID.(string), req.Rating, req.Comment)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, review)
}

// GetTrainerReviews handles GET /api/trainers/:id/reviews
// @Summary Get reviews for a trainer
// @Description Retrieve all reviews for a specific trainer. This endpoint is publicly accessible.
// @Tags Reviews
// @Produce json
// @Param id path string true "Trainer ID"
// @Success 200 {object} map[string]interface{} "Reviews retrieved successfully" {"reviews": []models.TrainerReview}
// @Failure 500 {object} map[string]string "Failed to retrieve reviews"
// @Router /trainers/{id}/reviews [get]
func (h *ReviewHandler) GetTrainerReviews(c *gin.Context) {
	trainerID := c.Param("id")

	reviews, err := h.service.GetTrainerReviews(c.Request.Context(), trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reviews": reviews})
}

// UpdateReview handles PUT /api/reviews/:id
// @Summary Update a review
// @Description Updates an existing review. Only the author can update their review.
// @Tags Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review ID"
// @Param request body handlers.UpdateReviewRequest true "Update review request"
// @Success 200 {object} map[string]string "Review updated successfully"
// @Failure 400 {object} map[string]string "Invalid request body or validation failed"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Only the author can update the review"
// @Failure 404 {object} map[string]string "Review not found"
// @Failure 500 {object} map[string]string "Failed to update review"
// @Security BearerAuth
// @Router /reviews/{id} [put]
func (h *ReviewHandler) UpdateReview(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	reviewID := c.Param("id")

	var req UpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.service.UpdateReview(c.Request.Context(), reviewID, userID.(string), req.Rating, req.Comment)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "review updated successfully"})
}

// DeleteReview handles DELETE /api/reviews/:id
// @Summary Delete a review
// @Description Deletes an existing review. Only the author can delete their review.
// @Tags Reviews
// @Accept json
// @Produce json
// @Param id path string true "Review ID"
// @Success 200 {object} map[string]string "Review deleted successfully"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Only the author can delete the review"
// @Failure 404 {object} map[string]string "Review not found"
// @Failure 500 {object} map[string]string "Failed to delete review"
// @Security BearerAuth
// @Router /reviews/{id} [delete]
func (h *ReviewHandler) DeleteReview(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	reviewID := c.Param("id")

	err := h.service.DeleteReview(c.Request.Context(), reviewID, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "review deleted successfully"})
}
