package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

func CreateAnimal(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[ANIMAL] CreateAnimal request — UserID: %s", userID)

	req := new(models.CreateAnimalRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[ANIMAL] CreateAnimal bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Validate farm belongs to user
	var farmCount int
	err := db.DB.Get(&farmCount, "SELECT COUNT(*) FROM farms WHERE id=$1 AND user_id=$2", req.FarmID, userID)
	if err != nil || farmCount == 0 {
		log.Printf("[ANIMAL] CreateAnimal — farm not found FarmID: %s | UserID: %s", req.FarmID, userID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Farm not found"})
	}

	// Check free tier limit — max 10 animals
	var user models.User
	db.DB.Get(&user, "SELECT is_premium FROM users WHERE id=$1", userID)

	if !user.IsPremium {
		var animalCount int
		db.DB.Get(&animalCount, `
			SELECT COUNT(*) FROM animals a
			JOIN farms f ON f.id = a.farm_id
			WHERE f.user_id=$1 AND a.is_deleted=false
		`, userID)

		if animalCount >= 10 {
			log.Printf("[ANIMAL] CreateAnimal blocked — free tier limit reached for UserID: %s", userID)
			return c.JSON(http.StatusForbidden, map[string]string{"error": "Upgrade to premium to add more than 10 animals"})
		}
	}

	// Check tag number uniqueness in farm
	var tagCount int
	db.DB.Get(&tagCount, "SELECT COUNT(*) FROM animals WHERE tag_number=$1 AND farm_id=$2 AND is_deleted=false", req.TagNumber, req.FarmID)
	if tagCount > 0 {
		log.Printf("[ANIMAL] CreateAnimal — duplicate tag number: %s", req.TagNumber)
		return c.JSON(http.StatusConflict, map[string]string{"error": "Tag number already exists in this farm"})
	}

	// Insert animal
	var animal models.Animal
	query := `
		INSERT INTO animals (farm_id, mother_id, tag_number, name, type, breed, gender, date_of_birth, photo_url)
		VALUES ($1, NULLIF($2,'')::BIGINT, $3, NULLIF($4,''), $5, NULLIF($6,''), $7, NULLIF($8,'')::DATE, NULLIF($9,''))
		RETURNING id, farm_id, mother_id, tag_number, name, type, breed, gender, date_of_birth, photo_url, is_sold, is_deleted, created_at, updated_at
	`
	err = db.DB.QueryRowx(query,
		req.FarmID, req.MotherID, req.TagNumber, req.Name,
		req.Type, req.Breed, req.Gender, req.DateOfBirth, req.PhotoURL,
	).StructScan(&animal)
	if err != nil {
		log.Printf("[ANIMAL] CreateAnimal insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create animal"})
	}

	// If buying price provided, record purchase
	if req.BuyingPrice > 0 {
		_, err = db.DB.Exec(`
			INSERT INTO animal_purchases (animal_id, bought_at, buying_price, bought_from)
			VALUES ($1, COALESCE(NULLIF($2,'')::DATE, CURRENT_DATE), $3, NULLIF($4,''))
		`, animal.ID, req.BoughtAt, req.BuyingPrice, req.BoughtFrom)
		if err != nil {
			log.Printf("[ANIMAL] CreateAnimal purchase record error: %v", err)
		} else {
			log.Printf("[ANIMAL] Purchase recorded — AnimalID: %s | Price: %.2f", animal.ID, req.BuyingPrice)
		}
	}

	log.Printf("[ANIMAL] Animal created — ID: %s | Tag: %s | Type: %s | FarmID: %s", animal.ID, animal.TagNumber, animal.Type, animal.FarmID)
	return c.JSON(http.StatusCreated, animal)
}

func GetAnimals(c echo.Context) error {
	userID := c.Get("user_id").(string)
	farmID := c.QueryParam("farm_id")
	searchQuery := c.QueryParam("q")
	pageStr := c.QueryParam("page")
	limitStr := c.QueryParam("limit")
	log.Printf("[ANIMAL] GetAnimals request — UserID: %s | FarmID: %s | Search: %s", userID, farmID, searchQuery)

	page := 1
	limit := 5

	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	offset := (page - 1) * limit

	query := `
		SELECT 
			a.*,
			f.name as farm_name,
			ap.buying_price,
			ap.bought_at::text as bought_at
		FROM animals a
		JOIN farms f ON f.id = a.farm_id
		LEFT JOIN animal_purchases ap ON ap.animal_id = a.id
		WHERE f.user_id=$1 AND a.is_deleted=false
	`
	args := []interface{}{userID}
	argIdx := 2

	if farmID != "" {
		query += fmt.Sprintf(" AND a.farm_id=$%d", argIdx)
		args = append(args, farmID)
		argIdx++
	}

	if searchQuery != "" {
		query += fmt.Sprintf(" AND (a.tag_number ILIKE $%d OR a.name ILIKE $%d OR a.type ILIKE $%d OR a.breed ILIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+searchQuery+"%")
		argIdx++
	}
	query += ` ORDER BY a.created_at DESC`

	// Append dynamic placeholders for Limit/Offset
	limitPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	query += fmt.Sprintf(" LIMIT %s OFFSET %s", limitPlaceholder, offsetPlaceholder)
	args = append(args, limit, offset)

	type AnimalWithMeta struct {
		models.Animal
		FarmName    *string  `db:"farm_name" json:"farm_name"`
		BuyingPrice *float64 `db:"buying_price" json:"buying_price"`
		BoughtAt    *string  `db:"bought_at" json:"bought_at"`
	}
	var animals []AnimalWithMeta

	err := db.DB.Select(&animals, query, args...)
	if err != nil {
		log.Printf("[ANIMAL] GetAnimals query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch animals"})
	}

	if animals == nil {
		animals = []AnimalWithMeta{}
	}

	log.Printf("[ANIMAL] GetAnimals returned %d animals for UserID: %s (page: %d, limit: %d)", len(animals), userID, page, limit)
	return c.JSON(http.StatusOK, animals)
}

func GetAnimal(c echo.Context) error {
	userID := c.Get("user_id").(string)
	animalID := c.Param("id")
	log.Printf("[ANIMAL] GetAnimal request — AnimalID: %s | UserID: %s", animalID, userID)

	var animal struct {
		models.Animal
		FarmName    *string  `db:"farm_name" json:"farm_name"`
		BuyingPrice *float64 `db:"buying_price" json:"buying_price"`
		BoughtAt    *string  `db:"bought_at" json:"bought_at"`
		BoughtFrom  *string  `db:"bought_from" json:"bought_from"`
		SellingPrice *float64 `db:"selling_price" json:"selling_price"`
		SoldAt      *string  `db:"sold_at" json:"sold_at"`
	}

	err := db.DB.QueryRowx(`
		SELECT 
			a.*,
			f.name as farm_name,
			ap.buying_price,
			ap.bought_at::text as bought_at,
			ap.bought_from,
			s.selling_price,
			s.sold_at::text as sold_at
		FROM animals a
		JOIN farms f ON f.id = a.farm_id
		LEFT JOIN animal_purchases ap ON ap.animal_id = a.id
		LEFT JOIN animal_sales s ON s.animal_id = a.id
		WHERE a.id=$1 AND f.user_id=$2 AND a.is_deleted=false
	`, animalID, userID).StructScan(&animal)
	if err != nil {
		log.Printf("[ANIMAL] GetAnimal not found — AnimalID: %s | Error: %v", animalID, err)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Animal not found"})
	}

	log.Printf("[ANIMAL] GetAnimal found — AnimalID: %s | Tag: %s", animal.ID, animal.TagNumber)
	return c.JSON(http.StatusOK, animal)
}

func UpdateAnimal(c echo.Context) error {
	userID := c.Get("user_id").(string)
	animalID := c.Param("id")
	log.Printf("[ANIMAL] UpdateAnimal request — AnimalID: %s | UserID: %s", animalID, userID)

	req := new(models.UpdateAnimalRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[ANIMAL] UpdateAnimal bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var animal models.Animal
	query := `
		UPDATE animals SET
			tag_number = COALESCE(NULLIF($1,''), tag_number),
			name = COALESCE(NULLIF($2,''), name),
			breed = COALESCE(NULLIF($3,''), breed),
			photo_url = COALESCE(NULLIF($4,''), photo_url),
			date_of_birth = COALESCE(NULLIF($5,'')::DATE, date_of_birth),
			updated_at = CURRENT_TIMESTAMP
		WHERE id=$6 AND is_deleted=false
		RETURNING id, farm_id, mother_id, tag_number, name, type, breed, gender, date_of_birth, photo_url, is_sold, is_deleted, created_at, updated_at
	`
	err := db.DB.QueryRowx(query,
		req.TagNumber, req.Name, req.Breed, req.PhotoURL, req.DateOfBirth, animalID,
	).StructScan(&animal)
	if err != nil {
		log.Printf("[ANIMAL] UpdateAnimal error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update animal"})
	}

	log.Printf("[ANIMAL] Animal updated — AnimalID: %s | Tag: %s", animal.ID, animal.TagNumber)
	return c.JSON(http.StatusOK, animal)
}

func DeleteAnimal(c echo.Context) error {
	userID := c.Get("user_id").(string)
	animalID := c.Param("id")
	log.Printf("[ANIMAL] DeleteAnimal request — AnimalID: %s | UserID: %s", animalID, userID)

	result, err := db.DB.Exec(`
		UPDATE animals SET is_deleted=true, updated_at=CURRENT_TIMESTAMP
		WHERE id=$1 AND farm_id IN (SELECT id FROM farms WHERE user_id=$2)
	`, animalID, userID)
	if err != nil {
		log.Printf("[ANIMAL] DeleteAnimal error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete animal"})
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		log.Printf("[ANIMAL] DeleteAnimal — animal not found AnimalID: %s", animalID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Animal not found"})
	}

	log.Printf("[ANIMAL] Animal soft deleted — AnimalID: %s", animalID)
	return c.JSON(http.StatusOK, map[string]string{"message": "Animal deleted successfully"})
}

type SellAnimalRequest struct {
	SellingPrice float64 `json:"selling_price"`
	SoldAt       string  `json:"sold_at"`
}

func SellAnimal(c echo.Context) error {
	userID := c.Get("user_id").(string)
	animalID := c.Param("id")
	log.Printf("[ANIMAL] SellAnimal request — AnimalID: %s | UserID: %s", animalID, userID)

	req := new(SellAnimalRequest)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var exists bool
	err := db.DB.Get(&exists, `
		SELECT EXISTS(
			SELECT 1 FROM animals a 
			JOIN farms f ON f.id = a.farm_id 
			WHERE a.id=$1 AND f.user_id=$2 AND a.is_deleted=false AND a.is_sold=false
		)
	`, animalID, userID)
	if err != nil || !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Animal not found or already sold"})
	}

	_, err = db.DB.Exec(`
		INSERT INTO animal_sales (animal_id, selling_price, sold_at)
		VALUES ($1, $2, COALESCE(NULLIF($3,'')::DATE, CURRENT_DATE))
	`, animalID, req.SellingPrice, req.SoldAt)
	if err != nil {
		log.Printf("[ANIMAL] SellAnimal record error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to record sale"})
	}

	_, err = db.DB.Exec(`UPDATE animals SET is_sold=true, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, animalID)
	if err != nil {
		log.Printf("[ANIMAL] SellAnimal update error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update animal status"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Animal sold successfully"})
}