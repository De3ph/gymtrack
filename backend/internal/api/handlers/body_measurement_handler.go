package handlers

import (
	"net/http"
	"strconv"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type BodyMeasurementHandler struct {
	measurementService *services.BodyMeasurementService
	userRepo           repositories.UserRepository
}

func NewBodyMeasurementHandler(
	measurementService *services.BodyMeasurementService,
	userRepo repositories.UserRepository,
) *BodyMeasurementHandler {
	return &BodyMeasurementHandler{
		measurementService: measurementService,
		userRepo:           userRepo,
	}
}

// BodyMeasurementPartDTO represents a body part measurement value in cm.
type BodyMeasurementPartDTO struct {
	Value float64 `json:"value" binding:"gte=0"`
}

// CreateBodyMeasurementRequest is the request body for creating a body measurement entry.
type CreateBodyMeasurementRequest struct {
	Date       time.Time                         `json:"date" binding:"required"`
	Weight     float64                           `json:"weight" binding:"required,gt=0"`
	WeightUnit models.WeightUnit                 `json:"weightUnit" binding:"required,oneof=kg lbs"`
	BodyFatPct float64                           `json:"bodyFatPct,omitempty" binding:"gte=0,lte=100"`
	Parts      map[string]BodyMeasurementPartDTO `json:"parts,omitempty"`
	Notes      string                            `json:"notes,omitempty" binding:"max=500"`
}

// UpdateBodyMeasurementRequest is the request body for updating a body measurement entry.
type UpdateBodyMeasurementRequest struct {
	Date       time.Time                         `json:"date" binding:"required"`
	Weight     float64                           `json:"weight" binding:"required,gt=0"`
	WeightUnit models.WeightUnit                 `json:"weightUnit" binding:"required,oneof=kg lbs"`
	BodyFatPct float64                           `json:"bodyFatPct,omitempty" binding:"gte=0,lte=100"`
	Parts      map[string]BodyMeasurementPartDTO `json:"parts,omitempty"`
	Notes      string                            `json:"notes,omitempty" binding:"max=500"`
}

// CreateBodyMeasurement handles POST /api/measurements
// @Summary Create a body measurement entry
// @Description Create a new body measurement entry (weight + body parts + body fat) for the authenticated athlete
// @Tags BodyMeasurements
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateBodyMeasurementRequest true "Create body measurement request"
// @Success 201 {object} models.BodyMeasurement "Body measurement created successfully"
// @Failure 400 {object} map[string]any "Invalid request body or validation error"
// @Failure 401 {object} map[string]any "User not authenticated"
// @Failure 403 {object} map[string]any "User is not an athlete"
// @Failure 500 {object} map[string]any "Failed to create body measurement"
// @Router /measurements [post]
func (h *BodyMeasurementHandler) CreateBodyMeasurement(c *gin.Context) {
	athleteID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userRole, _ := c.Get("userRole")

	var req CreateBodyMeasurementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	parts := make(map[string]models.BodyMeasurementPart, len(req.Parts))
	for k, v := range req.Parts {
		parts[k] = models.BodyMeasurementPart{Value: v.Value}
	}

	athleteIDInt, err := strconv.Atoi(athleteID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	measurement, err := h.measurementService.CreateBodyMeasurement(c.Request.Context(), services.CreateBodyMeasurementInput{
		AthleteID:  athleteIDInt,
		Date:       req.Date,
		Weight:     req.Weight,
		WeightUnit: req.WeightUnit,
		BodyFatPct: req.BodyFatPct,
		Parts:      parts,
		Notes:      req.Notes,
		UserRole:   userRole.(models.UserRole),
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create body measurement", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, measurement)
}

// GetBodyMeasurement handles GET /api/measurements/:id
// @Summary Get a body measurement
// @Description Retrieve a body measurement by ID (athletes can access their own, trainers with active relationship can access clients')
// @Tags BodyMeasurements
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Body measurement ID"
// @Success 200 {object} models.BodyMeasurement "Body measurement retrieved"
// @Failure 403 {object} map[string]any "Access denied"
// @Failure 404 {object} map[string]any "Body measurement not found"
// @Router /measurements/{id} [get]
func (h *BodyMeasurementHandler) GetBodyMeasurement(c *gin.Context) {
	measurementIDStr := c.Param("id")
	measurementID, err := strconv.Atoi(measurementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid measurement id"})
		return
	}
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	measurement, err := h.measurementService.GetBodyMeasurement(c.Request.Context(), services.GetBodyMeasurementInput{
		MeasurementID: measurementID,
		RequesterID:   userIDInt,
		RequesterRole: userRole.(models.UserRole),
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve body measurement"})
		return
	}

	c.JSON(http.StatusOK, measurement)
}

// GetBodyMeasurements handles GET /api/measurements
// @Summary Get athlete's body measurements
// @Description Retrieve paginated body measurement history for the authenticated athlete
// @Tags BodyMeasurements
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of entries to return (default: 50)"
// @Param offset query int false "Number of entries to skip (default: 0)"
// @Param startDate query string false "Start date filter (RFC3339)"
// @Param endDate query string false "End date filter (RFC3339)"
// @Success 200 {object} map[string]any "Body measurements retrieved" SchemaExample:{"measurements":[],"count":0}
// @Failure 403 {object} map[string]any "Only athletes can list body measurements"
// @Router /measurements [get]
func (h *BodyMeasurementHandler) GetBodyMeasurements(c *gin.Context) {
	athleteID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	limit, offset, startDate, endDate, err := services.ParseBodyMeasurementQueryParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	athleteIDInt, err := strconv.Atoi(athleteID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	result, err := h.measurementService.GetBodyMeasurements(c.Request.Context(), services.GetBodyMeasurementsInput{
		AthleteID: athleteIDInt,
		UserRole:  userRole.(models.UserRole),
		Limit:     limit,
		Offset:    offset,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve body measurements", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"measurements": result.Measurements,
		"count":        result.Count,
	})
}

// GetLatestBodyMeasurement handles GET /api/measurements/latest
// @Summary Get latest body measurement
// @Description Retrieve the most recent body measurement (athletes get their own, trainers can get latest for active clients)
// @Tags BodyMeasurements
// @Produce json
// @Security BearerAuth
// @Param athleteId query string false "Athlete ID (required for trainers)"
// @Success 200 {object} models.BodyMeasurement "Latest body measurement"
// @Success 204 "No body measurement found"
// @Router /measurements/latest [get]
func (h *BodyMeasurementHandler) GetLatestBodyMeasurement(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	athleteIDStr := c.Query("athleteId")
	var athleteID int
	if athleteIDStr != "" {
		var err error
		athleteID, err = strconv.Atoi(athleteIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid athlete id"})
			return
		}
	} else {
		athleteID, _ = strconv.Atoi(userID.(string))
	}

	userIDInt, err := strconv.Atoi(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	measurement, err := h.measurementService.GetLatestBodyMeasurement(c.Request.Context(), services.GetLatestBodyMeasurementInput{
		AthleteID:     athleteID,
		RequesterID:   userIDInt,
		RequesterRole: userRole.(models.UserRole),
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve latest body measurement"})
		return
	}

	if measurement == nil {
		c.Status(http.StatusNoContent)
		return
	}

	c.JSON(http.StatusOK, measurement)
}

// UpdateBodyMeasurement handles PUT /api/measurements/:id
// @Summary Update a body measurement
// @Description Update an existing body measurement (only within 24 hours of creation, athletes can only edit their own)
// @Tags BodyMeasurements
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Body measurement ID"
// @Param request body UpdateBodyMeasurementRequest true "Updated body measurement data"
// @Success 200 {object} models.BodyMeasurement "Body measurement updated"
// @Failure 403 {object} map[string]any "Access denied or edit window expired"
// @Failure 404 {object} map[string]any "Body measurement not found"
// @Router /measurements/{id} [put]
func (h *BodyMeasurementHandler) UpdateBodyMeasurement(c *gin.Context) {
	measurementIDStr := c.Param("id")
	measurementID, err := strconv.Atoi(measurementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid measurement id"})
		return
	}
	athleteID, _ := c.Get("userID")

	var req UpdateBodyMeasurementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	parts := make(map[string]models.BodyMeasurementPart, len(req.Parts))
	for k, v := range req.Parts {
		parts[k] = models.BodyMeasurementPart{Value: v.Value}
	}

	athleteIDInt, err := strconv.Atoi(athleteID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	measurement, err := h.measurementService.UpdateBodyMeasurement(c.Request.Context(), services.UpdateBodyMeasurementInput{
		MeasurementID: measurementID,
		AthleteID:     athleteIDInt,
		Date:          req.Date,
		Weight:        req.Weight,
		WeightUnit:    req.WeightUnit,
		BodyFatPct:    req.BodyFatPct,
		Parts:         parts,
		Notes:         req.Notes,
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update body measurement", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, measurement)
}

// DeleteBodyMeasurement handles DELETE /api/measurements/:id
// @Summary Delete a body measurement
// @Description Delete an existing body measurement (only within 24 hours of creation)
// @Tags BodyMeasurements
// @Produce json
// @Security BearerAuth
// @Param id path string true "Body measurement ID"
// @Success 200 {object} map[string]any "Body measurement deleted"
// @Failure 403 {object} map[string]any "Access denied or delete window expired"
// @Failure 404 {object} map[string]any "Body measurement not found"
// @Router /measurements/{id} [delete]
func (h *BodyMeasurementHandler) DeleteBodyMeasurement(c *gin.Context) {
	measurementIDStr := c.Param("id")
	measurementID, err := strconv.Atoi(measurementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid measurement id"})
		return
	}
	athleteID, _ := c.Get("userID")

	athleteIDInt, err := strconv.Atoi(athleteID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	err = h.measurementService.DeleteBodyMeasurement(c.Request.Context(), measurementID, athleteIDInt)
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete body measurement", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Body measurement deleted successfully"})
}

// GetClientBodyMeasurements handles GET /api/clients/:username/measurements
// @Summary Get client's body measurements (trainer only)
// @Description Retrieve body measurements for a specific client (trainers only, must have active relationship)
// @Tags BodyMeasurements
// @Produce json
// @Security BearerAuth
// @Param username path string true "Client username"
// @Param limit query int false "Number of entries to return (default: 50)"
// @Param offset query int false "Number of entries to skip (default: 0)"
// @Param startDate query string false "Start date filter (RFC3339)"
// @Param endDate query string false "End date filter (RFC3339)"
// @Success 200 {object} map[string]any "Client body measurements retrieved" SchemaExample:{"measurements":[],"count":0}
// @Failure 403 {object} map[string]any "No active relationship with client"
// @Router /clients/{username}/measurements [get]
func (h *BodyMeasurementHandler) GetClientBodyMeasurements(c *gin.Context) {
	username := c.Param("username")
	trainerID, _ := c.Get("userID")

	athlete, err := h.userRepo.GetUserByUsername(c.Request.Context(), username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get athlete details", "details": err.Error()})
		return
	}
	if athlete == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	limit, offset, startDate, endDate, err := services.ParseBodyMeasurementQueryParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	trainerIDInt, err := strconv.Atoi(trainerID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity"})
		return
	}

	result, err := h.measurementService.GetClientBodyMeasurements(c.Request.Context(), services.GetClientBodyMeasurementsInput{
		TrainerID: trainerIDInt,
		ClientID:  athlete.UserID,
		Limit:     limit,
		Offset:    offset,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		if handleServiceError(c, err) {
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve client body measurements", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"measurements": result.Measurements,
		"count":        result.Count,
	})
}
