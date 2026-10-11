package e2e

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// trainerProfile mirrors models.TrainerProfile.
type trainerProfile struct {
	Bio                      string   `json:"bio"`
	ProfilePhotoURL          string   `json:"profilePhotoUrl"`
	HourlyRate               float64  `json:"hourlyRate"`
	YearsOfExperience        int      `json:"yearsOfExperience"`
	IsAvailableForNewClients bool     `json:"isAvailableForNewClients"`
	Location                 string   `json:"location"`
	Languages                []string `json:"languages"`
}

// trainerWithProfile mirrors models.TrainerWithProfile (embedded user).
type trainerWithProfile struct {
	UserID         int            `json:"userId"`
	Username       string         `json:"username"`
	Role           string         `json:"role"`
	TrainerProfile trainerProfile `json:"trainerProfile"`
}

// availabilitySlot mirrors models.TrainerAvailability.
type availabilitySlot struct {
	AvailabilityID int    `json:"availabilityId"`
	TrainerID      int    `json:"trainerId"`
	DayOfWeek      int    `json:"dayOfWeek"`
	StartTime      string `json:"startTime"`
	EndTime        string `json:"endTime"`
	IsBooked       bool   `json:"isBooked"`
}

type trainerReview struct {
	ReviewID  int    `json:"reviewId"`
	TrainerID int    `json:"trainerId"`
	AthleteID int    `json:"athleteId"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
}

// getSlots reads a GET availability endpoint and fails on a null array.
// token == "" means the request is unauthenticated (public route).
func getSlots(t testing.TB, env *TestEnv, path, token string) []availabilitySlot {
	t.Helper()
	var rec *httptest.ResponseRecorder
	if token == "" {
		rec = env.DoRequest(http.MethodGet, path, nil, nil)
	} else {
		rec = env.DoAuthRequest(http.MethodGet, path, nil, token)
	}
	RequireStatus(t, rec, http.StatusOK)
	var resp struct {
		Slots []availabilitySlot `json:"slots"`
	}
	ParseJSON(t, rec.Body.Bytes(), &resp)
	if resp.Slots == nil {
		t.Fatalf("GET %s returned null slots, want []: %s", path, rec.Body.String())
	}
	return resp.Slots
}

// getReviews reads GET /api/trainers/:id/reviews and fails on null array.
func getReviews(t testing.TB, env *TestEnv, trainerID int) []trainerReview {
	t.Helper()
	w := env.DoRequest(http.MethodGet, "/api/trainers/"+itoa(trainerID)+"/reviews", nil, nil)
	RequireStatus(t, w, http.StatusOK)
	var resp struct {
		Reviews []trainerReview `json:"reviews"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)
	if resp.Reviews == nil {
		t.Fatalf("reviews for trainer %d is null, want []: %s", trainerID, w.Body.String())
	}
	return resp.Reviews
}

// createReview POSTs a review and asserts 201.
func createReview(t testing.TB, env *TestEnv, athleteToken string, trainerID, rating int, comment string) trainerReview {
	t.Helper()
	w := env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(trainerID)+"/reviews",
		map[string]any{"rating": rating, "comment": comment}, athleteToken)
	RequireStatus(t, w, http.StatusCreated)
	var r trainerReview
	ParseJSON(t, w.Body.Bytes(), &r)
	return r
}

// ---------------------------------------------------------------------------
// Public catalog + trainer profile management
// ---------------------------------------------------------------------------

