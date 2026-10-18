package config

import (
	"reflect"
	"testing"
)

// setenv sets an env var for the duration of the test (t.Setenv restores it).
func setenv(t *testing.T, key, value string) {
	t.Helper()
	t.Setenv(key, value)
}

// loadForTest loads the config with the minimum required environment.
// LoadConfig calls log.Fatal on a missing JWT secret, so every test needs one.
func loadForTest(t *testing.T) *Config {
	t.Helper()
	setenv(t, "JWT_SECRET", "0123456789abcdef0123456789abcdef")
	return LoadConfig()
}

func TestLoadConfig_GinModeDefaults(t *testing.T) {
	setenv(t, "GIN_MODE", "")
	t.Run("development", func(t *testing.T) {
		setenv(t, "APP_ENV", "development")
		if got := loadForTest(t).GinMode; got != "debug" {
			t.Fatalf("GinMode = %q, want debug", got)
		}
	})

	t.Run("production", func(t *testing.T) {
		setenv(t, "APP_ENV", "production")
		if got := loadForTest(t).GinMode; got != "release" {
			t.Fatalf("GinMode = %q, want release", got)
		}
	})

	t.Run("explicit GIN_MODE wins", func(t *testing.T) {
		setenv(t, "APP_ENV", "production")
		setenv(t, "GIN_MODE", "debug")
		if got := loadForTest(t).GinMode; got != "debug" {
			t.Fatalf("GinMode = %q, want debug", got)
		}
	})
}

func TestLoadConfig_DevelopmentCORSDefaults(t *testing.T) {
	setenv(t, "APP_ENV", "development")
	setenv(t, "CORS_ALLOWED_ORIGINS", "")

	want := []string{
		"http://localhost:3000", "http://127.0.0.1:3000",
		"http://localhost:3001", "http://127.0.0.1:3001",
	}
	if got := loadForTest(t).AllowedOrigins; !reflect.DeepEqual(got, want) {
		t.Fatalf("AllowedOrigins = %v, want %v", got, want)
	}
}

func TestLoadConfig_ProductionRequiresExplicitCORS(t *testing.T) {
	setenv(t, "APP_ENV", "production")
	setenv(t, "CORS_ALLOWED_ORIGINS", "")
	setenv(t, "FRONTEND_URL", "")

	if got := loadForTest(t).AllowedOrigins; len(got) != 0 {
		t.Fatalf("AllowedOrigins = %v, want none in production", got)
	}
}

// TestLoadConfig_ProductionCORSFallsBackToFrontendURL pins the production
// fallback: when CORS_ALLOWED_ORIGINS is empty, the FRONTEND_URL origin is
// allowed so a cross-origin deploy doesn't fail every preflight (/clients/*,
// /workout-plans/*, ...). Path is stripped; CORS_ALLOWED_ORIGINS still wins.
func TestLoadConfig_ProductionCORSFallsBackToFrontendURL(t *testing.T) {
	setenv(t, "APP_ENV", "production")
	setenv(t, "CORS_ALLOWED_ORIGINS", "")
	setenv(t, "FRONTEND_URL", "https://app.example.com/athlete?x=1")

	want := []string{"https://app.example.com"}
	if got := loadForTest(t).AllowedOrigins; !reflect.DeepEqual(got, want) {
		t.Fatalf("AllowedOrigins = %v, want %v", got, want)
	}
}

// TestLoadConfig_ProductionCORSInvalidFrontendURL ensures a malformed
// FRONTEND_URL does not silently widen (or crash) the allow-list — it is
// treated as unset and cross-origin stays rejected.
func TestLoadConfig_ProductionCORSInvalidFrontendURL(t *testing.T) {
	setenv(t, "APP_ENV", "production")
	setenv(t, "CORS_ALLOWED_ORIGINS", "")
	setenv(t, "FRONTEND_URL", "not a url")

	if got := loadForTest(t).AllowedOrigins; len(got) != 0 {
		t.Fatalf("AllowedOrigins = %v, want none for invalid FRONTEND_URL", got)
	}
}

// TestLoadConfig_ExplicitCORSWinsOverFrontendURL pins precedence.
func TestLoadConfig_ExplicitCORSWinsOverFrontendURL(t *testing.T) {
	setenv(t, "APP_ENV", "production")
	setenv(t, "CORS_ALLOWED_ORIGINS", "https://admin.example.com")
	setenv(t, "FRONTEND_URL", "https://app.example.com")

	want := []string{"https://admin.example.com"}
	if got := loadForTest(t).AllowedOrigins; !reflect.DeepEqual(got, want) {
		t.Fatalf("AllowedOrigins = %v, want %v", got, want)
	}
}

