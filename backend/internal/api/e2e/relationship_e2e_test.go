package e2e

import (
	"context"
	"net/http"
	"regexp"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// generateInvitationCode runs POST /api/relationships/invite as the trainer
// and returns the 8-character hex code plus its parsed expiry.
func generateInvitationCode(t testing.TB, env *TestEnv, trainerToken string) (string, time.Time) {
	t.Helper()

	w := env.DoAuthRequest(http.MethodPost, "/api/relationships/invite", nil, trainerToken)
	RequireJSONMessage(t, w, http.StatusCreated, "Invitation generated successfully")

	var resp struct {
		Invitation struct {
			Code      string `json:"code"`
			ExpiresAt string `json:"expiresAt"`
		} `json:"invitation"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)

	expiresAt, err := time.Parse(time.RFC3339, resp.Invitation.ExpiresAt)
	if err != nil {
		t.Fatalf("failed to parse invitation expiresAt %q: %v", resp.Invitation.ExpiresAt, err)
	}
	return resp.Invitation.Code, expiresAt
}

// acceptInvitationCode runs POST /api/relationships/accept as the athlete and
// returns the created relationship ID.
func acceptInvitationCode(t testing.TB, env *TestEnv, athleteToken, code string) int {
	t.Helper()

	w := env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": code}, athleteToken)
	RequireJSONMessage(t, w, http.StatusOK, "Invitation accepted successfully")

	var resp struct {
		Relationship struct {
			RelationshipID int    `json:"relationshipId"`
			TrainerID      int    `json:"trainerId"`
			AthleteID      int    `json:"athleteId"`
			Status         string `json:"status"`
		} `json:"relationship"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)

	if resp.Relationship.RelationshipID == 0 {
		t.Fatalf("accepted relationship has no ID: %s", w.Body.String())
	}
	return resp.Relationship.RelationshipID
}

// establishRelationshipByInvitation runs the full invite→accept loop and
// returns the relationship ID.
func establishRelationshipByInvitation(t testing.TB, env *TestEnv, trainerToken, athleteToken string) int {
	t.Helper()
	code, _ := generateInvitationCode(t, env, trainerToken)
	return acceptInvitationCode(t, env, athleteToken, code)
}

// athleteTrainerAssignment reads profile.trainerAssignment from
// GET /api/users/me; a zero value means the field was omitted (no assignment).
func athleteTrainerAssignment(t testing.TB, env *TestEnv, athleteToken string) int {
	t.Helper()

	w := env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, athleteToken)
	RequireStatus(t, w, http.StatusOK)

	var me struct {
		Profile struct {
			TrainerAssignment int `json:"trainerAssignment"`
		} `json:"profile"`
	}
	ParseJSON(t, w.Body.Bytes(), &me)
	return me.Profile.TrainerAssignment
}

// myTrainerResponse parses GET /api/relationships/my-trainer.
type myTrainerResponse struct {
	PendingInvitations []map[string]any `json:"pendingInvitations"`
	ActiveTrainer      *struct {
		Relationship struct {
			RelationshipID int    `json:"relationshipId"`
			TrainerID      int    `json:"trainerId"`
			AthleteID      int    `json:"athleteId"`
			Status         string `json:"status"`
		} `json:"relationship"`
		Trainer struct {
			UserID   int    `json:"userId"`
			Username string `json:"username"`
			Role     string `json:"role"`
		} `json:"trainer"`
	} `json:"activeTrainer"`
}

// ---------------------------------------------------------------------------
// Core invite → accept flow
// ---------------------------------------------------------------------------

