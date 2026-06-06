package models

import "time"

type Farm struct {
	ID        string    `db:"id" json:"id"`
	UserID    string    `db:"user_id" json:"user_id"`
	Name      string    `db:"name" json:"name"`
	Location  *string   `db:"location" json:"location"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
	IsActive  bool      `db:"is_active" json:"is_active"`
}

type CreateFarmRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Location string `json:"location"`
}

type UpdateFarmRequest struct {
	Name     string `json:"name"`
	Location string `json:"location"`
}