package config

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/couchbase/gocb/v2"
)

// Collection names
const (
	CollectionUsers         = "users"
	CollectionRelationships = "relationships"
	CollectionWorkouts      = "workouts"
	CollectionMeals         = "meals"
	CollectionComments      = "comments"
	CollectionInvitations   = "invitations"
	CollectionMuscleGroups          = "muscle_groups"
	CollectionEquipment             = "equipment"
	CollectionExercises             = "exercises"
	CollectionWorkoutPlans          = "workout_plans"
	CollectionWorkoutPlanAssignments = "workout_plan_assignments"
)

// Scope names
const (
	ScopeDefault = "_default"
)

// InitializeCollections creates all necessary collections if they don't exist
func InitializeCollections(cluster *gocb.Cluster, bucket *gocb.Bucket) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collections := []string{
		CollectionUsers,
		CollectionRelationships,
		CollectionWorkouts,
		CollectionMeals,
		CollectionComments,
		CollectionInvitations,
		CollectionMuscleGroups,
		CollectionEquipment,
		CollectionExercises,
		CollectionWorkoutPlans,
		CollectionWorkoutPlanAssignments,
	}

	// Get the default scope
	scope := bucket.Scope(ScopeDefault)

	// Get existing collections
	existingCollections := make(map[string]bool)
	manager := bucket.Collections()
	scopes, err := manager.GetAllScopes(&gocb.GetAllScopesOptions{})
	if err != nil {
		return fmt.Errorf("failed to get scopes: %w", err)
	}

	for _, s := range scopes {
		if s.Name == ScopeDefault {
			for _, c := range s.Collections {
				existingCollections[c.Name] = true
			}
		}
	}

	// Create missing collections
	for _, collectionName := range collections {
		if existingCollections[collectionName] {
			log.Printf("Collection '%s' already exists", collectionName)
			continue
		}

		err := manager.CreateCollection(gocb.CollectionSpec{
			Name:      collectionName,
			ScopeName: ScopeDefault,
		}, &gocb.CreateCollectionOptions{})

		if err != nil {
			return fmt.Errorf("failed to create collection '%s': %w", collectionName, err)
		}

		log.Printf("Created collection '%s'", collectionName)

		// Wait for collection to be ready
		err = waitForCollection(scope, collectionName)
		if err != nil {
			return fmt.Errorf("collection '%s' not ready: %w", collectionName, err)
		}
	}

	// Create indexes
	if err := createIndexes(ctx, cluster, bucket.Name(), collections); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	log.Println("Couchbase collections initialized successfully")
	return nil
}

func waitForCollection(scope *gocb.Scope, collectionName string) error {
	collection := scope.Collection(collectionName)
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		_, err := collection.Exists("test", &gocb.ExistsOptions{})
		if err == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for collection %s", collectionName)
}

