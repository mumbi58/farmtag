package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

func CreateFarm(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[FARM] CreateFarm request — UserID: %s", userID)

	req := new(models.CreateFarmRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[FARM] CreateFarm bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.Name == "" {
		log.Println("[FARM] CreateFarm validation failed — name is required")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Farm name is required"})
	}

	// Check premium — limit to 1 farm for free users
	var farmCount int
	err := db.DB.Get(&farmCount, "SELECT COUNT(*) FROM farms WHERE user_id=$1", userID)
	if err != nil {
		log.Printf("[FARM] CreateFarm count error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	var user models.User
	err = db.DB.Get(&user, "SELECT is_premium FROM users WHERE id=$1", userID)
	if err != nil {
		log.Printf("[FARM] CreateFarm user fetch error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	if !user.IsPremium && farmCount >= 1 {
		log.Printf("[FARM] CreateFarm blocked — free user %s already has %d farm(s)", userID, farmCount)
		return c.JSON(http.StatusForbidden, map[string]string{"error": "Upgrade to premium to create multiple farms"})
	}

	var farm models.Farm
	query := `
		INSERT INTO farms (user_id, name, location)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, name, location, created_at, updated_at
	`
	err = db.DB.QueryRowx(query, userID, req.Name, req.Location).StructScan(&farm)
	if err != nil {
		log.Printf("[FARM] CreateFarm insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create farm"})
	}

	log.Printf("[FARM] Farm created — ID: %s | Name: %s | UserID: %s", farm.ID, farm.Name, userID)
	return c.JSON(http.StatusCreated, farm)
}

func GetFarms(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[FARM] GetFarms request — UserID: %s", userID)

	pageStr := c.QueryParam("page")
	limitStr := c.QueryParam("limit")

	page := 1
	limit := 5

	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	offset := (page - 1) * limit

	var farms []models.Farm
	err := db.DB.Select(&farms, "SELECT * FROM farms WHERE user_id=$1 AND is_active=true ORDER BY created_at DESC LIMIT $2 OFFSET $3", userID, limit, offset)
	if err != nil {
		log.Printf("[FARM] GetFarms query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch farms"})
	}

	log.Printf("[FARM] GetFarms returned %d farms for UserID: %s (page: %d, limit: %d)", len(farms), userID, page, limit)
	return c.JSON(http.StatusOK, farms)
}

func GetFarm(c echo.Context) error {
	userID := c.Get("user_id").(string)
	farmID := c.Param("id")
	log.Printf("[FARM] GetFarm request — FarmID: %s | UserID: %s", farmID, userID)

	var farm models.Farm
	err := db.DB.Get(&farm, "SELECT * FROM farms WHERE id=$1 AND user_id=$2 AND is_active=true", farmID, userID)
	if err != nil {
		log.Printf("[FARM] GetFarm not found — FarmID: %s | UserID: %s", farmID, userID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Farm not found"})
	}

	log.Printf("[FARM] GetFarm found — FarmID: %s | Name: %s", farm.ID, farm.Name)
	return c.JSON(http.StatusOK, farm)
}

func UpdateFarm(c echo.Context) error {
	userID := c.Get("user_id").(string)
	farmID := c.Param("id")
	log.Printf("[FARM] UpdateFarm request — FarmID: %s | UserID: %s", farmID, userID)

	req := new(models.UpdateFarmRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[FARM] UpdateFarm bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var farm models.Farm
	query := `
		UPDATE farms SET name=$1, location=$2, updated_at=CURRENT_TIMESTAMP
		WHERE id=$3 AND user_id=$4
		RETURNING id, user_id, name, location, created_at, updated_at
	`
	err := db.DB.QueryRowx(query, req.Name, req.Location, farmID, userID).StructScan(&farm)
	if err != nil {
		log.Printf("[FARM] UpdateFarm error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update farm"})
	}

	log.Printf("[FARM] Farm updated — FarmID: %s | Name: %s", farm.ID, farm.Name)
	return c.JSON(http.StatusOK, farm)
}

func DeleteFarm(c echo.Context) error {
	userID := c.Get("user_id").(string)
	farmID := c.Param("id")
	log.Printf("[FARM] DeleteFarm request — FarmID: %s | UserID: %s", farmID, userID)

	result, err := db.DB.Exec("UPDATE farms SET is_active=false WHERE id=$1 AND user_id=$2", farmID, userID)
	if err != nil {
		log.Printf("[FARM] DeleteFarm error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete farm"})
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		log.Printf("[FARM] DeleteFarm — farm not found FarmID: %s", farmID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Farm not found"})
	}

	log.Printf("[FARM] Farm deleted — FarmID: %s | UserID: %s", farmID, userID)
	return c.JSON(http.StatusOK, map[string]string{"message": "Farm deleted successfully"})
}