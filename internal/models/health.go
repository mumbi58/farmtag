package models

import "time"

type HealthRecord struct {
	ID          string     `db:"id" json:"id"`
	AnimalID    string     `db:"animal_id" json:"animal_id"`
	RecordType  string     `db:"record_type" json:"record_type"` // vaccination, treatment, vet_visit
	Description string     `db:"description" json:"description"`
	Cost        *float64   `db:"cost" json:"cost"`
	DoneAt      time.Time  `db:"done_at" json:"done_at"`
	NextDueAt   *time.Time `db:"next_due_at" json:"next_due_at"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

type CreateHealthRecordRequest struct {
	AnimalID    string  `json:"animal_id" validate:"required"`
	RecordType  string  `json:"record_type" validate:"required"`
	Description string  `json:"description" validate:"required"`
	Cost        float64 `json:"cost"`
	DoneAt      string  `json:"done_at" validate:"required"`
	NextDueAt   string  `json:"next_due_at"`
}