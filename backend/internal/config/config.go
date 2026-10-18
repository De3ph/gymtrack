package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

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
	// AppEnv is the deployment environment (development|staging|production).
	AppEnv string
	// GinMode is the gin engine mode (debug|release|test). Defaults to
	// release when AppEnv is production, otherwise debug.
	GinMode string
	// Port is the TCP port the HTTP server listens on (PORT env).
	Port string
	// TrustedProxies lists the proxy IPs/CIDRs whose X-Forwarded-For header is
	// trusted. Empty disables proxy-header parsing, so ClientIP() returns the
	// peer address (no client IP spoofing).
	TrustedProxies []string
	// AllowedOrigins is the CORS allow-list. Empty in production means no
	// cross-origin browser access; same-origin traffic behind the reverse
	// proxy is unaffected.
	AllowedOrigins []string
	// SwaggerServerURL is the server URL advertised by the OpenAPI spec
	// (SWAGGER_SERVER_URL), e.g. https://api.example.com/api. Empty keeps the
	// spec host-relative so the Scalar UI targets the origin it is served from.
	SwaggerServerURL string
	// AuditLogRetentionDays is how long user_audit_logs rows are kept
	// (AUDIT_LOG_RETENTION_DAYS, default 365). 0 disables the pruning job.
	AuditLogRetentionDays int
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

	appEnv := strings.ToLower(getEnv("APP_ENV", "development"))
	ginMode := strings.ToLower(getEnv("GIN_MODE", ""))
	if ginMode == "" {
		if appEnv == "production" || appEnv == "prod" {
			ginMode = "release"
		} else {
			ginMode = "debug"
		}
	}

	port := strings.TrimSpace(getEnv("PORT", "8080"))
	if port == "" {
		port = "8080"
	}
	if err := validatePort(port); err != nil {
		log.Fatal(err)
	}

	isProduction := appEnv == "production" || appEnv == "prod"

	allowedOrigins := splitCSV(getEnv("CORS_ALLOWED_ORIGINS", ""))
	// Keyed on APP_ENV, not gin mode: setting GIN_MODE=debug in production must
	// not re-enable the localhost origins.
	if len(allowedOrigins) == 0 && !isProduction {
		// Local development only: the Next.js dev server runs on :3000, with
		// :3001 used for a second instance. Production relies on the
		// same-origin reverse proxy instead of CORS.
		allowedOrigins = []string{
			"http://localhost:3000", "http://127.0.0.1:3000",
			"http://localhost:3001", "http://127.0.0.1:3001",
		}
	}

	return &Config{
		JWTSecret:             jwtSecret,
		PostgresDSN:           getEnv("POSTGRES_DSN", DefaultPostgresDSN()),
		CacheEnabled:          getEnv("CACHE_ENABLED", "true") != "false",
		ResendAPIKey:          getEnv("RESEND_API_KEY", ""),
		EmailFrom:             getEnv("EMAIL_FROM", ""),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:3000"),
		OTelEndpoint:          getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		TraceSamplingRatio:    getEnvFloat("OTEL_TRACES_SAMPLER_ARG", 0.1),
		PProfEnabled:          parseBool("PPROF_ENABLED"),
		AppEnv:                appEnv,
		GinMode:               ginMode,
		Port:                  port,
		TrustedProxies:        splitCSV(getEnv("TRUSTED_PROXIES", "")),
		AllowedOrigins:        allowedOrigins,
		SwaggerServerURL:      strings.TrimSpace(getEnv("SWAGGER_SERVER_URL", "")),
		AuditLogRetentionDays: getEnvInt("AUDIT_LOG_RETENTION_DAYS", 365),
	}
}

// validatePort checks that value is a TCP port number. The server would
// otherwise fail only at ListenAndServe time, after all dependencies are up.
func validatePort(value string) error {
	n, err := strconv.Atoi(value)
	if err != nil || n < 1 || n > 65535 {
		return fmt.Errorf("PORT must be an integer between 1 and 65535, got %q", value)
	}
	return nil
}

// splitCSV splits a comma-separated env var, trimming whitespace and dropping
// empty entries. Returns nil for an empty input.
func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
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

// getEnvInt reads a non-negative int env var. Missing, unparsable or negative
// values fall back to the default; an explicit 0 is honoured (used to disable
// jobs such as audit-log retention).
func getEnvInt(key string, defaultValue int) int {
	value, exists := os.LookupEnv(key)
	if !exists {
		return defaultValue
	}
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed < 0 {
		return defaultValue
	}
	return parsed
}
