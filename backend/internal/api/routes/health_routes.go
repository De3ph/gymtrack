package routes

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// RegisterHealthRoutes registers the liveness/readiness probes outside /api.
//
//	GET /livez   - liveness: process is up, no dependencies checked. Use this
//	               for restart decisions, so a DB outage does not restart pods.
//	GET /readyz  - readiness: database is reachable. 503 when the DB ping
//	               fails so orchestrators stop routing traffic to this instance.
//	GET /healthz - alias of /readyz, kept for existing Docker/compose probes.
func RegisterHealthRoutes(router *gin.Engine, pool *pgxpool.Pool) {
	router.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	ready := func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		if err := pool.Ping(ctx); err != nil {
			zap.L().Warn("health probe: database ping failed", zap.Error(err))
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  "database unreachable",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}

	router.GET("/readyz", ready)
	router.GET("/healthz", ready)
}
