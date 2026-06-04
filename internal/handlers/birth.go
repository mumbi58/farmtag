package handlers

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

func RecordBirth(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[BIRTH] RecordBirth request — UserID: %s", userID)

	req := new(models.CreateBirthRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[BIRTH] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.TotalOffspring == 0 {
		req.TotalOffspring = 1
	}

	// Validate pregnancy exists
	var pregnancy models.Pregnancy
	err := db.DB.Get(&pregnancy, "SELECT * FROM pregnancies WHERE id=$1", req.PregnancyID)
	if err != nil {
		log.Printf("[BIRTH] Pregnancy not found — ID: %s", req.PregnancyID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Pregnancy record not found"})
	}

	// Get mother animal for farm info
	var mother models.Animal
	db.DB.Get(&mother, "SELECT * FROM animals WHERE id=$1", req.MotherID)

	// Record birth
	var birth models.Birth
	query := `
		INSERT INTO births (pregnancy_id, mother_id, birth_date, total_offspring, notes)
		VALUES ($1, $2, $3::DATE, $4, NULLIF($5,''))
		RETURNING id, pregnancy_id, mother_id, birth_date, total_offspring, notes, created_at
	`
	err = db.DB.QueryRowx(query,
		req.PregnancyID, req.MotherID, req.BirthDate, req.TotalOffspring, req.Notes,
	).StructScan(&birth)
	if err != nil {
		log.Printf("[BIRTH] Insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to record birth"})
	}

	// Update pregnancy status to delivered
	db.DB.Exec(`
		UPDATE pregnancies SET status='delivered', actual_birth_at=$1::DATE, updated_at=CURRENT_TIMESTAMP
		WHERE id=$2
	`, req.BirthDate, req.PregnancyID)
	log.Printf("[BIRTH] Pregnancy %s marked as delivered", req.PregnancyID)

	// Auto create offspring animals
	offspringCreated := 0
	for _, o := range req.Offspring {
		if o.TagNumber == "" || o.Gender == "" {
			log.Printf("[BIRTH] Skipping offspring — missing tag or gender")
			continue
		}
		_, err := db.DB.Exec(`
			INSERT INTO animals (farm_id, mother_id, tag_number, name, type, breed, gender, date_of_birth)
			VALUES ($1, $2, $3, NULLIF($4,''), $5, $6, $7, $8::DATE)
		`, mother.FarmID, req.MotherID, o.TagNumber, o.Name,
			mother.Type, mother.Breed, o.Gender, req.BirthDate)
		if err != nil {
			log.Printf("[BIRTH] Failed to create offspring tag %s: %v", o.TagNumber, err)
		} else {
			offspringCreated++
			log.Printf("[BIRTH] Offspring created — Tag: %s | Gender: %s | Mother: %s",
				o.TagNumber, o.Gender, mother.TagNumber)
		}
	}

	log.Printf("[BIRTH] Birth recorded — ID: %s | Mother: %s | Offspring: %d created",
		birth.ID, mother.TagNumber, offspringCreated)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"birth":             birth,
		"offspring_created": offspringCreated,
	})
}

func GetBirths(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[BIRTH] GetBirths request — UserID: %s", userID)

	var births []models.Birth
	err := db.DB.Select(&births, `
		SELECT b.* FROM births b
		JOIN animals a ON a.id = b.mother_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1
		ORDER BY b.birth_date DESC
	`, userID)
	if err != nil {
		log.Printf("[BIRTH] GetBirths query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch births"})
	}

	log.Printf("[BIRTH] GetBirths returned %d records for UserID: %s", len(births), userID)
	return c.JSON(http.StatusOK, births)
}