package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type WorkoutHandler struct {
	repo             *repositories.WorkoutRepository
	relationshipRepo *repositories.RelationshipRepository
	validator        *validator.Validate
}

func NewWorkoutHandler(repo *repositories.WorkoutRepository, relationshipRepo *repositories.RelationshipRepository) *WorkoutHandler {
	return &WorkoutHandler{
		repo:             repo,
		relationshipRepo: relationshipRepo,
		validator:        validator.New(),
	}
}

// CreateWorkoutRequest represents the request to create a workout
// @Description Request to create a new workout
type CreateWorkoutRequest struct {
	Date      time.Time         `json:"date" validate:"required"`
	Exercises []models.Exercise `json:"exercises" validate:"required,min=1,dive"`
}

// UpdateWorkoutRequest represents the request to update a workout
// @Description Request to update an existing workout
type UpdateWorkoutRequest struct {
	Date      time.Time         `json:"date" validate:"required"`
	Exercises []models.Exercise `json:"exercises" validate:"required,min=1,dive"`
}

// CreateWorkout handles POST /api/workouts
// @Summary Create a new workout
// @Description Create a new workout entry for the authenticated athlete
// @Tags Workouts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateWorkoutRequest true "Create workout request"
// @Success 201 {object} models.Workout "Workout created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body or validation error"
// @Failure 401 {object} map[string]interface{} "User not authenticated"
// @Failure 403 {object} map[string]interface{} "User is not an athlete"
// @Failure 500 {object} map[string]interface{} "Failed to create workout"
// Router: /api/workouts
func (h *WorkoutHandler) CreateWorkout(c *gin.Context) {
	// Extract athlete ID from JWT token
	athleteID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is an athlete
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can create workouts"})
		return
	}

	var req CreateWorkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	// Create workout
	workout := models.NewWorkout(athleteID.(string), req.Date, req.Exercises)

	// Validate workout model
	if err := h.validator.Struct(workout); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workout validation failed", "details": err.Error()})
		return
	}

	// Save to database
	if err := h.repo.Create(workout); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workout", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, workout)
}

// GetWorkout handles GET /api/workouts/:id
// @Summary Get a specific workout
// @Description Retrieve workout details by ID (athletes can only access their own workouts)
// @Tags Workouts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workout ID"
// @Success 200 {object} models.Workout "Workout retrieved successfully"
// @Failure 404 {object} map[string]interface{} "Workout not found"
// @Failure 403 {object} map[string]interface{} "Access denied"
// Router: /api/workouts/:id
func (h *WorkoutHandler) GetWorkout(c *gin.Context) {
	workoutID := c.Param("id")
	athleteID, _ := c.Get("userID")

	workout, err := h.repo.GetByID(workoutID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
		return
	}

	// Check ownership (athletes can only view their own workouts)
	userRole, _ := c.Get("userRole")
	if userRole == models.RoleAthlete && workout.AthleteID != athleteID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, workout)
}

// GetWorkouts handles GET /api/workouts
// @Summary Get athlete's workouts
// @Description Retrieve paginated list of workouts for the authenticated athlete with optional date range filtering
// @Tags Workouts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of workouts to return (default: 50)"
// @Param offset query int false "Number of workouts to skip (default: 0)"
// @Param startDate query string false "Start date for filtering (RFC3339 format)" Format(date-rfc3339)
// @Param endDate query string false "End date for filtering (RFC3339 format)" Format(date-rfc3339)
// @Success 200 {object} map[string]interface{} "Workouts retrieved successfully" SchemaExample:{"workouts":[],"count":0}
// @Failure 400 {object} map[string]interface{} "Invalid date format"
// @Failure 403 {object} map[string]interface{} "Only athletes can list their workouts"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve workouts"
// Router: /api/workouts
func (h *WorkoutHandler) GetWorkouts(c *gin.Context) {
	athleteID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	// Only athletes can list their own workouts (trainers will use different endpoint)
	if userRole != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can list their workouts"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var workouts []*models.Workout
	var err error

	// If date range is provided, use date range query
	if startDateStr != "" && endDateStr != "" {
		startDate, err1 := time.Parse(time.RFC3339, startDateStr)
		endDate, err2 := time.Parse(time.RFC3339, endDateStr)

		if err1 != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use RFC3339 format"})
			return
		}

		workouts, err = h.repo.GetByAthleteDateRange(athleteID.(string), startDate, endDate)
	} else {
		workouts, err = h.repo.GetByAthleteID(athleteID.(string), limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workouts", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workouts": workouts,
		"count":    len(workouts),
	})
}

