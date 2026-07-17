package config

// Couchbase collection name constants retained for the one-time migration runner
// (cmd/migrate). The running server no longer uses Couchbase.
const (
	CollectionUsers                  = "users"
	CollectionRelationships          = "relationships"
	CollectionWorkouts               = "workouts"
	CollectionMeals                  = "meals"
	CollectionComments               = "comments"
	CollectionInvitations            = "invitations"
	CollectionMuscleGroups           = "muscle_groups"
	CollectionEquipment              = "equipment"
	CollectionExercises              = "exercises"
	CollectionWorkoutPlans           = "workout_plans"
	CollectionWorkoutPlanAssignments = "workout_plan_assignments"
	CollectionBodyMeasurements       = "body_measurements"
)

// ScopeDefault is the Couchbase scope used by the migration runner.
const ScopeDefault = "_default"
