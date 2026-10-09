package models

import (
	"testing"

	domainerrors "gymtrack-backend/internal/domain/errors"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The library page picks its renderer from MediaType, so an unrecognised value
// would leave it unable to decide between <img>, <video>, and a placeholder.
func TestExerciseSetMedia_RejectsUnknownType(t *testing.T) {
	ex := NewExercise("Bench Press", "strength", 1, 1, 7)

	err := ex.SetMedia("https://example.com/x.gif", "webm")

	require.ErrorIs(t, err, domainerrors.ErrInvalidMedia)
	assert.Empty(t, ex.MediaURL, "a rejected media type must not leave a half-set URL behind")
	assert.Empty(t, ex.MediaType)
}

// An empty URL is a valid "no media" state, not an error: most of the catalog
// has no demonstration asset and must still be creatable.
func TestExerciseSetMedia_EmptyURLIsValid(t *testing.T) {
	ex := NewExercise("Plank", "strength", 1, 1, 7)

	require.NoError(t, ex.SetMedia("", ""))

	assert.Empty(t, ex.MediaURL)
	assert.Equal(t, MediaTypeGIF, ex.MediaType, "an omitted type must normalise to gif")
}

// The asset is fetched by the browser, so a relative path or a plain http:// URL
// would either 404 or be blocked as mixed content.
func TestExerciseSetMedia_RequiresAbsoluteHTTPS(t *testing.T) {
	for _, raw := range []string{
		"http://example.com/x.gif",
		"/local/x.gif",
		"x.gif",
		"//example.com/x.gif",
		"ftp://example.com/x.gif",
	} {
		t.Run(raw, func(t *testing.T) {
			ex := NewExercise("Bench Press", "strength", 1, 1, 7)

			err := ex.SetMedia(raw, MediaTypeGIF)

			require.ErrorIs(t, err, domainerrors.ErrInvalidMedia)
		})
	}
}

func TestExerciseSetMedia_AcceptsHTTPS(t *testing.T) {
	ex := NewExercise("Bench Press", "strength", 1, 1, 7)

	require.NoError(t, ex.SetMedia("https://example.com/x.gif", MediaTypeVideo))

	assert.Equal(t, "https://example.com/x.gif", ex.MediaURL)
	assert.Equal(t, MediaTypeVideo, ex.MediaType)
}

// Creating an exercise with a bad asset must fail before it is handed to the
// repository, otherwise the catalog gains a row the library page cannot render.
func TestNewExerciseWithMedia_InvalidMediaReturnsNoExercise(t *testing.T) {
	ex, err := NewExerciseWithMedia("Bench Press", "strength", 1, 1, 7, "not-a-url", MediaTypeGIF)

	require.ErrorIs(t, err, domainerrors.ErrInvalidMedia)
	assert.Nil(t, ex)
}

func TestNewExerciseWithMedia_ValidMedia(t *testing.T) {
	ex, err := NewExerciseWithMedia("Squat", "strength", 1, 1, 7,
		"https://example.com/squat.gif", MediaTypeGIF)

	require.NoError(t, err)
	require.NotNil(t, ex)
	assert.Equal(t, "Squat", ex.Name)
	assert.Equal(t, 7, ex.CreatedBy)
	assert.Equal(t, "https://example.com/squat.gif", ex.MediaURL)
	assert.Equal(t, MediaTypeGIF, ex.MediaType)
}
