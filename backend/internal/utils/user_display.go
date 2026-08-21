package utils

import "gymtrack-backend/internal/domain/models"

// DisplayName returns the user's display name. For non-active users (deleted, suspended, banned),
// returns "Deleted user" to anonymize their identity in public-facing responses.
func DisplayName(user *models.User) string {
	if user == nil {
		return "Deleted user"
	}
	if user.Status != models.UserStatusActive {
		return "Deleted user"
	}
	if user.Profile.Name != "" {
		return user.Profile.Name
	}
	return user.Username
}
