package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"gymtrack-backend/internal/domain/models"
	logger "gymtrack-backend/internal/infrastructure/log"
)

const (
	targetUsername      = "de3ph"
	targetEmail         = "de3ph@de3ph.com"
	targetPassword      = "1234567890"
	workoutCount        = 30
	mealCount           = 30
	minWorkoutExercises = 4
)

type catalogExercise struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Category      string `json:"category"`
	MuscleGroupID int    `json:"muscle_group_id"`
	EquipmentID   int    `json:"equipment_id"`
}

func main() {
	logger.InitConsole()
	defer logger.Sync()

	if err := run(); err != nil {
		zap.L().Fatal("seed failed", zap.Error(err))
	}
}

func run() error {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	ctx := context.Background()

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:123456@localhost:5432/gymtrack?sslmode=disable"
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	zap.L().Info("Connected to database")

	// 1. Ensure the target athlete exists (idempotent) with the requested password.
	userID, err := ensureAthlete(ctx, pool)
	if err != nil {
		return err
	}
	zap.L().Info("Athlete ready", zap.Int("user_id", userID))

	// 2. Load the exercise catalog for realistic workout exercises.
	catalog, err := loadExerciseCatalog(ctx, pool)
	if err != nil {
		return err
	}
	zap.L().Info("Exercise catalog loaded", zap.Int("exercises", len(catalog)))

	// 3. Clear any previously seeded meals/workouts for this athlete (idempotent reseed).
	if _, err := pool.Exec(ctx, "DELETE FROM meals WHERE athlete_id = $1", userID); err != nil {
		return fmt.Errorf("clear meals: %w", err)
	}
	if _, err := pool.Exec(ctx, "DELETE FROM workouts WHERE athlete_id = $1", userID); err != nil {
		return fmt.Errorf("clear workouts: %w", err)
	}
	zap.L().Info("Cleared existing seed data", zap.Int("user_id", userID))

	start := time.Now()

	// 4. Seed workouts: 30 on 30 distinct days, each with >= 4 exercises.
	if err := seedWorkouts(ctx, pool, userID, catalog, start); err != nil {
		return err
	}
	zap.L().Info("Seeded workouts", zap.Int("count", workoutCount))

	// 5. Seed meals: 30 on 30 distinct days.
	if err := seedMeals(ctx, pool, userID, start); err != nil {
		return err
	}
	zap.L().Info("Seeded meals", zap.Int("count", mealCount))

	fmt.Println("\n✓ Seed completed")
	fmt.Printf("  User:      %s (user_id=%d, password=%s)\n", targetUsername, userID, targetPassword)
	fmt.Printf("  Workouts:  %d\n", workoutCount)
	fmt.Printf("  Meals:     %d\n", mealCount)
	return nil
}

// ensureAthlete finds or creates the target athlete and sets the required password.
func ensureAthlete(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	var userID int
	var role string
	var status string
	var passwordHash string

	err := pool.QueryRow(ctx,
		"SELECT user_id, role, status, password_hash FROM users WHERE username = $1",
		targetUsername).Scan(&userID, &role, &status, &passwordHash)

	if err == nil {
		// Update password only if it does not already match (bcrypt compare).
		if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(targetPassword)) != nil {
			newHash, hashErr := bcrypt.GenerateFromPassword([]byte(targetPassword), bcrypt.DefaultCost)
			if hashErr != nil {
				return 0, fmt.Errorf("hash password: %w", hashErr)
			}
			if _, updErr := pool.Exec(ctx,
				"UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2",
				string(newHash), userID); updErr != nil {
				return 0, fmt.Errorf("update password: %w", updErr)
			}
			zap.L().Info("Updated password for existing user", zap.Int("user_id", userID))
		}
		return userID, nil
	}

	if err.Error() != "no rows in result set" {
		return 0, fmt.Errorf("lookup user: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(targetPassword), bcrypt.DefaultCost)
	if err != nil {
		return 0, fmt.Errorf("hash password: %w", err)
	}
	profile, _ := json.Marshal(map[string]any{
		"name":         targetUsername,
		"fitnessGoals": "build muscle",
	})
	err = pool.QueryRow(ctx,
		`INSERT INTO users (username, email, password_hash, role, profile)
		 VALUES ($1, $2, $3, 'athlete', $4) RETURNING user_id`,
		targetUsername, targetEmail, string(hash), string(profile)).Scan(&userID)
	if err != nil {
		return 0, fmt.Errorf("create user: %w", err)
	}
	zap.L().Info("Created new athlete user", zap.Int("user_id", userID))
	return userID, nil
}

func loadExerciseCatalog(ctx context.Context, pool *pgxpool.Pool) ([]catalogExercise, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, name, category, COALESCE(muscle_group_id, 0), COALESCE(equipment_id, 0)
		 FROM exercises ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("query exercises: %w", err)
	}
	defer rows.Close()

	catalog := make([]catalogExercise, 0)
	for rows.Next() {
		var ex catalogExercise
		if err := rows.Scan(&ex.ID, &ex.Name, &ex.Category, &ex.MuscleGroupID, &ex.EquipmentID); err != nil {
			return nil, fmt.Errorf("scan exercise: %w", err)
		}
		catalog = append(catalog, ex)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate exercises: %w", err)
	}
	return catalog, nil
}

