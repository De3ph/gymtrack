package services

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type MealService struct {
	mealRepo          repositories.MealRepository
	relationshipRepo  repositories.RelationshipRepository
	validator         *validator.Validate
}

func NewMealService(mealRepo repositories.MealRepository, relationshipRepo repositories.RelationshipRepository) *MealService {
	return &MealService{
		mealRepo:         mealRepo,
		relationshipRepo: relationshipRepo,
		validator:        validator.New(),
	}
}

type CreateMealInput struct {
	AthleteID string
	Date      time.Time
	MealType  models.MealType
	Items     []models.FoodItem
	UserRole  models.UserRole
}

func (s *MealService) CreateMeal(ctx context.Context, input CreateMealInput) (*models.Meal, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can create meals", "FORBIDDEN")
	}

	if err := s.validator.Struct(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	meal := models.NewMeal(input.AthleteID, input.Date, input.MealType, input.Items)

	if err := s.validator.Struct(meal); err != nil {
		return nil, fmt.Errorf("meal validation failed: %w", err)
	}

	if err := s.mealRepo.Create(meal); err != nil {
		return nil, fmt.Errorf("failed to create meal: %w", err)
	}

	return meal, nil
}

type GetMealInput struct {
	MealID       string
	RequesterID  string
	RequesterRole models.UserRole
}

func (s *MealService) GetMeal(ctx context.Context, input GetMealInput) (*models.Meal, error) {
	meal, err := s.mealRepo.GetByID(input.MealID)
	if err != nil {
		return nil, ErrMealNotFound
	}

	if input.RequesterRole == models.RoleAthlete && meal.AthleteID != input.RequesterID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	return meal, nil
}

type GetMealsInput struct {
	AthleteID string
	UserRole  models.UserRole
	Limit     int
	Offset    int
	StartDate *time.Time
	EndDate   *time.Time
	Date      string
}

type GetMealsOutput struct {
	Meals []*models.Meal
	Count int
}

func (s *MealService) GetMeals(ctx context.Context, input GetMealsInput) (*GetMealsOutput, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can list their meals", "FORBIDDEN")
	}

	var meals []*models.Meal
	var err error

	if input.Date != "" {
		parsedDate, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			return nil, NewServiceError("Invalid date format. Use YYYY-MM-DD format", "INVALID_DATE")
		}

		startDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, parsedDate.Location())
		endDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 23, 59, 59, 999999999, parsedDate.Location())

		meals, err = s.mealRepo.GetByAthleteDateRange(input.AthleteID, startDate, endDate)
	} else if input.StartDate != nil && input.EndDate != nil {
		meals, err = s.mealRepo.GetByAthleteDateRange(input.AthleteID, *input.StartDate, *input.EndDate)
	} else {
		meals, err = s.mealRepo.GetByAthleteID(input.AthleteID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve meals: %w", err)
	}

	return &GetMealsOutput{
		Meals: meals,
		Count: len(meals),
	}, nil
}

type UpdateMealInput struct {
	MealID    string
	AthleteID string
	Date      time.Time
	MealType  models.MealType
	Items     []models.FoodItem
}

func (s *MealService) UpdateMeal(ctx context.Context, input UpdateMealInput) (*models.Meal, error) {
	meal, err := s.mealRepo.GetByID(input.MealID)
	if err != nil {
		return nil, ErrMealNotFound
	}

	if meal.AthleteID != input.AthleteID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	if !meal.CanEdit() {
		return nil, NewServiceError("Cannot edit meal after 24 hours", "FORBIDDEN")
	}

	if err := s.validator.Struct(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	meal.Date = input.Date
	meal.MealType = input.MealType
	meal.Items = input.Items

	if err := s.mealRepo.Update(meal); err != nil {
		return nil, fmt.Errorf("failed to update meal: %w", err)
	}

	return meal, nil
}

func (s *MealService) DeleteMeal(ctx context.Context, mealID, athleteID string) error {
	meal, err := s.mealRepo.GetByID(mealID)
	if err != nil {
		return ErrMealNotFound
	}

	if meal.AthleteID != athleteID {
		return NewServiceError("Access denied", "FORBIDDEN")
	}

	if !meal.CanEdit() {
		return NewServiceError("Cannot delete meal after 24 hours", "FORBIDDEN")
	}

	if err := s.mealRepo.Delete(mealID); err != nil {
		return fmt.Errorf("failed to delete meal: %w", err)
	}

	return nil
}

type GetClientMealsInput struct {
	TrainerID   string
	ClientID    string
	Limit       int
	Offset      int
	StartDate   *time.Time
	EndDate     *time.Time
	MealType    string
}

func (s *MealService) GetClientMeals(ctx context.Context, input GetClientMealsInput) (*GetMealsOutput, error) {
	relationships, err := s.relationshipRepo.GetByTrainerID(ctx, input.TrainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}

	hasActiveRelationship := false
	for _, rel := range relationships {
		if rel.AthleteID == input.ClientID && rel.IsActive() {
			hasActiveRelationship = true
			break
		}
	}

	if !hasActiveRelationship {
		return nil, NewServiceError("You don't have an active relationship with this client", "FORBIDDEN")
	}

	var meals []*models.Meal

	if input.StartDate != nil && input.EndDate != nil {
		meals, err = s.mealRepo.GetByAthleteDateRange(input.ClientID, *input.StartDate, *input.EndDate)
	} else {
		meals, err = s.mealRepo.GetByAthleteID(input.ClientID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve meals: %w", err)
	}

	if input.MealType != "" {
		var filtered []*models.Meal
		for _, m := range meals {
			if strings.EqualFold(string(m.MealType), input.MealType) {
				filtered = append(filtered, m)
			}
		}
		meals = filtered
	}

	return &GetMealsOutput{
		Meals: meals,
		Count: len(meals),
	}, nil
}

func ParseMealQueryParams(c interface {
	DefaultQuery(key, def string) string
	Query(key string) string
}) (limit, offset int, startDate, endDate *time.Time, date string, err error) {
	limit, _ = strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ = strconv.Atoi(c.DefaultQuery("offset", "0"))

	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	date = c.Query("date")

	if startDateStr != "" && endDateStr != "" {
		start, err1 := time.Parse(time.RFC3339, startDateStr)
		end, err2 := time.Parse(time.RFC3339, endDateStr)
		if err1 != nil || err2 != nil {
			return 0, 0, nil, nil, "", NewServiceError("Invalid date format. Use RFC3339 format", "INVALID_DATE")
		}
		startDate = &start
		endDate = &end
	}

	return limit, offset, startDate, endDate, date, nil
}
