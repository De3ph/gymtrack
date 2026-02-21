package handlers

import (
	"net/http"
	"strconv"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type TrainerCatalogHandler struct {
	service *services.TrainerCatalogService
}

func NewTrainerCatalogHandler(service *services.TrainerCatalogService) *TrainerCatalogHandler {
	return &TrainerCatalogHandler{
		service: service,
	}
}

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
