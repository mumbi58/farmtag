package models

import "time"

type Pregnancy struct {
	ID             string     `db:"id" json:"id"`
	AnimalID       string     `db:"animal_id" json:"animal_id"`
	ConcevedAt     time.Time  `db:"conceived_at" json:"conceived_at"`
	ExpectedBirthAt time.Time `db:"expected_birth_at" json:"expected_birth_at"`
	ActualBirthAt  *time.Time `db:"actual_birth_at" json:"actual_birth_at"`
	Status         string     `db:"status" json:"status"` // pregnant, delivered, miscarried
	Notes          *string    `db:"notes" json:"notes"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

type CreatePregnancyRequest struct {
	AnimalID   string `json:"animal_id" validate:"required"`
	ConcevedAt string `json:"conceived_at" validate:"required"` // YYYY-MM-DD
	Notes      string `json:"notes"`
}

type UpdatePregnancyRequest struct {
	Status        string `json:"status"` // pregnant, delivered, miscarried
	ActualBirthAt string `json:"actual_birth_at"`
	Notes         string `json:"notes"`
}