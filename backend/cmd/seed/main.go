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

	// 1. Seed the exercise catalog (lookup tables + exercises) - idempotent.
	seeded, err := seedExerciseCatalog(ctx, pool)
	if err != nil {
		return err
	}
	zap.L().Info("Exercise catalog seeded",
		zap.Int("inserted", seeded),
		zap.Int("skipped_existing", len(exerciseSeed)-seeded))

	// 2. Ensure the target athlete exists (idempotent) with the requested password.
	userID, err := ensureAthlete(ctx, pool)
	if err != nil {
		return err
	}
	zap.L().Info("Athlete ready", zap.Int("user_id", userID))

	// 3. Load the exercise catalog for realistic workout exercises.
	catalog, err := loadExerciseCatalog(ctx, pool)
	if err != nil {
		return err
	}
	zap.L().Info("Exercise catalog loaded", zap.Int("exercises", len(catalog)))

	// 4. Clear any previously seeded meals/workouts for this athlete (idempotent reseed).
	if _, err := pool.Exec(ctx, "DELETE FROM meals WHERE athlete_id = $1", userID); err != nil {
		return fmt.Errorf("clear meals: %w", err)
	}
	if _, err := pool.Exec(ctx, "DELETE FROM workouts WHERE athlete_id = $1", userID); err != nil {
		return fmt.Errorf("clear workouts: %w", err)
	}
	zap.L().Info("Cleared existing seed data", zap.Int("user_id", userID))

	start := time.Now()

	// 5. Seed workouts: 30 on 30 distinct days, each with >= 4 exercises.
	if err := seedWorkouts(ctx, pool, userID, catalog, start); err != nil {
		return err
	}
	zap.L().Info("Seeded workouts", zap.Int("count", workoutCount))

	// 6. Seed meals: 30 on 30 distinct days.
	if err := seedMeals(ctx, pool, userID, start); err != nil {
		return err
	}
	zap.L().Info("Seeded meals", zap.Int("count", mealCount))

	fmt.Println("\n✓ Seed completed")
	fmt.Printf("  User:      %s (user_id=%d, password=%s)\n", targetUsername, userID, targetPassword)
	fmt.Printf("  Exercises: %d catalog rows\n", len(catalog))
	fmt.Printf("  Workouts:  %d\n", workoutCount)
	fmt.Printf("  Meals:     %d\n", mealCount)
	return nil
}

// lookupRow is a fixed-id row for the lookup tables. The explicit IDs are part
// of the seed contract: the exercise rows below reference them directly as
// muscle_group_id / equipment_id, so the ID -> code mapping must be stable.
type lookupRow struct {
	ID          int
	Code        string
	Description string
}

// catalogSeedExercise is one row of the exercise catalog seed. It mirrors the
// exercises table columns written by the seed (name, category, FK ids,
// instructions); id, created_by and media columns are left to their defaults.
type catalogSeedExercise struct {
	Name          string
	Category      string
	MuscleGroupID int
	EquipmentID   int
	Instructions  string
}

// seedExerciseCatalog seeds the lookup tables and the exercise catalog. It is
// safe to run repeatedly:
//   - muscle_groups / equipment_definitions rows are skipped when their
//     primary key OR unique code already exists (targetless ON CONFLICT);
//   - exercises rows are skipped when the name already exists
//     (exercises_name_unique, added by migration 004).
//
// It returns how many exercise rows were newly inserted.
func seedExerciseCatalog(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	if err := seedLookupRows(ctx, pool, "muscle_groups", muscleGroupSeed); err != nil {
		return 0, fmt.Errorf("seed muscle_groups: %w", err)
	}
	if err := seedLookupRows(ctx, pool, "equipment_definitions", equipmentSeed); err != nil {
		return 0, fmt.Errorf("seed equipment_definitions: %w", err)
	}

	const insertExercise = `INSERT INTO exercises (name, category, muscle_group_id, equipment_id, instructions, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (name) DO NOTHING`

	inserted := 0
	for _, ex := range exerciseSeed {
		tag, err := pool.Exec(ctx, insertExercise,
			ex.Name, ex.Category, ex.MuscleGroupID, ex.EquipmentID, ex.Instructions)
		if err != nil {
			return inserted, fmt.Errorf("insert exercise %q: %w", ex.Name, err)
		}
		if tag.RowsAffected() > 0 {
			inserted++
		}
	}
	return inserted, nil
}

