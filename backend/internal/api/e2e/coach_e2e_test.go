package e2e

import (
	"context"
	"net/http"
	"testing"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// coachRequest mirrors the JSON payload of models.CoachingRequest.
type coachRequest struct {
	RequestID int    `json:"requestId"`
	AthleteID int    `json:"athleteId"`
	TrainerID int    `json:"trainerId"`
	Message   string `json:"message"`
	Status    string `json:"status"`
	Type      string `json:"type"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// coachRequestDetails mirrors models.CoachingRequestWithDetails.
type coachRequestDetails struct {
	coachRequest
	Athlete *struct {
		UserID   int    `json:"userId"`
		Username string `json:"username"`
		Role     string `json:"role"`
	} `json:"athlete"`
	Trainer *struct {
		UserID   int    `json:"userId"`
		Username string `json:"username"`
		Role     string `json:"role"`
	} `json:"trainer"`
}

// createCoachingRequestAs runs POST /api/coaching-requests as an athlete and
// returns the created request, failing the test unless the status is 201.
func createCoachingRequestAs(t testing.TB, env *TestEnv, athleteToken string, trainerID int, message string) coachRequest {
	t.Helper()

	w := env.DoAuthRequest(http.MethodPost, "/api/coaching-requests", map[string]any{
		"trainerId": trainerID,
		"message":   message,
	}, athleteToken)
	RequireStatus(t, w, http.StatusCreated)

	var req coachRequest
	ParseJSON(t, w.Body.Bytes(), &req)
	return req
}

// listCoachingRequests reads a coaching-request list endpoint ("/my" or
// "/pending") and fails if the array is JSON null rather than empty.
func listCoachingRequests(t testing.TB, env *TestEnv, path, token string) []coachRequestDetails {
	t.Helper()

	w := env.DoAuthRequest(http.MethodGet, "/api/coaching-requests"+path, nil, token)
	RequireStatus(t, w, http.StatusOK)

	var resp struct {
		Requests []coachRequestDetails `json:"requests"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)
	if resp.Requests == nil {
		t.Fatalf("GET %s returned a null requests array, want []: %s", path, w.Body.String())
	}
	return resp.Requests
}

// requestStatus reads the request's status straight from the database, so a
// missing /my entry cannot be mistaken for a successful transition.
func requestStatus(t testing.TB, env *TestEnv, requestID int) string {
	t.Helper()

	var status string
	if err := env.DB.QueryRow(context.Background(),
		`SELECT status FROM coaching_requests WHERE id = $1`, requestID).Scan(&status); err != nil {
		t.Fatalf("query coaching request %d status: %v", requestID, err)
	}
	return status
}

// ---------------------------------------------------------------------------
// Create + /my
// ---------------------------------------------------------------------------

