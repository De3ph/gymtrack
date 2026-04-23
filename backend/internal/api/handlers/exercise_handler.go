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
	Name         string `json:"name" binding:"required"`
	Category     string `json:"category" binding:"required"`
	MuscleGroupID int    `json:"muscleGroupId" binding:"required"`
	EquipmentID  int    `json:"equipmentId" binding:"required"`
}

type SearchExercisesRequest struct {
	Query         string `form:"query"`
	MuscleGroupID *int   `form:"muscleGroupId"`
	EquipmentID   *int   `form:"equipmentId"`
}

// GetAllMuscleGroups returns all muscle groups
func (h *ExerciseHandler) GetAllMuscleGroups(c *gin.Context) {
	muscleGroups, err := h.exerciseService.GetAllMuscleGroups(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, muscleGroups)
}

// GetAllEquipment returns all equipment types
func (h *ExerciseHandler) GetAllEquipment(c *gin.Context) {
	equipment, err := h.exerciseService.GetAllEquipment(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, equipment)
}

// GetAllExercises returns all exercises
func (h *ExerciseHandler) GetAllExercises(c *gin.Context) {
	exercises, err := h.exerciseService.GetAllExercises(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exercises)
}

// GetExerciseByID returns a specific exercise by ID
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

// GetExercisesByMuscleGroup returns exercises filtered by muscle group
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

// GetExercisesByEquipment returns exercises filtered by equipment
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

// SearchExercises searches exercises with optional filters
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

// CreateExercise creates a new custom exercise (requires authentication)
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
