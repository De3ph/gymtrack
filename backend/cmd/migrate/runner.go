package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/couchbase/gocb/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gymtrack-backend/internal/config"
)

// RunMigration migrates all Couchbase data in the default bucket to PostgreSQL.
// It builds an exerciseIDMap so that workouts and workout_plans JSONB arrays
// reference the new SERIAL exercise IDs.
func RunMigration(ctx context.Context, cluster *gocb.Cluster, pgPool *pgxpool.Pool) error {
	bucket := os.Getenv("COUCHBASE_BUCKET")
	if bucket == "" {
		bucket = "gymtrack"
	}
	l := &couchbaseLoader{cluster: cluster, bucket: bucket}
	return runMigration(ctx, l, pgPool)
}

// loader abstracts the source of Couchbase-like documents so the runner can be
// unit-tested without a real Couchbase cluster.
type loader interface {
	load(ctx context.Context, collection string) ([]map[string]interface{}, error)
	loadByType(ctx context.Context, collection, docType string) ([]map[string]interface{}, error)
}

type couchbaseLoader struct {
	cluster *gocb.Cluster
	bucket  string
}

func (c *couchbaseLoader) load(ctx context.Context, collection string) ([]map[string]interface{}, error) {
	q := fmt.Sprintf("SELECT c.* FROM `%s`.`_default`.`%s` c", c.bucket, collection)
	rows, err := c.cluster.Query(q, &gocb.QueryOptions{Context: ctx})
	if err != nil {
		return nil, fmt.Errorf("query %s: %w", collection, err)
	}
	defer rows.Close()

	var docs []map[string]interface{}
	for rows.Next() {
		var doc map[string]interface{}
		if err := rows.Row(&doc); err != nil {
			return nil, fmt.Errorf("scan %s: %w", collection, err)
		}
		docs = append(docs, doc)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate %s: %w", collection, err)
	}
	return docs, nil
}

func (c *couchbaseLoader) loadByType(ctx context.Context, collection, docType string) ([]map[string]interface{}, error) {
	q := fmt.Sprintf("SELECT c.* FROM `%s`.`_default`.`%s` c WHERE c.type = '%s'", c.bucket, collection, docType)
	rows, err := c.cluster.Query(q, &gocb.QueryOptions{Context: ctx})
	if err != nil {
		return nil, fmt.Errorf("query %s type=%s: %w", collection, docType, err)
	}
	defer rows.Close()

	var docs []map[string]interface{}
	for rows.Next() {
		var doc map[string]interface{}
		if err := rows.Row(&doc); err != nil {
			return nil, fmt.Errorf("scan %s: %w", collection, err)
		}
		docs = append(docs, doc)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate %s: %w", collection, err)
	}
	return docs, nil
}

