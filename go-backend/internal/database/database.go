// Package database provides database connection and configuration for parking lot system.
package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// DB represents a database connection
type DB struct {
	*sql.DB
}

// GetDB returns => underlying *sql.DB
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

// GetEnv is a helper function to get environment variables with default values
// FIX: Move this function definition to the top of the file to avoid forward reference issues
func GetEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// Deprecated: Use GetEnv instead (public version)
func getEnv(key, defaultValue string) string {
	return GetEnv(key, defaultValue)
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

	// Configure connection pool
	// 50 open conns gives headroom for parallel test shards (3 shards × ~15 concurrent
	// requests each) without exhausting PostgreSQL's default 100-connection limit.
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	log.Println("Successfully connected to database")
	return &DB{db}, nil
}

// NewDBFromEnv creates a new database connection from environment variables
func NewDBFromEnv() (*DB, error) {
	// Fall back to individual environment variables
	config := Config{
		Host:     getEnv("DATABASE_HOST", "localhost"),
		Port:     getEnv("DATABASE_PORT", "5432"),
		User:     getEnv("DATABASE_USER", "postgres"),
		Password: getEnv("DATABASE_PASSWORD", ""),
		DBName:   getEnv("DATABASE_NAME", "oo_parking_lot_handlers_test"),
	}

	return NewDB(&config)
}

// SetupTestEnvironment ensures test environment variables are set with sensible defaults
// while respecting any values already set by CI or other test runners
func SetupTestEnvironment() {
	if os.Getenv("DATABASE_HOST") == "" {
		_ = os.Setenv("DATABASE_HOST", "localhost")
	}
	if os.Getenv("DATABASE_PORT") == "" {
		_ = os.Setenv("DATABASE_PORT", "5432")
	}
	if os.Getenv("DATABASE_USER") == "" {
		_ = os.Setenv("DATABASE_USER", "postgres")
	}
	if os.Getenv("DATABASE_PASSWORD") == "" {
		// Default to empty password for local development
		// CI will set this to the actual password
		_ = os.Setenv("DATABASE_PASSWORD", "")
	}
	if os.Getenv("DATABASE_NAME") == "" {
		_ = os.Setenv("DATABASE_NAME", "oo_parking_lot_handlers_test")
	}
}
