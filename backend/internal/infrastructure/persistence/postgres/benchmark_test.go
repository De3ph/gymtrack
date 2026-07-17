package postgres

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"
)

func BenchmarkUserRepository_GetByID(b *testing.B) {
	pool, cleanup := testutils.SetupTestPostgresDB(b)
	defer cleanup()

	repo := NewPostgresUserRepository(pool)
	ctx := context.Background()

	user := &models.User{
		Username:     "bench_user",
		Email:        "bench@example.com",
		PasswordHash: "hashedpassword123",
		Role:         models.RoleAthlete,
		Profile: models.UserProfile{
			Name: "Bench User",
			Bio:  "A benchmark test user with a longer profile to exercise JSONB deserialization in a more realistic way",
		},
	}
	if err := repo.CreateUser(ctx, user); err != nil {
		b.Fatalf("failed to create user: %v", err)
	}

	b.ResetTimer()
	for b.Loop() {
		_, err := repo.GetUserByID(ctx, user.UserID)
		if err != nil {
			b.Fatalf("GetUserByID failed: %v", err)
		}
	}
}

func BenchmarkWorkoutRepository_GetByAthleteID(b *testing.B) {
	pool, cleanup := testutils.SetupTestPostgresDB(b)
	defer cleanup()

	userRepo := NewPostgresUserRepository(pool)
	workoutRepo := NewPostgresWorkoutRepository(pool)
	ctx := context.Background()

	athlete := &models.User{
		Username:     "bench_athlete",
		Email:        "bench_athlete@example.com",
		PasswordHash: "hash",
		Role:         models.RoleAthlete,
		Profile:      models.UserProfile{Name: "Bench Athlete"},
	}
	if err := userRepo.CreateUser(ctx, athlete); err != nil {
		b.Fatalf("failed to create athlete: %v", err)
	}

	exercises := []models.WorkoutExercise{
		{
			ExerciseID: 1,
			Name:       "Bench Press",
			Sets: []models.ExerciseSet{
				{SetID: "s1", Weight: 80, WeightUnit: models.WeightUnitKg, Reps: 10, RestTime: 90, Completed: true},
				{SetID: "s2", Weight: 85, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90, Completed: false},
			},
			Notes: "Warm up first",
		},
		{
			ExerciseID: 2,
			Name:       "Squats",
			Sets: []models.ExerciseSet{
				{SetID: "s3", Weight: 100, WeightUnit: models.WeightUnitKg, Reps: 5, RestTime: 120, Completed: true},
				{SetID: "s4", Weight: 110, WeightUnit: models.WeightUnitKg, Reps: 3, RestTime: 120, Completed: true},
			},
		},
		{
			ExerciseID: 3,
			Name:       "Deadlift",
			Sets: []models.ExerciseSet{
				{SetID: "s5", Weight: 140, WeightUnit: models.WeightUnitKg, Reps: 5, RestTime: 180, Completed: true},
			},
		},
	}

	// Create 10 workouts for realistic pagination benchmark
	for i := 0; i < 10; i++ {
		w := &models.Workout{
			AthleteID: athlete.UserID,
			Date:      time.Date(2024, time.January, 15-i, 10, 0, 0, 0, time.UTC),
			Exercises: exercises,
		}
		if err := workoutRepo.Create(ctx, w); err != nil {
			b.Fatalf("failed to create workout %d: %v", i, err)
		}
	}

	b.ResetTimer()
	for b.Loop() {
		workouts, err := workoutRepo.GetByAthleteID(ctx, athlete.UserID, 20, 0)
		if err != nil {
			b.Fatalf("GetByAthleteID failed: %v", err)
		}
		_ = workouts
	}
}

