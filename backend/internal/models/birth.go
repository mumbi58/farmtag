package models

import "time"

type Birth struct {
	ID             string    `db:"id" json:"id"`
	PregnancyID    string    `db:"pregnancy_id" json:"pregnancy_id"`
	MotherID       string    `db:"mother_id" json:"mother_id"`
	BirthDate      time.Time `db:"birth_date" json:"birth_date"`
	TotalOffspring int       `db:"total_offspring" json:"total_offspring"`
	Notes          *string   `db:"notes" json:"notes"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

type CreateBirthRequest struct {
	PregnancyID    string `json:"pregnancy_id" validate:"required"`
	MotherID       string `json:"mother_id" validate:"required"`
	BirthDate      string `json:"birth_date" validate:"required"`
	TotalOffspring int    `json:"total_offspring"`
	Notes          string `json:"notes"`
	// Offspring details — auto create animals
	Offspring []OffspringRequest `json:"offspring"`
}

type OffspringRequest struct {
	TagNumber string `json:"tag_number" validate:"required"`
	Name      string `json:"name"`
	Gender    string `json:"gender" validate:"required"`
}