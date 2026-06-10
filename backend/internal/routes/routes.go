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
		<span class="badge">Terms & Conditions</span>
		<p>Welcome to FarmTag. Please read these Terms of Service carefully before using our mobile application and backend services operated by Kerdonet.</p>

		<h2>1. Agreement to Terms</h2>
		<p>By accessing or using FarmTag, you agree to be bound by these terms. If you disagree with any part of the terms, you may not access the service.</p>

		<h2>2. User Accounts</h2>
		<p>When you create an account, you must provide accurate, complete, and current information. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>
		<ul>
			<li>You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
			<li>You may not use as a username the name of another person or entity or that is not lawfully available for use.</li>
		</ul>

		<h2>3. Data & Intellectual Property</h2>
		<p>Your farm records, livestock logs, and reports belong entirely to you. FarmTag does not claim ownership of the content you upload. However, by using the service, you grant us the right to process this data to generate insights, analytics, and performance optimization suggestions for your farm.</p>

		<h2>4. Service Availability & Modification</h2>
		<p>We strive to keep the service operational at all times. However, we reserve the right to withdraw or amend our service, and any service or material we provide, in our sole discretion without notice. We will not be liable if for any reason all or any part of the service is unavailable at any time or for any period.</p>

		<h2>5. Support & Communications</h2>
		<p>For any technical help, questions regarding your billing, subscription features, or feedback, please reach out to our dedicated support team at <a href="mailto:info@kerdonet.com">info@kerdonet.com</a>.</p>

		<h2>6. Termination</h2>
		<p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
	`))
	e.GET("/privacy", handlers.ServeStaticPage("Privacy Policy", `
		<span class="badge">Privacy Policy</span>
		<p>At FarmTag, we value your privacy above all else. This Privacy Policy details how we collect, store, secure, and process your personal information and farm records.</p>

		<h2>1. Information We Collect</h2>
		<p>We collect information to provide a better, more automated experience for farm management. This includes:</p>
		<ul>
			<li><strong>Personal Profile Details:</strong> Your name, email address, and phone number when you register.</li>
			<li><strong>Farm Management Data:</strong> Livestock records, birth cycles, weight, breed details, health logs, and financial transactions (expenses/sales).</li>
			<li><strong>Device Information:</strong> Push notification tokens (with your permission) to deliver timely reminders.</li>
		</ul>

		<h2>2. How We Use Your Data</h2>
		<p>We use the collected information to:</p>
		<ul>
			<li>Provide and maintain the FarmTag platform.</li>
			<li>Generate financial dashboard analytics and productivity reports.</li>
			<li>Deliver push notification alerts for animal health cycles, breeding due dates, and custom farm reminders.</li>
			<li>Answer support requests and improve overall app functionality.</li>
		</ul>

		<div class="highlight-box">
			<p><strong>Zero Sale Guarantee:</strong> We do not sell, rent, or trade your personal or farm data to third parties. Your data is used exclusively to run your farm management system.</p>
		</div>

		<h2>3. Data Protection and Encryption</h2>
		<p>We implement industry-standard security measures including SSL/TLS encryption for all data in transit, and secure AES-256 database storage at rest. Your account credentials are cryptographically hashed and never visible to our administrators.</p>

		<h2>4. Third-Party Integrations</h2>
		<p>If you sign in using Apple or Google, we receive only your public profile details (such as your name and verified email address). If you choose to hide your email via Apple's private relay, we respect that choice completely.</p>

		<h2>5. Accessing and Deleting Your Data</h2>
		<p>You have the absolute right to view, export, or delete your data at any time. You can request account deletion directly from the mobile app. For any custom data export request or concerns, email us at <a href="mailto:info@kerdonet.com">info@kerdonet.com</a>.</p>
	`))
	e.GET("/account-deletion", handlers.ServeStaticPage("Account Deletion", `
		<span class="badge">Account Deletion Policy</span>
		<p>We are sorry to see you go! If you decide to close your FarmTag account, this page explains the options and procedures for deleting your profile and farm records.</p>

		<h2>How to Delete Your Account</h2>
		<p>To request deletion, you can do so directly from your phone in just a few taps:</p>
		<ol>
			<li>Open the <strong>FarmTag</strong> application.</li>
			<li>Navigate to <strong>Settings</strong> (by tapping your profile avatar in the dashboard and selecting Settings).</li>
			<li>Scroll down to the <strong>Danger Zone</strong> section.</li>
			<li>Tap <strong>Delete Account</strong>.</li>
			<li>Confirm your decision. Your session will be logged out immediately.</li>
		</ol>

		<h2>What Happens to Your Data?</h2>
		<ul>
			<li><strong>Soft Deletion:</strong> Your account is immediately deactivated. Your profile, farm lists, and animal databases are hidden from active views.</li>
			<li><strong>30-Day Recovery Period:</strong> Your data is stored securely in our archive for 30 days. If you made a mistake or changed your mind, you can recover your account by emailing us.</li>
			<li><strong>Permanent Deletion:</strong> After 30 days, all your farm data, history, health records, and profile details will be permanently and irreversibly purged from our production databases.</li>
		</ul>

		<div class="highlight-box">
			<p><strong>Immediate Hard Deletion:</strong> If you wish to bypass the 30-day grace period and have your data permanently deleted immediately, please send a request from your registered email address to <a href="mailto:info@kerdonet.com">info@kerdonet.com</a>.</p>
		</div>
	`))


	// Public
	auth := api.Group("/auth")
	auth.POST("/register", handlers.Register)
	auth.POST("/login", handlers.Login)
	auth.POST("/forgot-password", handlers.ForgotPassword)
	auth.POST("/reset-password", handlers.ResetPassword)
	auth.POST("/google", handlers.GoogleLogin)
	auth.POST("/apple", handlers.AppleLogin)

	// Webhooks
	api.POST("/payments/revenuecat-webhook", handlers.RevenueCatWebhook)

	// Protected
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())

	// Profile Profile
	protected.PUT("/profile", handlers.UpdateProfile)
	protected.DELETE("/profile", handlers.DeleteProfile)
	protected.POST("/profile/push-token", handlers.SetPushToken)
	protected.POST("/profile/test-push", handlers.TestPushNotification)
	protected.POST("/payments/verify-purchase", handlers.VerifyRevenueCatPurchase)

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