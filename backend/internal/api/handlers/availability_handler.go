package handlers

import (
	"errors"
	"net/http"
	"strconv"

	domainerrors "gymtrack-backend/internal/domain/errors"
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
// @Success 200 {object} map[string]any "Slots retrieved successfully" "slots":{[]models.TrainerAvailability}
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /trainers/me/availability [get]
func (h *AvailabilityHandler) GetMyAvailability(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	slots, err := h.service.GetAvailability(c.Request.Context(), userIDInt)
	if err != nil {
		handleInternalError(c, err, "internal server error")
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
// @Success 200 {object} map[string]any "Availability updated successfully" "message":"availability updated successfully"
// @Failure 400 {object} map[string]any "Bad request - invalid input"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /trainers/me/availability [put]
func (h *AvailabilityHandler) SetMyAvailability(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}

	var slots []models.TrainerAvailability
	if err := c.ShouldBindJSON(&slots); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid availability data. Please check the days and time slots and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	err = h.service.SetAvailability(c.Request.Context(), userIDInt, slots)
	if err != nil {
		handleInternalError(c, err, "internal server error")
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
// @Success 200 {object} map[string]any "Slots retrieved successfully" "slots":{[]models.TrainerAvailability}
// @Failure 404 {object} map[string]any "Trainer not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /trainers/{id}/availability [get]
func (h *AvailabilityHandler) GetTrainerAvailability(c *gin.Context) {
	trainerIDStr := c.Param("id")
	trainerID, err := strconv.Atoi(trainerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trainer ID. Please check the URL and try again"})
		return
	}

	slots, err := h.service.GetAvailability(c.Request.Context(), trainerID)
	if err != nil {
		handleInternalError(c, err, "internal server error")
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
// @Success 200 {object} map[string]any "Slot deleted successfully" "message":"slot deleted successfully"
// @Failure 401 {object} map[string]any "Unauthorized"
// @Failure 403 {object} map[string]any "Forbidden - not your slot"
// @Failure 404 {object} map[string]any "Slot not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /trainers/availability/{slotId} [delete]
func (h *AvailabilityHandler) DeleteSlot(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You need to log in to continue. Please log in and try again"})
		return
	}
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can delete availability slots"})
		return
	}

	slotIDStr := c.Param("slotId")
	slotID, err := strconv.Atoi(slotIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid availability slot ID. Please check the URL and try again"})
		return
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Your session is invalid. Please log in again"})
		return
	}

	err = h.service.DeleteSlot(c.Request.Context(), userIDInt, slotID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Slot not found. It may have been deleted or the ID is incorrect"})
			return
		}
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "slot deleted successfully"})
}
