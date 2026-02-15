package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	CouchbaseConnectionString string
	CouchbaseUsername         string
	CouchbasePassword         string
	CouchbaseBucket           string
	JWTSecret                 string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	return &Config{
		CouchbaseConnectionString: getEnv("COUCHBASE_CONNECTION_STRING", "couchbase://localhost"),
		CouchbaseUsername:         getEnv("COUCHBASE_USERNAME", "Administrator"),
		CouchbasePassword:         getEnv("COUCHBASE_PASSWORD", "password"),
		CouchbaseBucket:           getEnv("COUCHBASE_BUCKET", "gymtrack"),
		JWTSecret:                 getEnv("JWT_SECRET", "supersecretjwtkey"),
	}
}

func getEnv(key string, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
