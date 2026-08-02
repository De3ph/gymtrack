package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// DefaultMaxBodyBytes is the default request body size limit (1 MiB).
const DefaultMaxBodyBytes = 1 << 20

// BodyLimitMiddleware caps request body size to maxBytes.
// Uses http.MaxBytesReader which returns an error when exceeded.
// Pass 0 to use DefaultMaxBodyBytes.
func BodyLimitMiddleware(maxBytes int64) gin.HandlerFunc {
	if maxBytes <= 0 {
		maxBytes = DefaultMaxBodyBytes
	}
	return func(c *gin.Context) {
		if c.Request.ContentLength < 0 || c.Request.ContentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "request body too large",
			})
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
