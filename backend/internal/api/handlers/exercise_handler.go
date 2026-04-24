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
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises/muscle-groups [get]
func (h *ExerciseHandler) GetAllMuscleGroups(c *gin.Context) {
	muscleGroups, err := h.exerciseService.GetAllMuscleGroups(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises/equipment [get]
func (h *ExerciseHandler) GetAllEquipment(c *gin.Context) {
	equipment, err := h.exerciseService.GetAllEquipment(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises [get]
func (h *ExerciseHandler) GetAllExercises(c *gin.Context) {
	exercises, err := h.exerciseService.GetAllExercises(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
// @Failure 404 {object} map[string]interface{} "Exercise not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises/{id} [get]
func (h *ExerciseHandler) GetExerciseByID(c *gin.Context) {
	exerciseID := c.Param("id")

	exercise, err := h.exerciseService.GetExerciseByID(c.Request.Context(), exerciseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if exercise == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found"})
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
// @Failure 400 {object} map[string]interface{} "Invalid muscle group ID"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises/muscle-groups/{id} [get]
func (h *ExerciseHandler) GetExercisesByMuscleGroup(c *gin.Context) {
	muscleGroupIDStr := c.Param("id")
	muscleGroupID, err := strconv.Atoi(muscleGroupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid muscle group ID"})
		return
	}

	exercises, err := h.exerciseService.GetExercisesByMuscleGroup(c.Request.Context(), muscleGroupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
// @Failure 400 {object} map[string]interface{} "Invalid equipment ID"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises/equipment/{id} [get]
func (h *ExerciseHandler) GetExercisesByEquipment(c *gin.Context) {
	equipmentIDStr := c.Param("id")
	equipmentID, err := strconv.Atoi(equipmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid equipment ID"})
		return
	}

	exercises, err := h.exerciseService.GetExercisesByEquipment(c.Request.Context(), equipmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
// @Failure 400 {object} map[string]interface{} "Invalid search parameters"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises/search [get]
func (h *ExerciseHandler) SearchExercises(c *gin.Context) {
	var req SearchExercisesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exercises, err := h.exerciseService.SearchExercises(c.Request.Context(), req.Query, req.MuscleGroupID, req.EquipmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
// @Failure 400 {object} map[string]interface{} "Invalid request data"
// @Failure 401 {object} map[string]interface{} "User not authenticated"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /exercises [post]
func (h *ExerciseHandler) CreateExercise(c *gin.Context) {
	var req CreateExerciseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	exercise, err := h.exerciseService.CreateExercise(
		c.Request.Context(),
		req.Name,
		req.Category,
		req.MuscleGroupID,
		req.EquipmentID,
		userID.(string),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, exercise)
}
