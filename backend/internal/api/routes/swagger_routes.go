package routes

import (
	"net/http"

	"gymtrack-backend/docs"

	"github.com/gin-gonic/gin"
)

func RegisterSwaggerRoutes(router *gin.Engine) {
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