// TestE2E_Relationship_InviteAccept_FullFlow exercises the two-sided core
// loop: trainer generates codes, athletes accept, both sides then see the
// active relationship, the athlete's profile records the trainer
// assignment, and the invitation codes are consumed in the DB.
func TestE2E_Relationship_InviteAccept_FullFlow(t *testing.T) {
	env := SetupTestEnv(t)
	trainerUsername, trainerEmail, trainerID := env.RegisterUser(t, "reltr", "reltr@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	athUsername, athEmail, athID := env.RegisterUser(t, "relath", "relath@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	secondUsername, secondEmail, secondID := env.RegisterUser(t, "relath2", "relath2@e2e.test", "Password123!", "athlete")
	secondToken, _ := env.Login(t, secondEmail, "Password123!")
	_ = trainerUsername

	ctx := context.Background()

	// Before anything exists: my-trainer returns an empty pending list and no
	// activeTrainer key.
	w := env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, athToken)
	RequireStatus(t, w, http.StatusOK)
	var emptyTrainer myTrainerResponse
	ParseJSON(t, w.Body.Bytes(), &emptyTrainer)
	if len(emptyTrainer.PendingInvitations) != 0 {
		t.Fatalf("expected no pending invitations, got %d", len(emptyTrainer.PendingInvitations))
	}
	if emptyTrainer.ActiveTrainer != nil {
		t.Fatalf("expected no activeTrainer, got: %s", w.Body.String())
	}

	// Trainer generates an invitation: 201, 8-hex code, ~7-day expiry.
	code, expiresAt := generateInvitationCode(t, env, trainerToken)
	if !regexp.MustCompile(`^[0-9a-f]{8}$`).MatchString(code) {
		t.Fatalf("invitation code %q is not an 8-char hex string", code)
	}
	now := time.Now()
	if expiresAt.Before(now.Add(6*24*time.Hour)) || expiresAt.After(now.Add(8*24*time.Hour)) {
		t.Fatalf("unexpected invitation expiry %v (want ~7 days from %v)", expiresAt, now)
	}

	// Athlete accepts: relationship is created active immediately.
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": code}, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "Invitation accepted successfully")
	var accepted struct {
		Relationship struct {
			RelationshipID int    `json:"relationshipId"`
			TrainerID      int    `json:"trainerId"`
			AthleteID      int    `json:"athleteId"`
			Status         string `json:"status"`
		} `json:"relationship"`
	}
	ParseJSON(t, w.Body.Bytes(), &accepted)
	if accepted.Relationship.RelationshipID == 0 ||
		accepted.Relationship.TrainerID != trainerID ||
		accepted.Relationship.AthleteID != athID ||
		accepted.Relationship.Status != "active" {
		t.Fatalf("unexpected accepted relationship: %s", w.Body.String())
	}
	relID := accepted.Relationship.RelationshipID

	// Athlete's profile records the trainer assignment.
	if got := athleteTrainerAssignment(t, env, athToken); got != trainerID {
		t.Fatalf("profile.trainerAssignment = %d, want %d", got, trainerID)
	}

	// my-trainer now reports the active trainer.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, athToken)
	RequireStatus(t, w, http.StatusOK)
	var withTrainer myTrainerResponse
	ParseJSON(t, w.Body.Bytes(), &withTrainer)
	if withTrainer.ActiveTrainer == nil {
		t.Fatalf("expected activeTrainer, got: %s", w.Body.String())
	}
	if withTrainer.ActiveTrainer.Relationship.RelationshipID != relID ||
		withTrainer.ActiveTrainer.Relationship.TrainerID != trainerID ||
		withTrainer.ActiveTrainer.Relationship.Status != "active" {
		t.Fatalf("unexpected active relationship: %s", w.Body.String())
	}
	if withTrainer.ActiveTrainer.Trainer.UserID != trainerID ||
		withTrainer.ActiveTrainer.Trainer.Role != "trainer" {
		t.Fatalf("unexpected trainer profile: %s", w.Body.String())
	}

	// A second athlete accepts a different code from the same trainer.
	secondCode, _ := generateInvitationCode(t, env, trainerToken)
	secondRelID := acceptInvitationCode(t, env, secondToken, secondCode)
	if secondRelID == relID {
		t.Fatalf("second relationship reused ID %d", relID)
	}

	// my-clients lists both active clients with athlete profiles.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/my-clients", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var clients struct {
		Clients []struct {
			Relationship struct {
				RelationshipID int    `json:"relationshipId"`
				TrainerID      int    `json:"trainerId"`
				AthleteID      int    `json:"athleteId"`
				Status         string `json:"status"`
			} `json:"relationship"`
			Athlete struct {
				Username string `json:"username"`
				Role     string `json:"role"`
			} `json:"athlete"`
		} `json:"clients"`
		Count int `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &clients)
	if clients.Count != 2 || len(clients.Clients) != 2 {
		t.Fatalf("expected 2 clients, got count=%d len=%d: %s", clients.Count, len(clients.Clients), w.Body.String())
	}
	seen := map[int]string{}
	for _, c := range clients.Clients {
		if c.Relationship.TrainerID != trainerID || c.Relationship.Status != "active" {
			t.Fatalf("unexpected client relationship: %s", w.Body.String())
		}
		seen[c.Relationship.AthleteID] = c.Athlete.Username
	}
	if seen[athID] != athUsername || seen[secondID] != secondUsername {
		t.Fatalf("client usernames mismatch: %v", seen)
	}

	// Both invitation codes are consumed in the DB.
	for _, c := range []string{code, secondCode} {
		var status string
		if err := env.DB.QueryRow(ctx, `SELECT status FROM invitations WHERE code = $1`, c).Scan(&status); err != nil {
			t.Fatalf("query invitation status: %v", err)
		}
		if status != "used" {
			t.Fatalf("invitation %s status = %q, want %q", c, status, "used")
		}
	}

	// Relationships are persisted active.
	var dbStatus string
	if err := env.DB.QueryRow(ctx, `SELECT status FROM relationships WHERE id = $1`, relID).Scan(&dbStatus); err != nil {
		t.Fatalf("query relationship status: %v", err)
	}
	if dbStatus != "active" {
		t.Fatalf("relationship %d status = %q, want %q", relID, dbStatus, "active")
	}
}

// ---------------------------------------------------------------------------
// Client details + stats
// ---------------------------------------------------------------------------

// TestE2E_Relationship_ClientStats_WithData verifies the trainer client views
// with real data: the detail endpoint's this-week counters and the stats
// endpoint's workout volume / exercise breakdown / meal averages.
func TestE2E_Relationship_ClientStats_WithData(t *testing.T) {
	env := SetupTestEnv(t)
	trainerUsername, trainerEmail, _ := env.RegisterUser(t, "statstr", "statstr@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	athUsername, athEmail, _ := env.RegisterUser(t, "statsath", "statsath@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	_ = trainerUsername

	establishRelationshipByInvitation(t, env, trainerToken, athToken)

	// Seed one workout (1 set: 60.5 kg × 8 reps = 484 volume) and one meal
	// (495 calories) dated today, so both land in the current week.
	exerciseID := createExerciseForWorkout(t, env, athToken, "Bench Press")
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(exerciseID), athToken)
	RequireStatus(t, w, http.StatusCreated)
	w = env.DoAuthRequest(http.MethodPost, "/api/meals", mealPayload("breakfast"), athToken)
	RequireStatus(t, w, http.StatusCreated)

	// Client details: relationship + athlete profile + this-week counters.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+athUsername, nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var details struct {
		Relationship struct {
			TrainerID int    `json:"trainerId"`
			AthleteID int    `json:"athleteId"`
			Status    string `json:"status"`
		} `json:"relationship"`
		Athlete struct {
			Username string `json:"username"`
			Role     string `json:"role"`
		} `json:"athlete"`
		Stats struct {
			WorkoutsThisWeek int `json:"workoutsThisWeek"`
			MealsThisWeek    int `json:"mealsThisWeek"`
		} `json:"stats"`
	}
	ParseJSON(t, w.Body.Bytes(), &details)
	if details.Athlete.Username != athUsername || details.Athlete.Role != "athlete" {
		t.Fatalf("unexpected athlete in client details: %s", w.Body.String())
	}
	if details.Relationship.Status != "active" {
		t.Fatalf("client details relationship status = %q, want active", details.Relationship.Status)
	}
	if details.Stats.WorkoutsThisWeek != 1 || details.Stats.MealsThisWeek != 1 {
		t.Fatalf("this-week counters = %d/%d, want 1/1: %s",
			details.Stats.WorkoutsThisWeek, details.Stats.MealsThisWeek, w.Body.String())
	}

	// Client stats: workout volume + exercise breakdown + meal averages.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+athUsername+"/stats", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var stats struct {
		WorkoutStats struct {
			TotalVolume  float64 `json:"totalVolume"`
			WeeklyVolume []struct {
				Week     string  `json:"week"`
				Volume   float64 `json:"volume"`
				Workouts int     `json:"workouts"`
			} `json:"weeklyVolume"`
			ExerciseBreakdown []struct {
				Name      string  `json:"name"`
				TotalSets int     `json:"totalSets"`
				TotalReps int     `json:"totalReps"`
				MaxWeight float64 `json:"maxWeight"`
			} `json:"exerciseBreakdown"`
			Consistency float64 `json:"consistency"`
		} `json:"workoutStats"`
		MealStats struct {
			AverageCalories   float64 `json:"averageCalories"`
			AverageProtein    float64 `json:"averageProtein"`
			WeeklyAverages    []any   `json:"weeklyAverages"`
			MealTypeBreakdown []struct {
				MealType string `json:"mealType"`
				Count    int    `json:"count"`
			} `json:"mealTypeBreakdown"`
		} `json:"mealStats"`
	}
	ParseJSON(t, w.Body.Bytes(), &stats)
	if stats.WorkoutStats.TotalVolume != 484 {
		t.Fatalf("workout totalVolume = %v, want 484: %s", stats.WorkoutStats.TotalVolume, w.Body.String())
	}
	if len(stats.WorkoutStats.WeeklyVolume) != 1 || stats.WorkoutStats.WeeklyVolume[0].Workouts != 1 {
		t.Fatalf("unexpected weeklyVolume: %s", w.Body.String())
	}
	if len(stats.WorkoutStats.ExerciseBreakdown) != 1 ||
		stats.WorkoutStats.ExerciseBreakdown[0].Name != "Bench Press" ||
		stats.WorkoutStats.ExerciseBreakdown[0].TotalSets != 1 ||
		stats.WorkoutStats.ExerciseBreakdown[0].TotalReps != 8 ||
		stats.WorkoutStats.ExerciseBreakdown[0].MaxWeight != 60.5 {
		t.Fatalf("unexpected exerciseBreakdown: %s", w.Body.String())
	}
	if stats.WorkoutStats.Consistency != 0 {
		t.Fatalf("consistency = %v, want 0 (single workout in a week)", stats.WorkoutStats.Consistency)
	}
	if stats.MealStats.AverageCalories != 495 {
		t.Fatalf("meal averageCalories = %v, want 495", stats.MealStats.AverageCalories)
	}
	if stats.MealStats.AverageProtein != 65.5 {
		t.Fatalf("meal averageProtein = %v, want 65.5", stats.MealStats.AverageProtein)
	}
	if len(stats.MealStats.MealTypeBreakdown) != 1 ||
		stats.MealStats.MealTypeBreakdown[0].MealType != "breakfast" ||
		stats.MealStats.MealTypeBreakdown[0].Count != 1 {
		t.Fatalf("unexpected mealTypeBreakdown: %s", w.Body.String())
	}
}

// ---------------------------------------------------------------------------
// Accept failure branches
// ---------------------------------------------------------------------------

// TestE2E_Relationship_Accept_FailureBranches covers every 4xx path of
// POST /api/relationships/accept: binding failures, validation, unknown /
// used / expired codes, and the already-has-trainer rule.
func TestE2E_Relationship_Accept_FailureBranches(t *testing.T) {
	env := SetupTestEnv(t)
	_, trainerEmail, trainerID := env.RegisterUser(t, "failtr", "failtr@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	_, athEmail, _ := env.RegisterUser(t, "failath", "failath@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	_, secondEmail, _ := env.RegisterUser(t, "failath2", "failath2@e2e.test", "Password123!", "athlete")
	secondToken, _ := env.Login(t, secondEmail, "Password123!")
	_ = trainerID

	const validationMsg = "Validation failed. Please check the invitation code and try again"
	const bindingMsg = "Invalid invitation data. Please check the invitation code and try again"

	// Empty code (required fails)
	w := env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": ""}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, validationMsg)

	// Code too short (len=8 fails)
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": "abc"}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, validationMsg)

	// Missing code field entirely
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, validationMsg)

	// Non-string code (JSON binding fails)
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": 12345678}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)

	// Non-object body (JSON binding fails)
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", []map[string]any{}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)

	// Empty body (JSON binding fails)
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", nil, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)

	// Well-formed but unknown code
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": "deadbeef"}, athToken)
	RequireJSONError(t, w, http.StatusNotFound, "this invitation code is invalid")

	// Consume a code, then reject replays and second-trainer attempts.
	code, _ := generateInvitationCode(t, env, trainerToken)
	relID := acceptInvitationCode(t, env, athToken, code)
	_ = relID

	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": code}, secondToken)
	RequireJSONError(t, w, http.StatusConflict, "this invitation has already been used")

	secondCode, _ := generateInvitationCode(t, env, trainerToken)
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": secondCode}, athToken)
	RequireJSONError(t, w, http.StatusConflict,
		"you already have an active trainer. Please end your current coaching relationship first")

	// Expired code (backdated 1h past its 7-day window)
	thirdCode, _ := generateInvitationCode(t, env, trainerToken)
	if _, err := env.DB.Exec(context.Background(),
		`UPDATE invitations SET expires_at = now() - interval '1 hour' WHERE code = $1`, thirdCode); err != nil {
		t.Fatalf("failed to backdate invitation expiry: %v", err)
	}
	w = env.DoAuthRequest(http.MethodPost, "/api/relationships/accept", map[string]any{"code": thirdCode}, secondToken)
	RequireJSONError(t, w, http.StatusBadRequest, "this invitation has expired")
}

// ---------------------------------------------------------------------------
// Role guards
// ---------------------------------------------------------------------------

// TestE2E_Relationship_RoleGuards covers the trainer-only / athlete-only
// rules on every relationship route.
func TestE2E_Relationship_RoleGuards(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "relguard")
	athleteToken, _ := env.RegisterAthlete(t, "relguard")
	adminToken, _ := registerAdmin(t, env, "relguard")

	const (
		inviteGuard  = "Only trainers can generate invitation codes. Please log in as a trainer"
		clientsGuard = "Only trainers can view their clients. Please log in as a trainer"
		trainerGuard = "Only athletes can view their trainer. Please log in as an athlete"
		detailsGuard = "Only trainers can view client details. Please log in as a trainer"
		statsGuard   = "Only trainers can view client statistics. Please log in as a trainer"
		acceptGuard  = "Only athletes can accept invitations. Please log in as an athlete"
	)
	nonTrainer := []struct {
		role  string
		token string
	}{
		{"athlete", athleteToken},
		{"admin", adminToken},
	}
	nonAthlete := []struct {
		role  string
		token string
	}{
		{"trainer", trainerToken},
		{"admin", adminToken},
	}

	for _, tc := range nonTrainer {
		t.Run(tc.role+" cannot invite", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodPost, "/api/relationships/invite", nil, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, inviteGuard)
		})
		t.Run(tc.role+" cannot list clients", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodGet, "/api/relationships/my-clients", nil, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, clientsGuard)
		})
		t.Run(tc.role+" cannot view client details", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodGet, "/api/relationships/client/someone", nil, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, detailsGuard)
		})
		t.Run(tc.role+" cannot view client stats", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodGet, "/api/relationships/client/someone/stats", nil, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, statsGuard)
		})
	}

	for _, tc := range nonAthlete {
		t.Run(tc.role+" cannot accept", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodPost, "/api/relationships/accept",
				map[string]any{"code": "abcdefgh"}, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, acceptGuard)
		})
		t.Run(tc.role+" cannot view trainer", func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, tc.token)
			RequireJSONError(t, w, http.StatusForbidden, trainerGuard)
		})
	}
}

// ---------------------------------------------------------------------------
// Client view access failures
// ---------------------------------------------------------------------------

// TestE2E_Relationship_ClientView_AccessFailures pins the 404/403 matrix on
// the client detail + stats routes: unknown username, unrelated athlete,
// another trainer's client, and a terminated relationship.
func TestE2E_Relationship_ClientView_AccessFailures(t *testing.T) {
	env := SetupTestEnv(t)
	_, trainerEmail, _ := env.RegisterUser(t, "cvtr", "cvtr@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	_, otherTrainerEmail, _ := env.RegisterUser(t, "cvtr2", "cvtr2@e2e.test", "Password123!", "trainer")
	otherTrainerToken, _ := env.Login(t, otherTrainerEmail, "Password123!")
	athUsername, athEmail, _ := env.RegisterUser(t, "cvath", "cvath@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	strangerUsername, strangerEmail, _ := env.RegisterUser(t, "cvstranger", "cvstranger@e2e.test", "Password123!", "athlete")
	_, _ = env.Login(t, strangerEmail, "Password123!")

	relID := establishRelationshipByInvitation(t, env, trainerToken, athToken)

	const (
		notFoundMsg = "Client not found. They may have been removed or the username is incorrect"
		noRelMsg    = "You don't have an active coaching relationship with this client"
	)

	// Unknown username → 404 on both routes.
	w := env.DoAuthRequest(http.MethodGet, "/api/relationships/client/doesnotexist", nil, trainerToken)
	RequireJSONError(t, w, http.StatusNotFound, notFoundMsg)
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/doesnotexist/stats", nil, trainerToken)
	RequireJSONError(t, w, http.StatusNotFound, notFoundMsg)

	// Related user but no relationship → 403.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+strangerUsername, nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, noRelMsg)
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+strangerUsername+"/stats", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, noRelMsg)

	// Another trainer never coached this client → 403.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+athUsername, nil, otherTrainerToken)
	RequireJSONError(t, w, http.StatusForbidden, noRelMsg)
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+athUsername+"/stats", nil, otherTrainerToken)
	RequireJSONError(t, w, http.StatusForbidden, noRelMsg)

	// Terminate the relationship: the client views drop to 403.
	w = env.DoAuthRequest(http.MethodDelete, "/api/relationships/"+itoa(relID), nil, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "Relationship terminated successfully")
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+athUsername, nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, noRelMsg)
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/client/"+athUsername+"/stats", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, noRelMsg)

	// Athlete's my-trainer no longer reports an active trainer.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, athToken)
	RequireStatus(t, w, http.StatusOK)
	var afterTerminate myTrainerResponse
	ParseJSON(t, w.Body.Bytes(), &afterTerminate)
	if afterTerminate.ActiveTrainer != nil {
		t.Fatalf("expected no activeTrainer after termination: %s", w.Body.String())
	}
}

// ---------------------------------------------------------------------------
// Termination
// ---------------------------------------------------------------------------

// TestE2E_Relationship_Terminate covers the DELETE /api/relationships/:id
// validation, ownership, success, and post-termination state checks.
func TestE2E_Relationship_Terminate(t *testing.T) {
	env := SetupTestEnv(t)
	_, trainerEmail, trainerID := env.RegisterUser(t, "termtr", "termtr@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	_, athEmail, _ := env.RegisterUser(t, "termath", "termath@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	_, strangerTrainerEmail, _ := env.RegisterUser(t, "termtr2", "termtr2@e2e.test", "Password123!", "trainer")
	strangerTrainerToken, _ := env.Login(t, strangerTrainerEmail, "Password123!")

	relID := establishRelationshipByInvitation(t, env, trainerToken, athToken)

	// Non-numeric ID → 400.
	w := env.DoAuthRequest(http.MethodDelete, "/api/relationships/abc", nil, athToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid relationship ID. Please check the URL and try again")

	// Unknown ID → 404.
	w = env.DoAuthRequest(http.MethodDelete, "/api/relationships/999999", nil, athToken)
	RequireJSONError(t, w, http.StatusNotFound,
		"Relationship not found. It may have already been terminated")

	// A trainer who is not part of this relationship cannot terminate it.
	w = env.DoAuthRequest(http.MethodDelete, "/api/relationships/"+itoa(relID), nil, strangerTrainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"You are not authorized to terminate this relationship. Only the trainer or athlete involved can do this")

	// Athlete terminates: success + status on the returned relationship.
	w = env.DoAuthRequest(http.MethodDelete, "/api/relationships/"+itoa(relID), nil, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "Relationship terminated successfully")
	var terminated struct {
		Relationship struct {
			TrainerID int    `json:"trainerId"`
			AthleteID int    `json:"athleteId"`
			Status    string `json:"status"`
		} `json:"relationship"`
	}
	ParseJSON(t, w.Body.Bytes(), &terminated)
	if terminated.Relationship.TrainerID != trainerID || terminated.Relationship.Status != "terminated" {
		t.Fatalf("unexpected terminated relationship: %s", w.Body.String())
	}

	// Consequences: trainer's client list is empty, athlete's assignment cleared.
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/my-clients", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var emptyClients struct {
		Clients []map[string]any `json:"clients"`
		Count   int              `json:"count"`
	}
	ParseJSON(t, w.Body.Bytes(), &emptyClients)
	if emptyClients.Count != 0 || len(emptyClients.Clients) != 0 {
		t.Fatalf("expected no clients after termination: %s", w.Body.String())
	}
	if got := athleteTrainerAssignment(t, env, athToken); got != 0 {
		t.Fatalf("profile.trainerAssignment = %d after termination, want 0/absent", got)
	}

	// Pinned behaviour: re-terminating an already-terminated relationship
	// returns 200 — the handler does not guard on the current status, it
	// re-terminates and re-saves the existing row. Flipping this to 400/409
	// requires a conscious handler change.
	w = env.DoAuthRequest(http.MethodDelete, "/api/relationships/"+itoa(relID), nil, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "Relationship terminated successfully")
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

// TestE2E_Relationship_Unauthenticated asserts that all seven relationship
// routes sit behind the JWT middleware, exercising each of its three
// rejection paths (missing header, malformed header, unusable token) with
// body assertions.
func TestE2E_Relationship_Unauthenticated(t *testing.T) {
	env := SetupTestEnv(t)

	routes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/relationships/invite"},
		{http.MethodPost, "/api/relationships/accept"},
		{http.MethodGet, "/api/relationships/my-clients"},
		{http.MethodGet, "/api/relationships/my-trainer"},
		{http.MethodGet, "/api/relationships/client/someone"},
		{http.MethodGet, "/api/relationships/client/someone/stats"},
		{http.MethodDelete, "/api/relationships/1"},
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

// ---------------------------------------------------------------------------
// my-trainer pending invitations
// ---------------------------------------------------------------------------

// TestE2E_Relationship_MyTrainer_PendingInvitations covers the
// pendingInvitations half of GET /api/relationships/my-trainer, which every
// other test only ever observes as an empty list.
//
// Pinned contract (finding R1, audit §4.6): the field reports relationships
// with status = 'pending' — not unconsumed rows in `invitations`. No
// application code path creates a pending relationship (invitation accept and
// coaching-request accept both write 'active' immediately), so the field is
// always empty in production; a direct SQL insert is the only way to keep the
// query branch alive.
//
// The seeded pending row uses a *second* trainer because relationships carry
// UNIQUE(trainer_id, athlete_id): a pending row for the same pair would make
// the subsequent accept fail on the unique constraint (finding R3).
func TestE2E_Relationship_MyTrainer_PendingInvitations(t *testing.T) {
	env := SetupTestEnv(t)
	_, trainerEmail, trainerID := env.RegisterUser(t, "pendtr", "pendtr@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	_, otherTrainerEmail, otherTrainerID := env.RegisterUser(t, "pendtr2", "pendtr2@e2e.test", "Password123!", "trainer")
	_ = otherTrainerEmail
	_, athEmail, athID := env.RegisterUser(t, "pendath", "pendath@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")

	// An unconsumed invitation code is not a pending relationship.
	code, _ := generateInvitationCode(t, env, trainerToken)
	w := env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, athToken)
	RequireStatus(t, w, http.StatusOK)
	var afterCode myTrainerResponse
	ParseJSON(t, w.Body.Bytes(), &afterCode)
	if len(afterCode.PendingInvitations) != 0 {
		t.Fatalf("pendingInvitations = %d after generating a code, want 0 (codes are not relationships): %s",
			len(afterCode.PendingInvitations), w.Body.String())
	}
	if afterCode.ActiveTrainer != nil {
		t.Fatalf("expected no activeTrainer while the code is unaccepted: %s", w.Body.String())
	}

	// Seed the only state that can populate the field: a pending relationship
	// with a trainer the athlete has never accepted a code from.
	var pendingID int
	if err := env.DB.QueryRow(context.Background(),
		`INSERT INTO relationships (trainer_id, athlete_id, status, created_at, updated_at)
		 VALUES ($1, $2, 'pending', now(), now()) RETURNING id`,
		otherTrainerID, athID).Scan(&pendingID); err != nil {
		t.Fatalf("failed to seed pending relationship: %v", err)
	}

	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, athToken)
	RequireStatus(t, w, http.StatusOK)
	var withPending myTrainerResponse
	ParseJSON(t, w.Body.Bytes(), &withPending)
	if len(withPending.PendingInvitations) != 1 {
		t.Fatalf("pendingInvitations = %d, want 1: %s", len(withPending.PendingInvitations), w.Body.String())
	}
	inv := withPending.PendingInvitations[0]
	if inv["relationshipId"] != float64(pendingID) || inv["trainerId"] != float64(otherTrainerID) ||
		inv["athleteId"] != float64(athID) || inv["status"] != "pending" {
		t.Fatalf("unexpected pending invitation payload: %v", inv)
	}
	// A pending relationship is not an active training assignment.
	if withPending.ActiveTrainer != nil {
		t.Fatalf("pending relationship surfaced as activeTrainer: %s", w.Body.String())
	}

	// Accepting the code activates the relationship with the *first* trainer;
	// the seeded pending row for the other trainer survives the accept and is
	// still reported next to the assignment (nothing reconciles it).
	relID := acceptInvitationCode(t, env, athToken, code)
	w = env.DoAuthRequest(http.MethodGet, "/api/relationships/my-trainer", nil, athToken)
	RequireStatus(t, w, http.StatusOK)
	var afterAccept myTrainerResponse
	ParseJSON(t, w.Body.Bytes(), &afterAccept)
	if afterAccept.ActiveTrainer == nil ||
		afterAccept.ActiveTrainer.Relationship.RelationshipID != relID ||
		afterAccept.ActiveTrainer.Relationship.Status != "active" ||
		afterAccept.ActiveTrainer.Relationship.TrainerID != trainerID ||
		afterAccept.ActiveTrainer.Trainer.UserID != trainerID {
		t.Fatalf("unexpected activeTrainer after accept: %s", w.Body.String())
	}
	if len(afterAccept.PendingInvitations) != 1 {
		t.Fatalf("pendingInvitations = %d after accept, want the seeded row still present (1): %s",
			len(afterAccept.PendingInvitations), w.Body.String())
	}
}
