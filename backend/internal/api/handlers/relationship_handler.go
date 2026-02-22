package handlers

import (
	"fmt"
	"net/http"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type RelationshipHandler struct {
	invitationService *services.InvitationService
	relationshipRepo  *repositories.RelationshipRepository
	userRepo          repositories.UserRepository
	workoutRepo       *repositories.WorkoutRepository
	mealRepo          *repositories.MealRepository
	validator         *validator.Validate
}

func NewRelationshipHandler(
	invitationService *services.InvitationService,
	relationshipRepo *repositories.RelationshipRepository,
	userRepo repositories.UserRepository,
	workoutRepo *repositories.WorkoutRepository,
	mealRepo *repositories.MealRepository,
) *RelationshipHandler {
	return &RelationshipHandler{
		invitationService: invitationService,
		relationshipRepo:  relationshipRepo,
		userRepo:          userRepo,
		workoutRepo:       workoutRepo,
		mealRepo:          mealRepo,
		validator:         validator.New(),
	}
}

// GenerateInvitationRequest represents the request to generate an invitation.
// This endpoint is accessible only to trainers.
type GenerateInvitationRequest struct{}

// AcceptInvitationRequest represents the request to accept an invitation.
// Requires an 8-character invitation code.
type AcceptInvitationRequest struct {
	Code string `json:"code" validate:"required,len=8"`
}

// GetClientDetailsResponse contains detailed information about a client including relationship, athlete profile, and stats.
type GetClientDetailsResponse struct {
	Relationship *models.Relationship `json:"relationship"`
	Athlete      *models.User         `json:"athlete"`
	Stats        *ClientStats         `json:"stats"`
}

// ClientStats contains summary statistics for an athlete client.
type ClientStats struct {
	TotalWorkouts    int `json:"totalWorkouts"`
	TotalMeals       int `json:"totalMeals"`
	WorkoutsThisWeek int `json:"workoutsThisWeek"`
	MealsThisWeek    int `json:"mealsThisWeek"`
}

// WorkoutStats contains detailed workout statistics including volume trends, exercise breakdown, and consistency.
type WorkoutStats struct {
	TotalVolume       float64             `json:"totalVolume"`
	WeeklyVolume      []WeeklyVolumePoint `json:"weeklyVolume"`
	ExerciseBreakdown []ExerciseStat      `json:"exerciseBreakdown"`
	Consistency       float64             `json:"consistency"` // percentage
}

// WeeklyVolumePoint represents workout volume for a specific week.
type WeeklyVolumePoint struct {
	Week     string  `json:"week"`
	Volume   float64 `json:"volume"`
	Workouts int     `json:"workouts"`
}

// ExerciseStat contains statistics for a specific exercise.
type ExerciseStat struct {
	Name      string  `json:"name"`
	TotalSets int     `json:"totalSets"`
	TotalReps int     `json:"totalReps"`
	MaxWeight float64 `json:"maxWeight"`
}

// MealStats contains detailed meal and nutrition statistics including averages, weekly trends, and meal type breakdown.
type MealStats struct {
	AverageCalories   float64         `json:"averageCalories"`
	AverageProtein    float64         `json:"averageProtein"`
	AverageCarbs      float64         `json:"averageCarbs"`
	AverageFats       float64         `json:"averageFats"`
	WeeklyAverages    []WeeklyMealAvg `json:"weeklyAverages"`
	MealTypeBreakdown []MealTypeStat  `json:"mealTypeBreakdown"`
}

// WeeklyMealAvg represents average nutrition metrics for a specific week.
type WeeklyMealAvg struct {
	Week     string  `json:"week"`
	Calories float64 `json:"calories"`
	Protein  float64 `json:"protein"`
	Carbs    float64 `json:"carbs"`
	Fats     float64 `json:"fats"`
}

// MealTypeStat represents the count of meals for a specific meal type.
type MealTypeStat struct {
	MealType string `json:"mealType"`
	Count    int    `json:"count"`
}

// GetClientStatsResponse contains comprehensive workout and meal statistics for a client.
type GetClientStatsResponse struct {
	WorkoutStats *WorkoutStats `json:"workoutStats"`
	MealStats    *MealStats    `json:"mealStats"`
}

// GenerateInvitation generates a new invitation code for a trainer.
// @Summary Generate invitation code
// @Description Trainers generate an 8-character invitation code to share with athletes. The code expires after a set period.
// @Tags Relationships
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 201 {object} map[string]interface{} "Invitation generated successfully" {"message":"Invitation generated successfully","invitation":{"code":"string","expiresAt":"string"}}
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"Only trainers can generate invitations"}
// @Failure 500 {object} map[string]string "Internal server error" {"error":"Failed to generate invitation","details":"error message"}
// @Router /relationships/invite [post]
func (h *RelationshipHandler) GenerateInvitation(c *gin.Context) {
	// Extract trainer ID from JWT token
	trainerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is a trainer
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can generate invitations"})
		return
	}

	// Generate invitation
	invitation, err := h.invitationService.GenerateInvitation(trainerID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate invitation", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Invitation generated successfully",
		"invitation": gin.H{
			"code":      invitation.Code,
			"expiresAt": invitation.ExpiresAt,
		},
	})
}

