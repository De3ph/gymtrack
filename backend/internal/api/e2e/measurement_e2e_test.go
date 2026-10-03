package e2e

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"
)

// measurementPayload builds a valid create/update body-measurement request body.
// Mirrors workoutPayload(): a valid baseline that individual tests mutate.
func measurementPayload() map[string]any {
	return map[string]any{
		"date":       time.Now().UTC().Format(time.RFC3339),
		"weight":     75.4,
		"weightUnit": "kg",
		"bodyFatPct": 15.5,
		"parts": map[string]any{
			"chest": map[string]any{"value": 101.5},
			"waist": map[string]any{"value": 84.2},
		},
		"notes": "e2e measurement",
	}
}

// createMeasurement posts a valid body measurement and returns its measurementId.
// Mirrors createExerciseForWorkout().
func createMeasurement(t testing.TB, env *TestEnv, token string) int {
	t.Helper()
	w := env.DoAuthRequest(http.MethodPost, "/api/measurements", measurementPayload(), token)
	RequireStatus(t, w, http.StatusCreated)
	var m struct {
		MeasurementID int `json:"measurementId"`
	}
	ParseJSON(t, w.Body.Bytes(), &m)
	if m.MeasurementID == 0 {
		t.Fatal("expected non-zero measurementId")
	}
	return m.MeasurementID
}

