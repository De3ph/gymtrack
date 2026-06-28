package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"gymtrack-backend/internal/app"
	"gymtrack-backend/internal/config"

	_ "github.com/swaggo/files"
	_ "github.com/swaggo/gin-swagger"
	"go.uber.org/fx"
)

func main() {
	// Load configuration (required for initialization)
	_ = config.LoadConfig()

	// Build and run fx application
	_ = fx.New(
		app.RepositoryModule,
	)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Cleanup
	log.Println("Cleaning up...")
	config.DisconnectCouchbase()
}
