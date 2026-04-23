package config

import (
	"context"
	"log"
	"time"

	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

// SeedMuscleGroups seeds the muscle_groups collection with initial data
func SeedMuscleGroups(collection *gocb.Collection) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	muscleGroups := []models.MuscleGroupDefinition{
		{ID: 1, Code: "1", Description: "Chest"},
		{ID: 2, Code: "2", Description: "Back"},
		{ID: 3, Code: "3", Description: "Shoulders"},
		{ID: 4, Code: "4", Description: "Arms"},
		{ID: 5, Code: "5", Description: "Full Body"},
		{ID: 6, Code: "6", Description: "Legs"},
		{ID: 7, Code: "7", Description: "Core"},
	}

	for _, mg := range muscleGroups {
		mgData := map[string]interface{}{
			"type":        "muscleGroupDefinition",
			"id":          mg.ID,
			"code":        mg.Code,
			"description": mg.Description,
		}

		key := "muscle_group_" + mg.Code
		_, err := collection.Insert(key, mgData, &gocb.InsertOptions{Context: ctx})
		if err != nil {
			if err == gocb.ErrDocumentExists {
				log.Printf("Muscle group %s already exists, skipping", mg.Description)
				continue
			}
			return err
		}
		log.Printf("Seeded muscle group: %s", mg.Description)
	}

	log.Println("Muscle groups seeded successfully")
	return nil
}

// SeedEquipment seeds the equipment collection with initial data
func SeedEquipment(collection *gocb.Collection) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	equipment := []models.EquipmentDefinition{
		{ID: 1, Code: "1", Description: "Barbell"},
		{ID: 2, Code: "2", Description: "Dumbbell"},
		{ID: 3, Code: "3", Description: "Cable"},
		{ID: 4, Code: "4", Description: "Machine"},
		{ID: 5, Code: "5", Description: "Bodyweight"},
		{ID: 6, Code: "6", Description: "Kettlebell"},
		{ID: 7, Code: "7", Description: "Resistance Band"},
		{ID: 8, Code: "8", Description: "Medicine Ball"},
	}

	for _, eq := range equipment {
		eqData := map[string]interface{}{
			"type":        "equipmentDefinition",
			"id":          eq.ID,
			"code":        eq.Code,
			"description": eq.Description,
		}

		key := "equipment_" + eq.Code
		_, err := collection.Insert(key, eqData, &gocb.InsertOptions{Context: ctx})
		if err != nil {
			if err == gocb.ErrDocumentExists {
				log.Printf("Equipment %s already exists, skipping", eq.Description)
				continue
			}
			return err
		}
		log.Printf("Seeded equipment: %s", eq.Description)
	}

	log.Println("Equipment seeded successfully")
	return nil
}