func TestE2E_Measurement_CRUD_OwnAthlete(t *testing.T) {
	env := SetupTestEnv(t)
	token, userID := env.RegisterAthlete(t, "bmcr")

	// Create — assert the full payload round-trips through JSONB/SQL
	w := env.DoAuthRequest(http.MethodPost, "/api/measurements", measurementPayload(), token)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		Type          string  `json:"type"`
		MeasurementID int     `json:"measurementId"`
		AthleteID     int     `json:"athleteId"`
		Weight        float64 `json:"weight"`
		WeightUnit    string  `json:"weightUnit"`
		BodyFatPct    float64 `json:"bodyFatPct"`
		Parts         map[string]struct {
			Value float64 `json:"value"`
		} `json:"parts"`
		Notes string `json:"notes"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)
	if created.MeasurementID == 0 {
		t.Fatal("expected non-zero measurementId")
	}
	if created.Type != "body_measurement" {
		t.Fatalf("expected type %q, got %q", "body_measurement", created.Type)
	}
	if created.AthleteID != userID {
		t.Fatalf("expected athleteId %d, got %d", userID, created.AthleteID)
	}
	if created.Weight != 75.4 || created.WeightUnit != "kg" {
		t.Fatalf("unexpected weight/unit: %v %s", created.Weight, created.WeightUnit)
	}
	if created.BodyFatPct != 15.5 {
		t.Fatalf("expected bodyFatPct 15.5, got %v", created.BodyFatPct)
	}
	if created.Notes != "e2e measurement" {
		t.Fatalf("expected notes %q, got %q", "e2e measurement", created.Notes)
	}
	if created.Parts["chest"].Value != 101.5 {
		t.Fatalf("expected chest 101.5, got %v", created.Parts["chest"].Value)
	}
	id1 := created.MeasurementID
	id2 := createMeasurement(t, env, token)

	// List — two entries
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements", nil, token)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Measurements []map[string]any `json:"measurements"`
		Count        int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 2 {
		t.Fatalf("expected count 2, got %d", list.Count)
	}

	// Pagination via limit/offset
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements?limit=1", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1 with limit=1, got %d", list.Count)
	}
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements?offset=1", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1 with offset=1, got %d", list.Count)
	}

	// Date-range filter (RFC3339, both params required to activate the range)
	now := time.Now().UTC()
	inRange := "?startDate=" + now.Add(-2*time.Hour).Format(time.RFC3339) +
		"&endDate=" + now.Add(2*time.Hour).Format(time.RFC3339)
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements"+inRange, nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 2 {
		t.Fatalf("expected count 2 in current range, got %d", list.Count)
	}
	pastRange := "?startDate=" + now.AddDate(-1, 0, 0).Format(time.RFC3339) +
		"&endDate=" + now.AddDate(-1, 0, 1).Format(time.RFC3339)
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements"+pastRange, nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 0 {
		t.Fatalf("expected count 0 in past range, got %d", list.Count)
	}

	// Invalid date range → 400
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements?startDate=nope&endDate=nope", nil, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Latest
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest", nil, token)
	RequireStatus(t, w, http.StatusOK)
	var latest struct {
		Weight float64 `json:"weight"`
	}
	ParseJSON(t, w.Body.Bytes(), &latest)
	if latest.Weight != 75.4 {
		t.Fatalf("expected latest weight 75.4, got %v", latest.Weight)
	}

	// Read by ID
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(id1), nil, token)
	RequireStatus(t, w, http.StatusOK)

	// Update (within the 24h window)
	update := measurementPayload()
	update["weight"] = 71.25
	update["notes"] = "updated in e2e"
	w = env.DoAuthRequest(http.MethodPut, "/api/measurements/"+itoa(id1), update, token)
	RequireStatus(t, w, http.StatusOK)
	var updated struct {
		MeasurementID int     `json:"measurementId"`
		Weight        float64 `json:"weight"`
		Notes         string  `json:"notes"`
	}
	ParseJSON(t, w.Body.Bytes(), &updated)
	if updated.MeasurementID != id1 || updated.Weight != 71.25 || updated.Notes != "updated in e2e" {
		t.Fatalf("unexpected update response: %s", w.Body.String())
	}

	// Update persisted
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(id1), nil, token)
	RequireStatus(t, w, http.StatusOK)
	var reloaded struct {
		Weight float64 `json:"weight"`
	}
	ParseJSON(t, w.Body.Bytes(), &reloaded)
	if reloaded.Weight != 71.25 {
		t.Fatalf("expected persisted weight 71.25, got %v", reloaded.Weight)
	}

	// Delete — then verify all read paths reflect the deletion
	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/"+itoa(id1), nil, token)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(id1), nil, token)
	RequireJSONError(t, w, http.StatusNotFound, "Body measurement not found. It may have been deleted or the ID is incorrect.")

	w = env.DoAuthRequest(http.MethodGet, "/api/measurements", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1 after delete, got %d", list.Count)
	}

	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/"+itoa(id2), nil, token)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 0 {
		t.Fatalf("expected count 0 after deleting all, got %d", list.Count)
	}

	// Empty history → latest has no content
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest", nil, token)
	RequireStatus(t, w, http.StatusNoContent)
}

func TestE2E_Measurement_TrainerForbidden(t *testing.T) {
	env := SetupTestEnv(t)
	athleteToken, athleteID := env.RegisterAthlete(t, "bmtra")
	trainerToken, _ := env.RegisterTrainer(t, "bmtrt")
	measurementID := createMeasurement(t, env, athleteToken)

	// Trainer cannot log a measurement on behalf of a client
	w := env.DoAuthRequest(http.MethodPost, "/api/measurements", measurementPayload(), trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Only athletes can log body measurements. Trainers cannot log measurements on behalf of clients")

	// Trainer cannot use the athlete's own-history list endpoint
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Only athletes can view their measurement history. Trainers, please use the client measurements view")

	// No active relationship yet: read by id → 403 with relationship message
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(measurementID), nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You don't have an active coaching relationship with this athlete, so you can't view their measurements")

	// Latest for a client without a relationship → 403
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest?athleteId="+itoa(athleteID), nil, trainerToken)
	RequireStatus(t, w, http.StatusForbidden)

	// Trainer cannot edit or delete (not the owner)
	w = env.DoAuthRequest(http.MethodPut, "/api/measurements/"+itoa(measurementID), measurementPayload(), trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, "You can only edit your own body measurements")

	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/"+itoa(measurementID), nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, "You can only delete your own body measurements")

	// The measurement must still exist for its owner
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(measurementID), nil, athleteToken)
	RequireStatus(t, w, http.StatusOK)
}

func TestE2E_Measurement_AthleteCannotViewOthers(t *testing.T) {
	env := SetupTestEnv(t)
	tokenA, idA := env.RegisterAthlete(t, "bmowna")
	tokenB, _ := env.RegisterAthlete(t, "bmothb")
	measurementID := createMeasurement(t, env, tokenA)

	// B must not read A's measurement
	w := env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(measurementID), nil, tokenB)
	RequireJSONError(t, w, http.StatusForbidden,
		"This measurement belongs to another athlete. You can only view your own measurements")

	// B must not edit or delete A's measurement
	w = env.DoAuthRequest(http.MethodPut, "/api/measurements/"+itoa(measurementID), measurementPayload(), tokenB)
	RequireJSONError(t, w, http.StatusForbidden, "You can only edit your own body measurements")

	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/"+itoa(measurementID), nil, tokenB)
	RequireJSONError(t, w, http.StatusForbidden, "You can only delete your own body measurements")

	// B must not fetch A's latest via athleteId
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest?athleteId="+itoa(idA), nil, tokenB)
	RequireJSONError(t, w, http.StatusForbidden, "You can only view your own latest measurement")

	// B's own history is empty
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements", nil, tokenB)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Count int `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 0 {
		t.Fatalf("expected empty list for athlete B, got %d", list.Count)
	}
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest", nil, tokenB)
	RequireStatus(t, w, http.StatusNoContent)

	// A's measurement is untouched
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(measurementID), nil, tokenA)
	RequireStatus(t, w, http.StatusOK)
}

