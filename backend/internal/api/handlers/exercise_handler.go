package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"gymtrack-backend/internal/domain/services"
)

type ExerciseHandler struct {
	exerciseService services.ExerciseService
}

func NewExerciseHandler(exerciseService services.ExerciseService) *ExerciseHandler {
	return &ExerciseHandler{
		exerciseService: exerciseService,
	}
}

type CreateExerciseRequest struct {
	Name          string `json:"name" binding:"required"`
	Category      string `json:"category" binding:"required"`
	MuscleGroupID int    `json:"muscleGroupId" binding:"required"`
	EquipmentID   int    `json:"equipmentId" binding:"required"`
}

type SearchExercisesRequest struct {
	Query         string `form:"query"`
	MuscleGroupID *int   `form:"muscleGroupId"`
	EquipmentID   *int   `form:"equipmentId"`
}

// @Summary Get all muscle groups
// @Description Retrieve all available muscle groups for exercise categorization
// @Tags Exercises
// @Accept json
// @Produce json
// @Success 200 {array} models.MuscleGroupDefinition "Muscle groups retrieved successfully"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises/muscle-groups [get]
func (h *ExerciseHandler) GetAllMuscleGroups(c *gin.Context) {
	muscleGroups, err := h.exerciseService.GetAllMuscleGroups(c.Request.Context())
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, muscleGroups)
}

// @Summary Get all equipment types
// @Description Retrieve all available equipment types for exercise filtering
// @Tags Exercises
// @Accept json
// @Produce json
// @Success 200 {array} models.EquipmentDefinition "Equipment types retrieved successfully"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises/equipment [get]
func (h *ExerciseHandler) GetAllEquipment(c *gin.Context) {
	equipment, err := h.exerciseService.GetAllEquipment(c.Request.Context())
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, equipment)
}

// @Summary Get all exercises
// @Description Retrieve all available exercises in the database
// @Tags Exercises
// @Accept json
// @Produce json
// @Success 200 {array} models.Exercise "Exercises retrieved successfully"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises [get]
func (h *ExerciseHandler) GetAllExercises(c *gin.Context) {
	exercises, err := h.exerciseService.GetAllExercises(c.Request.Context())
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, exercises)
}

// @Summary Get exercise by ID
// @Description Retrieve detailed information for a specific exercise
// @Tags Exercises
// @Accept json
// @Produce json
// @Param id path string true "Exercise ID"
// @Success 200 {object} models.Exercise "Exercise retrieved successfully"
// @Failure 404 {object} map[string]any "Exercise not found"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises/{id} [get]
func (h *ExerciseHandler) GetExerciseByID(c *gin.Context) {
	exerciseIDStr := c.Param("id")
	exerciseID, err := strconv.Atoi(exerciseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exercise ID. Please check the URL and try again"})
		return
	}

	exercise, err := h.exerciseService.GetExerciseByID(c.Request.Context(), exerciseID)
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	if exercise == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found. It may have been deleted or the ID is incorrect"})
		return
	}

	c.JSON(http.StatusOK, exercise)
}

// @Summary Get exercises by muscle group
// @Description Retrieve all exercises that target a specific muscle group
// @Tags Exercises
// @Accept json
// @Produce json
// @Param id path int true "Muscle Group ID"
// @Success 200 {array} models.Exercise "Exercises retrieved successfully"
// @Failure 400 {object} map[string]any "Invalid muscle group ID"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises/muscle-groups/{id} [get]
func (h *ExerciseHandler) GetExercisesByMuscleGroup(c *gin.Context) {
	muscleGroupIDStr := c.Param("id")
	muscleGroupID, err := strconv.Atoi(muscleGroupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid muscle group ID. Please select a valid muscle group and try again"})
		return
	}

	exercises, err := h.exerciseService.GetExercisesByMuscleGroup(c.Request.Context(), muscleGroupID)
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, exercises)
}

// @Summary Get exercises by equipment
// @Description Retrieve all exercises that require specific equipment
// @Tags Exercises
// @Accept json
// @Produce json
// @Param id path int true "Equipment ID"
// @Success 200 {array} models.Exercise "Exercises retrieved successfully"
// @Failure 400 {object} map[string]any "Invalid equipment ID"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises/equipment/{id} [get]
func (h *ExerciseHandler) GetExercisesByEquipment(c *gin.Context) {
	equipmentIDStr := c.Param("id")
	equipmentID, err := strconv.Atoi(equipmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid equipment ID. Please select valid equipment and try again"})
		return
	}

	exercises, err := h.exerciseService.GetExercisesByEquipment(c.Request.Context(), equipmentID)
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, exercises)
}

// @Summary Search exercises
// @Description Search exercises with optional filters for name, muscle group, and equipment
// @Tags Exercises
// @Accept json
// @Produce json
// @Param query query string false "Search query for exercise name"
// @Param muscleGroupId query int false "Filter by muscle group ID"
// @Param equipmentId query int false "Filter by equipment ID"
// @Success 200 {array} models.Exercise "Exercises retrieved successfully"
// @Failure 400 {object} map[string]any "Invalid search parameters"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises/search [get]
func (h *ExerciseHandler) SearchExercises(c *gin.Context) {
	var req SearchExercisesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid search parameters. Please check the filters and try again"})
		return
	}

	exercises, err := h.exerciseService.SearchExercises(c.Request.Context(), req.Query, req.MuscleGroupID, req.EquipmentID)
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusOK, exercises)
}

// @Summary Create custom exercise
// @Description Create a new custom exercise (requires authentication)
// @Tags Exercises
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body handlers.CreateExerciseRequest true "Exercise creation data"
// @Success 201 {object} models.Exercise "Exercise created successfully"
// @Failure 400 {object} map[string]any "Invalid request data"
// @Failure 401 {object} map[string]any "You need to log in to continue. Please log in and try again"
// @Failure 500 {object} map[string]any "Internal server error"
// @Router /exercises [post]
func (h *ExerciseHandler) CreateExercise(c *gin.Context) {
	var req CreateExerciseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exercise data. Please check the submitted fields and try again"})
		return
	}

	// Get user ID from context (set by JWT middleware)
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

	exercise, err := h.exerciseService.CreateExercise(
		c.Request.Context(),
		req.Name,
		req.Category,
		req.MuscleGroupID,
		req.EquipmentID,
		userIDInt,
	)
	if err != nil {
		handleInternalError(c, err, "internal server error")
		return
	}

	c.JSON(http.StatusCreated, exercise)
}
