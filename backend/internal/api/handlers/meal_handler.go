package handlers

import (
	"net/http"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

type MealHandler struct {
	mealService *services.MealService
}

func NewMealHandler(mealService *services.MealService) *MealHandler {
	return &MealHandler{
		mealService: mealService,
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

	var req CreateMealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	meal, err := h.mealService.CreateMeal(c.Request.Context(), services.CreateMealInput{
		AthleteID: athleteID.(string),
		Date:      req.Date,
		MealType:  req.MealType,
		Items:     req.Items,
		UserRole:  userRole.(models.UserRole),
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "FORBIDDEN" {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
			return
		}
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
	athleteID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	meal, err := h.mealService.GetMeal(c.Request.Context(), services.GetMealInput{
		MealID:        mealID,
		RequesterID:   athleteID.(string),
		RequesterRole: userRole.(models.UserRole),
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "MEAL_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Meal not found"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve meal"})
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

	limit, offset, startDate, endDate, date, err := services.ParseMealQueryParams(c)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "INVALID_DATE" {
			c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse query params"})
		return
	}

	result, err := h.mealService.GetMeals(c.Request.Context(), services.GetMealsInput{
		AthleteID: athleteID.(string),
		UserRole:  userRole.(models.UserRole),
		Limit:     limit,
		Offset:    offset,
		StartDate: startDate,
		EndDate:   endDate,
		Date:      date,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "FORBIDDEN" {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve meals", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"meals": result.Meals,
		"count": result.Count,
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

	var req UpdateMealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	meal, err := h.mealService.UpdateMeal(c.Request.Context(), services.UpdateMealInput{
		MealID:    mealID,
		AthleteID: athleteID.(string),
		Date:      req.Date,
		MealType:  req.MealType,
		Items:     req.Items,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "MEAL_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Meal not found"})
				return
			}
		}
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

	err := h.mealService.DeleteMeal(c.Request.Context(), mealID, athleteID.(string))
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			if svcErr.Code == "FORBIDDEN" {
				c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
				return
			}
			if svcErr.Code == "MEAL_NOT_FOUND" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Meal not found"})
				return
			}
		}
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

	limit, offset, startDate, endDate, _, err := services.ParseMealQueryParams(c)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "INVALID_DATE" {
			c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse query params"})
		return
	}

	mealType := c.Query("mealType")

	result, err := h.mealService.GetClientMeals(c.Request.Context(), services.GetClientMealsInput{
		TrainerID: trainerID.(string),
		ClientID:  clientID,
		Limit:     limit,
		Offset:    offset,
		StartDate: startDate,
		EndDate:   endDate,
		MealType:  mealType,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok && svcErr.Code == "FORBIDDEN" {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve meals", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"meals": result.Meals,
		"count": result.Count,
	})
}
