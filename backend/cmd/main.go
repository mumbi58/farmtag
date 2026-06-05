package main

import (
	"log"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	"farmtag/config"	
	
	"farmtag/db"
	customMiddleware "farmtag/internal/middleware"
	"farmtag/internal/routes"
)

func main() {
	// Load config
	config.Load()

	// Connect to DB
	db.Connect()
	defer db.Close()

	// Init Echo
	e := echo.New()
	e.HideBanner = true

	// Middleware
	e.Use(echoMiddleware.Recover())
	e.Use(echoMiddleware.CORS())
	e.Use(customMiddleware.Logger())

	// replace the health check and add routes
e.GET("/health", func(c echo.Context) error {
    log.Println("[HEALTH] Health check called")
    return c.JSON(200, map[string]string{
        "status": "ok",
        "app":    config.App.AppName,
    })
})

routes.Register(e)

	// Start server
	port := ":" + config.App.AppPort
	log.Printf("[SERVER] %s starting on port %s", config.App.AppName, port)

	if err := e.Start(port); err != nil {
		log.Fatalf("[SERVER] Failed to start: %v", err)
	}
}