// TestE2E_Coach_CreateAndMyRequests covers the create endpoint's happy path
// and the two-sided /my listing (athlete sees sent requests, trainer sees
// received ones), including the empty-state shape.
func TestE2E_Coach_CreateAndMyRequests(t *testing.T) {
	env := SetupTestEnv(t)
	trainerUsername, trainerEmail, trainerID := env.RegisterUser(t, "coacht", "coacht@e2e.test", "Password123!", "trainer")
	trainerToken, _ := env.Login(t, trainerEmail, "Password123!")
	_, otherTrainerEmail, otherTrainerID := env.RegisterUser(t, "coacht2", "coacht2@e2e.test", "Password123!", "trainer")
	_ = otherTrainerEmail
	athUsername, athEmail, athID := env.RegisterUser(t, "coacha", "coacha@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")

	// Empty state: both roles get an empty, non-null array.
	if got := listCoachingRequests(t, env, "/my", athToken); len(got) != 0 {
		t.Fatalf("athlete /my before any request = %d entries, want 0", len(got))
	}
	if got := listCoachingRequests(t, env, "/my", trainerToken); len(got) != 0 {
		t.Fatalf("trainer /my before any request = %d entries, want 0", len(got))
	}
	if got := listCoachingRequests(t, env, "/pending", trainerToken); len(got) != 0 {
		t.Fatalf("trainer /pending before any request = %d entries, want 0", len(got))
	}

	// Create: 201 with the full request payload.
	req := createCoachingRequestAs(t, env, athToken, trainerID, "please coach me")
	if req.RequestID == 0 || req.AthleteID != athID || req.TrainerID != trainerID ||
		req.Message != "please coach me" || req.Status != "pending" || req.Type != "coaching_request" {
		t.Fatalf("unexpected created coaching request: %+v", req)
	}
	if req.CreatedAt == "" || req.UpdatedAt == "" {
		t.Fatalf("created coaching request is missing timestamps: %+v", req)
	}

	// Athlete /my: the sent request, enriched with both users.
	athList := listCoachingRequests(t, env, "/my", athToken)
	if len(athList) != 1 {
		t.Fatalf("athlete /my = %d entries, want 1: %+v", len(athList), athList)
	}
	if athList[0].RequestID != req.RequestID || athList[0].Status != "pending" {
		t.Fatalf("unexpected athlete /my entry: %+v", athList[0])
	}
	if athList[0].Trainer == nil || athList[0].Trainer.UserID != trainerID ||
		athList[0].Trainer.Username != trainerUsername || athList[0].Trainer.Role != "trainer" {
		t.Fatalf("athlete /my entry missing trainer details: %+v", athList[0])
	}
	if athList[0].Athlete == nil || athList[0].Athlete.Username != athUsername {
		t.Fatalf("athlete /my entry missing athlete details: %+v", athList[0])
	}

	// Trainer /my: the received request, enriched with the athlete.
	trList := listCoachingRequests(t, env, "/my", trainerToken)
	if len(trList) != 1 || trList[0].RequestID != req.RequestID {
		t.Fatalf("trainer /my = %+v, want the single request %d", trList, req.RequestID)
	}
	if trList[0].Athlete == nil || trList[0].Athlete.UserID != athID || trList[0].Athlete.Username != athUsername {
		t.Fatalf("trainer /my entry missing athlete details: %+v", trList[0])
	}

	// A second request to a *different* trainer is allowed.
	second := createCoachingRequestAs(t, env, athToken, otherTrainerID, "second option")
	if second.RequestID == req.RequestID {
		t.Fatalf("second request reused ID %d", req.RequestID)
	}
	if got := listCoachingRequests(t, env, "/my", athToken); len(got) != 2 {
		t.Fatalf("athlete /my after second request = %d entries, want 2", len(got))
	}
	// ...and it lands in the other trainer's list only.
	if got := listCoachingRequests(t, env, "/my", trainerToken); len(got) != 1 {
		t.Fatalf("first trainer /my = %d entries, want 1", len(got))
	}

	// The message field is optional. Registering a fresh trainer keeps this
	// creation clear of the duplicate guard (pending-only rows per trainer).
	_, freshTrainerEmail, freshTrainerID := env.RegisterUser(t, "coachm", "coachm@e2e.test", "Password123!", "trainer")
	_ = freshTrainerEmail
	w := env.DoAuthRequest(http.MethodPost, "/api/coaching-requests", map[string]any{
		"trainerId": freshTrainerID,
	}, athToken)
	RequireStatus(t, w, http.StatusCreated)
	var noMessage coachRequest
	ParseJSON(t, w.Body.Bytes(), &noMessage)
	if noMessage.Message != "" || noMessage.Status != "pending" {
		t.Fatalf("unexpected request without message: %+v", noMessage)
	}
}

// ---------------------------------------------------------------------------
// Create validation + role guards
// ---------------------------------------------------------------------------

