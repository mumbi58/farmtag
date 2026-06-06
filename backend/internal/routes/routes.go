package routes

import (
	"github.com/labstack/echo/v4"
	"farmtag/internal/handlers"
	"farmtag/internal/middleware"
)

func Register(e *echo.Echo) {
	api := e.Group("/api/v1")

	// Legal / web routes
	e.GET("/terms", handlers.ServeStaticPage("Terms of Service", `
		Welcome to FarmTag. By using our application, you agree to these terms.<br><br>
		1. <b>Account Responsibilities</b>: You are responsible for safeguarding your login credentials.<br>
		2. <b>Data Usage</b>: We do not sell your data. We use it solely to improve farm management analytics.<br>
		3. <b>Service Availability</b>: We strive for 99.9% uptime but cannot guarantee uninterrupted service.<br>
		4. <b>Termination</b>: We reserve the right to suspend accounts that violate these terms.
	`))
	e.GET("/privacy", handlers.ServeStaticPage("Privacy Policy", `
		At FarmTag, your privacy is a priority.<br><br>
		<b>Information Collection</b><br>
		We collect basic profile details (Name, Email, Phone) and your farm records. This data is strictly used to provide the FarmTag service.<br><br>
		<b>Data Sharing</b><br>
		We will never sell or rent your personal data to third parties. Data is encrypted in transit and at rest.<br><br>
		<b>Your Rights</b><br>
		You have the right to request a copy of your data or have it deleted at any time through our app settings.
	`))
	e.GET("/account-deletion", handlers.ServeStaticPage("Account Deletion", `
		<b>How to Delete Your Account</b><br><br>
		1. Open the FarmTag application.<br>
		2. Go to <b>Settings</b> > <b>Danger Zone</b> > <b>Delete Account</b>.<br>
		3. Confirm the deletion.<br><br>
		<b>What Happens Next?</b><br>
		Your profile and associated farm data will be soft-deleted immediately. If you wish to hard-delete your data, please email support@farmtag.app. Soft-deleted data is retained for 30 days before being permanently removed from our databases.
	`))


	// Public
	auth := api.Group("/auth")
	auth.POST("/register", handlers.Register)
	auth.POST("/login", handlers.Login)
	auth.POST("/forgot-password", handlers.ForgotPassword)
auth.POST("/reset-password", handlers.ResetPassword)

	// Protected
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())

	// Profile Profile
	protected.PUT("/profile", handlers.UpdateProfile)
	protected.DELETE("/profile", handlers.DeleteProfile)

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
	protected.POST("/animals/:id/sell", handlers.SellAnimal)

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