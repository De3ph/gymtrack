package config

import (
	"log"
	"time"

	"github.com/couchbase/gocb/v2"
)

// Collection names (keep for Couchbase rollback + InvitationService + migration runner)
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

// Scope names
const (
	ScopeDefault = "_default"
)

var (
	GlobalCluster *gocb.Cluster
	GlobalBucket  *gocb.Bucket
)

// couchbaseConnectionConfig holds Couchbase connection parameters from env vars.
type couchbaseConnectionConfig struct {
	connectionString string
	username         string
	password         string
	bucket           string
}

// loadCouchbaseConfig reads Couchbase connection params from env vars.
func loadCouchbaseConfig() couchbaseConnectionConfig {
	return couchbaseConnectionConfig{
		connectionString: getEnv("COUCHBASE_CONNECTION_STRING", "couchbase://localhost"),
		username:         getEnv("COUCHBASE_USERNAME", "Administrator"),
		password:         getEnv("COUCHBASE_PASSWORD", "password"),
		bucket:           getEnv("COUCHBASE_BUCKET", "gymtrack"),
	}
}

// ProvideCouchbaseConnection provides Couchbase cluster and bucket for fx.
// Reads connection params directly from environment variables.
func ProvideCouchbaseConnection() (cluster *gocb.Cluster, bucket *gocb.Bucket, err error) {
	cc := loadCouchbaseConfig()

	cluster, err = gocb.Connect(cc.connectionString, gocb.ClusterOptions{
		Authenticator: gocb.PasswordAuthenticator{
			Username: cc.username,
			Password: cc.password,
		},
	})
	if err != nil {
		return
	}

	bucket = cluster.Bucket(cc.bucket)
	err = bucket.WaitUntilReady(10*time.Second, nil)

	return
}

// GetCollection returns a collection from the bucket
func GetCollection(bucket *gocb.Bucket, collectionName string) *gocb.Collection {
	return bucket.Scope(ScopeDefault).Collection(collectionName)
}

func init() {
	log.Println("Couchbase config loaded (rollback-ready)")
}
