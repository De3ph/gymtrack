package main

import (
	"log"

	"gymtrack-backend/internal/app"

	"go.uber.org/fx"
)

// @title GymTrack API
// @version 1.0
// @description GymTrack backend API
// @server http://localhost:8080/api Local development
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	fx.New(
		app.RepositoryModule,
	).Run()

	log.Println("Cleaning up...")
}
