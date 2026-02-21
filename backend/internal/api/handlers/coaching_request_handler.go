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
