package models

import "time"

type Animal struct {
	ID          string     `db:"id" json:"id"`
	FarmID      string     `db:"farm_id" json:"farm_id"`
	MotherID    *string    `db:"mother_id" json:"mother_id"`
	TagNumber   string     `db:"tag_number" json:"tag_number"`
	Name        *string    `db:"name" json:"name"`
	Type        string     `db:"type" json:"type"`
	Breed       *string    `db:"breed" json:"breed"`
	Gender      string     `db:"gender" json:"gender"`
	DateOfBirth *time.Time `db:"date_of_birth" json:"date_of_birth"`
	PhotoURL    *string    `db:"photo_url" json:"photo_url"`
	IsSold      bool       `db:"is_sold" json:"is_sold"`
	IsDeleted   bool       `db:"is_deleted" json:"is_deleted"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}

type CreateAnimalRequest struct {
	FarmID      string `json:"farm_id" validate:"required"`
	MotherID    string `json:"mother_id"`
	TagNumber   string `json:"tag_number" validate:"required"`
	Name        string `json:"name"`
	Type        string `json:"type" validate:"required"`
	Breed       string `json:"breed"`
	Gender      string `json:"gender" validate:"required"`
	DateOfBirth string `json:"date_of_birth"`
	PhotoURL    string `json:"photo_url"`
	// Purchase info
	BuyingPrice float64 `json:"buying_price"`
	BoughtFrom  string  `json:"bought_from"`
	BoughtAt    string  `json:"bought_at"`
}

type UpdateAnimalRequest struct {
	TagNumber   string `json:"tag_number"`
	Name        string `json:"name"`
	Breed       string `json:"breed"`
	PhotoURL    string `json:"photo_url"`
	DateOfBirth string `json:"date_of_birth"`
}