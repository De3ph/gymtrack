package routes

import (
	"net/http"
	"net/url"
	"strings"

	"gymtrack-backend/docs"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// apiBasePath is the prefix every API route is mounted under (module.go:
// router.Group("/api"), plus the routes that register "/api/..." directly) and
// the prefix nginx forwards (nginx/default.conf: location /api/). The OpenAPI
// spec needs it as basePath, otherwise a "try it out" request resolves to
// /<path> instead of /api/<path> and 404s.
const apiBasePath = "/api"

// RegisterSwaggerRoutes serves the OpenAPI spec JSON and the Scalar UI.
//
// serverURL optionally overrides the server advertised by the spec (e.g.
// "https://api.example.com/api"), so a reverse-proxied deployment never
// publishes a hardcoded localhost URL. Empty keeps the spec host-relative,
// letting the Scalar UI call the same origin it was loaded from. Either way the
// spec is rooted at apiBasePath.
func RegisterSwaggerRoutes(router *gin.Engine, serverURL string) {
	applySwaggerServerURL(serverURL)

	// Serve the OpenAPI 3.1 spec JSON
	router.GET("/swagger/doc.json", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json", []byte(docs.SwaggerInfo.ReadDoc()))
	})

	// Serve Scalar UI
	router.GET("/swagger/index.html", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(scalarHTML))
	})

	// Redirect /swagger/ to /swagger/index.html
	router.GET("/swagger", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
}

// applySwaggerServerURL translates the configured public server URL into the
// swagger 2.0 host/basePath/schemes fields used by the generated spec.
//
// The base path is always apiBasePath, so requests resolve to /api/...; only the
// host and scheme are optional:
//
//   - empty: host-relative, so the Scalar UI targets the origin it was served
//     from (the reverse proxy in production);
//   - absolute URL: its host and scheme, and its path when it has one
//     (https://api.example.com/api);
//   - anything else: warned about and reset to host-relative. Resetting rather
//     than leaving the previous values means a typo in SWAGGER_SERVER_URL can
//     never leave a stale server advertised.
func applySwaggerServerURL(serverURL string) {
	serverURL = strings.TrimSpace(serverURL)
	if serverURL == "" {
		setSwaggerServer("", apiBasePath, nil)
		return
	}

	u, err := url.Parse(serverURL)
	if err != nil || u.Host == "" {
		zap.L().Warn("SWAGGER_SERVER_URL is not a valid absolute URL; serving a host-relative spec",
			zap.String("value", serverURL))
		setSwaggerServer("", apiBasePath, nil)
		return
	}

	var schemes []string
	if u.Scheme != "" {
		schemes = []string{u.Scheme}
	}
	setSwaggerServer(u.Host, swaggerBasePath(u.Path), schemes)
}

// swaggerBasePath returns the path carried by the configured server URL (e.g.
// /gateway/api), falling back to apiBasePath when the URL has no path — the
// public URL normally points at the origin and the API still lives under /api.
func swaggerBasePath(path string) string {
	if trimmed := strings.TrimSuffix(path, "/"); trimmed != "" {
		return trimmed
	}
	return apiBasePath
}

func setSwaggerServer(host, basePath string, schemes []string) {
	docs.SwaggerInfo.Host = host
	docs.SwaggerInfo.BasePath = basePath
	if schemes == nil {
		schemes = []string{}
	}
	docs.SwaggerInfo.Schemes = schemes
}

const scalarHTML = `<!doctype html>
<html>
<head>
  <title>GymTrack API</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="/swagger/doc.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
