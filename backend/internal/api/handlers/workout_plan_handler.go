package handlers

import (
	"net/http"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type WorkoutPlanHandler struct {
	service  *services.WorkoutPlanService
	userRepo repositories.UserRepository
}

func NewWorkoutPlanHandler(service *services.WorkoutPlanService, userRepo repositories.UserRepository) *WorkoutPlanHandler {
	return &WorkoutPlanHandler{
		service:  service,
		userRepo: userRepo,
	}
}

type CreatePlanRequest struct {
	Name        string                     `json:"name" validate:"required"`
	Description string                     `json:"description"`
	Exercises   []models.WorkoutPlanExercise `json:"exercises" validate:"required,min=1,dive"`
}

type UpdatePlanRequest struct {
	Name        string                     `json:"name" validate:"required"`
	Description string                     `json:"description"`
	Exercises   []models.WorkoutPlanExercise `json:"exercises" validate:"required,min=1,dive"`
}

type AssignPlanRequest struct {
	AthleteIDs []string `json:"athleteIds" validate:"required,min=1"`
}

// CreatePlan handles POST /api/workout-plans
func (h *WorkoutPlanHandler) CreatePlan(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}
	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can create workout plans"})
		return
	}

	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	plan, err := h.service.CreatePlan(c.Request.Context(), userID.(string), req.Name, req.Description, req.Exercises)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "VALIDATION" {
				c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workout plan", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, plan)
}

// GetPlans handles GET /api/workout-plans
func (h *WorkoutPlanHandler) GetPlans(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can list their workout plans"})
		return
	}

	plans, err := h.service.GetPlans(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workout plans", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
		"count": len(plans),
	})
}

// GetPlan handles GET /api/workout-plans/:id
func (h *WorkoutPlanHandler) GetPlan(c *gin.Context) {
	planID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	plan, err := h.service.GetPlan(c.Request.Context(), planID, userID.(string), userRole.(models.UserRole))
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_PLAN_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout plan not found"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve workout plan"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

// UpdatePlan handles PUT /api/workout-plans/:id
func (h *WorkoutPlanHandler) UpdatePlan(c *gin.Context) {
	planID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can update workout plans"})
		return
	}

	var req UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	plan, err := h.service.UpdatePlan(c.Request.Context(), planID, userID.(string), req.Name, req.Description, req.Exercises)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_PLAN_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout plan not found"})
				return
			}
			if svcErr.Code == "VALIDATION" {
				c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workout plan", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, plan)
}

// DeletePlan handles DELETE /api/workout-plans/:id
func (h *WorkoutPlanHandler) DeletePlan(c *gin.Context) {
	planID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can delete workout plans"})
		return
	}

	force := c.Query("force") == "true"

	err := h.service.DeletePlan(c.Request.Context(), planID, userID.(string), force)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_PLAN_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout plan not found"})
				return
			}
			if svcErr.Code == "HAS_ASSIGNMENTS" {
				c.JSON(http.StatusConflict, gin.H{"error": svcErr.Message})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workout plan", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workout plan deleted successfully"})
}

// AssignPlan handles POST /api/workout-plans/:id/assign
func (h *WorkoutPlanHandler) AssignPlan(c *gin.Context) {
	planID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can assign workout plans"})
		return
	}

	var req AssignPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	assignments, err := h.service.AssignPlan(c.Request.Context(), planID, userID.(string), req.AthleteIDs)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_PLAN_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout plan not found"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign workout plan", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"assignments": assignments,
		"count":       len(assignments),
	})
}

// GetAssignments handles GET /api/workout-plans/:id/assignments
func (h *WorkoutPlanHandler) GetAssignments(c *gin.Context) {
	planID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view plan assignments"})
		return
	}

	assignments, err := h.service.GetAssignmentsForPlan(c.Request.Context(), planID, userID.(string))
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_PLAN_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout plan not found"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve assignments", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"assignments": assignments,
		"count":       len(assignments),
	})
}

// GetMyPlans handles GET /api/workout-plans/assigned
func (h *WorkoutPlanHandler) GetMyPlans(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can view their assigned plans"})
		return
	}

	plans, err := h.service.GetMyPlans(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve assigned plans", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
		"count": len(plans),
	})
}

// StartWorkoutFromPlan handles POST /api/workout-plans/:id/start
func (h *WorkoutPlanHandler) StartWorkoutFromPlan(c *gin.Context) {
	planID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can start a workout from a plan"})
		return
	}

	workout, err := h.service.StartWorkoutFromPlan(c.Request.Context(), planID, userID.(string))
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "WORKOUT_PLAN_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Workout plan not found"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start workout from plan", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, workout)
}

// GetClientPlans handles GET /api/clients/:username/workout-plans
func (h *WorkoutPlanHandler) GetClientPlans(c *gin.Context) {
	username := c.Param("username")
	trainerID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	if userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view client plans"})
		return
	}

	athlete, err := h.userRepo.GetUserByUsername(c.Request.Context(), username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get athlete details", "details": err.Error()})
		return
	}
	if athlete == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	plans, err := h.service.GetClientPlans(c.Request.Context(), trainerID.(string), athlete.UserID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "FORBIDDEN" {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve client plans", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
		"count": len(plans),
	})
}
