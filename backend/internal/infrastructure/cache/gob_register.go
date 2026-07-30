package cache

import (
	"encoding/gob"

	"gymtrack-backend/internal/domain/models"
)

// init registers every concrete type that flows through the cache with
// encoding/gob. gob requires registration for interface-typed fields to
// encode/decode their concrete values.
//
// No cached model currently has an interface/any field (JSONB []byte fields are
// fine — gob special-cases byte slices), so these registrations are defensive:
// they guard against silent empty-data reads if a model ever gains one and
// establish this file as the single place to add such registrations.
//
// gob.Register is idempotent for the same concrete type, so a plain init() is
// safe even if a type is encountered elsewhere.
//
// NOTE: add registrations here when models gain interface-typed fields —
// register the concrete types stored in those fields, not just the top-level
// cached type.
func init() {
	gob.Register(&models.User{})
	gob.Register([]models.Exercise{})
	gob.Register([]models.MuscleGroupDefinition{})
	gob.Register([]models.EquipmentDefinition{})
	gob.Register([]*models.Relationship{})
	gob.Register(&models.TrainerWithProfile{})
	gob.Register([]models.TrainerWithProfile{})
}
