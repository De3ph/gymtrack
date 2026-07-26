package main

import (
	"gymtrack-backend/internal/app"
	logger "gymtrack-backend/internal/infrastructure/log"

	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
)

// @title GymTrack API
// @version 1.0
// @description GymTrack backend API
// @server http://localhost:8080/api Local development
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	logger.Init()
	defer logger.Sync()

	fx.New(
		app.RepositoryModule,
		fx.WithLogger(func() fxevent.Logger { return logger.NewZapLogger() }),
	).Run()

	zap.L().Info("Cleaning up...")
}