func TestE2E_Measurement_InvalidPayloadsAndIDs(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "bminv")

	// Unauthenticated access is rejected before reaching the handler
	w := env.DoRequest(http.MethodGet, "/api/measurements", nil, nil)
	RequireStatus(t, w, http.StatusUnauthorized)

	// Missing date
	p := measurementPayload()
	delete(p, "date")
	w = env.DoAuthRequest(http.MethodPost, "/api/measurements", p, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Weight must be > 0
	p = measurementPayload()
	p["weight"] = 0
	w = env.DoAuthRequest(http.MethodPost, "/api/measurements", p, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Unsupported weight unit
	p = measurementPayload()
	p["weightUnit"] = "tons"
	w = env.DoAuthRequest(http.MethodPost, "/api/measurements", p, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Body fat out of range (>100)
	p = measurementPayload()
	p["bodyFatPct"] = 101
	w = env.DoAuthRequest(http.MethodPost, "/api/measurements", p, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Notes over the 500-char limit
	p = measurementPayload()
	p["notes"] = strings.Repeat("a", 501)
	w = env.DoAuthRequest(http.MethodPost, "/api/measurements", p, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Malformed body
	w = env.DoAuthRequest(http.MethodPost, "/api/measurements", "not-an-object", token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Non-numeric measurement ID → 400 on read/update/delete
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/abc", nil, token)
	RequireStatus(t, w, http.StatusBadRequest)
	w = env.DoAuthRequest(http.MethodPut, "/api/measurements/abc", measurementPayload(), token)
	RequireStatus(t, w, http.StatusBadRequest)
	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/abc", nil, token)
	RequireStatus(t, w, http.StatusBadRequest)

	// Nonexistent measurement ID → 404 with the not-found contract
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/999999", nil, token)
	RequireJSONError(t, w, http.StatusNotFound, "Body measurement not found. It may have been deleted or the ID is incorrect.")
	w = env.DoAuthRequest(http.MethodPut, "/api/measurements/999999", measurementPayload(), token)
	RequireStatus(t, w, http.StatusNotFound)
	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/999999", nil, token)
	RequireStatus(t, w, http.StatusNotFound)

	// Invalid query params → 400
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements?startDate=nope&endDate=nope", nil, token)
	RequireStatus(t, w, http.StatusBadRequest)
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest?athleteId=abc", nil, token)
	RequireStatus(t, w, http.StatusBadRequest)
}

// TestE2E_Measurement_EditWindow24h exercises the 24-hour edit/delete window
// (models.BodyMeasurement.CanEdit) by backdating created_at directly in the DB.
func TestE2E_Measurement_EditWindow24h(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "bmwin")
	measurementID := createMeasurement(t, env, token)

	// Backdate the row beyond the 24h window
	if _, err := env.DB.Exec(context.Background(),
		`UPDATE body_measurements SET created_at = now() - interval '25 hours' WHERE id = $1`,
		measurementID); err != nil {
		t.Fatalf("failed to backdate created_at: %v", err)
	}

	// Edit refused once the window has passed
	w := env.DoAuthRequest(http.MethodPut, "/api/measurements/"+itoa(measurementID), measurementPayload(), token)
	RequireJSONError(t, w, http.StatusForbidden,
		"This measurement can no longer be edited because more than 24 hours have passed since it was logged")

	// Delete refused once the window has passed
	w = env.DoAuthRequest(http.MethodDelete, "/api/measurements/"+itoa(measurementID), nil, token)
	RequireJSONError(t, w, http.StatusForbidden,
		"This measurement can no longer be deleted because more than 24 hours have passed since it was logged")

	// The row must still exist and remain readable
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(measurementID), nil, token)
	RequireStatus(t, w, http.StatusOK)
}

func TestE2E_Measurement_TrainerClientView(t *testing.T) {
	env := SetupTestEnv(t)
	athleteUsername, athleteEmail, athleteID := env.RegisterUser(t, "bmcli", "bmcli@e2e.test", "Password123!", "athlete")
	athleteToken, _ := env.Login(t, athleteEmail, "Password123!")
	_, trainerEmail, trainerID := env.RegisterUser(t, "bmtrn", "bmtrn@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	measurementID := createMeasurement(t, env, athleteToken)

	// Unknown username → 404
	w := env.DoAuthRequest(http.MethodGet, "/api/clients/"+UniqueName("ghost")+"/measurements", nil, trainerToken)
	RequireStatus(t, w, http.StatusNotFound)

	// Role guard: athletes cannot use the client endpoint at all
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/measurements", nil, athleteToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Only trainers can view client measurements. Please log in as a trainer")

	// Trainer without an active relationship → 403
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/measurements", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You don't have an active coaching relationship with this client, so you can't view their measurements")

	// Establish the coaching relationship (athlete requests → trainer accepts)
	establishRelationship(t, env, trainerToken, trainerID, athleteToken, athleteUsername)

	// Trainer can now list the client's measurements
	w = env.DoAuthRequest(http.MethodGet, "/api/clients/"+athleteUsername+"/measurements", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Measurements []map[string]any `json:"measurements"`
		Count        int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Count != 1 {
		t.Fatalf("expected count 1, got %d", list.Count)
	}

	// Trainer can read the client's measurement by id
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/"+itoa(measurementID), nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)

	// Trainer can fetch the client's latest via athleteId
	w = env.DoAuthRequest(http.MethodGet, "/api/measurements/latest?athleteId="+itoa(athleteID), nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
}