// distinctPastDays returns n distinct days in the past, spaced roughly evenly
// over the last `spanDays` days, newest first.
func distinctPastDays(n, spanDays int, base time.Time) []time.Time {
	days := make([]time.Time, 0, n)
	for i := 0; i < n; i++ {
		day := base.AddDate(0, 0, -i*spanDays/n)
		days = append(days, time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC))
	}
	return days
}

// seedWorkouts inserts workoutCount workouts on distinct past days, each with
// at least minWorkoutExercises exercises picked from the real catalog.
func seedWorkouts(ctx context.Context, pool *pgxpool.Pool, userID int, catalog []catalogExercise, base time.Time) error {
	if len(catalog) == 0 {
		return fmt.Errorf("exercise catalog is empty, cannot build workouts")
	}

	days := distinctPastDays(workoutCount, 90, base)
	rng := rand.New(rand.NewSource(42))

	for i, day := range days {
		// Pick 4-6 distinct exercises, rotating across the catalog so each
		// workout looks like a real session (different muscle groups).
		exCount := minWorkoutExercises + rng.Intn(3) // 4, 5 or 6
		exercises := make([]models.WorkoutExercise, 0, exCount)

		for j := 0; j < exCount; j++ {
			idx := (i*7 + j*5 + rng.Intn(3)) % len(catalog)
			ex := catalog[idx]

			exercises = append(exercises, models.WorkoutExercise{
				ExerciseID: ex.ID,
				Name:       ex.Name,
				Sets:       buildSets(ex),
			})
		}

		exercisesJSON, err := json.Marshal(exercises)
		if err != nil {
			return fmt.Errorf("marshal workout %d: %w", i, err)
		}

		if _, err := pool.Exec(ctx,
			`INSERT INTO workouts (athlete_id, date, exercises, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $4)`,
			userID, day, exercisesJSON, day.Add(12*time.Hour)); err != nil {
			return fmt.Errorf("insert workout %d (date %s): %w", i, day.Format("2006-01-02"), err)
		}
	}
	return nil
}

// buildSets generates 3-4 realistic sets for a catalog exercise.
func buildSets(ex catalogExercise) []models.ExerciseSet {
	rng := rand.New(rand.NewSource(int64(ex.ID)))
	setCount := 3 + rng.Intn(2) // 3 or 4

	sets := make([]models.ExerciseSet, 0, setCount)
	for s := 0; s < setCount; s++ {
		sets = append(sets, models.ExerciseSet{
			SetID:      fmt.Sprintf("s%d", s+1),
			Weight:     exerciseBaseWeight(ex),
			WeightUnit: models.WeightUnitKg,
			Reps:       6 + rng.Intn(7), // 6-12 reps
			RestTime:   60 + rng.Intn(61),
			Completed:  s > 0,
		})
	}
	return sets
}

// exerciseBaseWeight picks a plausible starting weight (kg) per muscle group.
func exerciseBaseWeight(ex catalogExercise) float64 {
	switch ex.MuscleGroupID {
	case 1: // chest
		return []float64{60, 70, 80, 90}[ex.ID%4]
	case 2: // back
		return []float64{45, 55, 65, 75}[ex.ID%4]
	case 3: // shoulders
		return []float64{25, 30, 35, 40}[ex.ID%4]
	case 4: // arms
		return []float64{10, 15, 20, 25}[ex.ID%4]
	case 5: // legs
		return []float64{80, 100, 120, 140}[ex.ID%4]
	case 6: // core
		return []float64{5, 10, 15, 20}[ex.ID%4]
	default: // full-body / cardio
		return []float64{40, 50, 60, 70}[ex.ID%4]
	}
}

// seedMeals inserts one meal per day across distinct past days, rotating
// between breakfast, lunch, dinner and snack.
func seedMeals(ctx context.Context, pool *pgxpool.Pool, userID int, base time.Time) error {
	days := distinctPastDays(mealCount, 30, base)
	rng := rand.New(rand.NewSource(7))
	types := []models.MealType{
		models.MealTypeBreakfast,
		models.MealTypeLunch,
		models.MealTypeDinner,
		models.MealTypeSnack,
	}

	for i, day := range days {
		mealType := types[i%len(types)]
		items := buildMealItems(mealType, rng)

		itemsJSON, err := json.Marshal(items)
		if err != nil {
			return fmt.Errorf("marshal meal %d: %w", i, err)
		}

		if _, err := pool.Exec(ctx,
			`INSERT INTO meals (athlete_id, date, meal_type, items, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $5)`,
			userID, day, string(mealType), itemsJSON, day.Add(12*time.Hour)); err != nil {
			return fmt.Errorf("insert meal %d (date %s): %w", i, day.Format("2006-01-02"), err)
		}
	}
	return nil
}