func BenchmarkExerciseRepository_GetByID(b *testing.B) {
	pool, cleanup := testutils.SetupTestPostgresDB(b)
	defer cleanup()

	repo := NewPostgresExerciseRepository(pool)
	ctx := context.Background()

	// Seed muscle_groups and equipment_definitions via testutils
	ex := &models.Exercise{
		Name:          "Bench Press",
		Category:      "strength",
		MuscleGroupID: 1, // chest — seeded by testutils
		EquipmentID:   1, // barbell — seeded by testutils
		Instructions:  "Lie on bench, grip bar, lower to chest, press up",
	}
	if err := repo.CreateExercise(ctx, ex); err != nil {
		b.Fatalf("failed to create exercise: %v", err)
	}

	b.ResetTimer()
	for b.Loop() {
		fetched, err := repo.GetExerciseByID(ctx, ex.ExerciseID)
		if err != nil {
			b.Fatalf("GetExerciseByID failed: %v", err)
		}
		if fetched == nil {
			b.Fatal("GetExerciseByID returned nil")
		}
	}
}

func BenchmarkJSONBMarshal_WorkoutExercises(b *testing.B) {
	exercises := []models.WorkoutExercise{
		{
			ExerciseID: 1,
			Name:       "Bench Press",
			Sets: []models.ExerciseSet{
				{SetID: "s1", Weight: 80, WeightUnit: models.WeightUnitKg, Reps: 10, RestTime: 90, Completed: true},
				{SetID: "s2", Weight: 85, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90, Completed: false},
				{SetID: "s3", Weight: 90, WeightUnit: models.WeightUnitKg, Reps: 6, RestTime: 90, Completed: true},
			},
			Notes: "Heavy day",
		},
		{
			ExerciseID: 2,
			Name:       "Squats",
			Sets: []models.ExerciseSet{
				{SetID: "s4", Weight: 100, WeightUnit: models.WeightUnitKg, Reps: 5, RestTime: 120, Completed: true},
				{SetID: "s5", Weight: 110, WeightUnit: models.WeightUnitKg, Reps: 3, RestTime: 120, Completed: true},
				{SetID: "s6", Weight: 120, WeightUnit: models.WeightUnitKg, Reps: 1, RestTime: 180, Completed: true},
			},
		},
	}

	b.ResetTimer()
	b.ReportAllocs()
	for b.Loop() {
		data, err := json.Marshal(exercises)
		if err != nil {
			b.Fatalf("Marshal failed: %v", err)
		}
		_ = data
	}
}

func BenchmarkJSONBUnmarshal_WorkoutExercises(b *testing.B) {
	exercises := []models.WorkoutExercise{
		{
			ExerciseID: 1,
			Name:       "Bench Press",
			Sets: []models.ExerciseSet{
				{SetID: "s1", Weight: 80, WeightUnit: models.WeightUnitKg, Reps: 10, RestTime: 90, Completed: true},
				{SetID: "s2", Weight: 85, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90, Completed: false},
				{SetID: "s3", Weight: 90, WeightUnit: models.WeightUnitKg, Reps: 6, RestTime: 90, Completed: true},
			},
			Notes: "Heavy day",
		},
		{
			ExerciseID: 2,
			Name:       "Squats",
			Sets: []models.ExerciseSet{
				{SetID: "s4", Weight: 100, WeightUnit: models.WeightUnitKg, Reps: 5, RestTime: 120, Completed: true},
				{SetID: "s5", Weight: 110, WeightUnit: models.WeightUnitKg, Reps: 3, RestTime: 120, Completed: true},
				{SetID: "s6", Weight: 120, WeightUnit: models.WeightUnitKg, Reps: 1, RestTime: 180, Completed: true},
			},
		},
	}

	data, err := json.Marshal(exercises)
	if err != nil {
		b.Fatalf("Marshal failed: %v", err)
	}

	b.ResetTimer()
	b.ReportAllocs()
	for b.Loop() {
		var result []models.WorkoutExercise
		if err := json.Unmarshal(data, &result); err != nil {
			b.Fatalf("Unmarshal failed: %v", err)
		}
		_ = result
	}
}