// SeedExercises seeds the exercises collection with initial data
func SeedExercises(collection *gocb.Collection) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exercises := []struct {
		name         string
		category     string
		muscleGroupID int
		equipmentID  int
		instructions string
	}{
		// Chest Exercises
		{"Bench Press", "strength", 1, 1, "Lie on bench, lower bar to chest, press up"},
		{"Incline Dumbbell Press", "strength", 1, 2, "Lie on incline bench, press dumbbells up"},
		{"Cable Flyes", "strength", 1, 3, "Pull cables together in arc motion"},
		{"Push-ups", "strength", 1, 5, "Standard push-up position, lower chest to floor"},
		{"Dumbbell Flyes", "strength", 1, 2, "Lie flat, bring dumbbells together in arc"},

		// Back Exercises
		{"Deadlifts", "strength", 2, 1, "Lift barbell from floor to standing position"},
		{"Pull-ups", "strength", 2, 5, "Pull body up to bar"},
		{"Cable Rows", "strength", 2, 3, "Pull cable toward chest"},
		{"Dumbbell Rows", "strength", 2, 2, "Row dumbbell to side while bent over"},
		{"Lat Pulldowns", "strength", 2, 3, "Pull bar down to chest"},

		// Shoulder Exercises
		{"Overhead Press", "strength", 3, 1, "Press barbell overhead"},
		{"Lateral Raises", "strength", 3, 2, "Raise dumbbells to sides"},
		{"Front Raises", "strength", 3, 2, "Raise dumbbells to front"},
		{"Rear Delt Flyes", "strength", 3, 2, "Raise dumbbells to rear"},
		{"Arnold Press", "strength", 3, 2, "Rotate and press dumbbells overhead"},

		// Arms Exercises
		{"Bicep Curls", "strength", 4, 1, "Curl barbell to chest"},
		{"Hammer Curls", "strength", 4, 2, "Curl dumbbells with neutral grip"},
		{"Tricep Pushdowns", "strength", 4, 3, "Push cable down"},
		{"Skull Crushers", "strength", 4, 1, "Lower bar to forehead"},
		{"Tricep Dips", "strength", 4, 5, "Dip on parallel bars"},

		// Legs Exercises
		{"Squats", "strength", 6, 1, "Squat down with barbell on back"},
		{"Lunges", "strength", 6, 2, "Step forward and lower body"},
		{"Leg Press", "strength", 6, 4, "Press weight away with legs"},
		{"Calf Raises", "strength", 6, 5, "Raise up on toes"},
		{"Leg Extensions", "strength", 6, 4, "Extend legs against resistance"},

		// Core Exercises
		{"Plank", "strength", 7, 5, "Hold body in straight line"},
		{"Crunches", "strength", 7, 5, "Curl upper body toward knees"},
		{"Russian Twists", "strength", 7, 5, "Rotate torso side to side"},
		{"Leg Raises", "strength", 7, 5, "Raise legs while lying flat"},
		{"Mountain Climbers", "strength", 7, 5, "Alternate bringing knees to chest"},

		// Full Body Exercises
		{"Burpees", "strength", 5, 5, "Squat, kick back, push-up, jump"},
		{"Thrusters", "strength", 5, 1, "Squat and press overhead"},
		{"Kettlebell Swings", "strength", 5, 6, "Swing kettlebell between legs and overhead"},
		{"Box Jumps", "strength", 5, 5, "Jump onto elevated platform"},
		{"Clean and Press", "strength", 5, 1, "Clean barbell to shoulders and press"},

		// Additional Chest
		{"Decline Bench Press", "strength", 1, 1, "Press on decline bench"},
		{"Pec Deck", "strength", 1, 4, "Bring arms together on machine"},

		// Additional Back
		{"T-Bar Rows", "strength", 2, 1, "Row T-bar to chest"},
		{"Chin-ups", "strength", 2, 5, "Pull body up with underhand grip"},

		// Additional Legs
		{"Romanian Deadlifts", "strength", 6, 1, "Hinge at hips with barbell"},
		{"Bulgarian Split Squats", "strength", 6, 2, "Single-leg squat with rear foot elevated"},
		{"Goblet Squats", "strength", 6, 6, "Squat holding kettlebell at chest"},

		// Additional Core
		{"Ab Wheel Rollouts", "strength", 7, 5, "Roll wheel forward and back"},
		{"Hanging Leg Raises", "strength", 7, 5, "Raise legs while hanging from bar"},

		// Additional Arms
		{"Preacher Curls", "strength", 4, 4, "Curl on preacher bench"},
		{"Concentration Curls", "strength", 4, 2, "Curl dumbbell with elbow on inner thigh"},

		// Additional Shoulders
		{"Face Pulls", "strength", 3, 3, "Pull cable to face"},
		{"Upright Rows", "strength", 3, 1, "Pull barbell up to chin"},

		// Cardio
		{"Running", "cardio", 5, 5, "Run at steady pace"},
		{"Cycling", "cardio", 5, 4, "Cycle on stationary bike"},
		{"Rowing Machine", "cardio", 5, 4, "Row on indoor rower"},
		{"Jump Rope", "cardio", 5, 5, "Jump rope continuously"},
		{"Boxing", "cardio", 5, 5, "Boxing combinations"},

		// Flexibility
		{"Yoga", "flexibility", 5, 5, "Yoga poses and flows"},
		{"Stretching", "flexibility", 5, 5, "Static stretching exercises"},
		{"Pilates", "flexibility", 5, 5, "Pilates exercises"},
		{"Foam Rolling", "flexibility", 5, 5, "Self-myofascial release"},
		{"Dynamic Stretching", "flexibility", 5, 5, "Movement-based stretching"},
	}

	for i, ex := range exercises {
		exData := map[string]interface{}{
			"type":          "exercise",
			"exerciseId":    "exercise_" + ex.name,
			"name":          ex.name,
			"category":      ex.category,
			"muscleGroupId": ex.muscleGroupID,
			"equipmentId":   ex.equipmentID,
			"instructions":  ex.instructions,
			"createdBy":     nil,
			"createdAt":     time.Now().Format(time.RFC3339),
		}

		_, err := collection.Insert(exData["exerciseId"].(string), exData, &gocb.InsertOptions{Context: ctx})
		if err != nil {
			if err == gocb.ErrDocumentExists {
				log.Printf("Exercise %s already exists, skipping", ex.name)
				continue
			}
			return err
		}
		log.Printf("Seeded exercise (%d/%d): %s", i+1, len(exercises), ex.name)
	}

	log.Printf("Exercises seeded successfully: %d exercises", len(exercises))
	return nil
}

// SeedAllData seeds all initial data
func SeedAllData(bucket *gocb.Bucket) error {
	scope := bucket.Scope(ScopeDefault)

	// Seed muscle groups
	muscleGroupCollection := scope.Collection(CollectionMuscleGroups)
	if err := SeedMuscleGroups(muscleGroupCollection); err != nil {
		return err
	}

	// Seed equipment
	equipmentCollection := scope.Collection(CollectionEquipment)
	if err := SeedEquipment(equipmentCollection); err != nil {
		return err
	}

	// Seed exercises
	exerciseCollection := scope.Collection(CollectionExercises)
	if err := SeedExercises(exerciseCollection); err != nil {
		return err
	}

	log.Println("All initial data seeded successfully")
	return nil
}
