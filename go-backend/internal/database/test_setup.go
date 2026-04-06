// Package database provides test database setup utilities
package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// TestDatabases holds the names of test databases
var TestDatabases = []string{
	"oo_parking_lot_handlers_test",
	"oo_parking_lot_test",
}

// SetupTestDatabases creates test databases if they don't exist
// This function connects to the default PostgreSQL database and creates
// the test databases required for running Go tests
func SetupTestDatabases() error {
	// Get database configuration from environment variables
	host := GetEnv("DATABASE_HOST", "localhost")
	port := GetEnv("DATABASE_PORT", "5432")
	user := GetEnv("DATABASE_USER", "postgres")
	password := GetEnv("DATABASE_PASSWORD", "")
	// Always use 'postgres' database for setup, not the application database
	// This ensures we can create test databases even if the app database doesn't exist
	defaultDB := "postgres"

	// Connect to the default database (not test databases)
	// We need to connect to an existing database to create new ones
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable timezone=UTC",
		host,
		port,
		user,
		password,
		defaultDB,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to open database connection: %w", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database connection: %v", err)
		}
	}()

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to default database for test setup")

	// Create each test database if it doesn't exist
	for _, dbName := range TestDatabases {
		if err := createDatabaseIfNotExists(db, dbName); err != nil {
			return fmt.Errorf("failed to create test database %s: %w", dbName, err)
		}
	}

	log.Println("Test databases setup completed successfully")
	return nil
}

// createDatabaseIfNotExists creates a database if it doesn't already exist
func createDatabaseIfNotExists(db *sql.DB, dbName string) error {
	// Check if database exists
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM pg_database WHERE datname = $1
		)
	`, dbName).Scan(&exists)

	if err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	if exists {
		log.Printf("Test database '%s' already exists, skipping creation", dbName)
		return nil
	}

	// Create the database
	_, err = db.Exec(fmt.Sprintf("CREATE DATABASE %s", dbName))
	if err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}

	log.Printf("Successfully created test database '%s'", dbName)
	return nil
}

// DropTestDatabases drops all test databases
// This is optional and can be used for cleanup after tests
// Commented out by default for debugging purposes
func DropTestDatabases() error {
	host := GetEnv("DATABASE_HOST", "localhost")
	port := GetEnv("DATABASE_PORT", "5432")
	user := GetEnv("DATABASE_USER", "postgres")
	password := GetEnv("DATABASE_PASSWORD", "")
	// Always use 'postgres' database for setup, not the application database
	// This ensures we can drop test databases even if the app database doesn't exist
	defaultDB := "postgres"

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable timezone=UTC",
		host,
		port,
		user,
		password,
		defaultDB,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to open database connection: %w", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database connection: %v", err)
		}
	}()

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Drop each test database
	for _, dbName := range TestDatabases {
		if err := dropDatabaseIfExists(db, dbName); err != nil {
			return fmt.Errorf("failed to drop test database %s: %w", dbName, err)
		}
	}

	log.Println("Test databases dropped successfully")
	return nil
}

// dropDatabaseIfExists drops a database if it exists
func dropDatabaseIfExists(db *sql.DB, dbName string) error {
	// Check if database exists
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM pg_database WHERE datname = $1
		)
	`, dbName).Scan(&exists)

	if err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	if !exists {
		log.Printf("Test database '%s' does not exist, skipping drop", dbName)
		return nil
	}

	// Drop the database
	// Note: We need to terminate all connections to the database first
	_, err = db.Exec(fmt.Sprintf(`
		SELECT pg_terminate_backend(pid)
		FROM pg_stat_activity
		WHERE datname = '%s' AND pid <> pg_backend_pid()
	`, dbName))
	if err != nil {
		return fmt.Errorf("failed to terminate connections to database: %w", err)
	}

	_, err = db.Exec(fmt.Sprintf("DROP DATABASE %s", dbName))
	if err != nil {
		return fmt.Errorf("failed to drop database: %w", err)
	}

	log.Printf("Successfully dropped test database '%s'", dbName)
	return nil
}
