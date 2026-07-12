package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	JWTSecret   string
	PostgresDSN string
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
		JWTSecret:   jwtSecret,
		PostgresDSN: getEnv("POSTGRES_DSN", "postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable"),
	}
}

func getEnv(key string, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