// AcceptInvitation allows an athlete to accept a trainer's invitation.
// @Summary Accept invitation
// @Description Athletes accept an invitation by providing the 8-character code generated by a trainer.
// @Tags Relationships
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body AcceptInvitationRequest true "Invitation acceptance request"
// @Success 200 {object} map[string]interface{} "Invitation accepted successfully" {"message":"Invitation accepted successfully","relationship": models.Relationship}
// @Failure 400 {object} map[string]string "Bad request" {"error":"Invalid request body"} or {"error":"Validation failed"} or {"error":"Invalid invitation code"}
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"Only athletes can accept invitations"}
// @Router /relationships/accept [post]
func (h *RelationshipHandler) AcceptInvitation(c *gin.Context) {
	// Extract athlete ID from JWT token
	athleteID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is an athlete
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can accept invitations"})
		return
	}

	var req AcceptInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	// Accept invitation
	relationship, err := h.invitationService.AcceptInvitation(req.Code, athleteID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Invitation accepted successfully",
		"relationship": relationship,
	})
}

// GetMyTrainer retrieves the athlete's current trainer and any pending invitations.
// @Summary Get my trainer
// @Description Athletes can view their currently assigned trainer and any pending invitation codes.
// @Tags Relationships
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success" {"pendingInvitations": []models.Invitation, "activeTrainer": map[string]interface{}{"relationship": models.Relationship, "trainer": models.User}}
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"Only athletes can view their trainer"}
// @Failure 500 {object} map[string]string "Internal server error" {"error":"Failed to retrieve invitations/relationships"}
// @Router /relationships/my-trainer [get]
func (h *RelationshipHandler) GetMyTrainer(c *gin.Context) {
	// Extract athlete ID from JWT token
	athleteID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is an athlete
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleAthlete {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only athletes can view their trainer"})
		return
	}

	// Get pending invitations
	invitations, err := h.invitationService.GetPendingInvitations(athleteID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve invitations", "details": err.Error()})
		return
	}

	// Get active trainer relationship
	activeRelationship, err := h.relationshipRepo.GetByAthleteID(athleteID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve relationships", "details": err.Error()})
		return
	}

	var activeTrainer *gin.H
	if activeRelationship != nil {
		// Get trainer details
		trainer, err := h.userRepo.GetUserByID(c.Request.Context(), activeRelationship.TrainerID)
		if err == nil {
			activeTrainer = &gin.H{
				"relationship": activeRelationship,
				"trainer":      trainer,
			}
		}
	}

	response := gin.H{
		"pendingInvitations": invitations,
	}
	if activeTrainer != nil {
		response["activeTrainer"] = *activeTrainer
	}

	c.JSON(http.StatusOK, response)
}