// UpdateWorkout handles PUT /api/workouts/:id
// @Summary Update a workout
// @Description Update an existing workout (only within 24 hours of creation, athletes can only edit their own workouts)
// @Tags Workouts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workout ID"
// @Param request body UpdateWorkoutRequest true "Updated workout data"
// @Success 200 {object} models.Workout "Workout updated successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request body or validation error"
// @Failure 403 {object} map[string]interface{} "Access denied or edit window expired"
// @Failure 404 {object} map[string]interface{} "Workout not found"
// @Failure 500 {object} map[string]interface{} "Failed to update workout"
// Router: /api/workouts/:id
func (h *WorkoutHandler) UpdateWorkout(c *gin.Context) {
	workoutID := c.Param("id")
	athleteID, _ := c.Get("userID")

	// Get existing workout
	workout, err := h.repo.GetByID(workoutID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
		return
	}

	// Check ownership
	if workout.AthleteID != athleteID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Check 24-hour edit window
	if !workout.CanEdit() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot edit workout after 24 hours"})
		return
	}

	var req UpdateWorkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	// Update workout fields
	workout.Date = req.Date
	workout.Exercises = req.Exercises

	// Save changes
	if err := h.repo.Update(workout); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workout", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, workout)
}

// DeleteWorkout handles DELETE /api/workouts/:id
// @Summary Delete a workout
// @Description Delete an existing workout (only within 24 hours of creation, athletes can only delete their own workouts)
// @Tags Workouts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workout ID"
// @Success 200 {object} map[string]interface{} "Workout deleted successfully"
// @Failure 403 {object} map[string]interface{} "Access denied or delete window expired"
// @Failure 404 {object} map[string]interface{} "Workout not found"
// @Failure 500 {object} map[string]interface{} "Failed to delete workout"
// Router: /api/workouts/:id
func (h *WorkoutHandler) DeleteWorkout(c *gin.Context) {
	workoutID := c.Param("id")
	athleteID, _ := c.Get("userID")

	// Get existing workout
	workout, err := h.repo.GetByID(workoutID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
		return
	}

	// Check ownership
	if workout.AthleteID != athleteID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Check 24-hour delete window
	if !workout.CanEdit() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete workout after 24 hours"})
		return
	}

	// Delete workout
	if err := h.repo.Delete(workoutID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workout", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workout deleted successfully"})
}

// GetClientWorkouts handles GET /api/clients/:id/workouts
// @Summary Get client's workouts (trainer only)
// @Description Retrieve paginated list of workouts for a specific client (trainers only, must have active relationship)
// @Tags Workouts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Client (Athlete) ID"
// @Param limit query int false "Number of workouts to return (default: 50)"
// @Param offset query int false "Number of workouts to skip (default: 0)"
// @Param startDate query string false "Start date for filtering (RFC3339 format)" Format(date-rfc3339)
// @Param endDate query string false "End date for filtering (RFC3339 format)" Format(date-rfc3339)
// @Param exerciseType query string false "Filter by exercise type (case-insensitive partial match)"
// @Success 200 {object} map[string]interface{} "Client workouts retrieved successfully" SchemaExample:{"workouts":[],"count":0}
// @Failure 400 {object} map[string]interface{} "Invalid date format"
// @Failure 403 {object} map[string]interface{} "User is not a trainer or no active relationship with client"
// @Failure 500 {object} map[string]interface{} "Failed to retrieve workouts"
// Router: /api/clients/:id/workouts
func (h *WorkoutHandler) GetClientWorkouts(c *gin.Context) {
	clientID := c.Param("id")
	trainerID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	// Only trainers can view client workouts
	if userRole != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view client workouts"})
		return
	}

	// Verify that the trainer has an active relationship with this client
	relationships, err := h.relationshipRepo.GetByTrainerID(trainerID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify relationship", "details": err.Error()})
		return
	}

	hasActiveRelationship := false
	for _, rel := range relationships {
		if rel.AthleteID == clientID && rel.IsActive() {
			hasActiveRelationship = true
			break
		}
	}

	if !hasActiveRelationship {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have an active relationship with this client"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	exerciseType := c.Query("exerciseType")

	var workouts []*models.Workout

	// If date range is provided, use date range query
	if startDateStr != "" && endDateStr != "" {
		startDate, err1 := time.Parse(time.RFC3339, startDateStr)
		endDate, err2 := time.Parse(time.RFC3339, endDateStr)

		if err1 != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use RFC3339 format"})
			return
		}

		workouts, err = h.repo.GetByAthleteDateRange(clientID, startDate, endDate)
	} else {
		workouts, err = h.repo.GetByAthleteID(clientID, limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workouts", "details": err.Error()})
		return
	}

	// Filter by exercise type if provided
	if exerciseType != "" {
		var filtered []*models.Workout
		for _, w := range workouts {
			for _, e := range w.Exercises {
				if containsIgnoreCase(e.Name, exerciseType) {
					filtered = append(filtered, w)
					break
				}
			}
		}
		workouts = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"workouts": workouts,
		"count":    len(workouts),
	})
}

func containsIgnoreCase(s, substr string) bool {
	s = strings.ToLower(s)
	substr = strings.ToLower(substr)
	return strings.Contains(s, substr)
}
