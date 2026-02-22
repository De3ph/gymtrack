package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type CoachingRequestHandler struct {
	service *services.CoachingRequestService
}

func NewCoachingRequestHandler(service *services.CoachingRequestService) *CoachingRequestHandler {
	return &CoachingRequestHandler{
		service: service,
	}
}

type CreateCoachingRequestRequest struct {
	TrainerID string `json:"trainerId" binding:"required"`
	Message   string `json:"message"`
}

// @Summary Create a new coaching request
// @Description Athlete creates a new coaching request to request coaching from a trainer
// @Tags Coaching Requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateCoachingRequestRequest true "Coaching request details"
// @Success 201 {object} map[string]interface{} "Coaching request created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request data"
// @Failure 401 {object} map[string]interface{} "Unauthorized - user not authenticated"
// @Failure 403 {object} map[string]interface{} "Forbidden - only athletes can create coaching requests"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /coaching-requests [post]
func (h *CoachingRequestHandler) CreateCoachingRequest(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userRole, _ := c.Get("role")
	if userRole != "athlete" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only athletes can create coaching requests"})
		return
	}

	var req CreateCoachingRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, err := h.service.CreateCoachingRequest(c.Request.Context(), userID.(string), req.TrainerID, req.Message)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, request)
}

// @Summary Get my coaching requests
// @Description Retrieve coaching requests for the current user (sent by athlete or received by trainer)
// @Tags Coaching Requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Successfully retrieved coaching requests" "{\"requests\": []}"
// @Failure 401 {object} map[string]interface{} "Unauthorized - user not authenticated"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /coaching-requests/my [get]
func (h *CoachingRequestHandler) GetMyRequests(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userRole, _ := c.Get("role")

	requests, err := h.service.GetMyRequests(c.Request.Context(), userID.(string), userRole.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

// @Summary Accept a coaching request
// @Description Trainer accepts a coaching request from an athlete
// @Tags Coaching Requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Coaching request ID"
// @Success 200 {object} map[string]interface{} "Coaching request accepted successfully" "{\"message\":\"coaching request accepted\",\"relationship\":{}}"
// @Failure 400 {object} map[string]interface{} "Invalid request or coaching request not found"
// @Failure 401 {object} map[string]interface{} "Unauthorized - user not authenticated"
// @Failure 403 {object} map[string]interface{} "Forbidden - only trainers can accept coaching requests"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /coaching-requests/{id}/accept [post]
func (h *CoachingRequestHandler) AcceptCoachingRequest(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userRole, _ := c.Get("role")
	if userRole != "trainer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only trainers can accept coaching requests"})
		return
	}

	requestID := c.Param("id")

	relationship, err := h.service.AcceptCoachingRequest(c.Request.Context(), requestID, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "coaching request accepted",
		"relationship": relationship,
	})
}

// @Summary Reject a coaching request
// @Description Trainer rejects a coaching request from an athlete
// @Tags Coaching Requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Coaching request ID"
// @Success 200 {object} map[string]interface{} "Coaching request rejected successfully" "{\"message\":\"coaching request rejected\"}"
// @Failure 400 {object} map[string]interface{} "Invalid request or coaching request not found"
// @Failure 401 {object} map[string]interface{} "Unauthorized - user not authenticated"
// @Failure 403 {object} map[string]interface{} "Forbidden - only trainers can reject coaching requests"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /coaching-requests/{id}/reject [post]
func (h *CoachingRequestHandler) RejectCoachingRequest(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userRole, _ := c.Get("role")
	if userRole != "trainer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only trainers can reject coaching requests"})
		return
	}

	requestID := c.Param("id")

	err := h.service.RejectCoachingRequest(c.Request.Context(), requestID, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "coaching request rejected"})
}

// @Summary Get pending coaching requests
// @Description Trainer retrieves all pending coaching requests they have received
// @Tags Coaching Requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Successfully retrieved pending coaching requests" "{\"requests\": []}"
// @Failure 401 {object} map[string]interface{} "Unauthorized - user not authenticated"
// @Failure 403 {object} map[string]interface{} "Forbidden - only trainers can view pending requests"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /coaching-requests/pending [get]
func (h *CoachingRequestHandler) GetPendingRequests(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userRole, _ := c.Get("role")
	if userRole != "trainer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only trainers can view pending requests"})
		return
	}

	requests, err := h.service.GetPendingRequestsForTrainer(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}
