package routes

import (
	"reflect"
	"strings"
	"testing"

	"gymtrack-backend/docs"
)

// TestApplySwaggerServerURL pins the translation from the configured public
// server URL to the swagger 2.0 host/basePath/schemes fields. The spec must be
// rooted at /api in every case, otherwise "try it out" requests miss the API
// prefix.
func TestApplySwaggerServerURL(t *testing.T) {
	original := *docs.SwaggerInfo
	t.Cleanup(func() { *docs.SwaggerInfo = original })

	t.Run("empty is host-relative but still rooted at /api", func(t *testing.T) {
		docs.SwaggerInfo.Host = "stale.example.com"
		docs.SwaggerInfo.BasePath = "/stale"
		docs.SwaggerInfo.Schemes = []string{"https"}

		applySwaggerServerURL("   ")

		if docs.SwaggerInfo.Host != "" {
			t.Fatalf("Host = %q, want empty (host-relative)", docs.SwaggerInfo.Host)
		}
		if docs.SwaggerInfo.BasePath != "/api" {
			t.Fatalf("BasePath = %q, want /api", docs.SwaggerInfo.BasePath)
		}
		if len(docs.SwaggerInfo.Schemes) != 0 {
			t.Fatalf("Schemes = %v, want none", docs.SwaggerInfo.Schemes)
		}
	})

	t.Run("absolute URL sets host, basePath and scheme", func(t *testing.T) {
		applySwaggerServerURL("https://api.example.com/api/")

		if docs.SwaggerInfo.Host != "api.example.com" {
			t.Fatalf("Host = %q, want api.example.com", docs.SwaggerInfo.Host)
		}
		if docs.SwaggerInfo.BasePath != "/api" {
			t.Fatalf("BasePath = %q, want /api (trailing slash trimmed)", docs.SwaggerInfo.BasePath)
		}
		if !reflect.DeepEqual(docs.SwaggerInfo.Schemes, []string{"https"}) {
			t.Fatalf("Schemes = %v, want [https]", docs.SwaggerInfo.Schemes)
		}
		if doc := docs.SwaggerInfo.ReadDoc(); !strings.Contains(doc, `"host": "api.example.com"`) {
			t.Fatalf("rendered spec does not advertise the configured host:\n%s", doc[:min(len(doc), 200)])
		}
	})

	t.Run("absolute URL without a path still uses /api", func(t *testing.T) {
		applySwaggerServerURL("https://api.example.com")

		if docs.SwaggerInfo.Host != "api.example.com" {
			t.Fatalf("Host = %q, want api.example.com", docs.SwaggerInfo.Host)
		}
		if docs.SwaggerInfo.BasePath != "/api" {
			t.Fatalf("BasePath = %q, want the /api default", docs.SwaggerInfo.BasePath)
		}
	})

	t.Run("custom gateway path is honoured", func(t *testing.T) {
		applySwaggerServerURL("https://gateway.example.com/gymtrack/api")

		if docs.SwaggerInfo.BasePath != "/gymtrack/api" {
			t.Fatalf("BasePath = %q, want /gymtrack/api", docs.SwaggerInfo.BasePath)
		}
	})

	// A typo in SWAGGER_SERVER_URL must not leave a previously applied server
	// advertised (the function documents reset-to-host-relative).
	t.Run("invalid URL resets to host-relative", func(t *testing.T) {
		applySwaggerServerURL("https://api.example.com/api")

		applySwaggerServerURL("/api")

		if docs.SwaggerInfo.Host != "" {
			t.Fatalf("Host = %q, want empty after an invalid value", docs.SwaggerInfo.Host)
		}
		if docs.SwaggerInfo.BasePath != "/api" {
			t.Fatalf("BasePath = %q, want /api", docs.SwaggerInfo.BasePath)
		}
	})
}
