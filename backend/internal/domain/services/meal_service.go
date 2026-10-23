package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type MealService struct {
	mealRepo         repositories.MealRepository
	relationshipRepo repositories.RelationshipRepository
	validator        *validator.Validate
}

func NewMealService(mealRepo repositories.MealRepository, relationshipRepo repositories.RelationshipRepository) *MealService {
	return &MealService{
		mealRepo:         mealRepo,
		relationshipRepo: relationshipRepo,
		validator:        validator.New(),
	}
}

type CreateMealInput struct {
	AthleteID int
	Date      time.Time
	MealType  models.MealType
	Items     []models.FoodItem
	UserRole  models.UserRole
}

func (s *MealService) CreateMeal(ctx context.Context, input CreateMealInput) (*models.Meal, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can log meals. Trainers cannot log meals on behalf of clients", "FORBIDDEN")
	}

	if err := s.validator.Struct(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	meal := models.NewMeal(input.AthleteID, input.Date, input.MealType, input.Items)

	if err := s.validator.Struct(meal); err != nil {
		return nil, fmt.Errorf("meal validation failed: %w", err)
	}

	if err := s.mealRepo.Create(ctx, meal); err != nil {
		return nil, fmt.Errorf("failed to create meal: %w", err)
	}

	return meal, nil
}

type GetMealInput struct {
	MealID        int
	RequesterID   int
	RequesterRole models.UserRole
}

func (s *MealService) GetMeal(ctx context.Context, input GetMealInput) (*models.Meal, error) {
	meal, err := s.mealRepo.GetByID(ctx, input.MealID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrMealNotFound
		}
		return nil, fmt.Errorf("failed to get meal: %w", err)
	}

	if input.RequesterRole == models.RoleAthlete {
		if meal.AthleteID != input.RequesterID {
			return nil, NewServiceError("This meal belongs to another athlete. You can only view your own meals", "FORBIDDEN")
		}
	} else if input.RequesterRole == models.RoleTrainer {
		hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.RequesterID, meal.AthleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify relationship: %w", err)
		}
		if !hasActive {
			return nil, NewServiceError("You don't have an active coaching relationship with this athlete, so you can't view their meals", "FORBIDDEN")
		}
	}

	return meal, nil
}

type GetMealsInput struct {
	AthleteID int
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
		return nil, NewServiceError("Only athletes can view their meal history. Trainers, please use the client meals view", "FORBIDDEN")
	}

	meals := make([]*models.Meal, 0)
	var err error

	if input.Date != "" {
		parsedDate, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			return nil, NewServiceError("Invalid date format. Please use YYYY-MM-DD format, e.g. 2026-09-06", "INVALID_DATE")
		}

		startDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, parsedDate.Location())
		endDate := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 23, 59, 59, 999999999, parsedDate.Location())

		meals, err = s.mealRepo.GetByAthleteDateRange(ctx, input.AthleteID, startDate, endDate)
	} else if input.StartDate != nil && input.EndDate != nil {
		meals, err = s.mealRepo.GetByAthleteDateRange(ctx, input.AthleteID, *input.StartDate, *input.EndDate)
	} else {
		meals, err = s.mealRepo.GetByAthleteID(ctx, input.AthleteID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve meals: %w", err)
	}

	return &GetMealsOutput{
		Meals: meals,
		Count: len(meals),
	}, nil
}

type GetClientMealsInput struct {
	TrainerID int
	ClientID  int
	Limit     int
	Offset    int
	StartDate *time.Time
	EndDate   *time.Time
	MealType  string
}

func (s *MealService) GetClientMeals(ctx context.Context, input GetClientMealsInput) (*GetMealsOutput, error) {
	// Single indexed EXISTS instead of scanning the trainer's whole
	// relationship set and matching on the athlete in Go.
	hasActiveRelationship, err := s.relationshipRepo.HasActiveRelationship(ctx, input.TrainerID, input.ClientID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}

	if !hasActiveRelationship {
		return nil, NewServiceError("You don't have an active coaching relationship with this client, so you can't view their meals", "FORBIDDEN")
	}

	meals := make([]*models.Meal, 0)

	if input.StartDate != nil && input.EndDate != nil {
		meals, err = s.mealRepo.GetByAthleteDateRange(ctx, input.ClientID, *input.StartDate, *input.EndDate)
	} else {
		meals, err = s.mealRepo.GetByAthleteID(ctx, input.ClientID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve meals: %w", err)
	}

	if input.MealType != "" {
		filtered := make([]*models.Meal, 0)
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
		startDate, endDate, err = parseRFC3339Range(startDateStr, endDateStr)
		if err != nil {
			return 0, 0, nil, nil, "", err
		}
	}

	return limit, offset, startDate, endDate, date, nil
}
