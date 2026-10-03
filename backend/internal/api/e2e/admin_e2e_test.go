package e2e

import (
	"context"
	"net/http"
	"testing"
)

// promoteToAdmin promotes a user to admin directly in the DB — registration
// only accepts trainer|athlete (binding oneof), so tests must promote a
// registered user. The promotion must happen BEFORE login so the issued JWT
// carries the admin role (AdminOnlyMiddleware reads claims.Role).
func promoteToAdmin(t testing.TB, env *TestEnv, userID int) {
	t.Helper()
	if _, err := env.DB.Exec(context.Background(),
		`UPDATE users SET role = 'admin' WHERE user_id = $1`, userID); err != nil {
		t.Fatalf("failed to promote user %d to admin: %v", userID, err)
	}
}

// registerAdmin registers a user, promotes it to admin and logs in.
// Returns the admin access token and user ID.
func registerAdmin(t testing.TB, env *TestEnv, suffix string) (string, int) {
	t.Helper()
	_, email, userID := env.RegisterUser(t, "adm"+suffix, "adm"+suffix+"@e2e.test", "Password123!", "athlete")
	promoteToAdmin(t, env, userID)
	token, _ := env.Login(t, email, "Password123!")
	return token, userID
}

// adminRoutes lists every route registered under /api/admin (10 total) for
// the non-admin access matrix.
var adminRoutes = []struct {
	method string
	path   string
}{
	{http.MethodGet, "/api/admin/stats"},
	{http.MethodGet, "/api/admin/users"},
	{http.MethodGet, "/api/admin/users/1"},
	{http.MethodPut, "/api/admin/users/1/role"},
	{http.MethodPut, "/api/admin/users/1/status"},
	{http.MethodGet, "/api/admin/comments"},
	{http.MethodDelete, "/api/admin/comments/1"},
	{http.MethodPut, "/api/admin/exercises/1/verify"},
	{http.MethodDelete, "/api/admin/exercises/1"},
	{http.MethodPut, "/api/admin/profile/password"},
}

func TestE2E_Admin_NonAdminForbidden(t *testing.T) {
	env := SetupTestEnv(t)
	trainerToken, _ := env.RegisterTrainer(t, "admntr")
	athleteToken, _ := env.RegisterAthlete(t, "admnat")

	// Every admin route must reject trainer and athlete with 403
	// (AdminOnlyMiddleware aborts before the handlers run).
	for _, r := range adminRoutes {
		w := env.DoAuthRequest(r.method, r.path, map[string]any{}, trainerToken)
		RequireStatus(t, w, http.StatusForbidden)
		w = env.DoAuthRequest(r.method, r.path, map[string]any{}, athleteToken)
		RequireStatus(t, w, http.StatusForbidden)
	}

	// Exact middleware error contract on a representative route
	w := env.DoAuthRequest(http.MethodGet, "/api/admin/stats", nil, trainerToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Admin access is required. You don't have permission to perform this action")

	// Unauthenticated → 401 from the JWT middleware
	w = env.DoRequest(http.MethodGet, "/api/admin/stats", nil, nil)
	RequireStatus(t, w, http.StatusUnauthorized)
}

func TestE2E_Admin_UsersListAndDetail(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, _ := registerAdmin(t, env, "lst")
	trainerUsername, _, trainerID := env.RegisterUser(t, "adtrn", "adtrn@e2e.test", "Password123!", "trainer")
	athleteUsername, _, _ := env.RegisterUser(t, "adath", "adath@e2e.test", "Password123!", "athlete")

	// Full list: admin + trainer + athlete
	w := env.DoAuthRequest(http.MethodGet, "/api/admin/users", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Users []struct {
			UserID   int    `json:"userId"`
			Username string `json:"username"`
			Role     string `json:"role"`
		} `json:"users"`
		Total  int `json:"total"`
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 3 || len(list.Users) != 3 {
		t.Fatalf("expected 3 users (total 3), got len=%d total=%d", len(list.Users), list.Total)
	}
	if list.Limit != 25 || list.Offset != 0 {
		t.Fatalf("expected default limit 25 / offset 0, got %d / %d", list.Limit, list.Offset)
	}

	// Role filter
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/users?role=trainer", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 1 || len(list.Users) != 1 || list.Users[0].Role != "trainer" {
		t.Fatalf("expected exactly 1 trainer, got total=%d len=%d %+v", list.Total, len(list.Users), list.Users)
	}

	// Search by username
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/users?search="+athleteUsername, nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 1 || list.Users[0].Username != athleteUsername {
		t.Fatalf("expected exactly 1 match for %q, got total=%d %+v", athleteUsername, list.Total, list.Users)
	}

	// Pagination: limit=1 keeps total but returns a single row
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/users?limit=1", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if len(list.Users) != 1 || list.Total != 3 || list.Limit != 1 {
		t.Fatalf("expected len=1 total=3 limit=1, got len=%d total=%d limit=%d", len(list.Users), list.Total, list.Limit)
	}

	// Detail by ID
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/users/"+itoa(trainerID), nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var detail struct {
		UserID   int    `json:"userId"`
		Username string `json:"username"`
		Role     string `json:"role"`
	}
	ParseJSON(t, w.Body.Bytes(), &detail)
	if detail.UserID != trainerID || detail.Username != trainerUsername || detail.Role != "trainer" {
		t.Fatalf("unexpected detail response: %s", w.Body.String())
	}

	// Non-numeric ID → 400; unknown ID → 404
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/users/abc", nil, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/users/999999", nil, adminToken)
	RequireJSONError(t, w, http.StatusNotFound, "User not found. It may have been deleted or the ID is incorrect.")
}

