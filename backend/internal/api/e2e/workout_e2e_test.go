package e2e

import (
	"net/http"
	"testing"
	"time"
)

// createExerciseForWorkout seeds an exercise through the public catalog API
// and returns its ID. Names are uniquified (exercises.name is UNIQUE).
func createExerciseForWorkout(t testing.TB, env *TestEnv, token, name string) int {
	t.Helper()
	w := env.DoAuthRequest(http.MethodPost, "/api/exercises", map[string]any{
		"name":          UniqueName(name),
		"category":      "strength",
		"muscleGroupId": 1,
		"equipmentId":   1,
	}, token)
	RequireStatus(t, w, http.StatusCreated)
	var ex struct {
		ExerciseID int `json:"exerciseId"`
	}
	ParseJSON(t, w.Body.Bytes(), &ex)
	return ex.ExerciseID
}

// workoutPayload builds a valid create/update workout request body.
func workoutPayload(exerciseID int) map[string]any {
	return map[string]any{
		"date": time.Now().UTC().Format(time.RFC3339),
		"exercises": []map[string]any{{
			"exerciseId": exerciseID,
			"name":       "Bench Press",
			"sets": []map[string]any{{
				"weight":     60.5,
				"weightUnit": "kg",
				"reps":       8,
				"restTime":   90,
				"completed":  true,
			}},
		}},
	}
}

func TestE2E_Workout_CR_OwnAthlete(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "wcrud")
	exerciseID := createExerciseForWorkout(t, env, token, "Bench Press")

	// Create
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(exerciseID), token)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		WorkoutID int `json:"workoutId"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)
	if created.WorkoutID == 0 {
		t.Fatal("expected non-zero workoutId")
	}

	// Get by ID
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(created.WorkoutID), nil, token)
	RequireStatus(t, w, http.StatusOK)
	var got struct {
		Exercises []struct {
			Name string `json:"name"`
		} `json:"exercises"`
	}
	ParseJSON(t, w.Body.Bytes(), &got)
	if len(got.Exercises) != 1 || got.Exercises[0].Name != "Bench Press" {
		t.Fatalf("unexpected workout payload: %s", w.Body.String())
	}

	// List
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts", nil, token)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Workouts []map[string]any `json:"workouts"`
		Count    int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1, got %d", list.Count)
	}

}

func TestE2E_Workout_TrainerCannotCreate(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "wtrnc")
	athleteToken, _ := env.RegisterAthlete(t, "wathx")
	exerciseID := createExerciseForWorkout(t, env, athleteToken, "Squat")

	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(exerciseID), trainerToken)
	RequireStatus(t, w, http.StatusForbidden)
}

func TestE2E_Workout_AthleteCannotViewOthers(t *testing.T) {
	env := SetupTestEnv(t)
	tokenA, _ := env.RegisterAthlete(t, "ownera")
	tokenB, _ := env.RegisterAthlete(t, "otherb")
	exerciseID := createExerciseForWorkout(t, env, tokenA, "Deadlift")

	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(exerciseID), tokenA)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		WorkoutID int `json:"workoutId"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)

	// Athlete B must not see A's workout
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(created.WorkoutID), nil, tokenB)
	RequireStatus(t, w, http.StatusForbidden)

	// Athlete B's own list must be empty
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts", nil, tokenB)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Count int `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 0 {
		t.Fatalf("expected empty list for athlete B, got %d", list.Count)
	}
}

func TestE2E_Workout_InvalidPayloads(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "winv")

	// Missing exercises
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", map[string]any{
		"date": time.Now().UTC().Format(time.RFC3339),
	}, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Empty exercises array
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", map[string]any{
		"date":      time.Now().UTC().Format(time.RFC3339),
		"exercises": []map[string]any{},
	}, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Malformed body
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", "not-an-object", token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Nonexistent workout ID
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/999999", nil, token)
	RequireStatus(t, w, http.StatusNotFound)

	// Non-numeric workout ID
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/abc", nil, token)
	RequireStatus(t, w, http.StatusBadRequest)
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}

// establishRelationship runs the full coaching-request handshake:
// athlete requests coaching, trainer accepts. Returns the trainer's token
// and the athlete's username.
func establishRelationship(t testing.TB, env *TestEnv, trainerToken string, trainerID int, athleteToken string, athleteUsername string) {
	t.Helper()

	// Athlete creates a coaching request
	w := env.DoAuthRequest(http.MethodPost, "/api/coaching-requests", map[string]any{
		"trainerId": trainerID,
		"message":   "please coach me",
	}, athleteToken)
	RequireStatus(t, w, http.StatusCreated)

	// Trainer lists pending requests and picks the one from this athlete
	w = env.DoAuthRequest(http.MethodGet, "/api/coaching-requests/pending", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var pending struct {
		Requests []struct {
			RequestID int `json:"requestId"`
			Athlete   *struct {
				Username string `json:"username"`
			} `json:"athlete"`
		} `json:"requests"`
	}
	ParseJSON(t, w.Body.Bytes(), &pending)

	var reqID int
	for _, r := range pending.Requests {
		if r.Athlete != nil && r.Athlete.Username == athleteUsername {
			reqID = r.RequestID
			break
		}
	}
	if reqID == 0 {
		t.Fatal("pending coaching request for athlete not found")
	}

	// Trainer accepts
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(reqID)+"/accept", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
}

func TestE2E_Workout_TrainerClientView_NoRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "norel")
	_, _, _ = env.RegisterUser(t, "noathnorel", "noathnorel@e2e.test", "Password123!", "athlete")

	// Trainer has no relationship with this athlete
	w := env.DoAuthRequest(http.MethodGet, "/api/clients/noathnorel/workouts", nil, trainerToken)
	RequireStatus(t, w, http.StatusNotFound) // unknown username

	// Register a real unrelated athlete and try again
	strangerUsername, _, _ := env.RegisterUser(t, "stranger", "stranger@e2e.test", "Password123!", "athlete")
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+strangerUsername+"/workouts", nil, trainerToken)
	RequireStatus(t, w, http.StatusForbidden)
}

func TestE2E_Workout_TrainerClientView_WithRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	trainerUsername, trainerEmail, trainerID := env.RegisterUser(t, "withrel", "withrel@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	athleteUsername, athleteEmail, _ := env.RegisterUser(t, "withrelath", "withrelath@e2e.test", "Password123!", "athlete")
	athleteToken, _ := env.Login(t, athleteEmail, "Password123!")
	_ = trainerUsername
	exerciseID := createExerciseForWorkout(t, env, athleteToken, "Overhead Press")

	// Athlete logs a workout
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(exerciseID), athleteToken)
	RequireStatus(t, w, http.StatusCreated)

	// Establish trainer-athlete relationship
	establishRelationship(t, env, trainerToken, trainerID, athleteToken, athleteUsername)

	// Trainer can now view the client's workouts
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Workouts []map[string]any `json:"workouts"`
		Count    int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1, got %d", list.Count)
	}
}
