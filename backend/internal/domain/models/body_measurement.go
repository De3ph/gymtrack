package models

import (
	"time"

	"github.com/google/uuid"
)

// BodyMeasurementPart represents a single body part measurement value (in centimeters).
type BodyMeasurementPart struct {
	Value float64 `json:"value" validate:"gte=0"`
}

// BodyMeasurement captures an athlete's weight and body part measurements on a specific date.
// Body part measurements are stored in a flexible map so athletes can track whichever
// parts are relevant to their goals (chest, waist, hips, biceps, etc.).
type BodyMeasurement struct {
	Type         string                          `json:"type"` // Always "body_measurement"
	MeasurementID string                         `json:"measurementId"`
	AthleteID    string                          `json:"athleteId" validate:"required"`
	Date         time.Time                       `json:"date" validate:"required"`
	Weight       float64                         `json:"weight" validate:"gte=0"`
	WeightUnit   WeightUnit                      `json:"weightUnit" validate:"required,oneof=kg lbs"`
	BodyFatPct   float64                         `json:"bodyFatPct,omitempty" validate:"gte=0,lte=100"`
	Parts        map[string]BodyMeasurementPart  `json:"parts,omitempty"`
	Notes        string                          `json:"notes,omitempty" validate:"max=500"`
	CreatedAt    time.Time                       `json:"createdAt"`
	UpdatedAt    time.Time                       `json:"updatedAt"`
}

// NewBodyMeasurement creates a new body measurement with generated IDs and timestamps.
func NewBodyMeasurement(athleteID string, date time.Time, weight float64, weightUnit WeightUnit, bodyFatPct float64, parts map[string]BodyMeasurementPart, notes string) *BodyMeasurement {
	now := time.Now()
	return &BodyMeasurement{
		Type:          "body_measurement",
		MeasurementID: uuid.New().String(),
		AthleteID:     athleteID,
		Date:          date,
		Weight:        weight,
		WeightUnit:    weightUnit,
		BodyFatPct:    bodyFatPct,
		Parts:         parts,
		Notes:         notes,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

// CanEdit checks if the body measurement can be edited (within 24 hours of creation).
func (m *BodyMeasurement) CanEdit() bool {
	return time.Since(m.CreatedAt) < 24*time.Hour
}

// SupportedBodyParts lists the body parts that are commonly tracked. New parts
// can be stored in the Parts map but the UI surfaces these as quick-pick options.
var SupportedBodyParts = []string{
	"chest",
	"waist",
	"hips",
	"neck",
	"shoulders",
	"bicepLeft",
	"bicepRight",
	"forearmLeft",
	"forearmRight",
	"thighLeft",
	"thighRight",
	"calfLeft",
	"calfRight",
}
