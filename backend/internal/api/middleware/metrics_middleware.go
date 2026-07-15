package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	metricsRegistry     *prometheus.Registry
	httpRequestsTotal   *prometheus.CounterVec
	httpRequestDuration *prometheus.HistogramVec
	httpRequestsInFlight prometheus.Gauge
	metricsInitialized  bool
)

func InitMetricsMiddleware(registry *prometheus.Registry) {
	if metricsInitialized {
		return
	}

	metricsRegistry = registry

	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "gymtrack",
			Name:      "http_requests_total",
			Help:      "Total number of HTTP requests processed.",
		},
		[]string{"method", "path", "status"},
	)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "gymtrack",
			Name:      "http_request_duration_seconds",
			Help:      "Duration of HTTP requests in seconds.",
			Buckets:   prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	httpRequestsInFlight = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "gymtrack",
			Name:      "http_requests_in_flight",
			Help:      "Number of HTTP requests currently being served.",
		},
	)

	registry.MustRegister(httpRequestsTotal)
	registry.MustRegister(httpRequestDuration)
	registry.MustRegister(httpRequestsInFlight)

	metricsInitialized = true
}

func MetricsMiddleware() gin.HandlerFunc {
	if !metricsInitialized {
		panic("Metrics middleware not initialized. Call InitMetricsMiddleware first.")
	}

	return func(c *gin.Context) {
		// Skip self-tracking of /metrics endpoint
		if c.Request.URL.Path == "/metrics" {
			c.Next()
			return
		}

		// Skip OPTIONS preflight requests
		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		httpRequestsInFlight.Inc()
		defer httpRequestsInFlight.Dec()

		start := time.Now()
		c.Next()

		path := c.FullPath()
		if path == "" {
			path = "unknown"
		}

		method := c.Request.Method
		status := strconv.Itoa(c.Writer.Status())
		duration := time.Since(start).Seconds()

		httpRequestDuration.WithLabelValues(method, path).Observe(duration)
		httpRequestsTotal.WithLabelValues(method, path, status).Inc()
	}
}