// TestE2E_Coach_CreateValidationAndRoleGuards covers the create endpoint's
// role guard, binding branches, and business-rule failures.
func TestE2E_Coach_CreateValidationAndRoleGuards(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "cocreate")
	athUsername, athEmail, _ := env.RegisterUser(t, "cocreatea", "cocreatea@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	_ = athUsername
	adminToken, _ := registerAdmin(t, env, "cocreate")
	_, otherAthEmail, otherAthID := env.RegisterUser(t, "cocreateo", "cocreateo@e2e.test", "Password123!", "athlete")
	_ = otherAthEmail

	const (
		roleMsg    = "Only athletes can send coaching requests. Please log in as an athlete"
		bindingMsg = "Invalid coaching request data. Please check the trainer and message and try again"
		notFound   = "trainer not found. Please check the trainer ID and try again"
		notTrainer = "the selected user is not a trainer. Please choose a trainer account"
		duplicate  = "you already have a pending request to this trainer. Please wait for them to respond"
	)

	// Role guard: trainer and admin are denied before any body parsing.
	w := env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": trainerID, "message": "x"}, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, roleMsg)
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": trainerID, "message": "x"}, adminToken)
	RequireJSONError(t, w, http.StatusForbidden, roleMsg)

	// Binding failures: trainerId 0 is rejected by the required tag, a
	// non-integer breaks JSON decoding, an array is not an object, and an
	// empty body decodes to nothing — all surface the same message.
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"message": "no trainer"}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": "abc", "message": "wrong type"}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		[]map[string]any{}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests", nil, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, bindingMsg)

	// Unknown trainer ID -> 404.
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": 999999, "message": "ghost"}, athToken)
	RequireJSONError(t, w, http.StatusNotFound, notFound)

	// Existing users without the trainer role -> 400.
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": otherAthID, "message": "athlete target"}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest, notTrainer)

	// Duplicate pending request to the same trainer -> 409.
	createCoachingRequestAs(t, env, athToken, trainerID, "first")
	w = env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": trainerID, "message": "again"}, athToken)
	RequireJSONError(t, w, http.StatusConflict, duplicate)
}

// ---------------------------------------------------------------------------
// Pending view + reject flow
// ---------------------------------------------------------------------------

// TestE2E_Coach_PendingAndReject covers the /pending view and the full
// reject lifecycle: success, re-reject and accept-after-reject conflicts,
// non-owner, role guards, and ID validation.
func TestE2E_Coach_PendingAndReject(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "coreject")
	otherTrainerToken, _ := env.RegisterTrainer(t, "corejecto")
	_, athEmail, _ := env.RegisterUser(t, "corejecta", "corejecta@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	adminToken, _ := registerAdmin(t, env, "coreject")

	const (
		acceptGuard  = "Only trainers can accept coaching requests. Please log in as a trainer"
		rejectGuard  = "Only trainers can reject coaching requests. Please log in as a trainer"
		pendingGuard = "Only trainers can view pending coaching requests. Please log in as a trainer"
		notOwner     = "this coaching request was sent to a different trainer. You can only respond to your own requests"
		badID        = "Invalid coaching request ID. Please check the URL and try again"
		notFoundReq  = "coaching request not found. It may have been deleted or the ID is incorrect"
		rejected     = "this request has already been rejected and can no longer be changed"
	)

	// Two athletes write to the same trainer; /pending collects both.
	req := createCoachingRequestAs(t, env, athToken, trainerID, "coach me")
	secondAthToken, _ := env.RegisterAthlete(t, "corejectb")
	second := createCoachingRequestAs(t, env, secondAthToken, trainerID, "me too")
	pending := listCoachingRequests(t, env, "/pending", trainerToken)
	if len(pending) != 2 {
		t.Fatalf("/pending = %d entries, want 2", len(pending))
	}
	seen := map[int]bool{}
	for _, r := range pending {
		if r.Status != "pending" || r.Trainer == nil || r.Trainer.UserID != trainerID {
			t.Fatalf("unexpected /pending entry: %+v", r)
		}
		seen[r.RequestID] = true
	}
	if !seen[req.RequestID] || !seen[second.RequestID] {
		t.Fatalf("/pending missing requests: %+v", seen)
	}

	// Guard on the read side: athlete AND admin are both non-trainers here.
	for _, tok := range []string{athToken, adminToken} {
		w := env.DoAuthRequest(http.MethodGet, "/api/coaching-requests/pending", nil, tok)
		RequireJSONError(t, w, http.StatusForbidden, pendingGuard)
	}

	// Reject the first request: success message, DB status, and it leaves
	// /pending while staying visible in /my with status rejected.
	w := env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(req.RequestID)+"/reject", nil, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "coaching request rejected")
	if got := requestStatus(t, env, req.RequestID); got != "rejected" {
		t.Fatalf("DB status after reject = %q, want rejected", got)
	}
	if got := listCoachingRequests(t, env, "/pending", trainerToken); len(got) != 1 ||
		got[0].RequestID != second.RequestID {
		t.Fatalf("/pending after reject = %+v, want only request %d", got, second.RequestID)
	}
	mine := listCoachingRequests(t, env, "/my", athToken)
	if len(mine) != 1 || mine[0].Status != "rejected" {
		t.Fatalf("athlete /my after reject = %+v, want the single rejected request", mine)
	}

	// A rejected request can no longer be rejected or accepted.
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(req.RequestID)+"/reject", nil, trainerToken)
	RequireJSONError(t, w, http.StatusConflict, rejected)
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(req.RequestID)+"/accept", nil, trainerToken)
	RequireJSONError(t, w, http.StatusConflict, rejected)

	// A trainer who did not receive the request cannot answer it.
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(second.RequestID)+"/reject", nil, otherTrainerToken)
	RequireJSONError(t, w, http.StatusForbidden, notOwner)
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(second.RequestID)+"/accept", nil, otherTrainerToken)
	RequireJSONError(t, w, http.StatusForbidden, notOwner)

	// Athlete and admin are denied before the row is even looked up.
	for _, tok := range []string{athToken, adminToken} {
		w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(second.RequestID)+"/accept", nil, tok)
		RequireJSONError(t, w, http.StatusForbidden, acceptGuard)
		w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(second.RequestID)+"/reject", nil, tok)
		RequireJSONError(t, w, http.StatusForbidden, rejectGuard)
	}

	// Athlete with a non-numeric ID still hits the guard first (403, not
	// 400): the role check precedes parameter parsing.
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/abc/reject", nil, athToken)
	RequireJSONError(t, w, http.StatusForbidden, rejectGuard)

	// ID validation for the owner: non-numeric -> 400, unknown -> 404.
	for _, action := range []string{"accept", "reject"} {
		w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/abc/"+action, nil, trainerToken)
		RequireJSONError(t, w, http.StatusBadRequest, badID)
		w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/999999/"+action, nil, trainerToken)
		RequireJSONError(t, w, http.StatusNotFound, notFoundReq)
	}
}

