package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type AvailabilityHandler struct {
	service *services.AvailabilityService
}

func NewAvailabilityHandler(service *services.AvailabilityService) *AvailabilityHandler {
	return &AvailabilityHandler{
		service: service,
	}
}

// @Summary Get trainer's own availability slots
// @Description Retrieve all availability slots for the currently authenticated trainer
// @Tags Availability
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Slots retrieved successfully" "slots":{[]models.TrainerAvailability}
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /trainers/me/availability [get]
func (h *AvailabilityHandler) GetMyAvailability(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	slots, err := h.service.GetAvailability(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"slots": slots})
}

// @Summary Set trainer's own availability slots
// @Description Update or create availability slots for the currently authenticated trainer (replaces all existing slots)
// @Tags Availability
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param slots body []models.TrainerAvailability true "Array of availability slots to set" minItems(1)
// @Success 200 {object} map[string]interface{} "Availability updated successfully" "message":"availability updated successfully"
// @Failure 400 {object} map[string]interface{} "Bad request - invalid input"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /trainers/me/availability [put]
func (h *AvailabilityHandler) SetMyAvailability(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var slots []models.TrainerAvailability
	if err := c.ShouldBindJSON(&slots); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.service.SetAvailability(c.Request.Context(), userID.(string), slots)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "availability updated successfully"})
}

// @Summary Get any trainer's availability slots
// @Description Retrieve availability slots for a specific trainer by ID (public access)
// @Tags Availability
// @Accept json
// @Produce json
// @Param id path string true "Trainer ID" minLength(1) maxLength(255)
// @Success 200 {object} map[string]interface{} "Slots retrieved successfully" "slots":{[]models.TrainerAvailability}
// @Failure 404 {object} map[string]interface{} "Trainer not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /trainers/{id}/availability [get]
func (h *AvailabilityHandler) GetTrainerAvailability(c *gin.Context) {
	trainerID := c.Param("id")

	slots, err := h.service.GetAvailability(c.Request.Context(), trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"slots": slots})
}

// @Summary Delete a specific availability slot
// @Description Delete a specific availability slot by slot ID. Only the trainer who owns the slot can delete it.
// @Tags Availability
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param slotId path string true "Availability Slot ID" minLength(1) maxLength(255)
// @Success 200 {object} map[string]interface{} "Slot deleted successfully" "message":"slot deleted successfully"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - not your slot"
// @Failure 404 {object} map[string]interface{} "Slot not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /trainers/availability/{slotId} [delete]
func (h *AvailabilityHandler) DeleteSlot(c *gin.Context) {
	slotID := c.Param("slotId")

	err := h.service.DeleteSlot(c.Request.Context(), slotID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "slot deleted successfully"})
}