func createIndexes(ctx context.Context, cluster *gocb.Cluster, bucketName string, collections []string) error {
	scopeName := ScopeDefault

	// Index definitions by collection
	indexes := map[string][]string{
		CollectionUsers: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionUsers),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_users_email ON `%s`.`%s`.`%s`(email)", bucketName, scopeName, CollectionUsers),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_users_username ON `%s`.`%s`.`%s`(username)", bucketName, scopeName, CollectionUsers),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_users_role ON `%s`.`%s`.`%s`(role)", bucketName, scopeName, CollectionUsers),
		},
		CollectionRelationships: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionRelationships),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_relationships_trainer ON `%s`.`%s`.`%s`(trainerId)", bucketName, scopeName, CollectionRelationships),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_relationships_athlete ON `%s`.`%s`.`%s`(athleteId)", bucketName, scopeName, CollectionRelationships),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_relationships_status ON `%s`.`%s`.`%s`(status)", bucketName, scopeName, CollectionRelationships),
		},
		CollectionWorkouts: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionWorkouts),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_workouts_athlete ON `%s`.`%s`.`%s`(athleteId)", bucketName, scopeName, CollectionWorkouts),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_workouts_date ON `%s`.`%s`.`%s`(date)", bucketName, scopeName, CollectionWorkouts),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_workouts_athlete_date ON `%s`.`%s`.`%s`(athleteId, date)", bucketName, scopeName, CollectionWorkouts),
		},
		CollectionMeals: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionMeals),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_meals_athlete ON `%s`.`%s`.`%s`(athleteId)", bucketName, scopeName, CollectionMeals),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_meals_date ON `%s`.`%s`.`%s`(date)", bucketName, scopeName, CollectionMeals),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_meals_athlete_date ON `%s`.`%s`.`%s`(athleteId, date)", bucketName, scopeName, CollectionMeals),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_meals_type ON `%s`.`%s`.`%s`(mealType)", bucketName, scopeName, CollectionMeals),
		},
		CollectionComments: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionComments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_comments_target ON `%s`.`%s`.`%s`(targetId, targetType)", bucketName, scopeName, CollectionComments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_comments_author ON `%s`.`%s`.`%s`(authorId)", bucketName, scopeName, CollectionComments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_comments_parent ON `%s`.`%s`.`%s`(parentCommentId)", bucketName, scopeName, CollectionComments),
		},
		CollectionInvitations: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionInvitations),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_invitations_code ON `%s`.`%s`.`%s`(code)", bucketName, scopeName, CollectionInvitations),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_invitations_trainer ON `%s`.`%s`.`%s`(trainerId)", bucketName, scopeName, CollectionInvitations),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_invitations_status ON `%s`.`%s`.`%s`(status)", bucketName, scopeName, CollectionInvitations),
		},
		CollectionMuscleGroups: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionMuscleGroups),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_muscle_groups_id ON `%s`.`%s`.`%s`(id)", bucketName, scopeName, CollectionMuscleGroups),
		},
		CollectionEquipment: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionEquipment),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_equipment_id ON `%s`.`%s`.`%s`(id)", bucketName, scopeName, CollectionEquipment),
		},
		CollectionExercises: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionExercises),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON `%s`.`%s`.`%s`(muscleGroupId)", bucketName, scopeName, CollectionExercises),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON `%s`.`%s`.`%s`(equipmentId)", bucketName, scopeName, CollectionExercises),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_exercises_category ON `%s`.`%s`.`%s`(category)", bucketName, scopeName, CollectionExercises),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_exercises_name ON `%s`.`%s`.`%s`(name)", bucketName, scopeName, CollectionExercises),
		},
		CollectionWorkoutPlans: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionWorkoutPlans),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wp_trainer ON `%s`.`%s`.`%s`(trainerId)", bucketName, scopeName, CollectionWorkoutPlans),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wp_type ON `%s`.`%s`.`%s`(type)", bucketName, scopeName, CollectionWorkoutPlans),
		},
		CollectionWorkoutPlanAssignments: {
			fmt.Sprintf("CREATE PRIMARY INDEX IF NOT EXISTS ON `%s`.`%s`.`%s`", bucketName, scopeName, CollectionWorkoutPlanAssignments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_plan ON `%s`.`%s`.`%s`(planId)", bucketName, scopeName, CollectionWorkoutPlanAssignments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_athlete ON `%s`.`%s`.`%s`(athleteId)", bucketName, scopeName, CollectionWorkoutPlanAssignments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_trainer ON `%s`.`%s`.`%s`(trainerId)", bucketName, scopeName, CollectionWorkoutPlanAssignments),
			fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_type ON `%s`.`%s`.`%s`(type)", bucketName, scopeName, CollectionWorkoutPlanAssignments),
		},
	}

	// Create indexes for each collection
	for _, collectionName := range collections {
		collectionIndexes, ok := indexes[collectionName]
		if !ok {
			continue
		}

		for _, indexQuery := range collectionIndexes {
			_, err := cluster.Query(indexQuery, &gocb.QueryOptions{})
			if err != nil {
				// Index might already exist, log and continue
				log.Printf("Note: Could not create index (may already exist): %v", err)
			} else {
				log.Printf("Created index for collection '%s'", collectionName)
			}
		}
	}

	return nil
}