// GetMyClients retrieves a trainer's list of active clients.
// @Summary Get my clients
// @Description Trainers can view all their active client relationships with athlete profiles.
// @Tags Relationships
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success" {"clients": []ClientWithAthlete, "count": int}
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"Only trainers can view their clients"}
// @Failure 500 {object} map[string]string "Internal server error" {"error":"Failed to retrieve clients"}
// @Router /relationships/my-clients [get]
func (h *RelationshipHandler) GetMyClients(c *gin.Context) {
	// Extract trainer ID from JWT token
	trainerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is a trainer
	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view their clients"})
		return
	}

	// Get all relationships for this trainer
	relationships, err := h.relationshipRepo.GetByTrainerID(trainerID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve clients", "details": err.Error()})
		return
	}

	// Filter for active relationships only
	var activeClients []*models.Relationship
	for _, rel := range relationships {
		if rel.IsActive() {
			activeClients = append(activeClients, rel)
		}
	}

	// Fetch athlete details for each client
	type ClientWithAthlete struct {
		Relationship *models.Relationship `json:"relationship"`
		Athlete      *models.User         `json:"athlete"`
	}

	var clientsWithAthlete []ClientWithAthlete
	for _, rel := range activeClients {
		athlete, err := h.userRepo.GetUserByID(c.Request.Context(), rel.AthleteID)
		if err != nil {
			continue
		}
		clientsWithAthlete = append(clientsWithAthlete, ClientWithAthlete{
			Relationship: rel,
			Athlete:      athlete,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"clients": clientsWithAthlete,
		"count":   len(clientsWithAthlete),
	})
}

// GetClientDetails retrieves detailed information about a specific client including profile, relationship, and summary statistics.
// @Summary Get client details
// @Description Trainers can view comprehensive details for a specific client including workout/meal counts and current week activity.
// @Tags Relationships
// @Produce json
// @Security BearerAuth
// @Param id path string true "Client (athlete) user ID" example("user-123")
// @Success 200 {object} GetClientDetailsResponse "Success"
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"Only trainers can view client details"} or {"error":"You don't have an active relationship with this client"}
// @Failure 500 {object} map[string]string "Internal server error" {"error":"Failed to verify relationship/get athlete details"}
// @Router /relationships/client/{id} [get]
func (h *RelationshipHandler) GetClientDetails(c *gin.Context) {
	clientID := c.Param("id")
	trainerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view client details"})
		return
	}

	// Verify relationship
	relationships, err := h.relationshipRepo.GetByTrainerID(trainerID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify relationship", "details": err.Error()})
		return
	}

	var clientRelationship *models.Relationship
	for _, rel := range relationships {
		if rel.AthleteID == clientID && rel.IsActive() {
			clientRelationship = rel
			break
		}
	}

	if clientRelationship == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have an active relationship with this client"})
		return
	}

	// Get athlete details
	athlete, err := h.userRepo.GetUserByID(c.Request.Context(), clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get athlete details", "details": err.Error()})
		return
	}

	// Get stats
	allWorkouts, _ := h.workoutRepo.GetByAthleteID(clientID, 1000, 0)
	allMeals, _ := h.mealRepo.GetByAthleteID(clientID, 1000, 0)

	// Calculate this week's stats
	now := time.Now()
	weekStart := now.AddDate(0, 0, -int(now.Weekday()))
	weekStart = weekStart.Truncate(24 * time.Hour)

	workoutsThisWeek := 0
	mealsThisWeek := 0
	for _, w := range allWorkouts {
		if w.Date.After(weekStart) {
			workoutsThisWeek++
		}
	}
	for _, m := range allMeals {
		if m.Date.After(weekStart) {
			mealsThisWeek++
		}
	}

	stats := &ClientStats{
		TotalWorkouts:    len(allWorkouts),
		TotalMeals:       len(allMeals),
		WorkoutsThisWeek: workoutsThisWeek,
		MealsThisWeek:    mealsThisWeek,
	}

	c.JSON(http.StatusOK, GetClientDetailsResponse{
		Relationship: clientRelationship,
		Athlete:      athlete,
		Stats:        stats,
	})
}

