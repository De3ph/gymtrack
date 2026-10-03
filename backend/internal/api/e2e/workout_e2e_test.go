package e2e

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// invalidWorkoutMsg is the single 400 message the create-workout handler
// returns for every binding/validation failure (see CreateWorkout).
const invalidWorkoutMsg = "Invalid workout data. Please check the date and exercises and try again"

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

	// Missing exercises (binding produces a zero-value slice → required fails)
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", map[string]any{
		"date": time.Now().UTC().Format(time.RFC3339),
	}, token)
	RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)

	// Missing date
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", map[string]any{
		"exercises": []map[string]any{},
	}, token)
	RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)

	// Date that is not RFC3339
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", map[string]any{
		"date":      "15-02-2026",
		"exercises": []map[string]any{},
	}, token)
	RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)

	// Empty exercises array (min=1)
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", map[string]any{
		"date":      time.Now().UTC().Format(time.RFC3339),
		"exercises": []map[string]any{},
	}, token)
	RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)

	// Malformed body: valid JSON, wrong top-level type
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", "not-an-object", token)
	RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)

	// Not JSON at all
	w = env.DoAuthRequest(http.MethodPost, "/api/workouts", []int{1, 2, 3}, token)
	RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)

	// Nonexistent workout ID
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/999999", nil, token)
	RequireJSONError(t, w, http.StatusNotFound, "Workout not found. It may have been deleted or the ID is incorrect.")

	// Non-numeric workout ID
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/abc", nil, token)
	RequireJSONError(t, w, http.StatusBadRequest, "Invalid workout ID. Please check the URL and try again")

	// Decimal ID is not an integer
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/1.5", nil, token)
	RequireJSONError(t, w, http.StatusBadRequest, "Invalid workout ID. Please check the URL and try again")
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

	// Unknown username → 404 with the client-not-found message
	w := env.DoAuthRequest(http.MethodGet, "/api/clients/noathnorel/workouts", nil, trainerToken)
	RequireJSONError(t, w, http.StatusNotFound,
		"Client not found. They may have been removed or the username is incorrect")

	// Register a real unrelated athlete → 403 (user exists, no active coaching
	// relationship)
	strangerUsername, _, _ := env.RegisterUser(t, "stranger", "stranger@e2e.test", "Password123!", "athlete")
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+strangerUsername+"/workouts", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You don't have an active coaching relationship with this client, so you can't view their workouts")

	// A trainer username is not a client either: the target's role is never
	// checked, the relationship lookup is what denies access
	otherTrainerUsername, _, _ := env.RegisterUser(t, "othertr", "othertr@e2e.test", "Password123!", "trainer")
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+otherTrainerUsername+"/workouts", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You don't have an active coaching relationship with this client, so you can't view their workouts")
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

	// Trainer can now view the client's workouts, payload included
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	list := decodeWorkoutList(t, w)
	require.Equal(t, 1, list.Count)
	require.Len(t, list.Workouts, 1)
	require.Len(t, list.Workouts[0].Exercises, 1)
	// workouts.exercises is denormalized JSONB: the stored name is whatever the
	// client submitted (workoutPayload sends "Bench Press"), not the catalog
	// name of the referenced exercise.
	assert.Equal(t, "Bench Press", list.Workouts[0].Exercises[0].Name)
	assert.Equal(t, "kg", list.Workouts[0].Exercises[0].Sets[0].WeightUnit)

	// A different trainer still has no access to the same athlete
	otherTrainerToken, _ := env.RegisterTrainer(t, "withrelother")
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, otherTrainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You don't have an active coaching relationship with this client, so you can't view their workouts")
}

// ---------------------------------------------------------------------------
// Helpers shared by the workout edge-case tests
// ---------------------------------------------------------------------------

// workoutExerciseJSON mirrors one entry of the workouts.exercises JSONB column.
type workoutExerciseJSON struct {
	ExerciseID int    `json:"exerciseId"`
	Name       string `json:"name"`
	Notes      string `json:"notes"`
	Sets       []struct {
		Weight     float64 `json:"weight"`
		WeightUnit string  `json:"weightUnit"`
		Reps       int     `json:"reps"`
		RestTime   int     `json:"restTime"`
		Completed  bool    `json:"completed"`
	} `json:"sets"`
}

