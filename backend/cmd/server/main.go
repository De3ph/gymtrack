package main

import (
	"log"

	"gymtrack-backend/internal/app"

	_ "github.com/swaggo/files"
	_ "github.com/swaggo/gin-swagger"
	"go.uber.org/fx"
)

func main() {
	fx.New(
		app.RepositoryModule,
	).Run()

	log.Println("Cleaning up...")
}
