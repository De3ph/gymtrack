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

// CreateMealRequest represents the request body for creating a meal
// @Description Request body for creating a new meal entry
// @Property date required true time.Time "Date and time of the meal in RFC3339 format"
// @Property mealType required true string "Type of meal (breakfast, lunch, dinner, snack)"
// @Property items required true array models.FoodItem "List of food items in the meal"
type CreateMealRequest struct {
	Date     time.Time         `json:"date" validate:"required"`
	MealType models.MealType   `json:"mealType" validate:"required,oneof=breakfast lunch dinner snack"`
	Items    []models.FoodItem `json:"items" validate:"required,min=1,dive"`
}

// UpdateMealRequest represents the request body for updating a meal
// @Description Request body for updating an existing meal entry
// @Property date required true time.Time "Date and time of the meal in RFC3339 format"
// @Property mealType required true string "Type of meal (breakfast, lunch, dinner, snack)"
// @Property items required true array models.FoodItem "List of food items in the meal"
type UpdateMealRequest struct {
	Date     time.Time         `json:"date" validate:"required"`
	MealType models.MealType   `json:"mealType" validate:"required,oneof=breakfast lunch dinner snack"`
	Items    []models.FoodItem `json:"items" validate:"required,min=1,dive"`
}

// CreateMeal handles POST /api/meals
// @Summary Create a meal entry
// @Description Create a new meal entry for the authenticated athlete
// @Tags Meals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body handlers.CreateMealRequest true "Create meal request"
// @Success 201 {object} models.Meal "Meal created successfully"
// @Failure 400 {object} map[string]string "Invalid request body or validation failed"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Only athletes can create meals"
// @Failure 500 {object} map[string]string "Failed to create meal"
// @Router /meals [post]
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
// @Summary Get a specific meal
// @Description Retrieve a meal by its ID (athletes can only access their own meals)
// @Tags Meals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Meal ID"
// @Success 200 {object} models.Meal "Meal retrieved successfully"
// @Failure 404 {object} map[string]string "Meal not found"
// @Failure 403 {object} map[string]string "Access denied"
// @Router /meals/{id} [get]
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
// @Summary Get athlete's meals
// @Description Retrieve paginated meal history for the authenticated athlete with optional date range filtering
// @Tags Meals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of meals to return (default: 50)"
// @Param offset query int false "Number of meals to skip (default: 0)"
// @Param startDate query string false "Start date in RFC3339 format"
// @Param endDate query string false "End date in RFC3339 format"
// @Success 200 {object} map[string]interface{} "Meals retrieved successfully" "Returns meals array and count"
// @Failure 400 {object} map[string]string "Invalid date format"
// @Failure 403 {object} map[string]string "Only athletes can list their meals"
// @Failure 500 {object} map[string]string "Failed to retrieve meals"
// @Router /meals [get]
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
	dateStr := c.Query("date") // Handle single date parameter

	var meals []*models.Meal
	var err error

	// If single date is provided, query for that date
	if dateStr != "" {
		// Parse the date (expecting YYYY-MM-DD format)
		parsedDate, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD format"})
			return
		}

		// Set start and end to the same day
		startDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, parsedDate.Location())
		endDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 23, 59, 59, 999999999, parsedDate.Location())

		meals, err = h.repo.GetByAthleteDateRange(athleteID.(string), startDate, endDate)
	} else if startDateStr != "" && endDateStr != "" {
		// If date range is provided, use date range query
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
// @Summary Update a meal
// @Description Update an existing meal (only within 24 hours of creation, athletes can only update their own meals)
// @Tags Meals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Meal ID"
// @Param request body handlers.UpdateMealRequest true "Update meal request"
// @Success 200 {object} models.Meal "Meal updated successfully"
// @Failure 400 {object} map[string]string "Invalid request body or validation failed"
// @Failure 403 {object} map[string]string "Access denied or cannot edit after 24 hours"
// @Failure 404 {object} map[string]string "Meal not found"
// @Failure 500 {object} map[string]string "Failed to update meal"
// @Router /meals/{id} [put]
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
// @Summary Delete a meal
// @Description Delete an existing meal (only within 24 hours of creation, athletes can only delete their own meals)
// @Tags Meals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Meal ID"
// @Success 200 {object} map[string]string "Meal deleted successfully"
// @Failure 403 {object} map[string]string "Access denied or cannot delete after 24 hours"
// @Failure 404 {object} map[string]string "Meal not found"
// @Failure 500 {object} map[string]string "Failed to delete meal"
// @Router /meals/{id} [delete]
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
// @Summary Get client's meals (trainer view)
// @Description Retrieve paginated meal history for a specific client (trainers only, requires active relationship)
// @Tags Meals
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Client (athlete) ID"
// @Param limit query int false "Number of meals to return (default: 50)"
// @Param offset query int false "Number of meals to skip (default: 0)"
// @Param startDate query string false "Start date in RFC3339 format"
// @Param endDate query string false "End date in RFC3339 format"
// @Param mealType query string false "Filter by meal type (breakfast, lunch, dinner, snack)"
// @Success 200 {object} map[string]interface{} "Client meals retrieved successfully" "Returns meals array and count"
// @Failure 400 {object} map[string]string "Invalid date format"
// @Failure 403 {object} map[string]string "Only trainers can view client meals or no active relationship"
// @Failure 500 {object} map[string]string "Failed to retrieve meals"
// @Router /clients/{id}/meals [get]
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
