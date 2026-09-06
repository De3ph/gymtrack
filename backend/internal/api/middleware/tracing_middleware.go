package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// TracingMiddleware creates a server span for every HTTP request and puts it
// in the request context so logger.From can inject trace_id/span_id into logs.
// The span is named "<METHOD> <route-pattern>" (bounded cardinality) once the
// route matches, and records the response status as an attribute.
func TracingMiddleware() gin.HandlerFunc {
	tracer := otel.Tracer("gymtrack-backend/http")
	return func(c *gin.Context) {
		if c.Request.URL.Path == "/metrics" || c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		ctx, span := tracer.Start(
			c.Request.Context(),
			c.Request.Method,
			trace.WithSpanKind(trace.SpanKindServer),
			trace.WithAttributes(
				semconv.HTTPRequestMethodKey.String(c.Request.Method),
				semconv.URLScheme(c.Request.URL.Scheme),
				semconv.ServerAddress(c.Request.Host),
				// Raw path only as best-effort; span renamed to the route
				// pattern after routing to keep span names low-cardinality.
				semconv.URLPath(c.Request.URL.Path),
			),
		)
		defer span.End()

		c.Request = c.Request.WithContext(ctx)
		c.Next()

		route := c.FullPath()
		if route == "" {
			route = "unknown"
		}
		span.SetName(c.Request.Method + " " + route)

		status := c.Writer.Status()
		span.SetAttributes(semconv.HTTPResponseStatusCode(status))
		if status >= http.StatusInternalServerError {
			span.SetStatus(codes.Error, http.StatusText(status))
		}
	}
}