// ---------------------------------------------------------------------------
// Accept flow
// ---------------------------------------------------------------------------

// TestE2E_Coach_Accept_Flow covers the happy-path accept: relationship,
// trainer assignment, request status, and the double-accept conflict.
func TestE2E_Coach_Accept_Flow(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "coaccept")
	_, athEmail, athID := env.RegisterUser(t, "coaccepta", "coaccepta@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")

	req := createCoachingRequestAs(t, env, athToken, trainerID, "pick me")

	// Accept: success message plus the created relationship.
	w := env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(req.RequestID)+"/accept", nil, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "coaching request accepted")
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

	// Consequences: request row is accepted, /pending drains, the athlete is
	// assigned, and the relationship persists active in the DB.
	if got := requestStatus(t, env, req.RequestID); got != "accepted" {
		t.Fatalf("DB status after accept = %q, want accepted", got)
	}
	if got := listCoachingRequests(t, env, "/pending", trainerToken); len(got) != 0 {
		t.Fatalf("/pending after accept = %d entries, want 0", len(got))
	}
	mine := listCoachingRequests(t, env, "/my", athToken)
	if len(mine) != 1 || mine[0].Status != "accepted" {
		t.Fatalf("athlete /my after accept = %+v, want the single accepted request", mine)
	}
	if got := athleteTrainerAssignment(t, env, athToken); got != trainerID {
		t.Fatalf("profile.trainerAssignment = %d, want %d", got, trainerID)
	}
	var dbStatus string
	if err := env.DB.QueryRow(context.Background(),
		`SELECT status FROM relationships WHERE id = $1`, relID).Scan(&dbStatus); err != nil {
		t.Fatalf("query relationship status: %v", err)
	}
	if dbStatus != "active" {
		t.Fatalf("relationship %d status = %q, want active", relID, dbStatus)
	}

	// Re-accepting an accepted request is a conflict carrying the status.
	w = env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(req.RequestID)+"/accept", nil, trainerToken)
	RequireJSONError(t, w, http.StatusConflict,
		"this request has already been accepted and can no longer be changed")
}

// ---------------------------------------------------------------------------
// Accept failure: athlete already has a trainer
// ---------------------------------------------------------------------------

