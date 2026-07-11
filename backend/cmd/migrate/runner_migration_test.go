package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRunMigration(t *testing.T) {
	pool := setupTestPostgres(t)
	if pool == nil {
		return
	}
	defer pool.Close()

	ctx := context.Background()
	u1, u2 := "user-1", "user-2"
	e1, e2 := "ex-bench", "ex-squat"
	p1, w1, m1 := "plan-1", "workout-1", "meal-1"

	loader := &fixtureLoader{data: map[string][]map[string]interface{}{
		"muscle_groups": {{"id": 1, "code": "chest", "description": "Chest"}, {"id": 2, "code": "legs", "description": "Legs"}},
		"equipment":     {{"id": 1, "code": "barbell", "description": "Barbell"}, {"id": 2, "code": "dumbbell", "description": "Dumbbell"}},
		"users": {
			{"type": "user", "userId": u1, "username": "trainer1", "email": "t1@example.com", "passwordHash": "hash", "role": "trainer", "profile": map[string]interface{}{"name": "T"}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"},
			{"type": "user", "userId": u2, "username": "athlete1", "email": "a1@example.com", "passwordHash": "hash", "role": "athlete", "profile": map[string]interface{}{"name": "A"}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"},
		},
		"exercises": {
			{"type": "exercise", "exerciseId": e1, "name": "Bench Press", "category": "strength", "muscleGroupId": 1, "equipmentId": 1, "instructions": "", "createdBy": nil, "createdAt": "2024-01-01T00:00:00Z"},
			{"type": "exercise", "exerciseId": e2, "name": "Squat", "category": "strength", "muscleGroupId": 2, "equipmentId": 1, "instructions": "", "createdBy": nil, "createdAt": "2024-01-01T00:00:00Z"},
		},
		"workout_plans": {
			{"type": "workout_plan", "planId": p1, "trainerId": u1, "name": "Plan A", "description": "", "exercises": []interface{}{map[string]interface{}{"exerciseId": e1, "name": "Bench Press", "sets": []interface{}{}, "order": 0}}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"},
		},
		"workouts": {
			{"type": "workout", "workoutId": w1, "athleteId": u2, "date": "2024-01-02", "planId": p1, "exercises": []interface{}{map[string]interface{}{"exerciseId": e2, "name": "Squat", "sets": []interface{}{}}}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"},
		},
		"meals": {
			{"type": "meal", "mealId": m1, "athleteId": u2, "date": "2024-01-02", "mealType": "breakfast", "items": []interface{}{map[string]interface{}{"food": "eggs", "quantity": "2", "calories": 100}}, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"},
		},
		"body_measurements": {
			{"type": "body_measurement", "measurementId": "bm-1", "athleteId": u2, "date": "2024-01-02", "weight": 70, "weightUnit": "kg", "bodyFatPct": 15, "parts": map[string]interface{}{}, "notes": "", "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"},
		},
		"comments": {
			{"type": "comment", "commentId": "c-1", "targetType": "workout", "targetId": w1, "authorId": u1, "authorRole": "trainer", "content": "good", "createdAt": "2024-01-01T00:00:00Z"},
		},
		"workout_plan_assignments": {
			{"type": "workout_plan_assignment", "assignmentId": "wpa-1", "planId": p1, "athleteId": u2, "trainerId": u1, "status": "active", "createdAt": "2024-01-01T00:00:00Z"},
		},
		"invitations": {
			{"type": "invitation", "invitationId": "inv-1", "trainerId": u1, "code": "ABC123", "status": "pending", "createdAt": "2024-01-01T00:00:00Z", "expiresAt": "2025-01-01T00:00:00Z"},
		},
	}}

	require.NoError(t, runMigration(ctx, loader, pool))

	var exerciseCount int
	require.NoError(t, pool.QueryRow(ctx, "SELECT COUNT(*) FROM exercises").Scan(&exerciseCount))
	assert.Equal(t, 2, exerciseCount)

	nameToID := make(map[string]int)
	rows, err := pool.Query(ctx, "SELECT id, name FROM exercises ORDER BY id")
	require.NoError(t, err)
	defer rows.Close()
	for rows.Next() {
		var id int
		var name string
		require.NoError(t, rows.Scan(&id, &name))
		nameToID[name] = id
	}
	require.NoError(t, rows.Err())

	var planJSON []byte
	require.NoError(t, pool.QueryRow(ctx, "SELECT exercises FROM workout_plans WHERE name = $1", "Plan A").Scan(&planJSON))
	var planEx []map[string]interface{}
	require.NoError(t, json.Unmarshal(planJSON, &planEx))
	require.Len(t, planEx, 1)
	assert.Equal(t, float64(nameToID["Bench Press"]), planEx[0]["exerciseId"])

	var workoutJSON []byte
	require.NoError(t, pool.QueryRow(ctx, "SELECT exercises FROM workouts").Scan(&workoutJSON))
	var workoutEx []map[string]interface{}
	require.NoError(t, json.Unmarshal(workoutJSON, &workoutEx))
	require.Len(t, workoutEx, 1)
	assert.Equal(t, float64(nameToID["Squat"]), workoutEx[0]["exerciseId"])

	var userCount, workoutCount, mealCount, commentCount int
	require.NoError(t, pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&userCount))
	require.NoError(t, pool.QueryRow(ctx, "SELECT COUNT(*) FROM workouts").Scan(&workoutCount))
	require.NoError(t, pool.QueryRow(ctx, "SELECT COUNT(*) FROM meals").Scan(&mealCount))
	require.NoError(t, pool.QueryRow(ctx, "SELECT COUNT(*) FROM comments").Scan(&commentCount))
	assert.Equal(t, 2, userCount)
	assert.Equal(t, 1, workoutCount)
	assert.Equal(t, 1, mealCount)
	assert.Equal(t, 1, commentCount)
}
