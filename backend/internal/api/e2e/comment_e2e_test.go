package e2e

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"
)

// Exact error/message strings from comment_handler.go, comment_service.go
// and error_response.go — asserted verbatim so message drift fails loudly.
const (
	// ShouldBindJSON / binding-tag failures (create + update share it).
	commentBindMsg = "Invalid comment data. Please check the content and try again"
	// Handler-level ID parsing.
	commentTargetIDMsg = "Invalid target ID. Please check the workout or meal ID and try again"
	commentParentIDMsg = "Invalid parent comment ID. Please check the reply reference and try again"
	commentIDParamMsg  = "Invalid comment ID. Please check the URL and try again"
	// CommentService sentinels (err.Error() bodies via handleCommentServiceError).
	commentTargetNotFoundMsg = "the workout or meal you are commenting on was not found"
	commentAccessDeniedMsg   = "you don't have permission to comment on this workout or meal"
	commentNotAuthorMsg      = "only the author of this comment can edit or delete it"
	// Threading checks.
	commentParentMissingMsg  = "Parent comment not found. It may have been deleted"
	commentParentMismatchMsg = "This reply doesn't belong to the selected workout or meal. Please check and try again"
	// GET query parsing.
	commentGetParamsMsg  = "Please provide both targetType (workout or meal) and targetId"
	commentTargetTypeMsg = "Invalid target type. Must be \"workout\" or \"meal\""
	// handleInternalError fallback.
	commentInternalMsg = "Something went wrong while processing your request. Please try again later"
)

// commentPayload builds a valid create-comment body. targetId is a JSON
// string in CreateCommentRequest (parsed with strconv.Atoi in the handler).
func commentPayload(targetType string, targetID int, content string) map[string]any {
	return map[string]any{
		"targetType": targetType,
		"targetId":   itoa(targetID),
		"content":    content,
	}
}

// commentJSON mirrors the models.Comment JSON returned by create/update/list.
type commentJSON struct {
	Type            string  `json:"type"`
	CommentID       int     `json:"commentId"`
	TargetType      string  `json:"targetType"`
	TargetID        int     `json:"targetId"`
	AuthorID        int     `json:"authorId"`
	AuthorRole      string  `json:"authorRole"`
	Content         string  `json:"content"`
	ParentCommentID *int    `json:"parentCommentId"`
	CreatedAt       string  `json:"createdAt"`
	EditedAt        *string `json:"editedAt"`
}

// mustCreateCommentWorkout creates a workout owned by the token holder and
// returns its ID (comments need a real target).
func mustCreateCommentWorkout(t testing.TB, env *TestEnv, token, name string) int {
	t.Helper()
	exerciseID := createExerciseForWorkout(t, env, token, name)
	return mustCreateWorkout(t, env, token, exerciseID, name, time.Now().UTC())
}

// mustCreateComment posts a comment and returns the 201 body.
func mustCreateComment(t testing.TB, env *TestEnv, token, targetType string, targetID int, content string) commentJSON {
	t.Helper()
	w := env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload(targetType, targetID, content), token)
	RequireStatus(t, w, http.StatusCreated)
	var created commentJSON
	ParseJSON(t, w.Body.Bytes(), &created)
	if created.CommentID == 0 {
		t.Fatalf("expected non-zero commentId, body: %s", w.Body.String())
	}
	return created
}