// TestE2E_Trainer_CatalogAndProfile covers the public trainer catalog
// (list, filters, detail, availability, reviews) and the me/profile
// round-trip between the two endpoints.
func TestE2E_Trainer_CatalogAndProfile(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "catalog")
	_, otherID := env.RegisterTrainer(t, "catalog2")

	// The catalog lists every trainer role account (public, no token).
	w := env.DoRequest(http.MethodGet, "/api/trainers", nil, nil)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Trainers []trainerWithProfile `json:"trainers"`
		Total    int                  `json:"total"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Trainers == nil || list.Total < 2 {
		t.Fatalf("catalog = total %d with %d trainers, want >= 2 and non-null: %s",
			list.Total, len(list.Trainers), w.Body.String())
	}

	// Set a profile, then confirm /me/profile and /:id agree.
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/profile", map[string]any{
		"bio": "strength coach", "hourlyRate": 50, "yearsOfExperience": 4,
		"isAvailableForNewClients": true, "location": "Berlin", "languages": []string{"en", "tr"},
	}, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "profile updated successfully")

	w = env.DoAuthRequest(http.MethodGet, "/api/trainers/me/profile", nil, trainerToken)
	RequireStatus(t, w, http.StatusOK)
	var me trainerWithProfile
	ParseJSON(t, w.Body.Bytes(), &me)
	if me.TrainerProfile.Bio != "strength coach" || me.TrainerProfile.Location != "Berlin" ||
		me.TrainerProfile.HourlyRate != 50 || me.TrainerProfile.YearsOfExperience != 4 ||
		!me.TrainerProfile.IsAvailableForNewClients || len(me.TrainerProfile.Languages) != 2 {
		t.Fatalf("me/profile mismatch: %+v", me.TrainerProfile)
	}

	w = env.DoRequest(http.MethodGet, "/api/trainers/"+itoa(trainerID), nil, nil)
	RequireStatus(t, w, http.StatusOK)
	var detail trainerWithProfile
	ParseJSON(t, w.Body.Bytes(), &detail)
	if detail.TrainerProfile.Bio != "strength coach" || detail.UserID != trainerID || detail.Role != "trainer" {
		t.Fatalf("public detail mismatch: %s", w.Body.String())
	}

	// The location filter sees the saved profile; a mismatch does not.
	w = env.DoRequest(http.MethodGet, "/api/trainers?location=Berlin", nil, nil)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 1 || len(list.Trainers) != 1 || list.Trainers[0].UserID != trainerID {
		t.Fatalf("location=Berlin = %s, want exactly the trainer", w.Body.String())
	}
	w = env.DoRequest(http.MethodGet, "/api/trainers?location=Oslo", nil, nil)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 0 || len(list.Trainers) != 0 {
		t.Fatalf("location=Oslo = %s, want empty", w.Body.String())
	}

	// availableForNewClients=false finds the other (unset) trainer only
	// if their profile flag decodes to false; the catalog must answer 200.
	w = env.DoRequest(http.MethodGet, "/api/trainers?availableForNewClients=true", nil, nil)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	found := false
	for _, tr := range list.Trainers {
		if tr.UserID == trainerID {
			found = true
		}
	}
	if !found {
		t.Fatalf("availableForNewClients=true lost trainer %d: %s", trainerID, w.Body.String())
	}

	// The second trainer's public availability and reviews are empty arrays.
	slots := getSlots(t, env, "/api/trainers/"+itoa(otherID)+"/availability", "")
	if len(slots) != 0 {
		t.Fatalf("other trainer availability = %+v, want empty", slots)
	}
	if got := getReviews(t, env, otherID); len(got) != 0 {
		t.Fatalf("other trainer reviews = %+v, want empty", got)
	}
}

// TestE2E_Trainer_ProfileValidation pins the me/profile contract: the
// negative-value service validations currently surface as a generic 500
// (finding T2), and the GET role guard is trainer-only.
func TestE2E_Trainer_ProfileValidation(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "profval")
	adminToken, _ := registerAdmin(t, env, "profval")
	athToken, _ := env.RegisterAthlete(t, "profval")

	// GET me/profile is trainer-only.
	for _, tok := range []string{athToken, adminToken} {
		w := env.DoAuthRequest(http.MethodGet, "/api/trainers/me/profile", nil, tok)
		RequireJSONError(t, w, http.StatusForbidden,
			"Only trainers can access this profile section. Please log in as a trainer")
	}

	// Malformed JSON body -> 400 on PUT.
	w := env.DoAuthRequest(http.MethodPut, "/api/trainers/me/profile", "not-an-object", trainerToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid profile data. Please check the submitted fields and try again")

	// Negative service-level values surface as generic 500s, not 400s (T2).
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/profile",
		map[string]any{"hourlyRate": -5}, trainerToken)
	RequireJSONError(t, w, http.StatusInternalServerError,
		"Something went wrong while processing your request. Please try again later")
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/profile",
		map[string]any{"yearsOfExperience": -1}, trainerToken)
	RequireJSONError(t, w, http.StatusInternalServerError,
		"Something went wrong while processing your request. Please try again later")

	// No role guard on PUT /me/profile (T1): an athlete passes the handler's
	// auth check, then fails inside the repository (which scopes updates to
	// role='trainer') — and that not-found surfaces as a generic 500 instead
	// of a clean 403/404.
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/profile",
		map[string]any{"bio": "athlete moonlighting"}, athToken)
	RequireJSONError(t, w, http.StatusInternalServerError,
		"Something went wrong while processing your request. Please try again later")
}

// TestE2E_Trainer_PublicIDValidation covers the id-parsing branches of the
// public catalog endpoints.
func TestE2E_Trainer_PublicIDValidation(t *testing.T) {
	env := SetupTestEnv(t)

	for _, path := range []string{"/api/trainers/abc", "/api/trainers/abc/availability", "/api/trainers/abc/reviews"} {
		w := env.DoRequest(http.MethodGet, path, nil, nil)
		RequireJSONError(t, w, http.StatusBadRequest,
			"Invalid trainer ID. Please check the URL and try again")
	}

	w := env.DoRequest(http.MethodGet, "/api/trainers/999999", nil, nil)
	RequireJSONError(t, w, http.StatusNotFound,
		"Trainer not found. Please check the ID and try again")

	// Availability/reviews of an unknown trainer are empty, not 404.
	if got := getSlots(t, env, "/api/trainers/999999/availability", ""); len(got) != 0 {
		t.Fatalf("unknown trainer availability = %+v, want empty", got)
	}
	if got := getReviews(t, env, 999999); len(got) != 0 {
		t.Fatalf("unknown trainer reviews = %+v, want empty", got)
	}
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

// TestE2E_Trainer_Availability_Lifecycle covers set → read (own + public) →
// delete, malformed-body 400, and pins two contract warts: unknown slotId
// surfaces as 500 (T6), and PUT merges instead of replacing (T7).
func TestE2E_Trainer_Availability_Lifecycle(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "avail")

	slots := []map[string]any{
		{"dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00"},
		{"dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00"},
	}
	w := env.DoAuthRequest(http.MethodPut, "/api/trainers/me/availability", slots, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "availability updated successfully")

	own := getSlots(t, env, "/api/trainers/me/availability", trainerToken)
	if len(own) != 2 || own[0].TrainerID != trainerID || own[0].AvailabilityID == 0 {
		t.Fatalf("own availability = %+v, want 2 slots for trainer %d", own, trainerID)
	}
	pub := getSlots(t, env, "/api/trainers/"+itoa(trainerID)+"/availability", "")
	if len(pub) != 2 {
		t.Fatalf("public availability = %+v, want 2 slots", pub)
	}

	// Delete one; the other survives. Unknown ID -> generic 500 (T6).
	w = env.DoAuthRequest(http.MethodDelete,
		"/api/trainers/me/availability/"+itoa(own[0].AvailabilityID), nil, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "slot deleted successfully")
	if left := getSlots(t, env, "/api/trainers/me/availability", trainerToken); len(left) != 1 {
		t.Fatalf("after delete = %d slots, want 1", len(left))
	}
	w = env.DoAuthRequest(http.MethodDelete, "/api/trainers/me/availability/999999", nil, trainerToken)
	RequireJSONError(t, w, http.StatusInternalServerError,
		"Something went wrong while processing your request. Please try again later")
	w = env.DoAuthRequest(http.MethodDelete, "/api/trainers/me/availability/abc", nil, trainerToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid availability slot ID. Please check the URL and try again")

	// PUT is documented as "replaces all existing slots" but actually
	// upserts/merges — the surviving slot from before is still there (T7).
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/availability",
		[]map[string]any{{"dayOfWeek": 5, "startTime": "10:00", "endTime": "11:00"}}, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "availability updated successfully")
	if got := getSlots(t, env, "/api/trainers/me/availability", trainerToken); len(got) != 2 {
		t.Fatalf("after re-PUT = %d slots, want 2 (merge, not replace): %+v", len(got), got)
	}

	// Malformed body -> 400.
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/availability", "not-an-array", trainerToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid availability data. Please check the days and time slots and try again")
}

// TestE2E_Trainer_Availability_NoRoleGuards pins the missing role/ownership
// checks: an athlete (or admin) can write their own availability rows, read
// them back, and delete a trainer's slot by ID (T3/T4).
func TestE2E_Trainer_Availability_NoRoleGuards(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "availng")
	athToken, athID := env.RegisterAthlete(t, "availng")
	adminToken, _ := registerAdmin(t, env, "availng")

	// Athlete can set + read their own "availability" (T3).
	w := env.DoAuthRequest(http.MethodPut, "/api/trainers/me/availability",
		[]map[string]any{{"dayOfWeek": 2, "startTime": "08:00", "endTime": "09:00"}}, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "availability updated successfully")
	if got := getSlots(t, env, "/api/trainers/me/availability", athToken); len(got) != 1 ||
		got[0].TrainerID != athID {
		t.Fatalf("athlete availability = %+v, want 1 slot registered under the athlete ID", got)
	}

	// Admin gets the same treatment (T3).
	w = env.DoAuthRequest(http.MethodGet, "/api/trainers/me/availability", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)

	// DELETE /me/availability/:slotId checks ownership nowhere (T4): the
	// athlete removes the trainer's slot.
	w = env.DoAuthRequest(http.MethodPut, "/api/trainers/me/availability",
		[]map[string]any{{"dayOfWeek": 4, "startTime": "09:00", "endTime": "10:00"}}, trainerToken)
	RequireJSONMessage(t, w, http.StatusOK, "availability updated successfully")
	trSlots := getSlots(t, env, "/api/trainers/"+itoa(trainerID)+"/availability", "")
	if len(trSlots) != 1 {
		t.Fatalf("trainer slots = %+v, want 1", trSlots)
	}
	w = env.DoAuthRequest(http.MethodDelete,
		"/api/trainers/me/availability/"+itoa(trSlots[0].AvailabilityID), nil, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "slot deleted successfully")
	if got := getSlots(t, env, "/api/trainers/"+itoa(trainerID)+"/availability", ""); len(got) != 0 {
		t.Fatalf("trainer slots after athlete delete = %+v, want empty", got)
	}
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

// TestE2E_Trainer_Reviews_Flow covers the create path: active-relationship
// requirement, duplicate rejection, role guard ordering, and the 1-5 rating
// binding branches.
func TestE2E_Trainer_Reviews_Flow(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "rev")
	_, athEmail, _ := env.RegisterUser(t, "revath", "revath@e2e.test", "Password123!", "athlete")
	athToken, athID := env.Login(t, athEmail, "Password123!")
	_ = athID
	otherAthToken, _ := env.RegisterAthlete(t, "revother")
	t2Token, t2ID := env.RegisterTrainer(t, "rev2")

	// No relationship: athlete cannot review (403, not 404).
	w := env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(trainerID)+"/reviews",
		map[string]any{"rating": 5}, athToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"you can only review a trainer while you have an active coaching relationship with them")

	// Guardian order: role check comes before any ID/body parsing.
	w = env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(trainerID)+"/reviews",
		map[string]any{"rating": "abc"}, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Only athletes can write reviews. Please log in as an athlete")

	relID := establishRelationshipByInvitation(t, env, trainerToken, athToken)

	// With an active relationship the rating binding branches run.
	const invalidReview = "Invalid review data. Please check the rating (1-5) and comment and try again"
	for _, body := range []map[string]any{
		{"comment": "no rating"},
		{"rating": 0},
		{"rating": 6},
		{"rating": "five"},
	} {
		w = env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(trainerID)+"/reviews", body, athToken)
		RequireJSONError(t, w, http.StatusBadRequest, invalidReview)
	}
	w = env.DoAuthRequest(http.MethodPost, "/api/trainers/abc/reviews",
		map[string]any{"rating": 5}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid trainer ID. Please check the URL and try again")

	// Happy path, then the same-trainer duplicate guard.
	r := createReview(t, env, athToken, trainerID, 5, "great coach")
	if r.ReviewID == 0 || r.TrainerID != trainerID || r.Rating != 5 || r.Comment != "great coach" {
		t.Fatalf("unexpected review: %+v", r)
	}
	w = env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(trainerID)+"/reviews",
		map[string]any{"rating": 4}, athToken)
	RequireJSONError(t, w, http.StatusConflict,
		"you've already reviewed this trainer. You can edit or delete your existing review instead")

	// Per-trainer duplicate guard. Reviews are unique per (trainer, athlete) —
	// that pair is what UNIQUE(trainer_id, athlete_id) enforces — so after
	// terminating T1 and taking T2 as coach, the athlete must be able to review
	// T2 even though a stale T1 review exists.
	//
	// This previously asserted the opposite ("the check keys on the athlete"),
	// pinning a defect in which an athlete could only ever leave one review
	// across their whole history. The lookup is now scoped to the pair.
	w = env.DoAuthRequest(http.MethodDelete, "/api/relationships/"+itoa(relID), nil, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "Relationship terminated successfully")
	establishRelationshipByInvitation(t, env, t2Token, athToken)
	t2Review := createReview(t, env, athToken, t2ID, 4, "solid second coach")
	if t2Review.ReviewID == 0 || t2Review.TrainerID != t2ID {
		t.Fatalf("reviewing a second trainer must be allowed: %+v", t2Review)
	}
	if t2Review.ReviewID == r.ReviewID {
		t.Fatalf("second review reused the first review's id: %d", t2Review.ReviewID)
	}

	// ...but the same trainer is still rejected, so the guard is per pair.
	w = env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(t2ID)+"/reviews",
		map[string]any{"rating": 2}, athToken)
	RequireJSONError(t, w, http.StatusConflict,
		"you've already reviewed this trainer. You can edit or delete your existing review instead")

	// A different athlete with no relationship still gets 403.
	w = env.DoAuthRequest(http.MethodPost, "/api/trainers/"+itoa(trainerID)+"/reviews",
		map[string]any{"rating": 3}, otherAthToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"you can only review a trainer while you have an active coaching relationship with them")

	// The review surfaces publicly.
	revs := getReviews(t, env, trainerID)
	if len(revs) != 1 || revs[0].Rating != 5 || revs[0].Comment != "great coach" {
		t.Fatalf("public reviews = %+v, want the single 5-star review", revs)
	}
}

// TestE2E_Trainer_Reviews_UpdateDelete pins author-only edit/delete, rating
// validation, and the double-delete 404.
func TestE2E_Trainer_Reviews_UpdateDelete(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID := env.RegisterTrainer(t, "revupd")
	_, athEmail, _ := env.RegisterUser(t, "revupda", "revupda@e2e.test", "Password123!", "athlete")
	athToken, _ := env.Login(t, athEmail, "Password123!")
	otherAthToken, _ := env.RegisterAthlete(t, "revupd")

	establishRelationshipByInvitation(t, env, trainerToken, athToken)
	r := createReview(t, env, athToken, trainerID, 4, "solid")

	// Non-author (athlete or trainer) cannot edit.
	for _, tok := range []string{otherAthToken, trainerToken} {
		w := env.DoAuthRequest(http.MethodPut, "/api/reviews/"+itoa(r.ReviewID),
			map[string]any{"rating": 5, "comment": "hijack"}, tok)
		RequireJSONError(t, w, http.StatusForbidden, "you can only edit your own reviews")
	}

	// Author edit: 200 + persisted.
	w := env.DoAuthRequest(http.MethodPut, "/api/reviews/"+itoa(r.ReviewID),
		map[string]any{"rating": 2, "comment": "changed my mind"}, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "review updated successfully")
	revs := getReviews(t, env, trainerID)
	if len(revs) != 1 || revs[0].Rating != 2 || revs[0].Comment != "changed my mind" {
		t.Fatalf("reviews after update = %+v", revs)
	}

	// Edit validation + IDs.
	w = env.DoAuthRequest(http.MethodPut, "/api/reviews/"+itoa(r.ReviewID),
		map[string]any{"rating": 9}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid review data. Please check the rating (1-5) and comment and try again")
	w = env.DoAuthRequest(http.MethodPut, "/api/reviews/abc",
		map[string]any{"rating": 3}, athToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid review ID. Please check the URL and try again")
	w = env.DoAuthRequest(http.MethodPut, "/api/reviews/999999",
		map[string]any{"rating": 3}, athToken)
	RequireJSONError(t, w, http.StatusNotFound,
		"review not found. It may have been deleted or the ID is incorrect")

	// Non-author delete -> 403; author delete -> 200; second delete -> 404.
	w = env.DoAuthRequest(http.MethodDelete, "/api/reviews/"+itoa(r.ReviewID), nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, "you can only delete your own reviews")
	w = env.DoAuthRequest(http.MethodDelete, "/api/reviews/"+itoa(r.ReviewID), nil, athToken)
	RequireJSONMessage(t, w, http.StatusOK, "review deleted successfully")
	w = env.DoAuthRequest(http.MethodDelete, "/api/reviews/"+itoa(r.ReviewID), nil, athToken)
	RequireJSONError(t, w, http.StatusNotFound,
		"review not found. It may have been deleted or the ID is incorrect")
	if got := getReviews(t, env, trainerID); len(got) != 0 {
		t.Fatalf("reviews after delete = %+v, want empty", got)
	}
}

// ---------------------------------------------------------------------------
// Unauthenticated matrix
// ---------------------------------------------------------------------------

func TestE2E_Trainer_Unauthenticated(t *testing.T) {
	env := SetupTestEnv(t)

	routesTable := []struct {
		method string
		path   string
	}{
		{http.MethodPut, "/api/trainers/me/profile"},
		{http.MethodGet, "/api/trainers/me/profile"},
		{http.MethodGet, "/api/trainers/me/availability"},
		{http.MethodPut, "/api/trainers/me/availability"},
		{http.MethodDelete, "/api/trainers/me/availability/1"},
		{http.MethodPost, "/api/trainers/1/reviews"},
		{http.MethodPut, "/api/reviews/1"},
		{http.MethodDelete, "/api/reviews/1"},
	}

	for _, r := range routesTable {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			w := env.DoRequest(r.method, r.path, map[string]any{}, nil)
			RequireJSONError(t, w, http.StatusUnauthorized,
				"Authorization header is required. Please log in and include your Bearer token")

			w = env.DoRequest(r.method, r.path, map[string]any{}, map[string]string{"Authorization": "Basic abc"})
			RequireJSONError(t, w, http.StatusUnauthorized,
				"Invalid Authorization header. Expected format: Bearer <token>")

			w = env.DoRequest(r.method, r.path, map[string]any{}, map[string]string{"Authorization": "Bearer not.a.jwt"})
			RequireJSONError(t, w, http.StatusUnauthorized,
				"Your session token is invalid or expired. Please log in again")
		})
	}

	// The public catalog routes work with no token at all.
	for _, path := range []string{"/api/trainers", "/api/trainers/1", "/api/trainers/1/availability", "/api/trainers/1/reviews"} {
		w := env.DoRequest(http.MethodGet, path, nil, nil)
		if w.Code == http.StatusUnauthorized {
			t.Fatalf("GET %s unexpectedly requires auth", path)
		}
	}
}
