package db

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"farmtag/config"
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
}

func Close() {
	if DB != nil {
		DB.Close()
		log.Println("[DB] Connection closed")
	}
}