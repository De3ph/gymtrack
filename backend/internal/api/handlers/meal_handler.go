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

type MealHandler struct {
	repo             *repositories.MealRepository
	relationshipRepo *repositories.RelationshipRepository
	validator        *validator.Validate
}

func NewMealHandler(repo *repositories.MealRepository, relationshipRepo *repositories.RelationshipRepository) *MealHandler {
	return &MealHandler{
		repo:             repo,
		relationshipRepo: relationshipRepo,
		validator:        validator.New(),
	}
}

type CreateMealRequest struct {
	Date     time.Time         `json:"date" validate:"required"`
	MealType models.MealType   `json:"mealType" validate:"required,oneof=breakfast lunch dinner snack"`
	Items    []models.FoodItem `json:"items" validate:"required,min=1,dive"`
}

type UpdateMealRequest struct {
	Date     time.Time         `json:"date" validate:"required"`
	MealType models.MealType   `json:"mealType" validate:"required,oneof=breakfast lunch dinner snack"`
	Items    []models.FoodItem `json:"items" validate:"required,min=1,dive"`
}

// CreateMeal handles POST /api/meals
func (h *MealHandler) CreateMeal(c *gin.Context) {
	// Extract athlete ID from JWT token
	athleteID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is an athlete
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can create meals"})
		return
	}

	var req CreateMealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	// Create meal
	meal := models.NewMeal(athleteID.(string), req.Date, req.MealType, req.Items)

	// Validate meal model
	if err := h.validator.Struct(meal); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Meal validation failed", "details": err.Error()})
		return
	}

	// Save to database
	if err := h.repo.Create(meal); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meal", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, meal)
}

// GetMeal handles GET /api/meals/:id
func (h *MealHandler) GetMeal(c *gin.Context) {
	mealID := c.Param("id")
	meal, err := h.repo.GetByID(mealID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meal not found"})
		return
	}

	// Check ownership (athletes can only view their own meals)
	athleteID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	if userRole == models.RoleAthlete && meal.AthleteID != athleteID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, meal)
}

// GetMeals handles GET /api/meals
func (h *MealHandler) GetMeals(c *gin.Context) {
	athleteID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	// Only athletes can list their own meals
	if userRole != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can list their meals"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var meals []*models.Meal
	var err error

	// If date range is provided, use date range query
	if startDateStr != "" && endDateStr != "" {
		startDate, err1 := time.Parse(time.RFC3339, startDateStr)
		endDate, err2 := time.Parse(time.RFC3339, endDateStr)

		if err1 != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use RFC3339 format"})
			return
		}

		meals, err = h.repo.GetByAthleteDateRange(athleteID.(string), startDate, endDate)
	} else {
		meals, err = h.repo.GetByAthleteID(athleteID.(string), limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve meals", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"meals": meals,
		"count": len(meals),
	})
}

// UpdateMeal handles PUT /api/meals/:id
func (h *MealHandler) UpdateMeal(c *gin.Context) {
	mealID := c.Param("id")
	athleteID, _ := c.Get("userID")

	// Get existing meal
	meal, err := h.repo.GetByID(mealID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meal not found"})
		return
	}

	// Check ownership
	if meal.AthleteID != athleteID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Check 24-hour edit window
	if !meal.CanEdit() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot edit meal after 24 hours"})
		return
	}

	var req UpdateMealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	// Update meal fields
	meal.Date = req.Date
	meal.MealType = req.MealType
	meal.Items = req.Items

	// Save changes
	if err := h.repo.Update(meal); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update meal", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, meal)
}

// DeleteMeal handles DELETE /api/meals/:id
func (h *MealHandler) DeleteMeal(c *gin.Context) {
	mealID := c.Param("id")
	athleteID, _ := c.Get("userID")

	// Get existing meal
	meal, err := h.repo.GetByID(mealID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meal not found"})
		return
	}

	// Check ownership
	if meal.AthleteID != athleteID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Check 24-hour delete window
	if !meal.CanEdit() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete meal after 24 hours"})
		return
	}

	// Delete meal
	if err := h.repo.Delete(mealID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete meal", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Meal deleted successfully"})
}

// GetClientMeals handles GET /api/clients/:id/meals
// Trainers can view their clients' meals
func (h *MealHandler) GetClientMeals(c *gin.Context) {
	clientID := c.Param("id")
	trainerID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	// Only trainers can view client meals
	if userRole != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view client meals"})
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
	mealType := c.Query("mealType")

	var meals []*models.Meal

	// If date range is provided, use date range query
	if startDateStr != "" && endDateStr != "" {
		startDate, err1 := time.Parse(time.RFC3339, startDateStr)
		endDate, err2 := time.Parse(time.RFC3339, endDateStr)

		if err1 != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use RFC3339 format"})
			return
		}

		meals, err = h.repo.GetByAthleteDateRange(clientID, startDate, endDate)
	} else {
		meals, err = h.repo.GetByAthleteID(clientID, limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve meals", "details": err.Error()})
		return
	}

	// Filter by meal type if provided
	if mealType != "" {
		var filtered []*models.Meal
		for _, m := range meals {
			if strings.EqualFold(string(m.MealType), mealType) {
				filtered = append(filtered, m)
			}
		}
		meals = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"meals": meals,
		"count": len(meals),
	})
}
