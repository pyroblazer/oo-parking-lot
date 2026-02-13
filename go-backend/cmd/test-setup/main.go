// Test database setup program
package main

import (
	"log"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
)

func main() {
	log.Println("Setting up test databases...")
	if err := database.SetupTestDatabases(); err != nil {
		log.Fatalf("Failed to setup test databases: %v", err)
	}
	log.Println("Test databases setup completed successfully")
}
