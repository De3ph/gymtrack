package cache

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"gymtrack-backend/internal/domain/models"
)

// NoOpCache is a Cache[T] implementation where Get always misses and Set/Invalidate are no-ops.
// Used as the kill switch when CACHE_ENABLED=false in the environment config.
type NoOpCache[T any] struct{}

// NewNoOpCache creates a NoOpCache[T]. Get always returns miss; Set/Invalidate are no-ops.
func NewNoOpCache[T any]() *NoOpCache[T] {
	return &NoOpCache[T]{}
}

func (n *NoOpCache[T]) Get(key string) (T, bool) {
	var zero T
	return zero, false
}

func (n *NoOpCache[T]) Set(key string, value T) {}

func (n *NoOpCache[T]) SetWithTTL(key string, value T, ttl time.Duration) {}

func (n *NoOpCache[T]) Invalidate(key string) {}

func (n *NoOpCache[T]) InvalidatePrefix(prefix string) {}

// NewUserCache creates a Cache[*models.User] for the auth middleware user cache.
func NewUserCache(reg *prometheus.Registry, enabled bool) Cache[*models.User] {
	if !enabled {
		return NewNoOpCache[*models.User]()
	}
	metrics := NewCacheMetrics(reg, "cache_user")
	return NewGoCache[*models.User](5*time.Minute, 1*time.Minute, metrics)
}

// NewExerciseCache creates a Cache for exercise reference data.
func NewExerciseCache(reg *prometheus.Registry, enabled bool) Cache[[]models.Exercise] {
	if !enabled {
		return NewNoOpCache[[]models.Exercise]()
	}
	metrics := NewCacheMetrics(reg, "cache_exercise")
	return NewGoCache[[]models.Exercise](30*time.Minute, 1*time.Minute, metrics)
}

// NewMuscleGroupCache creates a Cache for muscle group reference data.
func NewMuscleGroupCache(reg *prometheus.Registry, enabled bool) Cache[[]models.MuscleGroupDefinition] {
	if !enabled {
		return NewNoOpCache[[]models.MuscleGroupDefinition]()
	}
	metrics := NewCacheMetrics(reg, "cache_muscle_group")
	return NewGoCache[[]models.MuscleGroupDefinition](30*time.Minute, 1*time.Minute, metrics)
}

// NewEquipmentCache creates a Cache for equipment reference data.
func NewEquipmentCache(reg *prometheus.Registry, enabled bool) Cache[[]models.EquipmentDefinition] {
	if !enabled {
		return NewNoOpCache[[]models.EquipmentDefinition]()
	}
	metrics := NewCacheMetrics(reg, "cache_equipment")
	return NewGoCache[[]models.EquipmentDefinition](30*time.Minute, 1*time.Minute, metrics)
}

// NewRelationshipCache creates a Cache for trainer-athlete relationships.
func NewRelationshipCache(reg *prometheus.Registry, enabled bool) Cache[[]*models.Relationship] {
	if !enabled {
		return NewNoOpCache[[]*models.Relationship]()
	}
	metrics := NewCacheMetrics(reg, "cache_relationship")
	return NewGoCache[[]*models.Relationship](2*time.Minute, 30*time.Second, metrics)
}

// NewTrainerIDCache creates a Cache for single trainer-by-ID lookups.
func NewTrainerIDCache(reg *prometheus.Registry, enabled bool) Cache[*models.TrainerWithProfile] {
	if !enabled {
		return NewNoOpCache[*models.TrainerWithProfile]()
	}
	metrics := NewCacheMetrics(reg, "cache_trainer_id")
	return NewGoCache[*models.TrainerWithProfile](5*time.Minute, 1*time.Minute, metrics)
}

// NewTrainerPublicCache creates a Cache for the GetPublicTrainers list query.
func NewTrainerPublicCache(reg *prometheus.Registry, enabled bool) Cache[[]models.TrainerWithProfile] {
	if !enabled {
		return NewNoOpCache[[]models.TrainerWithProfile]()
	}
	metrics := NewCacheMetrics(reg, "cache_trainer_public")
	return NewGoCache[[]models.TrainerWithProfile](5*time.Minute, 1*time.Minute, metrics)
}
