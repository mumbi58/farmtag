package models

type DashboardStats struct {
	TotalAnimals      int     `json:"total_animals"`
	TotalFarms        int     `json:"total_farms"`
	TotalInvested     float64 `json:"total_invested"`
	TotalEarned       float64 `json:"total_earned"`
	ProfitLoss        float64 `json:"profit_loss"`
	ActivePregnancies int     `json:"active_pregnancies"`
	BirthsDueIn30Days int     `json:"births_due_in_30_days"`
	AnimalsSold       int     `json:"animals_sold"`
}

type AnimalFinancials struct {
	AnimalID    string  `db:"animal_id" json:"animal_id"`
	TagNumber   string  `db:"tag_number" json:"tag_number"`
	Name        *string `db:"name" json:"name"`
	Type        string  `db:"type" json:"type"`
	BuyingPrice float64 `db:"buying_price" json:"buying_price"`
	SellingPrice float64 `db:"selling_price" json:"selling_price"`
	ProfitLoss  float64 `db:"profit_loss" json:"profit_loss"`
}

type UpcomingBirth struct {
	PregnancyID     string `db:"pregnancy_id" json:"pregnancy_id"`
	AnimalID        string `db:"animal_id" json:"animal_id"`
	TagNumber       string `db:"tag_number" json:"tag_number"`
	AnimalType      string `db:"animal_type" json:"animal_type"`
	FarmName        string `db:"farm_name" json:"farm_name"`
	ExpectedBirthAt string `db:"expected_birth_at" json:"expected_birth_at"`
	DaysRemaining   int    `db:"days_remaining" json:"days_remaining"`
}

type ExpenseSummary struct {
	Category   string  `db:"category" json:"category"`
	Total      float64 `db:"total" json:"total"`
	Percentage float64 `json:"percentage"`
}