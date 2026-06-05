package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName  string
	AppEnv   string
	AppPort  string
	DBHost   string
	DBPort   string
	DBUser   string
	DBPass   string
	DBName   string
	JWTSecret string
	JWTExpiry string
}

var App *Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("[CONFIG] No .env file found, reading from environment")
	}

	App = &Config{
		AppName:   getEnv("APP_NAME", "FarmTag"),
		AppEnv:    getEnv("APP_ENV", "development"),
		AppPort:   getEnv("APP_PORT", "8080"),
		DBHost:    getEnv("DB_HOST", "localhost"),
		DBPort:    getEnv("DB_PORT", "5432"),
		DBUser:    getEnv("DB_USER", "postgres"),
		DBPass:    getEnv("DB_PASSWORD", ""),
		DBName:    getEnv("DB_NAME", "farmtag"),
		JWTSecret: getEnv("JWT_SECRET", "secret"),
		JWTExpiry: getEnv("JWT_EXPIRY", "24h"),
	}

	log.Printf("[CONFIG] Loaded — App: %s | Env: %s | Port: %s", App.AppName, App.AppEnv, App.AppPort)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	log.Printf("[CONFIG] Warning: %s not set, using default", key)
	return fallback
}