// TestE2E_Coach_Accept_AthleteHasTrainer pins the accept-time guard against
// a second active trainer: the athlete requests T2 first, then takes T1 via
// the invitation flow, and T2's late accept must lose.
func TestE2E_Coach_Accept_AthleteHasTrainer(t *testing.T) {
	env := SetupTestEnv(t)
	t1Token, t1ID := env.RegisterTrainer(t, "coathas1")
	t2Token, _ := env.RegisterTrainer(t, "coathas2")
	_, athEmail, _ := env.RegisterUser(t, "coathasa", "coathasa@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")

	req := createCoachingRequestAs(t, env, athToken, t1ID, "first choice")
	establishRelationshipByInvitation(t, env, t2Token, athToken)

	w := env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(req.RequestID)+"/accept", nil, t1Token)
	RequireJSONError(t, w, http.StatusConflict,
		"this athlete already has an active trainer, so the request can't be accepted")

	// ...and the request stays pending — the conflict changed nothing.
	if got := requestStatus(t, env, req.RequestID); got != "pending" {
		t.Fatalf("DB status after failed accept = %q, want pending", got)
	}
}

// ---------------------------------------------------------------------------
// Corners: admin /my and terminated relationships
// ---------------------------------------------------------------------------

// TestE2E_Coach_AdminMyRequests pins the /my contract for the admin role.
// GetMyRequests switches only on athlete/trainer and reports anything else
// as an internal fault: an admin token gets 500, not a 403 or an empty list
// (finding H1).
func TestE2E_Coach_AdminMyRequests(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, _ := registerAdmin(t, env, "coadmin")

	w := env.DoAuthRequest(http.MethodGet, "/api/coaching-requests/my", nil, adminToken)
	RequireJSONError(t, w, http.StatusInternalServerError,
		"Something went wrong while processing your request. Please try again later")
}

// TestE2E_Coach_TerminatedRelationship pins the coaching-request guards
// against a terminated relationship (finding H2): CreateCoachingRequest and
// AcceptCoachingRequest treat *any* row returned by GetByAthleteID as an
// active trainer, so an athlete whose only relationship is terminated is
// permanently blocked from the coaching-request loop.
func TestE2E_Coach_TerminatedRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	t1Token, _ := env.RegisterTrainer(t, "coterm1")
	t2Token, t2ID := env.RegisterTrainer(t, "coterm2")
	_, t3ID := env.RegisterTrainer(t, "coterm3")
	_, athEmail, _ := env.RegisterUser(t, "coterma", "coterma@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")

	// A request to T2 made while unaffiliated stays pending here.
	pending := createCoachingRequestAs(t, env, athToken, t2ID, "from before")

	// The athlete takes T1 and terminates, leaving only a terminated row.

	relID := establishRelationshipByInvitation(t, env, t1Token, athToken)
	w := env.DoAuthRequest(http.MethodDelete, "/api/relationships/"+itoa(relID), nil, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "Relationship terminated successfully")

	// Create still reports the ex-trainer: the check does not call IsActive().
	const alreadyHasTrainer = "you already have an active trainer. Please end your current coaching relationship first"
	const athleteHasTrainer = "this athlete already has an active trainer, so the request can't be accepted"

	w2 := env.DoAuthRequest(http.MethodPost, "/api/coaching-requests",
		map[string]any{"trainerId": t3ID, "message": "new start"}, athToken)
	RequireJSONError(t, w2, http.StatusConflict, alreadyHasTrainer)

	w3 := env.DoAuthRequest(http.MethodPut, "/api/coaching-requests/"+itoa(pending.RequestID)+"/accept", nil, t2Token)
	RequireJSONError(t, w3, http.StatusConflict, athleteHasTrainer)
}

func TestE2E_Coach_Unauthenticated(t *testing.T) {
	env := SetupTestEnv(t)

	routesTable := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/coaching-requests"},
		{http.MethodGet, "/api/coaching-requests/my"},
		{http.MethodGet, "/api/coaching-requests/pending"},
		{http.MethodPut, "/api/coaching-requests/1/accept"},
		{http.MethodPut, "/api/coaching-requests/1/reject"},
	}

	for _, r := range routesTable {
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