// workoutJSON mirrors the workout fields asserted by these tests.
type workoutJSON struct {
	WorkoutID int                   `json:"workoutId"`
	AthleteID int                   `json:"athleteId"`
	Date      string                `json:"date"`
	PlanID    int                   `json:"planId"`
	Exercises []workoutExerciseJSON `json:"exercises"`
}

// workoutListJSON mirrors the body of GET /api/workouts and
// GET /api/clients/:username/workouts.
type workoutListJSON struct {
	Workouts []workoutJSON `json:"workouts"`
	Count    int           `json:"count"`
}

// workoutPayloadFor builds a valid create-workout body with an explicit
// exercise name and date. The shared workoutPayload helper hard-codes both,
// which is fine for a single workout but not for filter/pagination fixtures.
func workoutPayloadFor(exerciseID int, exerciseName string, date time.Time) map[string]any {
	return map[string]any{
		"date": date.UTC().Format(time.RFC3339),
		"exercises": []map[string]any{{
			"exerciseId": exerciseID,
			"name":       exerciseName,
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

// mustCreateWorkout creates a workout for the token holder on the given date
// and returns its ID.
func mustCreateWorkout(t testing.TB, env *TestEnv, token string, exerciseID int, name string, date time.Time) int {
	t.Helper()
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayloadFor(exerciseID, name, date), token)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		WorkoutID int `json:"workoutId"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)
	if created.WorkoutID == 0 {
		t.Fatalf("expected non-zero workoutId, body: %s", w.Body.String())
	}
	return created.WorkoutID
}

// decodeWorkoutList parses a workout-list response body.
func decodeWorkoutList(t testing.TB, w *httptest.ResponseRecorder) workoutListJSON {
	t.Helper()
	var body workoutListJSON
	ParseJSON(t, w.Body.Bytes(), &body)
	return body
}

// listWorkoutDates returns the response date strings in response order.
func listWorkoutDates(body workoutListJSON) []string {
	dates := make([]string, 0, len(body.Workouts))
	for _, wk := range body.Workouts {
		dates = append(dates, wk.Date)
	}
	return dates
}

// newTrainerAthletePair registers a trainer and an athlete and returns their
// tokens/IDs. No relationship is established — call establishRelationship.
func newTrainerAthletePair(t testing.TB, env *TestEnv, suffix string) (trainerToken string, trainerID int, athleteToken string, athleteID int, athleteUsername string) {
	t.Helper()
	_, trainerEmail, trainerID := env.RegisterUser(t, "tr"+suffix, "tr"+suffix+"@e2e.test", "Password123!", "trainer")
	trainerToken, _ = env.Login(t, trainerEmail, "Password123!")
	athleteUsername, athleteEmail, athleteID := env.RegisterUser(t, "at"+suffix, "at"+suffix+"@e2e.test", "Password123!", "athlete")
	athleteToken, _ = env.Login(t, athleteEmail, "Password123!")
	return trainerToken, trainerID, athleteToken, athleteID, athleteUsername
}

// ---------------------------------------------------------------------------
// Authentication / authorization
// ---------------------------------------------------------------------------

// TestE2E_Workout_Unauthenticated asserts that all four workout routes sit
// behind the JWT middleware, exercising each of its three rejection paths
// (missing header, malformed header, unusable token) with body assertions.
func TestE2E_Workout_Unauthenticated(t *testing.T) {
	env := SetupTestEnv(t)

	routes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/workouts"},
		{http.MethodGet, "/api/workouts"},
		{http.MethodGet, "/api/workouts/1"},
		{http.MethodGet, "/api/clients/someone/workouts"},
	}

	for _, r := range routes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			// No Authorization header at all
			w := env.DoRequest(r.method, r.path, map[string]any{}, nil)
			RequireJSONError(t, w, http.StatusUnauthorized,
				"Authorization header is required. Please log in and include your Bearer token")

			// Header present but not "Bearer <token>"
			w = env.DoRequest(r.method, r.path, map[string]any{}, map[string]string{"Authorization": "Basic abc"})
			RequireJSONError(t, w, http.StatusUnauthorized,
				"Invalid Authorization header. Expected format: Bearer <token>")

			// Correct shape, unusable token
			w = env.DoRequest(r.method, r.path, map[string]any{}, map[string]string{"Authorization": "Bearer not.a.jwt"})
			RequireJSONError(t, w, http.StatusUnauthorized,
				"Your session token is invalid or expired. Please log in again")
		})
	}
}

// TestE2E_Workout_RoleGuards covers the role rules enforced for the personal
// workout endpoints: only athletes may log or list their own workouts.
// Trainers and admins get 403 with the exact guard message.
func TestE2E_Workout_RoleGuards(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "wguard")
	adminToken, _ := registerAdmin(t, env, "wguard")

	const (
		createGuard = "Only athletes can log workouts. Trainers should create workout plans instead"
		listGuard   = "Only athletes can view their workout history. Trainers, please use the client workouts view"
	)

	roles := []struct {
		role  string
		token string
	}{
		{"trainer", trainerToken},
		{"admin", adminToken},
	}

	for _, tc := range roles {
		t.Run(tc.role+" cannot create", func(t *testing.T) {
			// The payload must be valid so the request reaches the service
			// role check rather than failing validation first.
			w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(1), tc.token)
			RequireJSONError(t, w, http.StatusForbidden, createGuard)
		})

		t.Run(tc.role+" cannot list", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodGet, "/api/workouts", nil, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, listGuard)
		})
	}
}

// TestE2E_Workout_CreateValidation walks the field-level validator rules of
// CreateWorkoutRequest / models.WorkoutExercise / models.ExerciseSet, which
// the earlier suite only probed at the top level.
func TestE2E_Workout_CreateValidation(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "wval")
	exerciseID := createExerciseForWorkout(t, env, token, "Validation Press")
	date := time.Now().UTC().Format(time.RFC3339)

	validSet := map[string]any{"weight": 10.0, "weightUnit": "kg", "reps": 5, "restTime": 60, "completed": true}

	// bodyWith wraps the given sets in a single-exercise workout body.
	bodyWith := func(sets []map[string]any) map[string]any {
		return map[string]any{
			"date": date,
			"exercises": []map[string]any{{
				"exerciseId": exerciseID,
				"name":       "Validation Press",
				"sets":       sets,
			}},
		}
	}

	cases := []struct {
		name string
		body map[string]any
	}{
		{"no sets", bodyWith([]map[string]any{})},
		{"missing reps", bodyWith([]map[string]any{{"weight": 10.0, "weightUnit": "kg"}})},
		{"zero reps", bodyWith([]map[string]any{{"weight": 10.0, "weightUnit": "kg", "reps": 0}})},
		{"unknown weight unit", bodyWith([]map[string]any{{"weight": 10.0, "weightUnit": "stones", "reps": 5}})},
		{"missing weight unit", bodyWith([]map[string]any{{"weight": 10.0, "reps": 5}})},
		{"negative weight", bodyWith([]map[string]any{{"weight": -0.5, "weightUnit": "kg", "reps": 5}})},
		{"negative rest time", bodyWith([]map[string]any{{"weight": 10.0, "weightUnit": "kg", "reps": 5, "restTime": -1}})},
		{"missing exercise name", map[string]any{
			"date": date,
			"exercises": []map[string]any{{
				"exerciseId": exerciseID,
				"sets":       []map[string]any{validSet},
			}},
		}},
		{"missing exercises key", map[string]any{"date": date}},
		{"date is not a timestamp", map[string]any{
			"date": 12345,
			"exercises": []map[string]any{{
				"exerciseId": exerciseID,
				"name":       "Validation Press",
				"sets":       []map[string]any{validSet},
			}},
		}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodPost, "/api/workouts", tc.body, token)
			RequireJSONError(t, w, http.StatusBadRequest, invalidWorkoutMsg)
		})
	}

	// Control case: the baseline set is accepted, proving the table above
	// fails for the intended reason rather than a broken fixture.
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", bodyWith([]map[string]any{validSet}), token)
	RequireStatus(t, w, http.StatusCreated)
}

// TestE2E_Workout_CreateRoundTrip asserts that a fully-populated workout
// survives the PostgreSQL JSONB round-trip field by field (the original test
// only checked the exercise name).
func TestE2E_Workout_CreateRoundTrip(t *testing.T) {
	env := SetupTestEnv(t)
	token, athleteID := env.RegisterAthlete(t, "wrt")
	exerciseID := createExerciseForWorkout(t, env, token, "Round Trip Press")

	body := map[string]any{
		"date": "2026-02-15T00:00:00Z",
		"exercises": []map[string]any{
			{
				"exerciseId": exerciseID,
				"name":       "Round Trip Press",
				"notes":      "felt strong",
				"sets": []map[string]any{
					{"weight": 60.5, "weightUnit": "kg", "reps": 8, "restTime": 90, "completed": true},
					{"weight": 62.5, "weightUnit": "kg", "reps": 6, "restTime": 120, "completed": false},
				},
			},
			{
				"exerciseId": 0, // freeform exercise: no catalog row required
				"name":       "Bodyweight Carry",
				"sets": []map[string]any{
					{"weight": 0, "weightUnit": "lbs", "reps": 1, "restTime": 0, "completed": true},
				},
			},
		},
	}

	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", body, token)
	RequireStatus(t, w, http.StatusCreated)
	var created workoutJSON
	ParseJSON(t, w.Body.Bytes(), &created)
	assert.Equal(t, athleteID, created.AthleteID)
	assert.Equal(t, "2026-02-15T00:00:00Z", created.Date,
		"the date column is DATE, so it round-trips as UTC midnight")

	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(created.WorkoutID), nil, token)
	RequireStatus(t, w, http.StatusOK)
	var got workoutJSON
	ParseJSON(t, w.Body.Bytes(), &got)

	require.Len(t, got.Exercises, 2, "both exercises must persist")
	require.Len(t, got.Exercises[0].Sets, 2, "both sets must persist")

	first := got.Exercises[0]
	assert.Equal(t, exerciseID, first.ExerciseID)
	assert.Equal(t, "Round Trip Press", first.Name)
	assert.Equal(t, "felt strong", first.Notes)
	assert.Equal(t, 60.5, first.Sets[0].Weight)
	assert.Equal(t, "kg", first.Sets[0].WeightUnit)
	assert.Equal(t, 8, first.Sets[0].Reps)
	assert.Equal(t, 90, first.Sets[0].RestTime)
	assert.True(t, first.Sets[0].Completed)
	assert.Equal(t, 62.5, first.Sets[1].Weight)
	assert.Equal(t, 6, first.Sets[1].Reps)
	assert.Equal(t, 120, first.Sets[1].RestTime)
	assert.False(t, first.Sets[1].Completed)

	assert.Equal(t, 0, got.Exercises[1].ExerciseID, "freeform exercises keep exerciseId 0")
	assert.Equal(t, "Bodyweight Carry", got.Exercises[1].Name)
	assert.Equal(t, "lbs", got.Exercises[1].Sets[0].WeightUnit)
	assert.Equal(t, 0.0, got.Exercises[1].Sets[0].Weight)

	// The new workout is visible in the athlete's own list as well
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts", nil, token)
	RequireStatus(t, w, http.StatusOK)
	list := decodeWorkoutList(t, w)
	require.Equal(t, 1, list.Count)
	assert.Equal(t, created.WorkoutID, list.Workouts[0].WorkoutID)
}

// ---------------------------------------------------------------------------
// List query parameters
// ---------------------------------------------------------------------------

// TestE2E_Workout_ListPaginationAndDateFilters exercises the query parameters
// of GET /api/workouts, which the original suite never sent.
func TestE2E_Workout_ListPaginationAndDateFilters(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "wfilter")
	exerciseID := createExerciseForWorkout(t, env, token, "Filter Squat")

	jan := mustCreateWorkout(t, env, token, exerciseID, "Filter Squat", time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC))
	feb := mustCreateWorkout(t, env, token, exerciseID, "Filter Squat", time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC))
	mar := mustCreateWorkout(t, env, token, exerciseID, "Filter Squat", time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC))

	// Newest first; count is the total number of workouts matching the
	// request filters, not the size of the returned page.
	w := env.DoAuthRequest(http.MethodGet, "/api/workouts", nil, token)
	RequireStatus(t, w, http.StatusOK)
	all := decodeWorkoutList(t, w)
	assert.Equal(t, 3, all.Count)
	assert.Equal(t,
		[]string{"2026-03-20T00:00:00Z", "2026-02-15T00:00:00Z", "2026-01-10T00:00:00Z"},
		listWorkoutDates(all))

	// limit only
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?limit=2", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page := decodeWorkoutList(t, w)
	assert.Equal(t, 3, page.Count)
	assert.Equal(t, mar, page.Workouts[0].WorkoutID)
	assert.Equal(t, feb, page.Workouts[1].WorkoutID)

	// limit + offset
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?limit=1&offset=2", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page = decodeWorkoutList(t, w)
	assert.Equal(t, 3, page.Count)
	assert.Equal(t, jan, page.Workouts[0].WorkoutID)

	// offset past the end is an empty (but successful) page; count still
	// reports the total
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?limit=10&offset=10", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page = decodeWorkoutList(t, w)
	assert.Equal(t, 3, page.Count)
	assert.Empty(t, page.Workouts)

	// Date range: only the matching window is returned
	w = env.DoAuthRequest(http.MethodGet,
		"/api/workouts?startDate=2026-02-01T00:00:00Z&endDate=2026-02-28T23:59:59Z", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page = decodeWorkoutList(t, w)
	assert.Equal(t, 1, page.Count)
	assert.Equal(t, feb, page.Workouts[0].WorkoutID)

	// A range wide enough to cover every workout
	w = env.DoAuthRequest(http.MethodGet,
		"/api/workouts?startDate=2026-01-01T00:00:00Z&endDate=2026-03-31T23:59:59Z", nil, token)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 3, decodeWorkoutList(t, w).Count)

	// Reversed range matches nothing (start <= end is never validated)
	w = env.DoAuthRequest(http.MethodGet,
		"/api/workouts?startDate=2026-03-01T00:00:00Z&endDate=2026-01-01T00:00:00Z", nil, token)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 0, decodeWorkoutList(t, w).Count)
	// Pagination applies inside a date range as well: count is the window
	// total, workouts is the requested page.
	w = env.DoAuthRequest(http.MethodGet,
		"/api/workouts?startDate=2026-01-01T00:00:00Z&endDate=2026-03-31T23:59:59Z&limit=2", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page = decodeWorkoutList(t, w)
	assert.Equal(t, 3, page.Count)
	assert.Len(t, page.Workouts, 2)
	assert.Equal(t, mar, page.Workouts[0].WorkoutID)
	assert.Equal(t, feb, page.Workouts[1].WorkoutID)

	// A single bound is applied on its own: start-only keeps the newer
	// workouts, end-only keeps the older ones.
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?startDate=2026-03-01T00:00:00Z", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page = decodeWorkoutList(t, w)
	assert.Equal(t, 1, page.Count)
	assert.Equal(t, mar, page.Workouts[0].WorkoutID)

	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?endDate=2026-01-31T00:00:00Z", nil, token)
	RequireStatus(t, w, http.StatusOK)
	page = decodeWorkoutList(t, w)
	assert.Equal(t, 1, page.Count)
	assert.Equal(t, jan, page.Workouts[0].WorkoutID)

	// Unparseable range → 400 with the RFC3339 hint
	w = env.DoAuthRequest(http.MethodGet,
		"/api/workouts?startDate=yesterday&endDate=2026-02-28T00:00:00Z", nil, token)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid search parameters. Please check the date format (RFC3339, e.g. 2026-09-06T00:00:00Z) and try again")
}

// TestE2E_Workout_ListPaginationEdgeCases pins down how invalid pagination
// values behave today. Negative limits/offsets reach PostgreSQL unclamped and
// surface as 500 (security audit OBS-002), while non-numeric values are
// discarded by strconv.Atoi and behave as 0. Update these expectations if
// pagination starts clamping/validating.
func TestE2E_Workout_ListPaginationEdgeCases(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "wpage")
	exerciseID := createExerciseForWorkout(t, env, token, "Page Curl")
	mustCreateWorkout(t, env, token, exerciseID, "Page Curl", time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC))
	mustCreateWorkout(t, env, token, exerciseID, "Page Curl", time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC))

	// limit=0 → LIMIT 0: a successful but empty page; count is still the total
	w := env.DoAuthRequest(http.MethodGet, "/api/workouts?limit=0", nil, token)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 2, decodeWorkoutList(t, w).Count)

	// Non-numeric limit is dropped by strconv.Atoi → treated as 0 (empty page)
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?limit=abc", nil, token)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 2, decodeWorkoutList(t, w).Count)

	// ...and a non-numeric offset is likewise ignored
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?offset=xyz", nil, token)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 2, decodeWorkoutList(t, w).Count)

	// Negative values are handed straight to PostgreSQL → 500
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?limit=-1", nil, token)
	RequireStatus(t, w, http.StatusInternalServerError)

	w = env.DoAuthRequest(http.MethodGet, "/api/workouts?offset=-1", nil, token)
	RequireStatus(t, w, http.StatusInternalServerError)
}

// TestE2E_Workout_GetByID_Access covers the GET /api/workouts/:id access rules,
// including the documented trainer IDOR (security audit AUTHZ-001).
func TestE2E_Workout_GetByID_Access(t *testing.T) {
	env := SetupTestEnv(t)
	ownerToken, ownerID := env.RegisterAthlete(t, "wowner")
	otherToken, _ := env.RegisterAthlete(t, "wother")
	trainerToken, _ := env.RegisterTrainer(t, "widor")
	adminToken, _ := registerAdmin(t, env, "widor")

	exerciseID := createExerciseForWorkout(t, env, ownerToken, "IDOR Row")
	workoutID := mustCreateWorkout(t, env, ownerToken, exerciseID, "IDOR Row",
		time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC))

	// Owner can read it
	w := env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(workoutID), nil, ownerToken)
	RequireStatus(t, w, http.StatusOK)
	var got workoutJSON
	ParseJSON(t, w.Body.Bytes(), &got)
	assert.Equal(t, workoutID, got.WorkoutID)
	assert.Equal(t, ownerID, got.AthleteID)

	// Another athlete is refused with the ownership message
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(workoutID), nil, otherToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"This workout belongs to another athlete. You can only view your own workouts")

	// Negative IDs parse fine and simply do not exist
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/-1", nil, ownerToken)
	RequireJSONError(t, w, http.StatusNotFound, "Workout not found. It may have been deleted or the ID is incorrect.")

	// Known unfixed finding AUTHZ-001: GetWorkout only enforces ownership for
	// athletes, so ANY trainer — and by extension any admin — can read ANY
	// workout by ID without a coaching relationship. This pins the current
	// behaviour; change both to 403 when AUTHZ-001 is fixed.
	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(workoutID), nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)

	w = env.DoAuthRequest(http.MethodGet, "/api/workouts/"+itoa(workoutID), nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
}

// ---------------------------------------------------------------------------
// Trainer client view
// ---------------------------------------------------------------------------

// TestE2E_Workout_ClientView_RoleGuardsAndFilters covers the trainer-only
// client view: the role gate, the date filter, the exerciseType filter and
// pagination on GET /api/clients/:username/workouts.
func TestE2E_Workout_ClientView_RoleGuardsAndFilters(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID, athleteToken, _, athleteUsername := newTrainerAthletePair(t, env, "cview")
	adminToken, _ := registerAdmin(t, env, "cview")

	exerciseID := createExerciseForWorkout(t, env, athleteToken, "Front Squat")
	mustCreateWorkout(t, env, athleteToken, exerciseID, "Bench Press", time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC))
	feb := mustCreateWorkout(t, env, athleteToken, exerciseID, "Front Squat", time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC))
	mar := mustCreateWorkout(t, env, athleteToken, exerciseID, "Front Squat", time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC))

	const roleGuard = "Only trainers can view client workouts. Please log in as a trainer"

	// Athletes cannot use the client view: the role check runs before any
	// parameter parsing or username lookup, so even a bogus username or a
	// malformed date still yields the role guard.
	w := env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, athleteToken)
	RequireJSONError(t, w, http.StatusForbidden, roleGuard)

	w = env.DoAuthRequest(http.MethodGet, "/api/clients/nobody/workouts?startDate=nope&endDate=nope", nil, athleteToken)
	RequireJSONError(t, w, http.StatusForbidden, roleGuard)

	// Admins get no bypass either — this route is trainer-only
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, adminToken)
	RequireJSONError(t, w, http.StatusForbidden, roleGuard)

	// Establish the coaching relationship, then the trainer has access
	establishRelationship(t, env, trainerToken, trainerID, athleteToken, athleteUsername)

	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	all := decodeWorkoutList(t, w)
	assert.Equal(t, 3, all.Count)
	assert.Equal(t,
		[]string{"2026-03-20T00:00:00Z", "2026-02-15T00:00:00Z", "2026-01-10T00:00:00Z"},
		listWorkoutDates(all))

	// exerciseType is a case-insensitive partial match over exercise names
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts?exerciseType=squat", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	filtered := decodeWorkoutList(t, w)
	assert.Equal(t, 3, filtered.Count) // count ignores the exerciseType filter
	assert.Equal(t, mar, filtered.Workouts[0].WorkoutID)
	assert.Equal(t, feb, filtered.Workouts[1].WorkoutID)

	// exerciseType with no match → empty page, not an error
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts?exerciseType=deadlift", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 3, decodeWorkoutList(t, w).Count) // period total; no workouts match

	// Pagination applies to the client view too
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts?limit=1&offset=1", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	page := decodeWorkoutList(t, w)
	assert.Equal(t, 3, page.Count)
	assert.Equal(t, feb, page.Workouts[0].WorkoutID)

	// Date filter
	w = env.DoAuthRequest(http.MethodGet,
		"/api/clients/"+athleteUsername+"/workouts?startDate=2026-03-01T00:00:00Z&endDate=2026-03-31T23:59:59Z", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	onlyMarch := decodeWorkoutList(t, w)
	assert.Equal(t, 1, onlyMarch.Count)
	assert.Equal(t, mar, onlyMarch.Workouts[0].WorkoutID)

	// A malformed date: GetClientWorkouts calls handleServiceError BEFORE its
	// own fallback, so the INVALID_DATE service message wins and the
	// "Invalid request. Please check the client username..." branch is dead
	// code (ParseWorkoutQueryParams can only fail with INVALID_DATE).
	w = env.DoAuthRequest(http.MethodGet,
		"/api/clients/"+athleteUsername+"/workouts?startDate=nope&endDate=2026-03-31T00:00:00Z", nil, trainerToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid date format. Please use RFC3339 format, e.g. 2026-09-06T00:00:00Z")
}

// TestE2E_Workout_ClientView_TerminatedRelationship asserts that access is
// revoked as soon as a relationship stops being active — the service checks
// Relationship.IsActive, not merely that a row exists.
func TestE2E_Workout_ClientView_TerminatedRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID, athleteToken, athleteID, athleteUsername := newTrainerAthletePair(t, env, "wterm")

	exerciseID := createExerciseForWorkout(t, env, athleteToken, "Terminated Row")
	mustCreateWorkout(t, env, athleteToken, exerciseID, "Terminated Row", time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC))

	establishRelationship(t, env, trainerToken, trainerID, athleteToken, athleteUsername)

	w := env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	assert.Equal(t, 1, decodeWorkoutList(t, w).Count)

	// Terminate the relationship directly; DELETE /api/relationships/:id is
	// covered by the relationship test suite.
	if _, err := env.DB.Exec(context.Background(),
		`UPDATE relationships SET status = 'terminated' WHERE trainer_id = $1 AND athlete_id = $2`,
		trainerID, athleteID); err != nil {
		t.Fatalf("failed to terminate relationship: %v", err)
	}

	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/workouts", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You don't have an active coaching relationship with this client, so you can't view their workouts")
}
