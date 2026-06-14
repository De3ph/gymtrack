package handlers

import (
	"net/http"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type WorkoutHandler struct {
	workoutService *services.WorkoutService
	userRepo       repositories.UserRepository
}

func NewWorkoutHandler(workoutService *services.WorkoutService, userRepo repositories.UserRepository) *WorkoutHandler {
	return &WorkoutHandler{
		workoutService: workoutService,
		userRepo:       userRepo,
	}
}

// CreateWorkoutRequest represents the request to create a workout
// @Description Request to create a new workout
type CreateWorkoutRequest struct {
	Date      time.Time                `json:"date" validate:"required"`
	Exercises []models.WorkoutExercise `json:"exercises" validate:"required,min=1,dive"`
}

// UpdateWorkoutRequest represents the request to update a workout
// @Description Request to update an existing workout
type UpdateWorkoutRequest struct {
	Date      time.Time                `json:"date" validate:"required"`
	Exercises []models.WorkoutExercise `json:"exercises" validate:"required,min=1,dive"`
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
	athleteID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	var req CreateWorkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	workout, err := h.workoutService.CreateWorkout(c.Request.Context(), services.CreateWorkoutInput{
		AthleteID: athleteID.(string),
		Date:      req.Date,
		Exercises: req.Exercises,
		UserRole:  userRole.(models.UserRole),
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
		}
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
	userRole, _ := c.Get("userRole")

	workout, err := h.workoutService.GetWorkout(c.Request.Context(), services.GetWorkoutInput{
		WorkoutID:     workoutID,
		RequesterID:   athleteID.(string),
		RequesterRole: userRole.(models.UserRole),
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workout"})
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

	limit, offset, startDate, endDate, err := services.ParseWorkoutQueryParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.workoutService.GetWorkouts(c.Request.Context(), services.GetWorkoutsInput{
		AthleteID: athleteID.(string),
		UserRole:  userRole.(models.UserRole),
		Limit:     limit,
		Offset:    offset,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "FORBIDDEN" {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workouts", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workouts": result.Workouts,
		"count":    result.Count,
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

	var req UpdateWorkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	workout, err := h.workoutService.UpdateWorkout(c.Request.Context(), services.UpdateWorkoutInput{
		WorkoutID: workoutID,
		AthleteID: athleteID.(string),
		Date:      req.Date,
		Exercises: req.Exercises,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
				return
			}
		}
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

	err := h.workoutService.DeleteWorkout(c.Request.Context(), workoutID, athleteID.(string))
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
				return
			}
		}
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
	username := c.Param("username")
	trainerID, _ := c.Get("userID")

	limit, offset, startDate, endDate, err := services.ParseWorkoutQueryParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exerciseType := c.Query("exerciseType")

	// Get athlete by username first
	athlete, err := h.userRepo.GetUserByUsername(c.Request.Context(), username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get athlete details", "details": err.Error()})
		return
	}
	if athlete == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	result, err := h.workoutService.GetClientWorkouts(c.Request.Context(), services.GetClientWorkoutsInput{
		TrainerID:    trainerID.(string),
		ClientID:     athlete.UserID,
		Limit:        limit,
		Offset:       offset,
		StartDate:    startDate,
		EndDate:      endDate,
		ExerciseType: exerciseType,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "FORBIDDEN" {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workouts", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workouts": result.Workouts,
		"count":    result.Count,
	})
}
