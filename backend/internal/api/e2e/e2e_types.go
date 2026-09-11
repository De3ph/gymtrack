package e2e

import (
	"time"

	"gymtrack-backend/internal/domain/models"
)

// TestJWTSecret is the JWT secret used for testing.
const TestJWTSecret = "test-jwt-secret-at-least-32-chars-long!!"

// TimeNow is a fixed time used for deterministic test data.
var TimeNow = time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)

// TestMuscleGroups lists the muscle group codes available in seeded data.
var TestMuscleGroups = []string{"chest", "back", "shoulders", "biceps", "triceps", "forearms", "core", "quadriceps", "hamstrings", "glutes", "calves", "full-body"}

// TestEquipment lists the equipment codes available in seeded data.
var TestEquipment = []string{"barbell", "dumbbell", "kettlebell", "cable", "machine", "bodyweight", "resistance-band", "medicine-ball", "foam-roller", "sled"}

// TestUserRole is a helper to convert string to models.UserRole.
func TestUserRole(s string) models.UserRole {
	return models.UserRole(s)
}

// TestRelationshipStatus is a helper to convert string to models.RelationshipStatus.
func TestRelationshipStatus(s string) models.RelationshipStatus {
	return models.RelationshipStatus(s)
}

// TestMealType is a helper to convert string to models.MealType.
func TestMealType(s string) models.MealType {
	return models.MealType(s)
}

// TestCommentTarget is a helper to convert string to models.TargetType.
func TestCommentTarget(s string) models.TargetType {
	return models.TargetType(s)
}