// getComments fetches GET /api/comments for a target.
func getComments(t testing.TB, env *TestEnv, token, targetType string, targetID int) []commentJSON {
	t.Helper()
	w := env.DoAuthRequest(http.MethodGet,
		"/api/comments?targetType="+targetType+"&targetId="+itoa(targetID), nil, token)
	RequireStatus(t, w, http.StatusOK)
	var resp struct {
		Comments []commentJSON `json:"comments"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)
	return resp.Comments
}

// ---------------------------------------------------------------------------
// Create + read round-trips
// ---------------------------------------------------------------------------

func TestE2E_Comment_CreateAndGet_OwnAthlete(t *testing.T) {
	env := SetupTestEnv(t)
	token, userID := env.RegisterAthlete(t, "ccrud")
	workoutID := mustCreateCommentWorkout(t, env, token, "Commented Squat")

	// Create on a workout target
	created := mustCreateComment(t, env, token, "workout", workoutID, "Solid depth on every rep")
	if created.Type != "comment" {
		t.Errorf("expected type \"comment\", got %q", created.Type)
	}
	if created.TargetType != "workout" || created.TargetID != workoutID {
		t.Errorf("target mismatch: %+v", created)
	}
	if created.AuthorID != userID || created.AuthorRole != "athlete" {
		t.Errorf("author mismatch: %+v", created)
	}
	if created.Content != "Solid depth on every rep" {
		t.Errorf("content mismatch: %q", created.Content)
	}
	if created.ParentCommentID != nil {
		t.Errorf("expected top-level comment (nil parentCommentId), got %v", *created.ParentCommentID)
	}
	if created.CreatedAt == "" || created.EditedAt != nil {
		t.Errorf("expected createdAt set and editedAt nil before edit: %+v", created)
	}

	// Read back through the list endpoint
	comments := getComments(t, env, token, "workout", workoutID)
	if len(comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(comments))
	}
	if comments[0].CommentID != created.CommentID || comments[0].Content != created.Content {
		t.Errorf("list round-trip mismatch: %+v", comments[0])
	}

	// Meal target works the same way
	w := env.DoAuthRequest(http.MethodPost, "/api/meals", mealPayload("lunch"), token)
	RequireStatus(t, w, http.StatusCreated)
	var meal struct {
		MealID int `json:"mealId"`
	}
	ParseJSON(t, w.Body.Bytes(), &meal)

	mustCreateComment(t, env, token, "meal", meal.MealID, "Nice macro split")
	comments = getComments(t, env, token, "meal", meal.MealID)
	if len(comments) != 1 || comments[0].TargetType != "meal" {
		t.Fatalf("expected 1 meal comment, got %+v", comments)
	}
}

// ---------------------------------------------------------------------------
// Permissions: cross-athlete, trainer w/o relationship, admin
// ---------------------------------------------------------------------------

func TestE2E_Comment_AccessDenied(t *testing.T) {
	env := SetupTestEnv(t)
	ownerToken, _ := env.RegisterAthlete(t, "cowner")
	workoutID := mustCreateCommentWorkout(t, env, ownerToken, "Owned Bench")
	mustCreateComment(t, env, ownerToken, "workout", workoutID, "Owner comment")

	// Another athlete: neither create nor list on someone else's target
	otherToken, _ := env.RegisterAthlete(t, "cother")
	w := env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload("workout", workoutID, "hi"), otherToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	w = env.DoAuthRequest(http.MethodGet, "/api/comments?targetType=workout&targetId="+itoa(workoutID), nil, otherToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	// Trainer without an active relationship: same denial
	trainerToken, _ := env.RegisterTrainer(t, "ctrn")
	w = env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload("workout", workoutID, "hi"), trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	w = env.DoAuthRequest(http.MethodGet, "/api/comments?targetType=workout&targetId="+itoa(workoutID), nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	// Admin: CanAccessComments only admits athlete (owner) or trainer (with
	// relationship) — admin falls through to ErrAccessDenied. Admins moderate
	// comments via /api/admin/comments instead. Pinned so a future "admin can
	// do anything" change fails loudly.
	adminToken, _ := registerAdmin(t, env, "cadm")
	w = env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload("workout", workoutID, "hi"), adminToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	w = env.DoAuthRequest(http.MethodGet, "/api/comments?targetType=workout&targetId="+itoa(workoutID), nil, adminToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	// The owner is unaffected by all of the above
	comments := getComments(t, env, ownerToken, "workout", workoutID)
	if len(comments) != 1 {
		t.Fatalf("expected owner to still see 1 comment, got %d", len(comments))
	}
}

func TestE2E_Comment_TrainerWithRelationship(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, trainerID, athleteToken, athleteID, athleteUsername := newTrainerAthletePair(t, env, "crel")

	workoutID := mustCreateCommentWorkout(t, env, athleteToken, "Coached Row")
	mustCreateComment(t, env, athleteToken, "workout", workoutID, "Athlete first")

	// No relationship yet → denied
	w := env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload("workout", workoutID, "coach"), trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	establishRelationship(t, env, trainerToken, trainerID, athleteToken, athleteUsername)

	// Trainer can now comment; authorRole records the commenting side
	trainerComment := mustCreateComment(t, env, trainerToken, "workout", workoutID, "Add a pause at the bottom")
	if trainerComment.AuthorRole != "trainer" || trainerComment.AuthorID != trainerID {
		t.Errorf("expected authorRole trainer / authorID %d, got %+v", trainerID, trainerComment)
	}

	comments := getComments(t, env, trainerToken, "workout", workoutID)
	if len(comments) != 2 {
		t.Fatalf("expected 2 comments (athlete + trainer), got %d", len(comments))
	}
	// created_at ASC ordering
	if comments[0].AuthorRole != "athlete" || comments[1].AuthorRole != "trainer" {
		t.Errorf("expected athlete comment first, got %+v", comments)
	}

	// Terminated relationship revokes comment access immediately — the service
	// checks HasActiveRelationship, not mere row existence (cf. workout client
	// view). Terminate via SQL; DELETE /api/relationships/:id belongs to the
	// relationship suite.
	if _, err := env.DB.Exec(context.Background(),
		`UPDATE relationships SET status = 'terminated' WHERE trainer_id = $1 AND athlete_id = $2`,
		trainerID, athleteID); err != nil {
		t.Fatalf("failed to terminate relationship: %v", err)
	}

	w = env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload("workout", workoutID, "coach"), trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)

	w = env.DoAuthRequest(http.MethodGet, "/api/comments?targetType=workout&targetId="+itoa(workoutID), nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)
}

// ---------------------------------------------------------------------------
// Create validation
// ---------------------------------------------------------------------------

func TestE2E_Comment_CreateValidation(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "cval")
	workoutID := mustCreateCommentWorkout(t, env, token, "Validation Bench")

	t.Run("binding failures all share one message", func(t *testing.T) {
		// Every ShouldBindJSON failure (required/min/max tags) returns
		// commentBindMsg — the second handler branch ("Validation failed.
		// Please check the comment content (1-2000 characters) and try again")
		// is dead code: validator.New() reads `validate` tags, and the request
		// struct only carries `binding` tags.
		cases := []struct {
			name    string
			payload any
		}{
			{"missing targetType", map[string]any{"targetId": itoa(workoutID), "content": "x"}},
			{"missing targetId", map[string]any{"targetType": "workout", "content": "x"}},
			{"missing content", map[string]any{"targetType": "workout", "targetId": itoa(workoutID)}},
			{"empty content", commentPayload("workout", workoutID, "")},
			{"content over 2000 chars", commentPayload("workout", workoutID, strings.Repeat("a", 2001))},
			{"non-object body", "not-a-map"},
			{"targetId as JSON number", map[string]any{"targetType": "workout", "targetId": workoutID, "content": "x"}},
		}
		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				w := env.DoAuthRequest(http.MethodPost, "/api/comments", tc.payload, token)
				RequireJSONError(t, w, http.StatusBadRequest, commentBindMsg)
			})
		}
	})

	// 2000 chars exactly is the accepted boundary
	t.Run("content of exactly 2000 chars accepted", func(t *testing.T) {
		w := env.DoAuthRequest(http.MethodPost, "/api/comments",
			commentPayload("workout", workoutID, strings.Repeat("a", 2000)), token)
		RequireStatus(t, w, http.StatusCreated)
	})

	t.Run("non-numeric targetId", func(t *testing.T) {
		w := env.DoAuthRequest(http.MethodPost, "/api/comments",
			map[string]any{"targetType": "workout", "targetId": "abc", "content": "x"}, token)
		RequireJSONError(t, w, http.StatusBadRequest, commentTargetIDMsg)
	})

	t.Run("non-numeric parentCommentId", func(t *testing.T) {
		w := env.DoAuthRequest(http.MethodPost, "/api/comments",
			map[string]any{"targetType": "workout", "targetId": itoa(workoutID), "content": "x", "parentCommentId": "abc"}, token)
		RequireJSONError(t, w, http.StatusBadRequest, commentParentIDMsg)
	})

	t.Run("empty parentCommentId is treated as top-level", func(t *testing.T) {
		w := env.DoAuthRequest(http.MethodPost, "/api/comments",
			map[string]any{"targetType": "workout", "targetId": itoa(workoutID), "content": "x", "parentCommentId": ""}, token)
		RequireStatus(t, w, http.StatusCreated)
		var c commentJSON
		ParseJSON(t, w.Body.Bytes(), &c)
		if c.ParentCommentID != nil {
			t.Errorf("expected nil parentCommentId for empty string, got %v", *c.ParentCommentID)
		}
	})

	t.Run("nonexistent target 404", func(t *testing.T) {
		w := env.DoAuthRequest(http.MethodPost, "/api/comments", commentPayload("workout", 999999, "x"), token)
		RequireJSONError(t, w, http.StatusNotFound, commentTargetNotFoundMsg)
	})

	// WART pinned: POST never validates the targetType enum (binding tag is
	// only `required`), so an unknown type reaches ResolveTargetAthlete's
	// default branch, which returns a plain fmt.Errorf — not a sentinel — and
	// handleCommentServiceError maps it to 500. GET validates the same input
	// up front and returns 400 (asserted in TestE2E_Comment_GetValidation).
	t.Run("invalid targetType is 500 not 400", func(t *testing.T) {
		w := env.DoAuthRequest(http.MethodPost, "/api/comments",
			map[string]any{"targetType": "banana", "targetId": itoa(workoutID), "content": "x"}, token)
		RequireJSONError(t, w, http.StatusInternalServerError, commentInternalMsg)
	})
}

// ---------------------------------------------------------------------------
// GET query validation
// ---------------------------------------------------------------------------

func TestE2E_Comment_GetValidation(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "cgetv")
	workoutID := mustCreateCommentWorkout(t, env, token, "Get Validation")

	cases := []struct {
		name    string
		query   string
		status  int
		message string
	}{
		{"no params", "", http.StatusBadRequest, commentGetParamsMsg},
		{"missing targetId", "?targetType=workout", http.StatusBadRequest, commentGetParamsMsg},
		{"missing targetType", "?targetId=" + itoa(workoutID), http.StatusBadRequest, commentGetParamsMsg},
		{"non-numeric targetId", "?targetType=workout&targetId=abc", http.StatusBadRequest, commentTargetIDMsg},
		// GET validates the enum before touching the DB — unlike POST (500).
		{"invalid targetType", "?targetType=banana&targetId=1", http.StatusBadRequest, commentTargetTypeMsg},
		{"nonexistent target", "?targetType=workout&targetId=999999", http.StatusNotFound, commentTargetNotFoundMsg},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := env.DoAuthRequest(http.MethodGet, "/api/comments"+tc.query, nil, token)
			RequireJSONError(t, w, tc.status, tc.message)
		})
	}

	// Happy path still works after all the rejects
	w := env.DoAuthRequest(http.MethodGet, "/api/comments?targetType=workout&targetId="+itoa(workoutID), nil, token)
	RequireStatus(t, w, http.StatusOK)
}

// ---------------------------------------------------------------------------
// Threading (parentCommentId)
// ---------------------------------------------------------------------------

func TestE2E_Comment_Threading(t *testing.T) {
	env := SetupTestEnv(t)
	token, _ := env.RegisterAthlete(t, "cthread")
	workoutID := mustCreateCommentWorkout(t, env, token, "Threaded OHP")
	otherWorkoutID := mustCreateCommentWorkout(t, env, token, "Threaded OHP 2")

	parent := mustCreateComment(t, env, token, "workout", workoutID, "Top level")

	// Reply on the same target
	w := env.DoAuthRequest(http.MethodPost, "/api/comments",
		map[string]any{"targetType": "workout", "targetId": itoa(workoutID),
			"content": "Reply", "parentCommentId": itoa(parent.CommentID)}, token)
	RequireStatus(t, w, http.StatusCreated)
	var reply commentJSON
	ParseJSON(t, w.Body.Bytes(), &reply)
	if reply.ParentCommentID == nil || *reply.ParentCommentID != parent.CommentID {
		t.Fatalf("expected parentCommentId %d, body: %s", parent.CommentID, w.Body.String())
	}

	comments := getComments(t, env, token, "workout", workoutID)
	if len(comments) != 2 {
		t.Fatalf("expected 2 comments, got %d", len(comments))
	}
	if comments[0].ParentCommentID != nil || comments[1].ParentCommentID == nil {
		t.Errorf("expected [top-level, reply], got %+v", comments)
	}

	// Parent does not exist
	w = env.DoAuthRequest(http.MethodPost, "/api/comments",
		map[string]any{"targetType": "workout", "targetId": itoa(workoutID),
			"content": "Orphan", "parentCommentId": "999999"}, token)
	RequireJSONError(t, w, http.StatusBadRequest, commentParentMissingMsg)

	// Parent belongs to a different target
	w = env.DoAuthRequest(http.MethodPost, "/api/comments",
		map[string]any{"targetType": "workout", "targetId": itoa(otherWorkoutID),
			"content": "Wrong thread", "parentCommentId": itoa(parent.CommentID)}, token)
	RequireJSONError(t, w, http.StatusBadRequest, commentParentMismatchMsg)

	// Parent check happens after permission: another athlete cannot even probe
	// parent validity — gets plain access denial
	otherToken, _ := env.RegisterAthlete(t, "cthread2")
	w = env.DoAuthRequest(http.MethodPost, "/api/comments",
		map[string]any{"targetType": "workout", "targetId": itoa(workoutID),
			"content": "probe", "parentCommentId": "999999"}, otherToken)
	RequireJSONError(t, w, http.StatusForbidden, commentAccessDeniedMsg)
}

// ---------------------------------------------------------------------------
// Update: author-only, validation order, error bodies
// ---------------------------------------------------------------------------

func TestE2E_Comment_UpdateAuthorOnly(t *testing.T) {
	env := SetupTestEnv(t)
	authorToken, _ := env.RegisterAthlete(t, "cupd")
	otherToken, _ := env.RegisterAthlete(t, "cupd2")
	workoutID := mustCreateCommentWorkout(t, env, authorToken, "Editable Bench")

	target := mustCreateComment(t, env, authorToken, "workout", workoutID, "original")

	// Author edits: content changes, editedAt gets set, persists on read-back
	w := env.DoAuthRequest(http.MethodPut, "/api/comments/"+itoa(target.CommentID),
		map[string]any{"content": "updated"}, authorToken)
	RequireStatus(t, w, http.StatusOK)
	var updated commentJSON
	ParseJSON(t, w.Body.Bytes(), &updated)
	if updated.Content != "updated" {
		t.Errorf("expected content \"updated\", got %q", updated.Content)
	}
	if updated.EditedAt == nil {
		t.Error("expected editedAt to be set after update")
	}
	comments := getComments(t, env, authorToken, "workout", workoutID)
	if len(comments) != 1 || comments[0].Content != "updated" {
		t.Errorf("expected persisted update in list, got %+v", comments)
	}

	// Non-author is rejected — even with an invalid body: permission is
	// checked before ShouldBindJSON in UpdateComment.
	w = env.DoAuthRequest(http.MethodPut, "/api/comments/"+itoa(target.CommentID),
		map[string]any{"content": "hijack"}, otherToken)
	RequireJSONError(t, w, http.StatusForbidden, commentNotAuthorMsg)

	w = env.DoAuthRequest(http.MethodPut, "/api/comments/"+itoa(target.CommentID),
		map[string]any{}, otherToken)
	RequireJSONError(t, w, http.StatusForbidden, commentNotAuthorMsg)

	// Author with an invalid body reaches the binding check
	w = env.DoAuthRequest(http.MethodPut, "/api/comments/"+itoa(target.CommentID),
		map[string]any{}, authorToken)
	RequireJSONError(t, w, http.StatusBadRequest, commentBindMsg)

	w = env.DoAuthRequest(http.MethodPut, "/api/comments/"+itoa(target.CommentID),
		map[string]any{"content": strings.Repeat("b", 2001)}, authorToken)
	RequireJSONError(t, w, http.StatusBadRequest, commentBindMsg)

	// Bad path ID
	w = env.DoAuthRequest(http.MethodPut, "/api/comments/abc", map[string]any{"content": "x"}, authorToken)
	RequireJSONError(t, w, http.StatusBadRequest, commentIDParamMsg)

	// WART pinned: a nonexistent commentID fails CanEditOrDeleteComment with
	// ErrTargetNotFound, whose text talks about "the workout or meal you are
	// commenting on" — wrong entity, but that is the shipped contract. The
	// correct "Comment not found. It may have been deleted" branch further
	// down is unreachable (the comment was already proven to exist above).
	w = env.DoAuthRequest(http.MethodPut, "/api/comments/999999", map[string]any{"content": "x"}, authorToken)
	RequireJSONError(t, w, http.StatusNotFound, commentTargetNotFoundMsg)
}

// ---------------------------------------------------------------------------
// Delete: author-only, error bodies
// ---------------------------------------------------------------------------

func TestE2E_Comment_DeleteAuthorOnly(t *testing.T) {
	env := SetupTestEnv(t)
	authorToken, _ := env.RegisterAthlete(t, "cdel")
	otherToken, _ := env.RegisterAthlete(t, "cdel2")
	workoutID := mustCreateCommentWorkout(t, env, authorToken, "Deletable Press")

	first := mustCreateComment(t, env, authorToken, "workout", workoutID, "keep me")
	second := mustCreateComment(t, env, authorToken, "workout", workoutID, "delete me")

	// Non-author cannot delete
	w := env.DoAuthRequest(http.MethodDelete, "/api/comments/"+itoa(second.CommentID), nil, otherToken)
	RequireJSONError(t, w, http.StatusForbidden, commentNotAuthorMsg)

	// Bad path ID
	w = env.DoAuthRequest(http.MethodDelete, "/api/comments/abc", nil, authorToken)
	RequireJSONError(t, w, http.StatusBadRequest, commentIDParamMsg)

	// Author deletes; the surviving comment stays put
	w = env.DoAuthRequest(http.MethodDelete, "/api/comments/"+itoa(second.CommentID), nil, authorToken)
	RequireJSONMessage(t, w, http.StatusOK, "Comment deleted")

	comments := getComments(t, env, authorToken, "workout", workoutID)
	if len(comments) != 1 || comments[0].CommentID != first.CommentID {
		t.Fatalf("expected only comment %d to remain, got %+v", first.CommentID, comments)
	}

	// Double delete → 404 (same ErrTargetNotFound wart as update)
	w = env.DoAuthRequest(http.MethodDelete, "/api/comments/"+itoa(second.CommentID), nil, authorToken)
	RequireJSONError(t, w, http.StatusNotFound, commentTargetNotFoundMsg)

	// Nonexistent ID directly
	w = env.DoAuthRequest(http.MethodDelete, "/api/comments/999999", nil, authorToken)
	RequireJSONError(t, w, http.StatusNotFound, commentTargetNotFoundMsg)
}

// ---------------------------------------------------------------------------
// Authentication: all four routes behind the JWT middleware
// ---------------------------------------------------------------------------

func TestE2E_Comment_Unauthenticated(t *testing.T) {
	env := SetupTestEnv(t)

	routes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/comments"},
		{http.MethodGet, "/api/comments"},
		{http.MethodPut, "/api/comments/1"},
		{http.MethodDelete, "/api/comments/1"},
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
