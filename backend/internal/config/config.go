package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	JWTSecret    string
	PostgresDSN  string
	CacheEnabled bool
	ResendAPIKey string
	EmailFrom    string
	FrontendURL  string
	// OTelEndpoint is the OTLP HTTP endpoint for trace export
	// (e.g. http://localhost:4318 or scheme-less localhost:4318 for insecure).
	// Empty disables distributed tracing (no-op tracer provider).
	OTelEndpoint string
	// TraceSamplingRatio is the parent-based TraceIDRatio sampling ratio
	// (0..1, clamped) applied when tracing is enabled.
	TraceSamplingRatio float64
	// PProfEnabled exposes net/http/pprof handlers under /debug/pprof.
	PProfEnabled bool
}

// DefaultPostgresDSN returns the local development DSN used when
// POSTGRES_DSN is not set. Matches the convention used by cmd/migrate and
// cmd/ensure-schema so they can run without a .env file.
func DefaultPostgresDSN() string {
	return "postgres://postgres:123456@localhost:5432/gymtrack?sslmode=disable"
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
		JWTSecret:    jwtSecret,
		PostgresDSN:  getEnv("POSTGRES_DSN", DefaultPostgresDSN()),
		CacheEnabled: getEnv("CACHE_ENABLED", "true") != "false",
		ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		EmailFrom:    getEnv("EMAIL_FROM", ""),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		OTelEndpoint: getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		TraceSamplingRatio: getEnvFloat("OTEL_TRACES_SAMPLER_ARG", 0.1),
		PProfEnabled:  parseBool("PPROF_ENABLED"),
	}
}

func getEnv(key string, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// parseBool reads a boolean env var using strconv.ParseBool so "1", "t",
// "TRUE", etc. are accepted; missing or invalid values are false.
func parseBool(key string) bool {
	value, exists := os.LookupEnv(key)
	if !exists {
		return false
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false
	}
	return parsed
}

// getEnvFloat reads a float env var; missing or invalid values fall back
// to the default.
func getEnvFloat(key string, defaultValue float64) float64 {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return defaultValue
	}
	return parsed
}
