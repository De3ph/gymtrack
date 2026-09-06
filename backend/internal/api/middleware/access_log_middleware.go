package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	logger "gymtrack-backend/internal/infrastructure/log"
)

// AccessLogMiddleware logs every HTTP request as a structured zap entry with
// method, route, status, latency, and client IP. Uses logger.From so requests
// carrying a valid span include trace_id/span_id for Grafana correlation.
func AccessLogMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.URL.Path == "/metrics" || c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		log := logger.From(c.Request.Context())
		log.Info("http_request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("route", c.FullPath()),
			zap.Int("status", status),
			zap.Duration("duration", time.Since(start)),
			zap.String("client_ip", c.ClientIP()),
		)
		if status >= http.StatusInternalServerError {
			log.Warn("http_request_failed", zap.Int("status", status))
		}
	}
}
