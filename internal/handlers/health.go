package handlers

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

func CreateHealthRecord(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[HEALTH] CreateHealthRecord request — UserID: %s", userID)

	req := new(models.CreateHealthRecordRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[HEALTH] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Validate animal belongs to user
	var count int
	err := db.DB.Get(&count, `
		SELECT COUNT(*) FROM animals a
		JOIN farms f ON f.id = a.farm_id
		WHERE a.id=$1 AND f.user_id=$2 AND a.is_deleted=false
	`, req.AnimalID, userID)
	if err != nil || count == 0 {
		log.Printf("[HEALTH] Animal not found — AnimalID: %s | UserID: %s", req.AnimalID, userID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Animal not found"})
	}

	var record models.HealthRecord
	query := `
		INSERT INTO health_records (animal_id, record_type, description, cost, done_at, next_due_at)
		VALUES ($1, $2, $3, NULLIF($4, 0), $5::DATE, NULLIF($6,'')::DATE)
		RETURNING id, animal_id, record_type, description, cost, done_at, next_due_at, created_at
	`
	err = db.DB.QueryRowx(query,
		req.AnimalID, req.RecordType, req.Description,
		req.Cost, req.DoneAt, req.NextDueAt,
	).StructScan(&record)
	if err != nil {
		log.Printf("[HEALTH] Insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create health record"})
	}

	log.Printf("[HEALTH] Health record created — ID: %s | Animal: %s | Type: %s | NextDue: %v",
		record.ID, req.AnimalID, req.RecordType, record.NextDueAt)
	return c.JSON(http.StatusCreated, record)
}

func GetHealthRecords(c echo.Context) error {
	userID := c.Get("user_id").(string)
	animalID := c.QueryParam("animal_id")
	log.Printf("[HEALTH] GetHealthRecords — UserID: %s | AnimalID: %s", userID, animalID)

	var records []models.HealthRecord
	var err error

	if animalID != "" {
		err = db.DB.Select(&records, `
			SELECT h.* FROM health_records h
			JOIN animals a ON a.id = h.animal_id
			JOIN farms f ON f.id = a.farm_id
			WHERE h.animal_id=$1 AND f.user_id=$2
			ORDER BY h.done_at DESC
		`, animalID, userID)
	} else {
		err = db.DB.Select(&records, `
			SELECT h.* FROM health_records h
			JOIN animals a ON a.id = h.animal_id
			JOIN farms f ON f.id = a.farm_id
			WHERE f.user_id=$1
			ORDER BY h.done_at DESC
		`, userID)
	}

	if err != nil {
		log.Printf("[HEALTH] GetHealthRecords query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch health records"})
	}

	log.Printf("[HEALTH] GetHealthRecords returned %d records", len(records))
	return c.JSON(http.StatusOK, records)
}

func GetUpcomingHealthReminders(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[HEALTH] GetUpcomingReminders — UserID: %s", userID)

	var records []models.HealthRecord
	err := db.DB.Select(&records, `
		SELECT h.* FROM health_records h
		JOIN animals a ON a.id = h.animal_id
		JOIN farms f ON f.id = a.farm_id
		WHERE f.user_id=$1
		AND h.next_due_at IS NOT NULL
		AND h.next_due_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
		ORDER BY h.next_due_at ASC
	`, userID)
	if err != nil {
		log.Printf("[HEALTH] GetUpcomingReminders query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch reminders"})
	}

	log.Printf("[HEALTH] GetUpcomingReminders returned %d upcoming records", len(records))
	return c.JSON(http.StatusOK, records)
}