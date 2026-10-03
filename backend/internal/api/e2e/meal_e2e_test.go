package e2e

import (
	"net/http"
	"testing"
	"time"
)

// mealPayload builds a valid create meal request body.
func mealPayload(mealType string) map[string]any {
	return map[string]any{
		"date":     time.Now().UTC().Format(time.RFC3339),
		"mealType": mealType,
		"items": []map[string]any{
			{
				"food":     "Chicken Breast",
				"quantity": "200g",
				"calories": 330.0,
				"macros": map[string]any{
					"protein": 62.0,
					"carbs":   0.0,
					"fats":    7.0,
				},
			},
			{
				"food":     "Brown Rice",
				"quantity": "150g",
				"calories": 165.0,
				"macros": map[string]any{
					"protein": 3.5,
					"carbs":   35.0,
					"fats":    1.2,
				},
			},
		},
	}
}

func TestE2E_Meal_CR_OwnAthlete(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "mcrud")

	// Create
	w := env.DoAuthRequest(http.MethodPost, "/api/meals", mealPayload("lunch"), token)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		MealID int `json:"mealId"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)
	if created.MealID == 0 {
		t.Fatal("expected non-zero mealId")
	}

	// Get by ID
	w = env.DoAuthRequest(http.MethodGet, "/api/meals/"+itoa(created.MealID), nil, token)
	RequireStatus(t, w, http.StatusOK)
	var got struct {
		MealType string `json:"mealType"`
		Items    []struct {
			Food string `json:"food"`
		} `json:"items"`
	}
	ParseJSON(t, w.Body.Bytes(), &got)
	if got.MealType != "lunch" {
		t.Fatalf("expected mealType 'lunch', got %q", got.MealType)
	}
	if len(got.Items) != 2 || got.Items[0].Food != "Chicken Breast" {
		t.Fatalf("unexpected meal payload: %s", w.Body.String())
	}

	// List
	w = env.DoAuthRequest(http.MethodGet, "/api/meals", nil, token)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Meals []map[string]any `json:"meals"`
		Count int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1, got %d", list.Count)
	}
}

func TestE2E_Meal_TrainerCannotCreate(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "mtrnc")
	env.RegisterAthlete(t, "mathx") // an athlete exists, but the caller is a trainer

	w := env.DoAuthRequest(http.MethodPost, "/api/meals", mealPayload("breakfast"), trainerToken)
	RequireStatus(t, w, http.StatusForbidden)
}

func TestE2E_Meal_AthleteCannotViewOthers(t *testing.T) {
	env := SetupTestEnv(t)
	tokenA, _ := env.RegisterAthlete(t, "ownera")
	tokenB, _ := env.RegisterAthlete(t, "otherb")

	w := env.DoAuthRequest(http.MethodPost, "/api/meals", mealPayload("dinner"), tokenA)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		MealID int `json:"mealId"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)

	// Athlete B must not see A's meal
	w = env.DoAuthRequest(http.MethodGet, "/api/meals/"+itoa(created.MealID), nil, tokenB)
	RequireStatus(t, w, http.StatusForbidden)

	// Athlete B's list must be empty (isolation)
	w = env.DoAuthRequest(http.MethodGet, "/api/meals", nil, tokenB)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Count int `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 0 {
		t.Fatalf("expected empty list for other athlete, got %d", list.Count)
	}
}
func TestE2E_Meal_InvalidPayloads(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "minval")

	tests := []struct {
		name       string
		payload    any
		wantStatus int
		wantError  string
	}{
		{
			name:       "missing date",
			payload:    map[string]any{"mealType": "lunch", "items": []any{map[string]any{"food": "Apple", "quantity": "1", "calories": 52, "macros": map[string]any{"protein": 0.3, "carbs": 14, "fats": 0.2}}}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "missing mealType",
			payload:    map[string]any{"date": time.Now().UTC().Format(time.RFC3339), "items": []any{map[string]any{"food": "Apple", "quantity": "1", "calories": 52, "macros": map[string]any{"protein": 0.3, "carbs": 14, "fats": 0.2}}}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "invalid mealType",
			payload:    map[string]any{"date": time.Now().UTC().Format(time.RFC3339), "mealType": "brunch", "items": []any{map[string]any{"food": "Apple", "quantity": "1", "calories": 52, "macros": map[string]any{"protein": 0.3, "carbs": 14, "fats": 0.2}}}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "empty items",
			payload:    map[string]any{"date": time.Now().UTC().Format(time.RFC3339), "mealType": "snack", "items": []any{}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "missing food in item",
			payload:    map[string]any{"date": time.Now().UTC().Format(time.RFC3339), "mealType": "snack", "items": []any{map[string]any{"quantity": "1", "calories": 52, "macros": map[string]any{"protein": 0.3, "carbs": 14, "fats": 0.2}}}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "missing quantity in item",
			payload:    map[string]any{"date": time.Now().UTC().Format(time.RFC3339), "mealType": "snack", "items": []any{map[string]any{"food": "Apple", "calories": 52, "macros": map[string]any{"protein": 0.3, "carbs": 14, "fats": 0.2}}}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "negative calories",
			payload:    map[string]any{"date": time.Now().UTC().Format(time.RFC3339), "mealType": "snack", "items": []any{map[string]any{"food": "Apple", "quantity": "1", "calories": -10, "macros": map[string]any{"protein": 0.3, "carbs": 14, "fats": 0.2}}}},
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
		{
			name:       "malformed JSON body",
			payload:    "not-a-map",
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid meal data. Please check the date, meal type and items and try again",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodPost, "/api/meals", tc.payload, token)
			RequireJSONError(t, w, tc.wantStatus, tc.wantError)
		})
	}
}
func TestE2E_Meal_TrainerClientView_NoRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "norel")

	// Trainer has no relationship with unknown username
	w := env.DoAuthRequest(http.MethodGet, "/api/clients/unknownathlete/meals", nil, trainerToken)
	RequireStatus(t, w, http.StatusNotFound) // unknown username

	// Register a real unrelated athlete and try again
	strangerUsername, _, _ := env.RegisterUser(t, "stranger", "stranger@e2e.test", "Password123!", "athlete")
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+strangerUsername+"/meals", nil, trainerToken)
	RequireStatus(t, w, http.StatusForbidden)
}

func TestE2E_Meal_TrainerClientView_WithRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	trainerUsername, trainerEmail, trainerID := env.RegisterUser(t, "withrel", "withrel@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	athleteUsername, athleteEmail, _ := env.RegisterUser(t, "withrelath", "withrelath@e2e.test", "Password123!", "athlete")
	athleteToken, _ := env.Login(t, athleteEmail, "Password123!")
	_ = trainerUsername

	// Athlete logs a meal
	w := env.DoAuthRequest(http.MethodPost, "/api/meals", mealPayload("breakfast"), athleteToken)
	RequireStatus(t, w, http.StatusCreated)

	// Establish trainer-athlete relationship
	establishRelationship(t, env, trainerToken, trainerID, athleteToken, athleteUsername)

	// Trainer can now view the client's meals
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/meals", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Meals []map[string]any `json:"meals"`
		Count int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1, got %d", list.Count)
	}

	// Client view supports the mealType filter (own-list does not)
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/meals?mealType=breakfast", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected 1 breakfast meal, got %d", list.Count)
	}
	if list.Meals[0]["mealType"] != "breakfast" {
		t.Fatalf("expected mealType 'breakfast', got %v", list.Meals[0]["mealType"])
	}

	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/meals?mealType=dinner", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 0 {
		t.Fatalf("expected 0 dinner meals, got %d", list.Count)
	}
}

// TestE2E_Meal_AthleteCannotAccessClientView verifies that athletes
// cannot access the trainer-only client meals endpoint.
func TestE2E_Meal_AthleteCannotAccessClientView(t *testing.T) {
	env := SetupTestEnv(t)
	athleteToken, _ := env.RegisterAthlete(t, "athclient")
	// Create another athlete to try to access
	otherUsername, _, _ := env.RegisterUser(t, "otherath", "otherath@e2e.test", "Password123!", "athlete")

	w := env.DoAuthRequest(http.MethodGet, "/api/clients/"+otherUsername+"/meals", nil, athleteToken)
	RequireStatus(t, w, http.StatusForbidden)
}

// TestE2E_Meal_Unauthenticated verifies that all meal endpoints require authentication.
func TestE2E_Meal_Unauthenticated(t *testing.T) {
	env := SetupTestEnv(t)

	// POST /api/meals
	w := env.DoRequest(http.MethodPost, "/api/meals", mealPayload("lunch"), nil)
	RequireStatus(t, w, http.StatusUnauthorized)

	// GET /api/meals
	w = env.DoRequest(http.MethodGet, "/api/meals", nil, nil)
	RequireStatus(t, w, http.StatusUnauthorized)

	// GET /api/meals/:id
	w = env.DoRequest(http.MethodGet, "/api/meals/1", nil, nil)
	RequireStatus(t, w, http.StatusUnauthorized)

	// GET /api/clients/:username/meals
	w = env.DoRequest(http.MethodGet, "/api/clients/test/meals", nil, nil)
	RequireStatus(t, w, http.StatusUnauthorized)
}

// TestE2E_Meal_MalformedToken verifies that malformed tokens are rejected.
func TestE2E_Meal_MalformedToken(t *testing.T) {
	env := SetupTestEnv(t)

	// Valid athlete token
	token, _ := env.RegisterAthlete(t, "malftest")

	// Malformed token
	w := env.DoAuthRequest(http.MethodGet, "/api/meals", nil, "not-a-valid-jwt")
	RequireStatus(t, w, http.StatusUnauthorized)

	// Ensure valid token still works
	w = env.DoAuthRequest(http.MethodGet, "/api/meals", nil, token)
	RequireStatus(t, w, http.StatusOK)
}

// TestE2E_Meal_ListWithFilters verifies query parameter filtering works.
func TestE2E_Meal_ListWithFilters(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "mfilters")

	// Create multiple meals with different types
	today := time.Now().UTC().Format("2006-01-02")

	w := env.DoAuthRequest(http.MethodPost, "/api/meals", map[string]any{
		"date":     time.Now().UTC().Format(time.RFC3339),
		"mealType": "breakfast",
		"items":    []map[string]any{{"food": "Eggs", "quantity": "3", "calories": 210, "macros": map[string]any{"protein": 18, "carbs": 1.5, "fats": 14}}},
	}, token)
	RequireStatus(t, w, http.StatusCreated)

	w = env.DoAuthRequest(http.MethodPost, "/api/meals", map[string]any{
		"date":     time.Now().UTC().Format(time.RFC3339),
		"mealType": "lunch",
		"items":    []map[string]any{{"food": "Salad", "quantity": "200g", "calories": 150, "macros": map[string]any{"protein": 5, "carbs": 10, "fats": 10}}},
	}, token)
	RequireStatus(t, w, http.StatusCreated)

	w = env.DoAuthRequest(http.MethodPost, "/api/meals", map[string]any{
		"date":     time.Now().UTC().Format(time.RFC3339),
		"mealType": "dinner",
		"items":    []map[string]any{{"food": "Steak", "quantity": "250g", "calories": 450, "macros": map[string]any{"protein": 50, "carbs": 0, "fats": 25}}},
	}, token)
	RequireStatus(t, w, http.StatusCreated)

	// Note: own-list GET /api/meals intentionally has no mealType filter
	// (documented in swagger params: only limit/offset/startDate/endDate/date).
	// The mealType filter lives on the trainer client view — covered in
	// TestE2E_Meal_TrainerClientView_WithRelationship.

	// Filter by date
	w = env.DoAuthRequest(http.MethodGet, "/api/meals?date="+today, nil, token)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Meals []map[string]any `json:"meals"`
		Count int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 3 {
		t.Fatalf("expected 3 meals for today, got %d", list.Count)
	}

	// Test pagination
	w = env.DoAuthRequest(http.MethodGet, "/api/meals?limit=2&offset=0", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 2 {
		t.Fatalf("expected 2 meals with limit=2, got %d", list.Count)
	}

	w = env.DoAuthRequest(http.MethodGet, "/api/meals?limit=2&offset=2", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected 1 meal with limit=2 offset=2, got %d", list.Count)
	}

	// Invalid date format
	w = env.DoAuthRequest(http.MethodGet, "/api/meals?date=invalid", nil, token)
	RequireJSONError(t, w, http.StatusBadRequest, "Invalid date format. Please use YYYY-MM-DD format, e.g. 2026-09-06")

	// Invalid startDate/endDate format (RFC3339 range variant)
	w = env.DoAuthRequest(http.MethodGet, "/api/meals?startDate=invalid&endDate=invalid", nil, token)
	RequireJSONError(t, w, http.StatusBadRequest, "Invalid date format. Please use RFC3339 format, e.g. 2026-09-06T00:00:00Z")
}
