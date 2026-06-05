package routes

import (
	"github.com/labstack/echo/v4"
	"farmtag/internal/handlers"
	"farmtag/internal/middleware"
)

func Register(e *echo.Echo) {
	api := e.Group("/api/v1")

	// Public
	auth := api.Group("/auth")
	auth.POST("/register", handlers.Register)
	auth.POST("/login", handlers.Login)

	// Protected
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())

	// Dashboard
	protected.GET("/dashboard", handlers.GetDashboard)
	protected.GET("/dashboard/upcoming-births", handlers.GetUpcomingBirths)
	protected.GET("/dashboard/financials", handlers.GetAnimalFinancials)

	// Farms
	protected.POST("/farms", handlers.CreateFarm)
	protected.GET("/farms", handlers.GetFarms)
	protected.GET("/farms/:id", handlers.GetFarm)
	protected.PUT("/farms/:id", handlers.UpdateFarm)
	protected.DELETE("/farms/:id", handlers.DeleteFarm)

	// Animals
	protected.POST("/animals", handlers.CreateAnimal)
	protected.GET("/animals", handlers.GetAnimals)
	protected.GET("/animals/:id", handlers.GetAnimal)
	protected.PUT("/animals/:id", handlers.UpdateAnimal)
	protected.DELETE("/animals/:id", handlers.DeleteAnimal)

	// Pregnancies
	protected.POST("/pregnancies", handlers.CreatePregnancy)
	protected.GET("/pregnancies", handlers.GetPregnancies)
	protected.PUT("/pregnancies/:id", handlers.UpdatePregnancy)

	// Births
	protected.POST("/births", handlers.RecordBirth)
	protected.GET("/births", handlers.GetBirths)

	// Health Records
	protected.POST("/health-records", handlers.CreateHealthRecord)
	protected.GET("/health-records", handlers.GetHealthRecords)
	protected.GET("/health-records/reminders", handlers.GetUpcomingHealthReminders)

	// Expenses
	protected.POST("/expenses", handlers.CreateExpense)
	protected.GET("/expenses", handlers.GetExpenses)
	protected.GET("/expenses/summary", handlers.GetExpenseSummary)
	protected.DELETE("/expenses/:id", handlers.DeleteExpense)
}