package routes

import (
	"github.com/labstack/echo/v4"
	"farmtag/internal/handlers"
	"farmtag/internal/middleware"
)

func Register(e *echo.Echo) {
	api := e.Group("/api/v1")

	// Public routes
	auth := api.Group("/auth")
	auth.POST("/register", handlers.Register)
	auth.POST("/login", handlers.Login)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())

	// We will add more routes here as we build
	_ = protected
}