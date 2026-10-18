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
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
//
// The OpenAPI server URL is not baked in here: it is applied at runtime from
// SWAGGER_SERVER_URL (see routes.RegisterSwaggerRoutes). Empty keeps the spec
// host-relative so the Scalar UI targets the origin it is served from.
func main() {
	logger.Init()
	defer logger.Sync()

	fx.New(
		app.RepositoryModule,
		fx.WithLogger(func() fxevent.Logger { return logger.NewZapLogger() }),
	).Run()

	zap.L().Info("Cleaning up...")
}
