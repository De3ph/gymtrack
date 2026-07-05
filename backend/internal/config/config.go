package config

import (
	"log"
	"os"
	"time"

	"github.com/couchbase/gocb/v2"
	"github.com/joho/godotenv"
)

type Config struct {
	CouchbaseConnectionString string
	CouchbaseUsername         string
	CouchbasePassword         string
	CouchbaseBucket           string
	JWTSecret                 string
	PostgresDSN               string
}

func LoadConfig() *Config {
	// Try loading .env from multiple possible locations
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	// Validate JWT secret is sufficiently strong
	if len(jwtSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters long")
	}

	return &Config{
		CouchbaseConnectionString: getEnv("COUCHBASE_CONNECTION_STRING", "couchbase://localhost"),
		CouchbaseUsername:         getEnv("COUCHBASE_USERNAME", "Administrator"),
		CouchbasePassword:         getEnv("COUCHBASE_PASSWORD", "password"),
		CouchbaseBucket:           getEnv("COUCHBASE_BUCKET", "gymtrack"),
		JWTSecret:                 jwtSecret,
		PostgresDSN:               getEnv("POSTGRES_DSN", "postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable"),
	}
}

func getEnv(key string, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// ProvideCouchbaseConnection provides Couchbase cluster and bucket for fx
func ProvideCouchbaseConnection(cfg *Config) (cluster *gocb.Cluster, bucket *gocb.Bucket, err error) {
	cluster, err = gocb.Connect(cfg.CouchbaseConnectionString, gocb.ClusterOptions{
		Authenticator: gocb.PasswordAuthenticator{
			Username: cfg.CouchbaseUsername,
			Password: cfg.CouchbasePassword,
		},
	})

	if err != nil {
		return
	}

	bucket = cluster.Bucket(cfg.CouchbaseBucket)
	err = bucket.WaitUntilReady(10*time.Second, nil)

	return
}

// GetCollection returns a collection from the bucket
func GetCollection(bucket *gocb.Bucket, collectionName string) *gocb.Collection {
	return bucket.Scope(ScopeDefault).Collection(collectionName)
}
