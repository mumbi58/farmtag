package handlers

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

func GetDashboard(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[DASHBOARD] GetDashboard request — UserID: %s", userID)

	stats := models.DashboardStats{}

	// Total farms
	err := db.DB.Get(&stats.TotalFarms, "SELECT COUNT(*) FROM farms WHERE user_id=$1", userID)
	if err != nil {
		log.Printf("[DASHBOARD] TotalFarms error: %v", err)
	}
	log.Printf("[DASHBOARD] TotalFarms: %d", stats.TotalFarms)

	// Total active animals
	err = db.DB.Get(&stats.TotalAnimals, `
		SELECT COUNT(*) FROM animals a
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1 AND a.is_deleted=false AND a.is_sold=false
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] TotalAnimals error: %v", err)
	}
	log.Printf("[DASHBOARD] TotalAnimals: %d", stats.TotalAnimals)

	// Total animals sold
	err = db.DB.Get(&stats.AnimalsSold, `
		SELECT COUNT(*) FROM animals a
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1 AND a.is_sold=true AND a.is_deleted=false
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] AnimalsSold error: %v", err)
	}
	log.Printf("[DASHBOARD] AnimalsSold: %d", stats.AnimalsSold)

	// Total invested (buying prices)
	err = db.DB.Get(&stats.TotalInvested, `
		SELECT COALESCE(SUM(ap.buying_price), 0)
		FROM animal_purchases ap
		JOIN animals a ON a.id = ap.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1 AND a.is_deleted=false
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] TotalInvested error: %v", err)
	}
	log.Printf("[DASHBOARD] TotalInvested: %.2f", stats.TotalInvested)

	// Total earned (selling prices)
	err = db.DB.Get(&stats.TotalEarned, `
		SELECT COALESCE(SUM(s.selling_price), 0)
		FROM animal_sales s
		JOIN animals a ON a.id = s.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1 AND a.is_deleted=false
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] TotalEarned error: %v", err)
	}
	log.Printf("[DASHBOARD] TotalEarned: %.2f", stats.TotalEarned)

	// Profit/Loss
	stats.ProfitLoss = stats.TotalEarned - stats.TotalInvested
	log.Printf("[DASHBOARD] ProfitLoss: %.2f", stats.ProfitLoss)

	// Active pregnancies
	err = db.DB.Get(&stats.ActivePregnancies, `
		SELECT COUNT(*) FROM pregnancies p
		JOIN animals a ON a.id = p.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1 AND p.status='pregnant'
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] ActivePregnancies error: %v", err)
	}
	log.Printf("[DASHBOARD] ActivePregnancies: %d", stats.ActivePregnancies)

	// Births due in next 30 days
	err = db.DB.Get(&stats.BirthsDueIn30Days, `
		SELECT COUNT(*) FROM pregnancies p
		JOIN animals a ON a.id = p.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1
		AND p.status='pregnant'
		AND p.expected_birth_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] BirthsDueIn30Days error: %v", err)
	}
	log.Printf("[DASHBOARD] BirthsDueIn30Days: %d", stats.BirthsDueIn30Days)

	log.Printf("[DASHBOARD] Stats compiled successfully for UserID: %s", userID)
	return c.JSON(http.StatusOK, stats)
}

func GetUpcomingBirths(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[DASHBOARD] GetUpcomingBirths — UserID: %s", userID)

	var upcoming []models.UpcomingBirth
	err := db.DB.Select(&upcoming, `
		SELECT
			p.id as pregnancy_id,
			a.id as animal_id,
			a.tag_number,
			a.type as animal_type,
			f.name as farm_name,
			TO_CHAR(p.expected_birth_at, 'YYYY-MM-DD') as expected_birth_at,
			(p.expected_birth_at::DATE - CURRENT_DATE) as days_remaining
		FROM pregnancies p
		JOIN animals a ON a.id = p.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1
		AND p.status='pregnant'
		AND p.expected_birth_at >= CURRENT_DATE
		ORDER BY p.expected_birth_at ASC
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] GetUpcomingBirths query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch upcoming births"})
	}

	log.Printf("[DASHBOARD] GetUpcomingBirths returned %d upcoming births", len(upcoming))
	return c.JSON(http.StatusOK, upcoming)
}

func GetAnimalFinancials(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[DASHBOARD] GetAnimalFinancials — UserID: %s", userID)

	var financials []models.AnimalFinancials
	err := db.DB.Select(&financials, `
		SELECT
			a.id as animal_id,
			a.tag_number,
			a.name,
			a.type,
			COALESCE(ap.buying_price, 0) as buying_price,
			COALESCE(s.selling_price, 0) as selling_price,
			COALESCE(s.selling_price, 0) - COALESCE(ap.buying_price, 0) as profit_loss
		FROM animals a
		JOIN farms f ON f.id = a.farm_id
		LEFT JOIN animal_purchases ap ON ap.animal_id = a.id
		LEFT JOIN animal_sales s ON s.animal_id = a.id
		WHERE f.user_id=$1 AND a.is_deleted=false
		ORDER BY profit_loss DESC
	`, userID)
	if err != nil {
		log.Printf("[DASHBOARD] GetAnimalFinancials query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch financials"})
	}

	log.Printf("[DASHBOARD] GetAnimalFinancials returned %d animals", len(financials))
	return c.JSON(http.StatusOK, financials)
}