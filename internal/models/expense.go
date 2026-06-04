package models

import "time"

type Expense struct {
	ID          string    `db:"id" json:"id"`
	FarmID      string    `db:"farm_id" json:"farm_id"`
	Category    string    `db:"category" json:"category"` // feed, medicine, labor, equipment, other
	Amount      float64   `db:"amount" json:"amount"`
	Description *string   `db:"description" json:"description"`
	ExpenseDate time.Time `db:"expense_date" json:"expense_date"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

type CreateExpenseRequest struct {
	FarmID      string  `json:"farm_id" validate:"required"`
	Category    string  `json:"category" validate:"required"`
	Amount      float64 `json:"amount" validate:"required"`
	Description string  `json:"description"`
	ExpenseDate string  `json:"expense_date" validate:"required"`
}