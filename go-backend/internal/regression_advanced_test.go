// Package internal provides advanced regression tests for edge cases
package internal

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// TestRegression_DistanceTieBreaking tests that when multiple slots have same distance, system assigns slot with lowest label
func TestRegression_DistanceTieBreaking(t *testing.T) {
	router, db, cleanup := setupAdvancedTestRouter(t)
	defer cleanup()

	// Clean up database at test start to ensure no leftover data
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create entry point A
	_, err := db.GetDB().Exec(`INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ('A', 'Entry Point A', NOW(), NOW())`)
	require.NoError(t, err)

	// Create 2 SP slots at same distance (5 units) from entry point A
	// SP-Tie1 and SP-Tie2 both at distance 5
	slot1Distances, _ := json.Marshal([]int{5, 10, 15})
	slot2Distances, _ := json.Marshal([]int{5, 10, 15})
	_, err = db.GetDB().Exec(`INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ('SP-Tie1', 'SP', $1, TRUE, NOW(), NOW())`, slot1Distances)
	require.NoError(t, err)
	_, err = db.GetDB().Exec(`INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ('SP-Tie2', 'SP', $1, TRUE, NOW(), NOW())`, slot2Distances)
	require.NoError(t, err)

	// Park small vehicle - should get SP-Tie1 (alphabetically first)
	parkRequest := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Verify slot was assigned
	assert.Equal(t, http.StatusCreated, parkRecorder.Code)

	var response map[string]interface{}
	err = json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify wrapper format
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].(map[string]interface{})
	assert.NotNil(t, data["parking_slot"].(map[string]interface{})["id"])
	assert.Equal(t, "SP", data["parking_slot"].(map[string]interface{})["slot_type"])

	// Verify SP-Tie1 is assigned (alphabetically first)
	slotLabel := data["parking_slot"].(map[string]interface{})["slot_label"].(string)
	assert.Equal(t, "SP-Tie1", slotLabel, "When multiple slots have same distance, system should assign slot with lowest label (SP-Tie1 before SP-Tie2)")

	// Check for new session fields
	assert.Contains(t, data, "is_active")
	assert.Contains(t, data, "is_continuous")
	assert.Contains(t, data, "duration_hours")
	assert.Contains(t, data, "total_fee")
}

// TestRegression_SlotExhaustionByVehicleType tests that when no compatible slots exist for vehicle type, returns 409 Conflict
func TestRegression_SlotExhaustionByVehicleType(t *testing.T) {
	router, db, cleanup := setupAdvancedTestRouter(t)
	defer cleanup()

	// Create entry point A
	_, err := db.GetDB().Exec(`INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ('A', 'Entry Point A', NOW(), NOW())`)
	require.NoError(t, err)

	// Create only SP and MP slots (no LP slots)
	spDistances, _ := json.Marshal([]int{10, 20, 30})
	mpDistances, _ := json.Marshal([]int{15, 25, 35})
	_, err = db.GetDB().Exec(`INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ('SP-1', 'SP', $1, TRUE, NOW(), NOW())`, spDistances)
	require.NoError(t, err)
	_, err = db.GetDB().Exec(`INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ('MP-1', 'MP', $1, TRUE, NOW(), NOW())`, mpDistances)
	require.NoError(t, err)

	// Try to park large vehicle (requires LP) - should fail with 409 Conflict
	parkRequest := map[string]interface{}{
		"vehicle_type":   "L",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Verify 409 Conflict error is returned
	assert.Equal(t, http.StatusConflict, parkRecorder.Code)

	var response map[string]interface{}
	err = json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.False(t, response["success"].(bool))
	errorMsg := strings.ToLower(response["error"].(string))
	assert.Contains(t, errorMsg, "no available parking slot")
}

// setupAdvancedTestRouter sets up test router with database access for advanced regression tests
func setupAdvancedTestRouter(t *testing.T) (*mux.Router, *database.DB, func()) {
	db := setupAdvancedTestDB(t)

	// Clean up database
	cleanup := func() {
		db.GetDB().Exec("DELETE FROM parking_sessions")
		db.GetDB().Exec("DELETE FROM parking_slots")
		db.GetDB().Exec("DELETE FROM entry_points")
		db.Close()
	}

	// Initialize repositories
	entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
	parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
	sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

	// Initialize services
	parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

	// Initialize handlers
	parkingHandler := handlers.NewParkingHandler(parkingService)

	// Setup router
	router := mux.NewRouter()
	api := router.PathPrefix("/api/v1").Subrouter()

	// Parking sessions routes
	api.HandleFunc("/sessions", parkingHandler.ParkVehicle).Methods("POST")
	api.HandleFunc("/sessions", parkingHandler.ListSessions).Methods("GET")
	api.HandleFunc("/sessions/{id}", parkingHandler.GetSession).Methods("GET")
	api.HandleFunc("/sessions/{id}/unpark", parkingHandler.UnparkVehicle).Methods("POST")

	// Parking slots routes
	api.HandleFunc("/slots", parkingHandler.ListSlots).Methods("GET")
	api.HandleFunc("/slots/available", parkingHandler.AvailableSlots).Methods("GET")

	// Entry points routes
	api.HandleFunc("/entry_points", parkingHandler.ListEntryPoints).Methods("GET")

	return router, db, cleanup
}

// setupAdvancedTestDB sets up test database for advanced regression tests
func setupAdvancedTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()
	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Create tables for testing
	db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS entry_points (
			id BIGSERIAL PRIMARY KEY,
			identifier VARCHAR(255) UNIQUE NOT NULL,
			name VARCHAR(255),
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS parking_slots (
			id BIGSERIAL PRIMARY KEY,
			slot_label VARCHAR(255) UNIQUE NOT NULL,
			slot_type VARCHAR(50) NOT NULL,
			distances JSONB NOT NULL,
			available BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS parking_sessions (
			id BIGSERIAL PRIMARY KEY,
			vehicle_type VARCHAR(50) NOT NULL,
			parking_slot_id BIGINT NOT NULL REFERENCES parking_slots(id),
			entry_point_id BIGINT NOT NULL REFERENCES entry_points(id),
			parked_at TIMESTAMP NOT NULL,
			exited_at TIMESTAMP,
			total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)

	return db
}