// TerminateRelationship ends an active trainer-athlete relationship.
// @Summary Terminate relationship
// @Description Either the trainer or athlete can terminate the relationship. This action deactivates the relationship and removes the trainer assignment from the athlete's profile.
// @Tags Relationships
// @Produce json
// @Security BearerAuth
// @Param id path string true "Relationship ID" example("rel-123")
// @Success 200 {object} map[string]interface{} "Relationship terminated successfully" {"message":"Relationship terminated successfully","relationship": models.Relationship}
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"You are not authorized to terminate this relationship"}
// @Failure 404 {object} map[string]string "Not found" {"error":"Relationship not found"}
// @Failure 500 {object} map[string]string "Internal server error" {"error":"Failed to terminate relationship/get athlete/update profile"}
// @Router /relationships/{id} [delete]
func (h *RelationshipHandler) TerminateRelationship(c *gin.Context) {
	relationshipID := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	// Get the relationship
	relationship, err := h.relationshipRepo.GetByID(relationshipID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Relationship not found"})
		return
	}

	// Check if user is authorized (must be the trainer or athlete in the relationship)
	isAuthorized := false
	if userRole == models.RoleTrainer && relationship.TrainerID == userID.(string) {
		isAuthorized = true
	} else if userRole == models.RoleAthlete && relationship.AthleteID == userID.(string) {
		isAuthorized = true
	}

	if !isAuthorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to terminate this relationship"})
		return
	}

	// Terminate the relationship
	relationship.Terminate()
	if err := h.relationshipRepo.Update(relationship); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to terminate relationship", "details": err.Error()})
		return
	}

	// Update athlete's profile to remove trainer assignment
	athlete, err := h.userRepo.GetUserByID(c.Request.Context(), relationship.AthleteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get athlete", "details": err.Error()})
		return
	}
	athlete.Profile.TrainerAssignment = ""
	if err := h.userRepo.UpdateUser(c.Request.Context(), athlete); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update athlete profile", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Relationship terminated successfully",
		"relationship": relationship,
	})
}

// GetClientStats retrieves comprehensive workout and meal statistics for a client.
// @Summary Get client statistics
// @Description Trainers can view detailed analytics including workout volume trends, exercise breakdown, consistency scores, and nutrition averages for a specific client.
// @Tags Relationships
// @Produce json
// @Security BearerAuth
// @Param id path string true "Client (athlete) user ID" example("user-123")
// @Success 200 {object} GetClientStatsResponse "Success" {"workoutStats": WorkoutStats, "mealStats": MealStats}
// @Failure 401 {object} map[string]string "Unauthorized" {"error":"User not authenticated"}
// @Failure 403 {object} map[string]string "Forbidden" {"error":"Only trainers can view client stats"} or {"error":"You don't have an active relationship with this client"}
// @Failure 500 {object} map[string]string "Internal server error" {"error":"Failed to verify relationship"}
// @Router /relationships/client/{id}/stats [get]
func (h *RelationshipHandler) GetClientStats(c *gin.Context) {
	clientID := c.Param("id")
	trainerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists || userRole.(models.UserRole) != models.RoleTrainer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only trainers can view client stats"})
		return
	}

	// Verify relationship
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

	// Get all workouts and meals
	allWorkouts, _ := h.workoutRepo.GetByAthleteID(clientID, 1000, 0)
	allMeals, _ := h.mealRepo.GetByAthleteID(clientID, 1000, 0)

	// Calculate workout stats
	workoutStats := calculateWorkoutStats(allWorkouts)

	// Calculate meal stats
	mealStats := calculateMealStats(allMeals)

	c.JSON(http.StatusOK, GetClientStatsResponse{
		WorkoutStats: workoutStats,
		MealStats:    mealStats,
	})
}

