package handlers

import (
	"net/http"
	"strconv"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

// TrainerCatalogHandler handles trainer-related HTTP requests
type TrainerCatalogHandler struct {
	service *services.TrainerCatalogService
}

// NewTrainerCatalogHandler creates a new TrainerCatalogHandler instance
// @Summary Create trainer catalog handler
// @Description Initializes a handler for trainer catalog endpoints
// @Tags Trainers

// @Success 200 {object} TrainerCatalogHandler "Successfully created handler"

func NewTrainerCatalogHandler(service *services.TrainerCatalogService) *TrainerCatalogHandler {
	return &TrainerCatalogHandler{
		service: service,
	}
}

// @Summary Get all trainers with optional filtering
// @Description Retrieves a list of trainers with optional filtering by specialization, location, minimum rating, and availability status. Supports pagination.
// @Tags Trainers
// @Accept json
// @Produce json
// @Param specialization query string false "Filter by specialization (e.g., 'yoga', 'strength')"
// @Param location query string false "Filter by location"
// @Param minRating query number false "Minimum rating filter (0-5)"
// @Param availableForNewClients query boolean false "Filter by availability for new clients (true/false)"
// @Param limit query int false "Number of results per page (default: 20)"
// @Param offset query int false "Number of results to skip (default: 0)"
// @Success 200 {object} map[string]interface{} "Successfully retrieved trainers" "{\"trainers\":[],\"total\":0,\"limit\":20,\"offset\":0}"
// @Failure 500 {object} map[string]interface{} "Internal server error" "{\"error\":\"error message\"}"
// @Router /trainers [get]
func (h *TrainerCatalogHandler) GetTrainers(c *gin.Context) {
	filters := &services.TrainerSearchFilters{
		Specialization: c.Query("specialization"),
		Location:       c.Query("location"),
	}

	if minRating := c.Query("minRating"); minRating != "" {
		if rating, err := strconv.ParseFloat(minRating, 64); err == nil {
			filters.MinRating = rating
		}
	}

	if available := c.Query("availableForNewClients"); available != "" {
		availableBool := available == "true"
		filters.AvailableForNewClients = &availableBool
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	filters.Limit = limit
	filters.Offset = offset

	trainers, count, err := h.service.SearchTrainers(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trainers": trainers,
		"total":    count,
		"limit":    limit,
		"offset":   offset,
	})
}

// @Summary Get trainer by ID
// @Description Retrieves detailed profile information for a specific trainer by their ID
// @Tags Trainers
// @Accept json
// @Produce json
// @Param id path string true "Trainer ID"
// @Success 200 {object} models.TrainerWithProfile "Successfully retrieved trainer"
// @Failure 404 {object} map[string]interface{} "Trainer not found" "{\"error\":\"trainer not found\"}"
// @Failure 500 {object} map[string]interface{} "Internal server error" "{\"error\":\"error message\"}"
// @Router /trainers/{id} [get]
func (h *TrainerCatalogHandler) GetTrainerByID(c *gin.Context) {
	trainerID := c.Param("id")

	trainer, err := h.service.GetTrainerProfile(c.Request.Context(), trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if trainer == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "trainer not found"})
		return
	}

	c.JSON(http.StatusOK, trainer)
}

// @Summary Update current trainer's profile
// @Description Updates the profile information for the currently authenticated trainer
// @Tags Trainers
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param profile body models.TrainerProfile true "Profile update data"
// @Success 200 {object} map[string]interface{} "Profile updated successfully" "{\"message\":\"profile updated successfully\"}"
// @Failure 400 {object} map[string]interface{} "Invalid request data" "{\"error\":\"error message\"}"
// @Failure 401 {object} map[string]interface{} "Unauthorized" "{\"error\":\"unauthorized\"}"
// @Failure 500 {object} map[string]interface{} "Internal server error" "{\"error\":\"error message\"}"
// @Router /trainers/me/profile [put]
func (h *TrainerCatalogHandler) UpdateMyProfile(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var profile models.TrainerProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.service.UpdateTrainerProfile(c.Request.Context(), userID.(string), &profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated successfully"})
}

// @Summary Get current trainer's profile
// @Description Retrieves the profile information for the currently authenticated trainer
// @Tags Trainers
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.TrainerWithProfile "Successfully retrieved trainer profile"
// @Failure 401 {object} map[string]interface{} "Unauthorized" "{\"error\":\"unauthorized\"}"
// @Failure 403 {object} map[string]interface{} "Forbidden - only trainers can access" "{\"error\":\"Only trainers can access profile\"}"
// @Failure 404 {object} map[string]interface{} "Profile not found" "{\"error\":\"trainer profile not found\"}"
// @Failure 500 {object} map[string]interface{} "Internal server error" "{\"error\":\"error message\"}"
// @Router /trainers/me/profile [get]
func (h *TrainerCatalogHandler) GetMyProfile(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Check if user is a trainer
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can access profile"})
		return
	}

	profile, err := h.service.GetTrainerProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if profile == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "trainer profile not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}