func TestE2E_Admin_DashboardStats(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, _ := registerAdmin(t, env, "st")
	env.RegisterTrainer(t, "sttr")
	env.RegisterAthlete(t, "stat")

	w := env.DoAuthRequest(http.MethodGet, "/api/admin/stats", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var stats struct {
		TotalUsers        int `json:"totalUsers"`
		TotalTrainers     int `json:"totalTrainers"`
		TotalAthletes     int `json:"totalAthletes"`
		NewUsersToday     int `json:"newUsersToday"`
		NewUsersThisWeek  int `json:"newUsersThisWeek"`
		NewUsersThisMonth int `json:"newUsersThisMonth"`
		TotalWorkouts     int `json:"totalWorkouts"`
		TotalMeals        int `json:"totalMeals"`
	}
	ParseJSON(t, w.Body.Bytes(), &stats)
	if stats.TotalUsers != 3 {
		t.Fatalf("expected totalUsers 3, got %d", stats.TotalUsers)
	}
	if stats.TotalTrainers != 1 || stats.TotalAthletes != 1 {
		t.Fatalf("expected 1 trainer + 1 athlete, got %d / %d", stats.TotalTrainers, stats.TotalAthletes)
	}
	if stats.NewUsersToday != 3 || stats.NewUsersThisWeek != 3 || stats.NewUsersThisMonth != 3 {
		t.Fatalf("expected all 3 users counted as new today/week/month, got %d/%d/%d",
			stats.NewUsersToday, stats.NewUsersThisWeek, stats.NewUsersThisMonth)
	}
	if stats.TotalWorkouts != 0 || stats.TotalMeals != 0 {
		t.Fatalf("expected 0 workouts/meals in a fresh DB, got %d/%d", stats.TotalWorkouts, stats.TotalMeals)
	}
}

func TestE2E_Admin_UpdateUserRole(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, adminID := registerAdmin(t, env, "rol")
	_, _, athleteID := env.RegisterUser(t, "adrole", "adrole@e2e.test", "Password123!", "athlete")

	getRole := func() string {
		t.Helper()
		w := env.DoAuthRequest(http.MethodGet, "/api/admin/users/"+itoa(athleteID), nil, adminToken)
		RequireStatus(t, w, http.StatusOK)
		var d struct {
			Role string `json:"role"`
		}
		ParseJSON(t, w.Body.Bytes(), &d)
		return d.Role
	}

	// Promote athlete → trainer, verify persisted
	w := env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/role",
		map[string]any{"role": "trainer"}, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var msg struct {
		Message string `json:"message"`
	}
	ParseJSON(t, w.Body.Bytes(), &msg)
	if msg.Message != "Role updated successfully" {
		t.Fatalf("unexpected message: %q", msg.Message)
	}
	if r := getRole(); r != "trainer" {
		t.Fatalf("expected role trainer after update, got %q", r)
	}

	// Promote athlete → admin, verify persisted
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/role",
		map[string]any{"role": "admin"}, adminToken)
	RequireStatus(t, w, http.StatusOK)
	if r := getRole(); r != "admin" {
		t.Fatalf("expected role admin after update, got %q", r)
	}

	// Admin cannot change their own role
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(adminID)+"/role",
		map[string]any{"role": "athlete"}, adminToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"You cannot change your own role. Ask another admin to change it for you")

	// Invalid role value (binding: oneof=trainer athlete admin)
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/role",
		map[string]any{"role": "superuser"}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)

	// Missing role field
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/role",
		map[string]any{}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)

	// Unknown target user → 404; non-numeric ID → 400
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/999999/role",
		map[string]any{"role": "trainer"}, adminToken)
	RequireJSONError(t, w, http.StatusNotFound, "User not found. It may have been deleted or the ID is incorrect.")
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/abc/role",
		map[string]any{"role": "trainer"}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_Admin_UpdateUserStatus(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, adminID := registerAdmin(t, env, "sta")
	athleteToken, athleteID := env.RegisterAthlete(t, "adsta")

	// Suspend the athlete
	w := env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/status",
		map[string]any{"status": "suspended"}, adminToken)
	RequireStatus(t, w, http.StatusOK)

	// The suspended athlete is blocked by the JWT middleware on any protected route
	w = env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, athleteToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Your account is suspended and can't access the app right now. Please contact support")

	// Ban → same block with "banned"
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/status",
		map[string]any{"status": "banned"}, adminToken)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, athleteToken)
	RequireJSONError(t, w, http.StatusForbidden,
		"Your account is banned and can't access the app right now. Please contact support")

	// Reactivate → access restored
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/status",
		map[string]any{"status": "active"}, adminToken)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, athleteToken)
	RequireStatus(t, w, http.StatusOK)

	// Last-admin protection: the only admin cannot suspend itself
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(adminID)+"/status",
		map[string]any{"status": "suspended"}, adminToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"You cannot suspend or ban the last admin. Promote another user to admin first")

	// Invalid status value (binding: oneof=active suspended banned — "deleted" is rejected)
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/"+itoa(athleteID)+"/status",
		map[string]any{"status": "deleted"}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)

	// Unknown target → 404; non-numeric ID → 400
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/999999/status",
		map[string]any{"status": "suspended"}, adminToken)
	RequireJSONError(t, w, http.StatusNotFound, "User not found. It may have been deleted or the ID is incorrect.")
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/users/abc/status",
		map[string]any{"status": "suspended"}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_Admin_CommentsModeration(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, _ := registerAdmin(t, env, "cmt")
	athleteToken, athleteID := env.RegisterAthlete(t, "adcmt")

	// Seed a comment through the public API: exercise → workout → comment
	exerciseID := createExerciseForWorkout(t, env, athleteToken, "Admin Curl")
	w := env.DoAuthRequest(http.MethodPost, "/api/workouts", workoutPayload(exerciseID), athleteToken)
	RequireStatus(t, w, http.StatusCreated)
	var created struct {
		WorkoutID int `json:"workoutId"`
	}
	ParseJSON(t, w.Body.Bytes(), &created)

	w = env.DoAuthRequest(http.MethodPost, "/api/comments", map[string]any{
		"targetType": "workout",
		"targetId":   itoa(created.WorkoutID),
		"content":    "please review my form",
	}, athleteToken)
	RequireStatus(t, w, http.StatusCreated)

	// Admin lists all comments
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/comments", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var list struct {
		Comments []struct {
			CommentID  int    `json:"commentId"`
			TargetType string `json:"targetType"`
			TargetID   int    `json:"targetId"`
			AuthorID   int    `json:"authorId"`
			AuthorRole string `json:"authorRole"`
			Content    string `json:"content"`
		} `json:"comments"`
		Total int `json:"total"`
	}
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 1 || len(list.Comments) != 1 {
		t.Fatalf("expected 1 comment, got total=%d len=%d", list.Total, len(list.Comments))
	}
	c := list.Comments[0]
	if c.TargetType != "workout" || c.TargetID != created.WorkoutID ||
		c.AuthorID != athleteID || c.Content != "please review my form" {
		t.Fatalf("unexpected comment fields: %+v", c)
	}
	commentID := c.CommentID

	// targetType filter
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/comments?targetType=workout", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 1 {
		t.Fatalf("expected total 1 for targetType=workout, got %d", list.Total)
	}
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/comments?targetType=meal", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 0 {
		t.Fatalf("expected total 0 for targetType=meal, got %d", list.Total)
	}

	// Force-delete the comment (admin bypasses ownership)
	w = env.DoAuthRequest(http.MethodDelete, "/api/admin/comments/"+itoa(commentID), nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoAuthRequest(http.MethodGet, "/api/admin/comments", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &list)
	if list.Total != 0 {
		t.Fatalf("expected 0 comments after delete, got %d", list.Total)
	}

	// Deleting again → 404; non-numeric ID → 400
	w = env.DoAuthRequest(http.MethodDelete, "/api/admin/comments/"+itoa(commentID), nil, adminToken)
	RequireJSONError(t, w, http.StatusNotFound, "Comment not found. It may have already been deleted")
	w = env.DoAuthRequest(http.MethodDelete, "/api/admin/comments/abc", nil, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_Admin_ExerciseModeration(t *testing.T) {
	env := SetupTestEnv(t)
	adminToken, _ := registerAdmin(t, env, "ex")
	athleteToken, _ := env.RegisterAthlete(t, "adex")
	exerciseID := createExerciseForWorkout(t, env, athleteToken, "Admin Press")

	// Verify the exercise and confirm the flag persists (public catalog read)
	w := env.DoAuthRequest(http.MethodPut, "/api/admin/exercises/"+itoa(exerciseID)+"/verify", nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var msg struct {
		Message string `json:"message"`
	}
	ParseJSON(t, w.Body.Bytes(), &msg)
	if msg.Message != "Exercise verified successfully" {
		t.Fatalf("unexpected message: %q", msg.Message)
	}
	w = env.DoRequest(http.MethodGet, "/api/exercises/"+itoa(exerciseID), nil, nil)
	RequireStatus(t, w, http.StatusOK)
	var ex struct {
		ExerciseID int  `json:"exerciseId"`
		IsVerified bool `json:"isVerified"`
	}
	ParseJSON(t, w.Body.Bytes(), &ex)
	if !ex.IsVerified {
		t.Fatalf("expected isVerified=true after admin verify, body: %s", w.Body.String())
	}

	// Force-delete the exercise
	w = env.DoAuthRequest(http.MethodDelete, "/api/admin/exercises/"+itoa(exerciseID), nil, adminToken)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoRequest(http.MethodGet, "/api/exercises/"+itoa(exerciseID), nil, nil)
	RequireStatus(t, w, http.StatusNotFound)

	// Deleting again → 404 with the exercise-specific message
	w = env.DoAuthRequest(http.MethodDelete, "/api/admin/exercises/"+itoa(exerciseID), nil, adminToken)
	RequireJSONError(t, w, http.StatusNotFound, "Exercise not found. It may have already been deleted")

	// Verify a nonexistent exercise → 404 (note: service currently returns the
	// generic USER_NOT_FOUND sentinel for verify-misses, so only the status is
	// asserted here rather than enshrining the mismatched message)
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/exercises/999999/verify", nil, adminToken)
	RequireStatus(t, w, http.StatusNotFound)

	// Non-numeric IDs → 400
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/exercises/abc/verify", nil, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)
	w = env.DoAuthRequest(http.MethodDelete, "/api/admin/exercises/abc", nil, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_Admin_ChangePassword(t *testing.T) {
	env := SetupTestEnv(t)
	_, email, adminID := env.RegisterUser(t, "adpw", "adpw@e2e.test", "Password123!", "athlete")
	promoteToAdmin(t, env, adminID)
	adminToken, _ := env.Login(t, email, "Password123!")

	// Wrong old password → 400
	w := env.DoAuthRequest(http.MethodPut, "/api/admin/profile/password", map[string]any{
		"oldPassword": "WrongPass1!", "newPassword": "NewPass456!",
	}, adminToken)
	RequireJSONError(t, w, http.StatusBadRequest,
		"The current password you entered is incorrect. Please try again")

	// New password below the min=8 binding → 400
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/profile/password", map[string]any{
		"oldPassword": "Password123!", "newPassword": "short",
	}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)

	// Missing fields → 400
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/profile/password", map[string]any{}, adminToken)
	RequireStatus(t, w, http.StatusBadRequest)

	// Successful change
	w = env.DoAuthRequest(http.MethodPut, "/api/admin/profile/password", map[string]any{
		"oldPassword": "Password123!", "newPassword": "NewPass456!",
	}, adminToken)
	RequireStatus(t, w, http.StatusOK)
	var msg struct {
		Message string `json:"message"`
	}
	ParseJSON(t, w.Body.Bytes(), &msg)
	if msg.Message != "Password changed successfully" {
		t.Fatalf("unexpected message: %q", msg.Message)
	}

	// Old password no longer works, new password does
	w = env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": email, "password": "Password123!",
	}, nil)
	RequireStatus(t, w, http.StatusUnauthorized)
	w = env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": email, "password": "NewPass456!",
	}, nil)
	RequireStatus(t, w, http.StatusOK)
}
