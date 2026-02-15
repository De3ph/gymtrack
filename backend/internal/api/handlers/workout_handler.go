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

type CreateWorkoutRequest struct {
	Date      time.Time         `json:"date" validate:"required"`
	Exercises []models.Exercise `json:"exercises" validate:"required,min=1,dive"`
}

type UpdateWorkoutRequest struct {
	Date      time.Time         `json:"date" validate:"required"`
	Exercises []models.Exercise `json:"exercises" validate:"required,min=1,dive"`
}

// CreateWorkout handles POST /api/workouts
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
// Trainers can view their clients' workouts
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