// buildMealItems builds 2-4 food items realistic for the given meal type.
func buildMealItems(mealType models.MealType, rng *rand.Rand) []models.FoodItem {
	var pool []models.FoodItem
	switch mealType {
	case models.MealTypeBreakfast:
		pool = []models.FoodItem{
			{Food: "Oatmeal", Quantity: "80g", Calories: 300, Macros: models.Macros{Protein: 10, Carbs: 54, Fats: 6}},
			{Food: "Greek Yogurt", Quantity: "200g", Calories: 146, Macros: models.Macros{Protein: 20, Carbs: 8, Fats: 4}},
			{Food: "Scrambled Eggs", Quantity: "3 eggs", Calories: 234, Macros: models.Macros{Protein: 19, Carbs: 2, Fats: 16}},
			{Food: "Whole Wheat Toast", Quantity: "2 slices", Calories: 160, Macros: models.Macros{Protein: 8, Carbs: 28, Fats: 2}},
			{Food: "Banana", Quantity: "1 medium", Calories: 105, Macros: models.Macros{Protein: 1, Carbs: 27, Fats: 0}},
			{Food: "Blueberries", Quantity: "100g", Calories: 57, Macros: models.Macros{Protein: 1, Carbs: 14, Fats: 0}},
		}
	case models.MealTypeLunch:
		pool = []models.FoodItem{
			{Food: "Grilled Chicken Breast", Quantity: "200g", Calories: 330, Macros: models.Macros{Protein: 62, Carbs: 0, Fats: 7}},
			{Food: "Brown Rice", Quantity: "150g cooked", Calories: 173, Macros: models.Macros{Protein: 4, Carbs: 36, Fats: 1}},
			{Food: "Quinoa Salad", Quantity: "200g", Calories: 240, Macros: models.Macros{Protein: 9, Carbs: 42, Fats: 4}},
			{Food: "Mixed Vegetables", Quantity: "200g", Calories: 87, Macros: models.Macros{Protein: 5, Carbs: 17, Fats: 1}},
			{Food: "Tuna Wrap", Quantity: "1 wrap", Calories: 320, Macros: models.Macros{Protein: 28, Carbs: 30, Fats: 9}},
			{Food: "Lentil Soup", Quantity: "300ml", Calories: 180, Macros: models.Macros{Protein: 12, Carbs: 27, Fats: 2}},
		}
	case models.MealTypeDinner:
		pool = []models.FoodItem{
			{Food: "Grilled Salmon", Quantity: "180g", Calories: 350, Macros: models.Macros{Protein: 34, Carbs: 0, Fats: 22}},
			{Food: "Lean Steak", Quantity: "200g", Calories: 460, Macros: models.Macros{Protein: 54, Carbs: 0, Fats: 26}},
			{Food: "Sweet Potato", Quantity: "1 medium", Calories: 103, Macros: models.Macros{Protein: 2, Carbs: 24, Fats: 0}},
			{Food: "Steamed Broccoli", Quantity: "200g", Calories: 68, Macros: models.Macros{Protein: 5, Carbs: 13, Fats: 1}},
			{Food: "Whole Wheat Pasta", Quantity: "180g cooked", Calories: 250, Macros: models.Macros{Protein: 9, Carbs: 50, Fats: 1}},
			{Food: "Avocado Salad", Quantity: "1 bowl", Calories: 210, Macros: models.Macros{Protein: 3, Carbs: 12, Fats: 17}},
		}
	case models.MealTypeSnack:
		pool = []models.FoodItem{
			{Food: "Whey Protein Shake", Quantity: "1 scoop", Calories: 120, Macros: models.Macros{Protein: 24, Carbs: 3, Fats: 1}},
			{Food: "Almonds", Quantity: "28g", Calories: 164, Macros: models.Macros{Protein: 6, Carbs: 6, Fats: 14}},
			{Food: "Apple", Quantity: "1 medium", Calories: 95, Macros: models.Macros{Protein: 0, Carbs: 25, Fats: 0}},
			{Food: "Cottage Cheese", Quantity: "150g", Calories: 147, Macros: models.Macros{Protein: 18, Carbs: 5, Fats: 6}},
			{Food: "Energy Bar", Quantity: "1 bar", Calories: 200, Macros: models.Macros{Protein: 10, Carbs: 25, Fats: 7}},
			{Food: "Peanut Butter Rice Cakes", Quantity: "2", Calories: 120, Macros: models.Macros{Protein: 4, Carbs: 18, Fats: 4}},
		}
	default:
		pool = []models.FoodItem{
			{Food: "Mixed Nuts", Quantity: "30g", Calories: 180, Macros: models.Macros{Protein: 6, Carbs: 6, Fats: 16}},
			{Food: "Fruit Smoothie", Quantity: "1 glass", Calories: 150, Macros: models.Macros{Protein: 5, Carbs: 30, Fats: 1}},
		}
	}

	// 2-4 items per meal
	count := 2 + rng.Intn(3) // 2, 3 or 4
	items := make([]models.FoodItem, 0, count)

	// Deterministic shuffle to avoid picking the same tail every time.
	rng.Shuffle(len(pool), func(a, b int) { pool[a], pool[b] = pool[b], pool[a] })
	for i := 0; i < count; i++ {
		items = append(items, pool[i])
	}
	return items
}
