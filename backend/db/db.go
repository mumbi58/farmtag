package db

import (
	"fmt"
	"log"
	"os"

	"farmtag/config"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func Connect() {
	cfg := config.App

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPass, cfg.DBName,
	)

	log.Println("[DB] Connecting to PostgreSQL...")

	var err error
	DB, err = sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("[DB] Failed to connect: %v", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Printf("[DB] Connected successfully — Host: %s | DB: %s", cfg.DBHost, cfg.DBName)

	runMigrations()
}

func runMigrations() {
	log.Println("[DB] Running migrations...")

	content, err := os.ReadFile("migrations/001_init.sql")
	if err != nil {
		log.Fatalf("[DB] Failed to read migration file: %v", err)
	}

	if _, err := DB.Exec(string(content)); err != nil {
		log.Fatalf("[DB] Failed to execute migrations: %v", err)
	}

	log.Println("[DB] ✓ Migrations successfully applied — schema initialized")
}

func Close() {
	if DB != nil {
		DB.Close()
		log.Println("[DB] Connection closed")
	}
}
