// Package database provides database connection and configuration for the parking lot system.
package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// DB represents a database connection
type DB struct {
	*sql.DB
}

// GetDB returns the underlying *sql.DB
func (db *DB) GetDB() *sql.DB {
	return db.DB
}

// Config holds database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string // #nosec G117 -- Password field is used internally for database connection, not exposed via JSON
	DBName   string
}

// NewDB creates a new database connection
func NewDB(config *Config) (*DB, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable timezone=UTC",
		config.Host,
		config.Port,
		config.User,
		config.Password,
		config.DBName,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to database")
	return &DB{db}, nil
}

// NewDBFromEnv creates a new database connection from environment variables
// Supports both DATABASE_URL and individual environment variables
func NewDBFromEnv() (*DB, error) {
	// Try DATABASE_URL first (for Docker compatibility)
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		return NewDBFromURL(databaseURL)
	}

	// Fall back to individual environment variables
	config := Config{
		Host:     getEnv("DATABASE_HOST", "localhost"),
		Port:     getEnv("DATABASE_PORT", "5432"),
		User:     getEnv("DATABASE_USER", "postgres"),
		Password: getEnv("DATABASE_PASSWORD", ""),
		DBName:   getEnv("DATABASE_NAME", "oo_parking_lot"),
	}

	return NewDB(&config)
}

// NewDBFromURL creates a new database connection from a connection URL
func NewDBFromURL(databaseURL string) (*DB, error) {
	// Add timezone=UTC to ensure consistent time handling
	db, err := sql.Open("postgres", databaseURL+"&timezone=UTC")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to database")
	return &DB{db}, nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// EnsureAvailableColumn ensures that available column exists in parking_slots table
func EnsureAvailableColumn(db *sql.DB) error {
	// Check if available column exists
	var columnExists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_name = 'parking_slots'
			AND column_name = 'available'
		)
	`).Scan(&columnExists)
	if err != nil {
		return fmt.Errorf("failed to check available column: %w", err)
	}

	if !columnExists {
		// Add available column
		_, err := db.Exec(`
			ALTER TABLE parking_slots
			ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE
		`)
		if err != nil {
			return fmt.Errorf("failed to add available column: %w", err)
		}
		log.Println("Added available column to parking_slots table")
	}

	return nil
}
