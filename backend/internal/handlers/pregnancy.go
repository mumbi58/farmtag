package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

// pregnancyDuration returns expected birth date based on animal type
func pregnancyDuration(animalType string) time.Duration {
	durations := map[string]int{
		"cow":   283,
		"goat":  150,
		"sheep": 147,
		"pig":   114,
		"camel": 390,
	}
	days, ok := durations[animalType]
	if !ok {
		days = 280 // default
	}
	return time.Duration(days) * 24 * time.Hour
}

func CreatePregnancy(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[PREGNANCY] CreatePregnancy request — UserID: %s", userID)

	req := new(models.CreatePregnancyRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[PREGNANCY] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Validate animal belongs to user
	var animal models.Animal
	err := db.DB.Get(&animal, `
		SELECT a.* FROM animals a
		JOIN farms f ON f.id = a.farm_id
		WHERE a.id=$1 AND f.user_id=$2 AND a.is_deleted=false
	`, req.AnimalID, userID)
	if err != nil {
		log.Printf("[PREGNANCY] Animal not found — AnimalID: %s | UserID: %s", req.AnimalID, userID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Animal not found"})
	}

	// Only females can get pregnant
	if animal.Gender != "female" {
		log.Printf("[PREGNANCY] CreatePregnancy failed — animal %s is not female", req.AnimalID)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Only female animals can be pregnant"})
	}

	// Check no active pregnancy
	var activeCount int
	db.DB.Get(&activeCount, `
		SELECT COUNT(*) FROM pregnancies
		WHERE animal_id=$1 AND status='pregnant'
	`, req.AnimalID)
	if activeCount > 0 {
		log.Printf("[PREGNANCY] CreatePregnancy failed — animal %s already pregnant", req.AnimalID)
		return c.JSON(http.StatusConflict, map[string]string{"error": "Animal already has an active pregnancy"})
	}

	// Parse conceived date
	conceived, err := time.Parse("2006-01-02", req.ConcevedAt)
	if err != nil {
		log.Printf("[PREGNANCY] Invalid conceived_at date: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid date format. Use YYYY-MM-DD"})
	}

	// Auto calculate expected birth
	expectedBirth := conceived.Add(pregnancyDuration(animal.Type))
	log.Printf("[PREGNANCY] Calculated expected birth — Animal: %s | Type: %s | Conceived: %s | Expected: %s",
		animal.TagNumber, animal.Type, conceived.Format("2006-01-02"), expectedBirth.Format("2006-01-02"))

	var pregnancy models.Pregnancy
	query := `
		INSERT INTO pregnancies (animal_id, conceived_at, expected_birth_at, status, notes)
		VALUES ($1, $2, $3, 'pregnant', NULLIF($4,''))
		RETURNING id, animal_id, conceived_at, expected_birth_at, actual_birth_at, status, notes, created_at, updated_at
	`
	err = db.DB.QueryRowx(query, req.AnimalID, conceived, expectedBirth, req.Notes).StructScan(&pregnancy)
	if err != nil {
		log.Printf("[PREGNANCY] Insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to record pregnancy"})
	}

	log.Printf("[PREGNANCY] Pregnancy recorded — ID: %s | AnimalID: %s | Expected: %s",
		pregnancy.ID, pregnancy.AnimalID, pregnancy.ExpectedBirthAt.Format("2006-01-02"))
	return c.JSON(http.StatusCreated, pregnancy)
}

func GetPregnancies(c echo.Context) error {
	userID := c.Get("user_id").(string)
	animalID := c.QueryParam("animal_id")
	status := c.QueryParam("status")
	log.Printf("[PREGNANCY] GetPregnancies — UserID: %s | AnimalID: %s | Status: %s", userID, animalID, status)

	query := `
		SELECT p.* FROM pregnancies p
		JOIN animals a ON a.id = p.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1
	`
	args := []interface{}{userID}
	argIdx := 2

	if animalID != "" {
		query += ` AND p.animal_id=$` + itoa(argIdx)
		args = append(args, animalID)
		argIdx++
	}
	if status != "" {
		query += ` AND p.status=$` + itoa(argIdx)
		args = append(args, status)
	}
	query += ` ORDER BY p.created_at DESC`

	var pregnancies []models.Pregnancy
	err := db.DB.Select(&pregnancies, query, args...)
	if err != nil {
		log.Printf("[PREGNANCY] GetPregnancies query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch pregnancies"})
	}

	log.Printf("[PREGNANCY] GetPregnancies returned %d records", len(pregnancies))
	return c.JSON(http.StatusOK, pregnancies)
}

func UpdatePregnancy(c echo.Context) error {
	userID := c.Get("user_id").(string)
	pregnancyID := c.Param("id")
	log.Printf("[PREGNANCY] UpdatePregnancy — ID: %s | UserID: %s", pregnancyID, userID)

	req := new(models.UpdatePregnancyRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[PREGNANCY] UpdatePregnancy bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var pregnancy models.Pregnancy
	query := `
		UPDATE pregnancies SET
			status = COALESCE(NULLIF($1,''), status),
			actual_birth_at = COALESCE(NULLIF($2,'')::DATE, actual_birth_at),
			notes = COALESCE(NULLIF($3,''), notes),
			updated_at = CURRENT_TIMESTAMP
		WHERE id=$4
		RETURNING id, animal_id, conceived_at, expected_birth_at, actual_birth_at, status, notes, created_at, updated_at
	`
	err := db.DB.QueryRowx(query, req.Status, req.ActualBirthAt, req.Notes, pregnancyID).StructScan(&pregnancy)
	if err != nil {
		log.Printf("[PREGNANCY] UpdatePregnancy error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update pregnancy"})
	}

	log.Printf("[PREGNANCY] Pregnancy updated — ID: %s | Status: %s", pregnancy.ID, pregnancy.Status)
	return c.JSON(http.StatusOK, pregnancy)
}

// helper
func itoa(i int) string {
	return string(rune('0' + i))
}