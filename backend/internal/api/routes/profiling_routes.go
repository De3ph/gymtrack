package routes

import (
	"net/http/pprof"

	"github.com/gin-gonic/gin"
)

// RegisterProfilingRoutes mounts net/http/pprof handlers under /debug/pprof
// when enabled (PPROF_ENABLED=true). Disabled by default — pprof endpoints
// must never be exposed on hosts reachable from untrusted networks.
func RegisterProfilingRoutes(router *gin.Engine, enabled bool) {
	if !enabled {
		return
	}
	debug := router.Group("/debug/pprof")
	debug.GET("/", gin.WrapF(pprof.Index))
	debug.GET("/cmdline", gin.WrapF(pprof.Cmdline))
	debug.GET("/profile", gin.WrapF(pprof.Profile))
	debug.POST("/symbol", gin.WrapF(pprof.Symbol))
	debug.GET("/symbol", gin.WrapF(pprof.Symbol))
	debug.GET("/trace", gin.WrapF(pprof.Trace))
	debug.GET("/allocs", gin.WrapH(pprof.Handler("allocs")))
	debug.GET("/block", gin.WrapH(pprof.Handler("block")))
	debug.GET("/goroutine", gin.WrapH(pprof.Handler("goroutine")))
	debug.GET("/heap", gin.WrapH(pprof.Handler("heap")))
	debug.GET("/mutex", gin.WrapH(pprof.Handler("mutex")))
	debug.GET("/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
}
