package models

import (
	"fmt"
	"net/url"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
)

type Exercise struct {
	ExerciseID    int       `json:"exerciseId" example:"1"`
	Name          string    `json:"name" validate:"required"`
	Category      string    `json:"category"` // strength, cardio, flexibility
	MuscleGroupID int       `json:"muscleGroupId" example:"1"`
	EquipmentID   int       `json:"equipmentId" example:"1"`
	Instructions  string    `json:"instructions"`
	CreatedBy     int       `json:"createdBy,omitempty" example:"1"` // athlete ID for custom exercises
	IsVerified    bool      `json:"isVerified"`
	CreatedAt     time.Time `json:"createdAt"`

	// MediaURL points at a demonstration asset (GIF, MP4, or still image) served
	// over https. Empty means the exercise has no media and the UI renders a
	// placeholder instead of a broken frame.
	MediaURL string `json:"mediaUrl,omitempty"`
	// MediaType selects the renderer: gif | video | image. Defaults to gif.
	MediaType string `json:"mediaType" example:"gif"`
}

// Recognised values for Exercise.MediaType. The renderer the frontend picks is
// driven by this column, so an unknown value would leave the page unable to
// decide between <img>, <video>, and a placeholder.
const (
	MediaTypeGIF   = "gif"
	MediaTypeVideo = "video"
	MediaTypeImage = "image"
)

// NewExerciseWithMedia creates a custom exercise that carries its own
// demonstration asset. MediaType is normalised (empty means gif) and validated
// before the row is written, so the catalog cannot end up holding a row the
// exercise library page is unable to render.
func NewExerciseWithMedia(name, category string, muscleGroupID, equipmentID, createdBy int, mediaURL, mediaType string) (*Exercise, error) {
	exercise := NewExercise(name, category, muscleGroupID, equipmentID, createdBy)
	if err := exercise.SetMedia(mediaURL, mediaType); err != nil {
		return nil, err
	}
	return exercise, nil
}

// SetMedia attaches (or clears) the demonstration asset for this exercise.
// An empty URL is a valid "no media" state. A non-empty URL must be absolute
// https: the asset is fetched by the browser, so a relative path or a plain
// http:// URL would either 404 or be blocked as mixed content.
func (e *Exercise) SetMedia(mediaURL, mediaType string) error {
	if mediaType == "" {
		mediaType = MediaTypeGIF
	}
	switch mediaType {
	case MediaTypeGIF, MediaTypeVideo, MediaTypeImage:
	default:
		// Wrapped so the handler can tell "the caller sent nonsense" apart from a
		// genuine server fault with errors.Is, instead of matching error text.
		return fmt.Errorf("%w: unsupported type %q", domainerrors.ErrInvalidMedia, mediaType)
	}

	if mediaURL != "" {
		parsed, err := url.Parse(mediaURL)
		if err != nil || !parsed.IsAbs() || parsed.Scheme != "https" || parsed.Host == "" {
			return fmt.Errorf("%w: url must be absolute https", domainerrors.ErrInvalidMedia)
		}
	}

	e.MediaURL = mediaURL
	e.MediaType = mediaType
	return nil
}

type ExerciseSet struct {
	SetID      string     `json:"setId"`
	Type       SetType    `json:"setType" validate:"omitempty,oneof=warmup working backoff drop"`
	Weight     float64    `json:"weight" validate:"gte=0"`
	WeightUnit WeightUnit `json:"weightUnit" validate:"required,oneof=kg lbs"`
	Reps       int        `json:"reps" validate:"gt=0"`
	RestTime   int        `json:"restTime" validate:"gte=0"` // in seconds
	Completed  bool       `json:"completed"`                 // for workout tracking
}

type WorkoutExercise struct {
	ExerciseID int           `json:"exerciseId" example:"1"`   // 0 = freeform exercise; Name is authoritative (exercises stored as JSONB, no catalog FK)
	Name       string        `json:"name" validate:"required"` // denormalized for convenience
	Sets       []ExerciseSet `json:"sets" validate:"required,min=1,dive"`
	Notes      string        `json:"notes,omitempty"`
}

// NewExercise creates a new exercise with timestamp
func NewExercise(name, category string, muscleGroupID, equipmentID int, createdBy int) *Exercise {
	now := time.Now()

	return &Exercise{
		ExerciseID:    0,
		Name:          name,
		Category:      category,
		MuscleGroupID: muscleGroupID,
		EquipmentID:   equipmentID,
		CreatedBy:     createdBy,
		CreatedAt:     now,
	}
}

// NewExerciseSet creates a new exercise set
func NewExerciseSet(weight float64, weightUnit WeightUnit, reps, restTime int) *ExerciseSet {
	return &ExerciseSet{
		Type:       SetTypeWorking,
		Weight:     weight,
		WeightUnit: weightUnit,
		Reps:       reps,
		RestTime:   restTime,
		Completed:  false,
	}
}

// CompleteSet marks the set as completed
func (es *ExerciseSet) CompleteSet() {
	es.Completed = true
}