func calculateWorkoutStats(workouts []*models.Workout) *WorkoutStats {
	var totalVolume float64
	exerciseMap := make(map[string]*ExerciseStat)
	var weeklyData []WeeklyVolumePoint

	// Group workouts by week
	weekMap := make(map[string][]*models.Workout)

	for _, w := range workouts {
		// Calculate volume (sets * reps * weight)
		for _, e := range w.Exercises {
			for _, reps := range e.Reps {
				volume := float64(e.Sets) * float64(reps) * e.Weight
				totalVolume += volume
			}

			// Exercise breakdown
			if _, ok := exerciseMap[e.Name]; !ok {
				exerciseMap[e.Name] = &ExerciseStat{Name: e.Name}
			}
			exerciseMap[e.Name].TotalSets += e.Sets
			maxWeight := exerciseMap[e.Name].MaxWeight
			if e.Weight > maxWeight {
				exerciseMap[e.Name].MaxWeight = e.Weight
			}
			for _, reps := range e.Reps {
				exerciseMap[e.Name].TotalReps += reps
			}
		}

		// Group by week
		year, week := w.Date.ISOWeek()
		weekKey := fmt.Sprintf("%d-W%02d", year, week)
		weekMap[weekKey] = append(weekMap[weekKey], w)
	}

	// Calculate weekly volume
	for week, ws := range weekMap {
		var weekVol float64
		for _, w := range ws {
			for _, e := range w.Exercises {
				for _, reps := range e.Reps {
					weekVol += float64(e.Sets) * float64(reps) * e.Weight
				}
			}
		}
		weeklyData = append(weeklyData, WeeklyVolumePoint{
			Week:     week,
			Volume:   weekVol,
			Workouts: len(ws),
		})
	}

	// Calculate consistency (percentage of weeks with at least 3 workouts)
	weeksWithWorkouts := 0
	totalWeeks := len(weeklyData)
	if totalWeeks > 0 {
		for _, wd := range weeklyData {
			if wd.Workouts >= 3 {
				weeksWithWorkouts++
			}
		}
	}

	var consistency float64
	if totalWeeks > 0 {
		consistency = float64(weeksWithWorkouts) / float64(totalWeeks) * 100
	}

	// Convert exercise map to slice
	var exerciseBreakdown []ExerciseStat
	for _, es := range exerciseMap {
		exerciseBreakdown = append(exerciseBreakdown, *es)
	}

	return &WorkoutStats{
		TotalVolume:       totalVolume,
		WeeklyVolume:      weeklyData,
		ExerciseBreakdown: exerciseBreakdown,
		Consistency:       consistency,
	}
}

func calculateMealStats(meals []*models.Meal) *MealStats {
	var totalCalories, totalProtein, totalCarbs, totalFats float64
	mealTypeMap := make(map[models.MealType]int)
	weeklyMap := make(map[string][]*models.Meal)

	for _, m := range meals {
		// Calculate totals
		for _, item := range m.Items {
			if item.Calories > 0 {
				totalCalories += item.Calories
			}
			if item.Macros.Protein > 0 || item.Macros.Carbs > 0 || item.Macros.Fats > 0 {
				totalProtein += item.Macros.Protein
				totalCarbs += item.Macros.Carbs
				totalFats += item.Macros.Fats
			}
		}

		// Meal type breakdown
		mealTypeMap[m.MealType]++

		// Weekly averages
		year, week := m.Date.ISOWeek()
		weekKey := fmt.Sprintf("%d-W%02d", year, week)
		weeklyMap[weekKey] = append(weeklyMap[weekKey], m)
	}

	// Calculate averages
	mealCount := float64(len(meals))
	var avgCalories, avgProtein, avgCarbs, avgFats float64
	if mealCount > 0 {
		avgCalories = totalCalories / mealCount
		avgProtein = totalProtein / mealCount
		avgCarbs = totalCarbs / mealCount
		avgFats = totalFats / mealCount
	}

	// Calculate weekly averages
	var weeklyAverages []WeeklyMealAvg
	for week, ws := range weeklyMap {
		var weekCalories, weekProtein, weekCarbs, weekFats float64
		mealCountInWeek := float64(len(ws))
		for _, m := range ws {
			for _, item := range m.Items {
				if item.Calories > 0 {
					weekCalories += item.Calories
				}
				if item.Macros.Protein > 0 || item.Macros.Carbs > 0 || item.Macros.Fats > 0 {
					weekProtein += item.Macros.Protein
					weekCarbs += item.Macros.Carbs
					weekFats += item.Macros.Fats
				}
			}
		}
		if mealCountInWeek > 0 {
			weeklyAverages = append(weeklyAverages, WeeklyMealAvg{
				Week:     week,
				Calories: weekCalories / mealCountInWeek,
				Protein:  weekProtein / mealCountInWeek,
				Carbs:    weekCarbs / mealCountInWeek,
				Fats:     weekFats / mealCountInWeek,
			})
		}
	}

	// Convert meal type map to slice
	var mealTypeBreakdown []MealTypeStat
	for mt, count := range mealTypeMap {
		mealTypeBreakdown = append(mealTypeBreakdown, MealTypeStat{
			MealType: string(mt),
			Count:    count,
		})
	}

	return &MealStats{
		AverageCalories:   avgCalories,
		AverageProtein:    avgProtein,
		AverageCarbs:      avgCarbs,
		AverageFats:       avgFats,
		WeeklyAverages:    weeklyAverages,
		MealTypeBreakdown: mealTypeBreakdown,
	}
}