// TestLoadConfig_ProductionCORSNotReopenedByGinMode pins the decision to key
// the dev CORS fallback on APP_ENV: running production with GIN_MODE=debug (for
// temporary debugging) must not re-enable the localhost origins.
func TestLoadConfig_ProductionCORSNotReopenedByGinMode(t *testing.T) {
	setenv(t, "APP_ENV", "production")
	setenv(t, "GIN_MODE", "debug")
	setenv(t, "CORS_ALLOWED_ORIGINS", "")
	setenv(t, "FRONTEND_URL", "")

	cfg := loadForTest(t)
	if cfg.GinMode != "debug" {
		t.Fatalf("GinMode = %q, want debug (explicit override honoured)", cfg.GinMode)
	}
	if len(cfg.AllowedOrigins) != 0 {
		t.Fatalf("AllowedOrigins = %v, want none in production even in debug mode", cfg.AllowedOrigins)
	}
}

func TestLoadConfig_StagingGetsDevCORSDefaults(t *testing.T) {
	setenv(t, "APP_ENV", "staging")
	setenv(t, "CORS_ALLOWED_ORIGINS", "")

	if got := loadForTest(t).AllowedOrigins; len(got) == 0 {
		t.Fatalf("staging should keep the localhost fallback origins")
	}
}

func TestLoadConfig_CORSFromEnv(t *testing.T) {
	setenv(t, "APP_ENV", "production")
	setenv(t, "CORS_ALLOWED_ORIGINS", " https://app.example.com , ,https://admin.example.com ")

	want := []string{"https://app.example.com", "https://admin.example.com"}
	if got := loadForTest(t).AllowedOrigins; !reflect.DeepEqual(got, want) {
		t.Fatalf("AllowedOrigins = %v, want %v", got, want)
	}
}

func TestLoadConfig_PortAndTrustedProxies(t *testing.T) {
	setenv(t, "PORT", "9090")
	setenv(t, "TRUSTED_PROXIES", "172.16.0.0/12, 10.0.0.5")

	cfg := loadForTest(t)
	if cfg.Port != "9090" {
		t.Fatalf("Port = %q, want 9090", cfg.Port)
	}
	want := []string{"172.16.0.0/12", "10.0.0.5"}
	if !reflect.DeepEqual(cfg.TrustedProxies, want) {
		t.Fatalf("TrustedProxies = %v, want %v", cfg.TrustedProxies, want)
	}
}

// TestLoadConfig_SwaggerServerURL covers the runtime override that replaces the
// hardcoded localhost server URL in the OpenAPI spec.
func TestLoadConfig_SwaggerServerURL(t *testing.T) {
	t.Run("default is empty (host-relative spec)", func(t *testing.T) {
		t.Setenv("SWAGGER_SERVER_URL", "")
		if got := loadForTest(t).SwaggerServerURL; got != "" {
			t.Fatalf("SwaggerServerURL = %q, want empty", got)
		}
	})

	t.Run("trimmed from env", func(t *testing.T) {
		setenv(t, "SWAGGER_SERVER_URL", "  https://api.example.com/api  ")
		if got := loadForTest(t).SwaggerServerURL; got != "https://api.example.com/api" {
			t.Fatalf("SwaggerServerURL = %q, want https://api.example.com/api", got)
		}
	})
}

// TestLoadConfig_AuditLogRetentionDays pins the retention default, the explicit
// 0 (disabled) override and the invalid-value fallback.
func TestLoadConfig_AuditLogRetentionDays(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  int
	}{
		{"default", "", 365},
		{"explicit", "30", 30},
		{"disabled", "0", 0},
		{"invalid falls back", "abc", 365},
		{"negative falls back", "-1", 365},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			setenv(t, "AUDIT_LOG_RETENTION_DAYS", tc.value)
			if got := loadForTest(t).AuditLogRetentionDays; got != tc.want {
				t.Fatalf("AuditLogRetentionDays = %d, want %d", got, tc.want)
			}
		})
	}
}

// TestValidatePort covers the startup validation: an unparsable or
// out-of-range port must fail loudly instead of at ListenAndServe time.
func TestValidatePort(t *testing.T) {
	for _, value := range []string{"abc", "0", "-1", "70000", "8080x", ""} {
		if err := validatePort(value); err == nil {
			t.Errorf("validatePort(%q) = nil, want an error", value)
		}
	}
	for _, value := range []string{"1", "8080", "65535"} {
		if err := validatePort(value); err != nil {
			t.Errorf("validatePort(%q) = %v, want nil", value, err)
		}
	}
}

func TestLoadConfig_Defaults(t *testing.T) {
	t.Setenv("PORT", "")
	t.Setenv("TRUSTED_PROXIES", "")

	cfg := loadForTest(t)
	if cfg.Port != "8080" {
		t.Fatalf("default Port = %q, want 8080", cfg.Port)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Fatalf("default TrustedProxies = %v, want none", cfg.TrustedProxies)
	}
}
