// Test database setup program
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	_ "github.com/lib/pq"
)

func main() {
	// Log current working directory for debugging CI issues
	cwd, err := os.Getwd()
	if err != nil {
		log.Printf("Warning: could not get current working directory: %v", err)
	} else {
		log.Printf("Current working directory: %s", cwd)
	}

	log.Println("Setting up test databases...")
	if err := database.SetupTestDatabases(); err != nil {
		log.Fatalf("Failed to setup test databases: %v", err)
	}
	log.Println("Test databases setup completed successfully")

	// Initialize schema for test databases
	log.Println("Initializing schema for test databases...")
	for _, dbName := range database.TestDatabases {
		if err := initializeTestDatabase(dbName); err != nil {
			log.Fatalf("Failed to initialize test database %s: %v", dbName, err)
		}
	}
	log.Println("Test database schema initialization completed successfully")

	// Verify test databases are ready
	log.Println("Verifying test databases are ready...")
	for _, dbName := range database.TestDatabases {
		if err := verifyTestDatabase(dbName); err != nil {
			log.Fatalf("Failed to verify test database %s: %v", dbName, err)
		}
	}
	log.Println("All test databases verified and ready for testing")
}

// initializeTestDatabase initializes schema for a test database
func initializeTestDatabase(dbName string) error {
	host := database.GetEnv("DATABASE_HOST", "localhost")
	port := database.GetEnv("DATABASE_PORT", "5432")
	user := database.GetEnv("DATABASE_USER", "postgres")
	password := database.GetEnv("DATABASE_PASSWORD", "")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable timezone=UTC",
		host,
		port,
		user,
		password,
		dbName,
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

	// Test connection with retries (database might not be fully initialized yet)
	var lastErr error
	for i := 0; i < 5; i++ {
		if err := db.Ping(); err != nil {
			lastErr = err
			if i < 4 {
				// Wait a bit and retry
				time.Sleep(100 * time.Millisecond)
			}
		} else {
			lastErr = nil
			break
		}
	}
	if lastErr != nil {
		return fmt.Errorf("failed to ping database after retries: %w", lastErr)
	}

	// Read the init-db.sql script
	script, err := getInitDBScript()
	if err != nil {
		return err
	}

	// Split the script into individual statements
	statements := splitSQLStatements(string(script))

	// Execute each statement
	for i, stmt := range statements {
		if stmt == "" {
			continue
		}
		_, err = db.Exec(stmt)
		if err != nil {
			// Print the statement that failed for debugging
			stmtPreview := stmt
			if len(stmtPreview) > 200 {
				stmtPreview = stmtPreview[:200] + "..."
			}
			return fmt.Errorf("failed to execute SQL statement %d: %w\nStatement:\n%s", i+1, err, stmtPreview)
		}
	}

	log.Printf("Successfully initialized schema for test database %s", dbName)
	return nil
}

// splitSQLStatements splits a SQL script into individual statements
func splitSQLStatements(script string) []string {
	var statements []string
	var currentStatement strings.Builder

	lines := strings.Split(script, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		// Skip empty lines and comments
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		currentStatement.WriteString(line)
		currentStatement.WriteString("\n")
		// Check if the line ends with a semicolon
		if strings.HasSuffix(trimmed, ";") {
			stmt := currentStatement.String()
			statements = append(statements, stmt)
			currentStatement.Reset()
		}
	}

	// Add the last statement if it doesn't end with a semicolon
	if currentStatement.Len() > 0 {
		stmt := currentStatement.String()
		statements = append(statements, stmt)
		currentStatement.Reset()
	}

	return statements
}

// getInitDBScript reads the init-db.sql script from possible paths
func getInitDBScript() ([]byte, error) {
	scriptPaths := []string{
		"scripts/init-db.sql",
		"./scripts/init-db.sql",
		"../scripts/init-db.sql",
		"go-backend/scripts/init-db.sql",
	}

	var lastErr error
	for _, path := range scriptPaths {
		script, err := os.ReadFile(path)
		if err == nil {
			log.Printf("Successfully read init-db.sql from: %s", path)
			return script, nil
		}
		lastErr = err
	}
	return nil, fmt.Errorf("failed to read init-db.sql from any path (tried %v): %w", scriptPaths, lastErr)
}

// verifyTestDatabase verifies that a test database is ready by checking connectivity and basic table existence
func verifyTestDatabase(dbName string) error {
	host := database.GetEnv("DATABASE_HOST", "localhost")
	port := database.GetEnv("DATABASE_PORT", "5432")
	user := database.GetEnv("DATABASE_USER", "postgres")
	password := database.GetEnv("DATABASE_PASSWORD", "")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable timezone=UTC",
		host,
		port,
		user,
		password,
		dbName,
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

	// Verify at least one table exists (parking_slots should exist after schema init)
	var tableExists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'parking_slots'
		)
	`).Scan(&tableExists)

	if err != nil {
		return fmt.Errorf("failed to check table existence: %w", err)
	}

	if !tableExists {
		return fmt.Errorf("required table 'parking_slots' not found in database %s", dbName)
	}

	log.Printf("Database %s verified: connectivity and schema OK", dbName)
	return nil
}
