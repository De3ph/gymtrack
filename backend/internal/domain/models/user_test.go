package models

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// models.User is serialized directly by many handlers (public trainer catalog,
// relationships, coaching requests, admin user lists). The password hash is a
// bcrypt digest, so it must be redacted at the type level rather than relying on
// every one of those call sites to remember to strip it.
func TestUser_MarshalJSONOmitsPasswordHash(t *testing.T) {
	user := &User{
		UserID:       1,
		Username:     "coach",
		Email:        "coach@example.com",
		PasswordHash: "$2a$10$superSecretBcryptDigest",
		Role:         RoleTrainer,
		Status:       UserStatusActive,
	}

	data, err := json.Marshal(user)
	require.NoError(t, err)

	assert.NotContains(t, string(data), "passwordHash")
	assert.NotContains(t, string(data), "$2a$10$")
	// The field must be genuinely dropped, not blanked to "".
	assert.False(t, strings.Contains(string(data), `"passwordHash":""`))
}

// TrainerWithProfile embeds User, so the embedded field is promoted into the
// outer struct's JSON. The unauthenticated catalog routes serialize this type.
func TestTrainerWithProfile_MarshalJSONOmitsPasswordHash(t *testing.T) {
	trainer := &TrainerWithProfile{
		User: User{
			UserID:       7,
			Username:     "trainer1",
			Email:        "trainer1@example.com",
			PasswordHash: "$2a$10$anotherSecretDigest",
			Role:         RoleTrainer,
			Status:       UserStatusActive,
		},
		TrainerProfile: TrainerProfile{Bio: "Strength coach"},
		AverageRating:  4.5,
		ReviewCount:    2,
	}

	data, err := json.Marshal(trainer)
	require.NoError(t, err)

	assert.NotContains(t, string(data), "passwordHash")
	assert.NotContains(t, string(data), "$2a$10$")
	// Guard against over-redacting: the public fields must still be present.
	assert.Contains(t, string(data), `"username":"trainer1"`)
	assert.Contains(t, string(data), `"averageRating":4.5`)
	assert.Contains(t, string(data), `"bio":"Strength coach"`)
}

// Redaction is a marshalling concern only: the hash must remain readable by the
// auth and password-reset services, which operate on the model directly.
func TestUser_PasswordHashRemainsAccessibleInGo(t *testing.T) {
	user := &User{PasswordHash: "$2a$10$readableInGo"}

	assert.Equal(t, "$2a$10$readableInGo", user.PasswordHash)
}