func runMigration(ctx context.Context, l loader, pool *pgxpool.Pool) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	userIDMap := make(map[string]int)
	exerciseIDMap := make(map[string]int)
	workoutIDMap := make(map[string]int)
	mealIDMap := make(map[string]int)
	planIDMap := make(map[string]int)
	measurementIDMap := make(map[string]int)
	commentIDMap := make(map[string]int)

	steps := []struct {
		name string
		fn   func() error
	}{
		{"muscle_groups", func() error { return migrateMuscleGroups(ctx, l, tx) }},
		{"equipment_definitions", func() error { return migrateEquipmentDefinitions(ctx, l, tx) }},
		{"users", func() error { return migrateUsers(ctx, l, tx, userIDMap) }},
		{"relationships", func() error { return migrateRelationships(ctx, l, tx, userIDMap) }},
		{"coaching_requests", func() error { return migrateCoachingRequests(ctx, l, tx, userIDMap) }},
		{"trainer_reviews", func() error { return migrateTrainerReviews(ctx, l, tx, userIDMap) }},
		{"trainer_availabilities", func() error { return migrateTrainerAvailabilities(ctx, l, tx, userIDMap) }},
		{"exercises", func() error { return migrateExercises(ctx, l, tx, userIDMap, exerciseIDMap) }},
		{"workout_plans", func() error { return migrateWorkoutPlans(ctx, l, tx, userIDMap, planIDMap) }},
		{"workouts", func() error { return migrateWorkouts(ctx, l, tx, userIDMap, planIDMap, exerciseIDMap, workoutIDMap) }},
		{"meals", func() error { return migrateMeals(ctx, l, tx, userIDMap, mealIDMap) }},
		{"body_measurements", func() error { return migrateBodyMeasurements(ctx, l, tx, userIDMap, measurementIDMap) }},
		{"comments", func() error { return migrateComments(ctx, l, tx, userIDMap, workoutIDMap, mealIDMap, commentIDMap) }},
		{"workout_plan_assignments", func() error { return migrateWorkoutPlanAssignments(ctx, l, tx, userIDMap, planIDMap) }},
		{"invitations", func() error { return migrateInvitations(ctx, l, tx, userIDMap) }},
	}

	for _, step := range steps {
		if err := step.fn(); err != nil {
			return fmt.Errorf("migrate %s: %w", step.name, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	if err := verifyCounts(ctx, l, pool); err != nil {
		return fmt.Errorf("verify counts: %w", err)
	}

	return nil
}

func migrateMuscleGroups(ctx context.Context, l loader, tx pgx.Tx) error {
	docs, err := l.load(ctx, config.CollectionMuscleGroups)
	if err != nil {
		return err
	}
	for _, doc := range docs {
		id := asInt(doc["id"])
		code := asString(doc["code"])
		description := asString(doc["description"])
		_, err := tx.Exec(ctx,
			"INSERT INTO muscle_groups (id, code, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
			id, code, description,
		)
		if err != nil {
			return fmt.Errorf("insert muscle_groups id=%d: %w", id, err)
		}
	}
	fmt.Printf("Migrated muscle_groups: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateEquipmentDefinitions(ctx context.Context, l loader, tx pgx.Tx) error {
	docs, err := l.load(ctx, config.CollectionEquipment)
	if err != nil {
		return err
	}
	for _, doc := range docs {
		id := asInt(doc["id"])
		code := asString(doc["code"])
		description := asString(doc["description"])
		_, err := tx.Exec(ctx,
			"INSERT INTO equipment_definitions (id, code, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
			id, code, description,
		)
		if err != nil {
			return fmt.Errorf("insert equipment_definitions id=%d: %w", id, err)
		}
	}
	fmt.Printf("Migrated equipment_definitions: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateUsers(ctx context.Context, l loader, tx pgx.Tx, userIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionUsers, "user")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["userId"])
		profileJSON, err := json.Marshal(doc["profile"])
		if err != nil {
			return fmt.Errorf("marshal user profile: %w", err)
		}
		var newID int
		err = tx.QueryRow(ctx,
			"INSERT INTO users (username, email, password_hash, role, profile, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id",
			asString(doc["username"]),
			asString(doc["email"]),
			asString(doc["passwordHash"]),
			asString(doc["role"]),
			profileJSON,
			asTime(doc["createdAt"]),
			asTime(doc["updatedAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert user %s: %w", oldID, err)
		}
		userIDMap[oldID] = newID
	}
	fmt.Printf("Migrated users: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateRelationships(ctx context.Context, l loader, tx pgx.Tx, userIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionRelationships, "relationship")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		_, err := tx.Exec(ctx,
			"INSERT INTO relationships (trainer_id, athlete_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
			trainerID, athleteID, asString(doc["status"]), asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		)
		if err != nil {
			return fmt.Errorf("insert relationship: %w", err)
		}
	}
	fmt.Printf("Migrated relationships: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateCoachingRequests(ctx context.Context, l loader, tx pgx.Tx, userIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, "coaching_requests", "coaching_request")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		_, err := tx.Exec(ctx,
			"INSERT INTO coaching_requests (athlete_id, trainer_id, message, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
			athleteID, trainerID, asString(doc["message"]), asString(doc["status"]), asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		)
		if err != nil {
			return fmt.Errorf("insert coaching_request: %w", err)
		}
	}
	fmt.Printf("Migrated coaching_requests: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateTrainerReviews(ctx context.Context, l loader, tx pgx.Tx, userIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionComments, "review")
	if err != nil {
		return err
	}
	if len(docs) == 0 {
		docs, err = l.loadByType(ctx, "reviews", "review")
		if err != nil {
			return err
		}
	}
	for _, doc := range docs {
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		_, err := tx.Exec(ctx,
			"INSERT INTO trainer_reviews (trainer_id, athlete_id, rating, comment, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
			trainerID, athleteID, asInt(doc["rating"]), asString(doc["comment"]), asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		)
		if err != nil {
			return fmt.Errorf("insert trainer_review: %w", err)
		}
	}
	fmt.Printf("Migrated trainer_reviews: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateTrainerAvailabilities(ctx context.Context, l loader, tx pgx.Tx, userIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionUsers, "availability")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		start, err := time.Parse("15:04", asString(doc["startTime"]))
		if err != nil {
			return fmt.Errorf("parse startTime: %w", err)
		}
		end, err := time.Parse("15:04", asString(doc["endTime"]))
		if err != nil {
			return fmt.Errorf("parse endTime: %w", err)
		}
		_, err = tx.Exec(ctx,
			"INSERT INTO trainer_availabilities (trainer_id, day_of_week, start_time, end_time, is_booked, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
			trainerID, asInt(doc["dayOfWeek"]), start, end, asBool(doc["isBooked"]), asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		)
		if err != nil {
			return fmt.Errorf("insert trainer_availability: %w", err)
		}
	}
	fmt.Printf("Migrated trainer_availabilities: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateExercises(ctx context.Context, l loader, tx pgx.Tx, userIDMap, exerciseIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionExercises, "exercise")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["exerciseId"])
		var createdBy interface{}
		if v := doc["createdBy"]; v != nil && asString(v) != "" {
			id, ok := userIDMap[asString(v)]
			if !ok {
				return fmt.Errorf("unknown createdBy %s", v)
			}
			createdBy = id
		}
		var newID int
		err := tx.QueryRow(ctx,
			"INSERT INTO exercises (legacy_id, name, category, muscle_group_id, equipment_id, instructions, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
			oldID,
			asString(doc["name"]),
			asString(doc["category"]),
			asInt(doc["muscleGroupId"]),
			asInt(doc["equipmentId"]),
			asString(doc["instructions"]),
			createdBy,
			asTime(doc["createdAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert exercise %s: %w", oldID, err)
		}
		exerciseIDMap[oldID] = newID
	}
	fmt.Printf("Migrated exercises: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateWorkoutPlans(ctx context.Context, l loader, tx pgx.Tx, userIDMap, planIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionWorkoutPlans, "workout_plan")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["planId"])
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		exercisesJSON, err := rewriteExercisesJSONB(doc["exercises"], nil)
		if err != nil {
			return fmt.Errorf("rewrite workout_plan exercises: %w", err)
		}
		var newID int
		err = tx.QueryRow(ctx,
			"INSERT INTO workout_plans (trainer_id, name, description, exercises, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
			trainerID, asString(doc["name"]), asString(doc["description"]), exercisesJSON, asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert workout_plan %s: %w", oldID, err)
		}
		planIDMap[oldID] = newID
	}
	fmt.Printf("Migrated workout_plans: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateWorkouts(ctx context.Context, l loader, tx pgx.Tx, userIDMap, planIDMap, exerciseIDMap, workoutIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionWorkouts, "workout")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["workoutId"])
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		var planID interface{}
		if v := doc["planId"]; v != nil && asString(v) != "" {
			id, ok := planIDMap[asString(v)]
			if !ok {
				return fmt.Errorf("unknown planId %s", v)
			}
			planID = id
		}
		exercisesJSON, err := rewriteExercisesJSONB(doc["exercises"], exerciseIDMap)
		if err != nil {
			return fmt.Errorf("rewrite workout exercises: %w", err)
		}
		var newID int
		err = tx.QueryRow(ctx,
			"INSERT INTO workouts (athlete_id, date, plan_id, exercises, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
			athleteID, asDate(doc["date"]), planID, exercisesJSON, asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert workout %s: %w", oldID, err)
		}
		workoutIDMap[oldID] = newID
	}
	fmt.Printf("Migrated workouts: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateMeals(ctx context.Context, l loader, tx pgx.Tx, userIDMap, mealIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionMeals, "meal")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["mealId"])
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		itemsJSON, err := json.Marshal(doc["items"])
		if err != nil {
			return fmt.Errorf("marshal meal items: %w", err)
		}
		var newID int
		err = tx.QueryRow(ctx,
			"INSERT INTO meals (athlete_id, date, meal_type, items, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
			athleteID, asDate(doc["date"]), asString(doc["mealType"]), itemsJSON, asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert meal %s: %w", oldID, err)
		}
		mealIDMap[oldID] = newID
	}
	fmt.Printf("Migrated meals: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateBodyMeasurements(ctx context.Context, l loader, tx pgx.Tx, userIDMap, measurementIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionBodyMeasurements, "body_measurement")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["measurementId"])
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		partsJSON, err := json.Marshal(doc["parts"])
		if err != nil {
			return fmt.Errorf("marshal parts: %w", err)
		}
		var bodyFatPct interface{}
		if v := doc["bodyFatPct"]; v != nil && asString(v) != "" {
			bodyFatPct = asFloat64(v)
		}
		var newID int
		err = tx.QueryRow(ctx,
			"INSERT INTO body_measurements (athlete_id, date, weight, weight_unit, body_fat_pct, parts, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
			athleteID, asDate(doc["date"]), asFloat64(doc["weight"]), asString(doc["weightUnit"]), bodyFatPct, partsJSON, asString(doc["notes"]), asTime(doc["createdAt"]), asTime(doc["updatedAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert body_measurement %s: %w", oldID, err)
		}
		measurementIDMap[oldID] = newID
	}
	fmt.Printf("Migrated body_measurements: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateComments(ctx context.Context, l loader, tx pgx.Tx, userIDMap, workoutIDMap, mealIDMap, commentIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionComments, "comment")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		oldID := asString(doc["commentId"])
		authorID, ok := userIDMap[asString(doc["authorId"])]
		if !ok {
			return fmt.Errorf("unknown authorId %s", doc["authorId"])
		}
		targetType := asString(doc["targetType"])
		var targetID int
		switch targetType {
		case "workout":
			id, ok := workoutIDMap[asString(doc["targetId"])]
			if !ok {
				return fmt.Errorf("unknown workout targetId %s", doc["targetId"])
			}
			targetID = id
		case "meal":
			id, ok := mealIDMap[asString(doc["targetId"])]
			if !ok {
				return fmt.Errorf("unknown meal targetId %s", doc["targetId"])
			}
			targetID = id
		default:
			return fmt.Errorf("unsupported comment targetType %s", targetType)
		}
		var newID int
		err := tx.QueryRow(ctx,
			"INSERT INTO comments (target_type, target_id, author_id, author_role, content, created_at, edited_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
			targetType, targetID, authorID, asString(doc["authorRole"]), asString(doc["content"]), asTime(doc["createdAt"]), asTimePtr(doc["editedAt"]),
		).Scan(&newID)
		if err != nil {
			return fmt.Errorf("insert comment %s: %w", oldID, err)
		}
		commentIDMap[oldID] = newID
	}

	for _, doc := range docs {
		oldID := asString(doc["commentId"])
		parentOld := asString(doc["parentCommentId"])
		if parentOld == "" {
			continue
		}
		parentNew, ok := commentIDMap[parentOld]
		if !ok {
			return fmt.Errorf("unknown parentCommentId %s", parentOld)
		}
		newID := commentIDMap[oldID]
		_, err := tx.Exec(ctx, "UPDATE comments SET parent_comment_id = $1 WHERE id = $2", parentNew, newID)
		if err != nil {
			return fmt.Errorf("update comment parent: %w", err)
		}
	}
	fmt.Printf("Migrated comments: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateWorkoutPlanAssignments(ctx context.Context, l loader, tx pgx.Tx, userIDMap, planIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionWorkoutPlanAssignments, "workout_plan_assignment")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		planID, ok := planIDMap[asString(doc["planId"])]
		if !ok {
			return fmt.Errorf("unknown planId %s", doc["planId"])
		}
		athleteID, ok := userIDMap[asString(doc["athleteId"])]
		if !ok {
			return fmt.Errorf("unknown athleteId %s", doc["athleteId"])
		}
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		_, err := tx.Exec(ctx,
			"INSERT INTO workout_plan_assignments (plan_id, athlete_id, trainer_id, status, created_at) VALUES ($1, $2, $3, $4, $5)",
			planID, athleteID, trainerID, asString(doc["status"]), asTime(doc["createdAt"]),
		)
		if err != nil {
			return fmt.Errorf("insert workout_plan_assignment: %w", err)
		}
	}
	fmt.Printf("Migrated workout_plan_assignments: %d/%d\n", len(docs), len(docs))
	return nil
}

func migrateInvitations(ctx context.Context, l loader, tx pgx.Tx, userIDMap map[string]int) error {
	docs, err := l.loadByType(ctx, config.CollectionInvitations, "invitation")
	if err != nil {
		return err
	}
	for _, doc := range docs {
		trainerID, ok := userIDMap[asString(doc["trainerId"])]
		if !ok {
			return fmt.Errorf("unknown trainerId %s", doc["trainerId"])
		}
		var athleteID interface{}
		if v := doc["athleteId"]; v != nil && asString(v) != "" {
			id, ok := userIDMap[asString(v)]
			if !ok {
				return fmt.Errorf("unknown athleteId %s", v)
			}
			athleteID = id
		}
		_, err := tx.Exec(ctx,
			"INSERT INTO invitations (trainer_id, code, status, created_at, expires_at, used_at, athlete_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
			trainerID, asString(doc["code"]), asString(doc["status"]), asTime(doc["createdAt"]), asTime(doc["expiresAt"]), asTimePtr(doc["usedAt"]), athleteID,
		)
		if err != nil {
			return fmt.Errorf("insert invitation: %w", err)
		}
	}
	fmt.Printf("Migrated invitations: %d/%d\n", len(docs), len(docs))
	return nil
}

func verifyCounts(ctx context.Context, l loader, pool *pgxpool.Pool) error {
	checks := []struct {
		collection string
		table      string
	}{
		{config.CollectionUsers, "users"},
		{config.CollectionRelationships, "relationships"},
		{config.CollectionWorkouts, "workouts"},
		{config.CollectionMeals, "meals"},
		{config.CollectionComments, "comments"},
		{config.CollectionExercises, "exercises"},
		{config.CollectionWorkoutPlans, "workout_plans"},
		{config.CollectionWorkoutPlanAssignments, "workout_plan_assignments"},
		{config.CollectionBodyMeasurements, "body_measurements"},
		{config.CollectionInvitations, "invitations"},
	}
	for _, check := range checks {
		docs, err := l.load(ctx, check.collection)
		if err != nil {
			return fmt.Errorf("load %s for verify: %w", check.collection, err)
		}
		var pgCount int
		if err := pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", check.table)).Scan(&pgCount); err != nil {
			return fmt.Errorf("count %s: %w", check.table, err)
		}
		if docsCount := len(docs); docsCount != pgCount {
			fmt.Printf("COUNT MISMATCH: %s couchbase=%d postgres=%d\n", check.table, docsCount, pgCount)
		} else {
			fmt.Printf("COUNT OK: %s = %d\n", check.table, pgCount)
		}
	}
	return nil
}

func asString(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

func asInt(v interface{}) int {
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	case string:
		i, _ := strconv.Atoi(n)
		return i
	}
	return 0
}

func asFloat64(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case string:
		f, _ := strconv.ParseFloat(n, 64)
		return f
	}
	return 0
}

func asBool(v interface{}) bool {
	if v == nil {
		return false
	}
	if b, ok := v.(bool); ok {
		return b
	}
	return asString(v) == "true"
}

func asTime(v interface{}) time.Time {
	if v == nil {
		return time.Now()
	}
	if t, ok := v.(time.Time); ok {
		return t
	}
	s := asString(v)
	if s == "" {
		return time.Now()
	}
	for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02T15:04:05", "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Now()
}

func asTimePtr(v interface{}) *time.Time {
	if v == nil {
		return nil
	}
	if t, ok := v.(time.Time); ok {
		return &t
	}
	s := asString(v)
	if s == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339, time.RFC3339Nano, "2006-01-02T15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return nil
}

func asDate(v interface{}) time.Time {
	if v == nil {
		return time.Now()
	}
	if t, ok := v.(time.Time); ok {
		return t
	}
	s := asString(v)
	if s == "" {
		return time.Now()
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t
	}
	return asTime(v)
}

func rewriteExercisesJSONB(raw interface{}, exerciseIDMap map[string]int) ([]byte, error) {
	if raw == nil {
		return []byte("[]"), nil
	}
	data, err := json.Marshal(raw)
	if err != nil {
		return nil, err
	}
	var arr []map[string]interface{}
	if err := json.Unmarshal(data, &arr); err != nil {
		return nil, err
	}
	for _, ex := range arr {
		old, ok := ex["exerciseId"].(string)
		if !ok || old == "" {
			continue
		}
		if exerciseIDMap == nil {
			continue
		}
		newID, exists := exerciseIDMap[old]
		if !exists {
			return nil, fmt.Errorf("exerciseId %s not found in map", old)
		}
		ex["exerciseId"] = newID
	}
	return json.Marshal(arr)
}