// seedLookupRows inserts fixed-id lookup rows. The unqualified ON CONFLICT
// clause swallows conflicts on both the primary key (id) and the unique code,
// so a row that already exists - under either key - is skipped instead of
// failing the whole seed. `table` is a compile-time constant at both call sites.
func seedLookupRows(ctx context.Context, pool *pgxpool.Pool, table string, rows []lookupRow) error {
	query := fmt.Sprintf(
		"INSERT INTO %s (id, code, description) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
		table,
	)
	for _, row := range rows {
		if _, err := pool.Exec(ctx, query, row.ID, row.Code, row.Description); err != nil {
			return fmt.Errorf("%s id=%d code=%q: %w", table, row.ID, row.Code, err)
		}
	}
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

// muscleGroupSeed is the fixed muscle group taxonomy referenced by the
// exercise rows below (IDs 1-7). Kept in sync with seed_exercises.sql.
var muscleGroupSeed = []lookupRow{
	{1, "chest", "Chest"},
	{2, "back", "Back"},
	{3, "shoulders", "Shoulders"},
	{4, "arms", "Arms"},
	{5, "legs", "Legs"},
	{6, "core", "Core"},
	{7, "full-body", "Full Body"},
}

// equipmentSeed is the fixed equipment taxonomy referenced by the exercise
// rows below (IDs 1-8). Kept in sync with seed_exercises.sql.
var equipmentSeed = []lookupRow{
	{1, "barbell", "Barbell"},
	{2, "dumbbell", "Dumbbell"},
	{3, "machine", "Machine"},
	{4, "cable", "Cable"},
	{5, "bodyweight", "Bodyweight"},
	{6, "kettlebell", "Kettlebell"},
	{7, "resistance-band", "Resistance Band"},
	{8, "other", "Other"},
}

// exerciseSeed is the exercise catalog: 58 rows across the seven muscle groups.
// Name is the idempotency key (exercises_name_unique, added by migration 004).
var exerciseSeed = []catalogSeedExercise{
	// Chest (muscle_group_id = 1)
	{Name: "Barbell Bench Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 1, Instructions: "Lie on flat bench, grip barbell at shoulder width, lower to mid-chest, press up."},
	{Name: "Dumbbell Bench Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 2, Instructions: "Lie on flat bench holding dumbbells at chest level, press up until arms fully extended, lower with control."},
	{Name: "Incline Barbell Bench Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 1, Instructions: "Set bench to 30-45 degrees, press barbell from upper chest to full extension."},
	{Name: "Incline Dumbbell Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 2, Instructions: "Bench at 30-45 degrees, press dumbbells from upper chest to full extension."},
	{Name: "Decline Bench Press", Category: "strength", MuscleGroupID: 1, EquipmentID: 1, Instructions: "Lie on decline bench, press barbell from lower chest to full extension."},
	{Name: "Chest Fly (Machine)", Category: "strength", MuscleGroupID: 1, EquipmentID: 3, Instructions: "Sit at pec deck machine, bring handles together in front of chest with slight elbow bend."},
	{Name: "Cable Chest Fly", Category: "strength", MuscleGroupID: 1, EquipmentID: 4, Instructions: "Stand between cable columns, bring hands together in front of chest with slight elbow bend."},
	{Name: "Push-Up", Category: "strength", MuscleGroupID: 1, EquipmentID: 5, Instructions: "Start in plank position with hands shoulder-width apart, lower chest to floor, push back up."},
	{Name: "Dumbbell Pullover", Category: "strength", MuscleGroupID: 1, EquipmentID: 2, Instructions: "Lie across a flat bench with hips low, hold one dumbbell with both hands above chest, lower behind head, bring back up."},

	// Back (muscle_group_id = 2)
	{Name: "Barbell Row", Category: "strength", MuscleGroupID: 2, EquipmentID: 1, Instructions: "Bend at hips with a flat back, grip barbell at shoulder width, pull to lower ribcage, lower with control."},
	{Name: "Dumbbell Row", Category: "strength", MuscleGroupID: 2, EquipmentID: 2, Instructions: "Place one knee and hand on a bench, pull dumbbell to hip with the other arm, lower with control."},
	{Name: "Pull-Up", Category: "strength", MuscleGroupID: 2, EquipmentID: 5, Instructions: "Hang from a bar with palms facing away, pull chin over the bar, lower with control."},
	{Name: "Chin-Up", Category: "strength", MuscleGroupID: 2, EquipmentID: 5, Instructions: "Hang from a bar with palms facing toward you, pull chin over the bar, lower with control."},
	{Name: "Lat Pulldown", Category: "strength", MuscleGroupID: 2, EquipmentID: 4, Instructions: "Sit at cable machine, grip bar wide overhead, pull to upper chest, return with control."},
	{Name: "Seated Cable Row", Category: "strength", MuscleGroupID: 2, EquipmentID: 4, Instructions: "Sit with feet braced, grip handle, pull to lower abdomen keeping back straight, return with control."},
	{Name: "T-Bar Row", Category: "strength", MuscleGroupID: 2, EquipmentID: 1, Instructions: "Straddle the T-bar, bend with a flat back, pull the bar to chest, lower with control."},
	{Name: "Face Pull", Category: "strength", MuscleGroupID: 2, EquipmentID: 4, Instructions: "Set cable at upper-chest height with rope attachment, pull toward face while externally rotating shoulders."},

	// Shoulders (muscle_group_id = 3)
	{Name: "Overhead Press (Barbell)", Category: "strength", MuscleGroupID: 3, EquipmentID: 1, Instructions: "Stand with barbell at shoulders, press overhead until arms fully extended, lower to shoulders."},
	{Name: "Dumbbell Shoulder Press", Category: "strength", MuscleGroupID: 3, EquipmentID: 2, Instructions: "Sit or stand with dumbbells at shoulder height, press overhead, lower with control."},
	{Name: "Lateral Raise", Category: "strength", MuscleGroupID: 3, EquipmentID: 2, Instructions: "Stand with dumbbells at sides, raise arms out to the side to shoulder height, lower with control."},
	{Name: "Front Raise", Category: "strength", MuscleGroupID: 3, EquipmentID: 2, Instructions: "Stand with dumbbells in front of thighs, raise arms forward to shoulder height, lower with control."},
	{Name: "Reverse Fly", Category: "strength", MuscleGroupID: 3, EquipmentID: 2, Instructions: "Bend forward with a flat back holding dumbbells, raise arms out to sides, squeeze shoulder blades together."},
	{Name: "Arnold Press", Category: "strength", MuscleGroupID: 3, EquipmentID: 2, Instructions: "Start with dumbbells in front of shoulders palms facing you, press overhead while rotating palms forward."},
	{Name: "Upright Row", Category: "strength", MuscleGroupID: 3, EquipmentID: 1, Instructions: "Stand with barbell at thigh level, pull straight up to chin leading with elbows, lower with control."},
	{Name: "Dumbbell Shrug", Category: "strength", MuscleGroupID: 3, EquipmentID: 2, Instructions: "Stand holding dumbbells at sides, shrug shoulders up toward ears, hold briefly, lower."},

	// Arms (muscle_group_id = 4)
	{Name: "Barbell Curl", Category: "strength", MuscleGroupID: 4, EquipmentID: 1, Instructions: "Stand with barbell at thigh level, curl bar to shoulders keeping elbows fixed, lower with control."},
	{Name: "Dumbbell Curl", Category: "strength", MuscleGroupID: 4, EquipmentID: 2, Instructions: "Stand with dumbbells at sides, curl to shoulders alternating or together, keep elbows fixed."},
	{Name: "Hammer Curl", Category: "strength", MuscleGroupID: 4, EquipmentID: 2, Instructions: "Stand with dumbbells at sides palms facing each other, curl to shoulders keeping palms facing in."},
	{Name: "Tricep Pushdown", Category: "strength", MuscleGroupID: 4, EquipmentID: 4, Instructions: "Set cable at high position, grip rope or bar, push down to full arm extension, return with control."},
	{Name: "Skull Crusher", Category: "strength", MuscleGroupID: 4, EquipmentID: 1, Instructions: "Lie on bench with barbell or EZ-bar above face, lower toward forehead by bending elbows, extend back up."},
	{Name: "Tricep Dip", Category: "strength", MuscleGroupID: 4, EquipmentID: 5, Instructions: "Grip parallel bars or bench edge, lower body by bending elbows to 90 degrees, push back up."},
	{Name: "Concentration Curl", Category: "strength", MuscleGroupID: 4, EquipmentID: 2, Instructions: "Sit on bench, rest elbow against inner thigh, curl dumbbell to shoulder, lower with control."},
	{Name: "Overhead Tricep Extension", Category: "strength", MuscleGroupID: 4, EquipmentID: 2, Instructions: "Stand or sit holding a dumbbell overhead with both hands, lower behind head by bending elbows, extend back up."},

	// Legs (muscle_group_id = 5)
	{Name: "Barbell Back Squat", Category: "strength", MuscleGroupID: 5, EquipmentID: 1, Instructions: "Rest barbell on upper back, feet shoulder-width apart, squat to at least parallel, drive back up."},
	{Name: "Front Squat", Category: "strength", MuscleGroupID: 5, EquipmentID: 1, Instructions: "Rest barbell across front of shoulders, keep torso upright, squat to parallel, drive back up."},
	{Name: "Leg Press", Category: "strength", MuscleGroupID: 5, EquipmentID: 3, Instructions: "Sit in leg press machine, place feet shoulder-width on platform, lower until knees at 90 degrees, press back up."},
	{Name: "Romanian Deadlift", Category: "strength", MuscleGroupID: 5, EquipmentID: 1, Instructions: "Hold barbell at hip level, hinge at hips pushing hips back, lower bar along legs until hamstrings stretch, return."},
	{Name: "Leg Curl (Machine)", Category: "strength", MuscleGroupID: 5, EquipmentID: 3, Instructions: "Lie face down on leg curl machine, curl heels toward glutes, lower with control."},
	{Name: "Leg Extension (Machine)", Category: "strength", MuscleGroupID: 5, EquipmentID: 3, Instructions: "Sit on leg extension machine, extend legs until straight, lower with control."},
	{Name: "Standing Calf Raise", Category: "strength", MuscleGroupID: 5, EquipmentID: 3, Instructions: "Stand on calf raise machine with shoulders under pads, rise up on toes, lower with control."},
	{Name: "Dumbbell Lunge", Category: "strength", MuscleGroupID: 5, EquipmentID: 2, Instructions: "Hold dumbbells at sides, step forward into lunge, lower back knee toward floor, push back to start."},
	{Name: "Goblet Squat", Category: "strength", MuscleGroupID: 5, EquipmentID: 6, Instructions: "Hold a kettlebell or dumbbell at chest, squat to parallel keeping torso upright, drive back up."},
	{Name: "Barbell Hip Thrust", Category: "strength", MuscleGroupID: 5, EquipmentID: 1, Instructions: "Sit on floor with upper back against bench, barbell across hips, thrust upward squeezing glutes at top."},

	// Core (muscle_group_id = 6)
	{Name: "Leg Raise", Category: "strength", MuscleGroupID: 6, EquipmentID: 5, Instructions: "Lie on back with legs straight, raise legs to 90 degrees keeping them straight, lower with control."},
	{Name: "Russian Twist", Category: "strength", MuscleGroupID: 6, EquipmentID: 5, Instructions: "Sit with feet off floor, lean back slightly, rotate torso side to side optionally holding a weight."},
	{Name: "Cable Crunch", Category: "strength", MuscleGroupID: 6, EquipmentID: 4, Instructions: "Kneel facing cable machine with rope attached overhead, crunch forward curling torso, return with control."},
	{Name: "Hanging Leg Raise", Category: "strength", MuscleGroupID: 6, EquipmentID: 5, Instructions: "Hang from a bar, raise legs to parallel or higher keeping them straight, lower with control."},
	{Name: "Pallof Press", Category: "strength", MuscleGroupID: 6, EquipmentID: 4, Instructions: "Stand sideways to cable column, grip handle at chest height, press hands forward resisting rotation, return."},

	// Full Body (muscle_group_id = 7)
	{Name: "Deadlift (Conventional)", Category: "strength", MuscleGroupID: 7, EquipmentID: 1, Instructions: "Stand with feet hip-width apart, barbell over mid-foot, bend down grip bar, drive through heels to stand up, lower with control."},
	{Name: "Sumo Deadlift", Category: "strength", MuscleGroupID: 7, EquipmentID: 1, Instructions: "Stand with feet wide toes pointed out, grip bar inside knees, drive through heels to stand up."},
	{Name: "Power Clean", Category: "strength", MuscleGroupID: 7, EquipmentID: 1, Instructions: "Pull barbell from floor to shoulders in one explosive motion, catch in partial squat, stand up."},
	{Name: "Kettlebell Swing", Category: "strength", MuscleGroupID: 7, EquipmentID: 6, Instructions: "Stand with kettlebell between legs, hinge at hips, swing to chest height using hip drive."},
	{Name: "Burpee", Category: "cardio", MuscleGroupID: 7, EquipmentID: 5, Instructions: "From standing squat down, kick feet to plank, do push-up, jump feet forward, explode up."},
	{Name: "Farmer's Walk", Category: "strength", MuscleGroupID: 7, EquipmentID: 2, Instructions: "Hold heavy dumbbells at sides, walk with upright posture for distance or time."},
	{Name: "Barbell Thruster", Category: "strength", MuscleGroupID: 7, EquipmentID: 1, Instructions: "Hold barbell at shoulders, squat to parallel, drive up into overhead press in one fluid motion."},
	{Name: "Box Jump", Category: "cardio", MuscleGroupID: 7, EquipmentID: 8, Instructions: "Stand facing a sturdy box, squat slightly, jump onto box landing softly, step down."},
	{Name: "Treadmill Running", Category: "cardio", MuscleGroupID: 7, EquipmentID: 3, Instructions: "Run or walk on treadmill at desired speed and incline."},
	{Name: "Stationary Bike", Category: "cardio", MuscleGroupID: 7, EquipmentID: 3, Instructions: "Cycle on a stationary bike at desired resistance and pace."},
}
