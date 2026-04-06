// Package internal provides Newman-based API tests for green flow functionality
//
// This test file mirrors Newman test collection scenarios for green flow,
// providing comprehensive API-level tests that verify green flow endpoints
// behave correctly according to Newman test specifications.
package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// setupNewmanGreenFlowTestDB creates and initializes test database for Newman-based green flow tests
func setupNewmanGreenFlowTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create tables for testing
	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS entry_points (
			id BIGSERIAL PRIMARY KEY,
			identifier VARCHAR(255) UNIQUE NOT NULL,
			name VARCHAR(255),
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
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
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
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
	require.NoError(t, err)

	return db
}

// cleanupNewmanGreenFlowTestDB cleans up test database after tests
func cleanupNewmanGreenFlowTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createNewmanTestEntryPointGreenFlow creates a test entry point for Newman-based green flow tests
// Note: Renamed to avoid redeclaration with other test files
func createNewmanTestEntryPointGreenFlow(t *testing.T, db *sql.DB, identifier, name string) *models.EntryPoint {
	query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
	var ep models.EntryPoint
	err := db.QueryRow(query, identifier, name).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
	require.NoError(t, err)
	return &ep
}

// createNewmanTestParkingSlotGreenFlow creates a test parking slot for Newman-based green flow tests
// Note: Renamed to avoid redeclaration with other test files
func createNewmanTestParkingSlotGreenFlow(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
	distancesBytes, _ := json.Marshal(distances)
	query := `INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at`
	var slot models.ParkingSlot
	var distancesJSON []byte
	err := db.QueryRow(query, slotLabel, slotType, distancesBytes, available).Scan(&slot.ID, &slot.SlotLabel, &slot.SlotType, &distancesJSON, &slot.Available, &slot.CreatedAt, &slot.UpdatedAt)
	require.NoError(t, err)
	json.Unmarshal(distancesJSON, &slot.Distances)
	return &slot
}

// ============================================================================
// Newman-Based API Tests - Green Flow
// ============================================================================

// TestNewmanGreenFlow provides comprehensive API-level tests mirroring Newman collection
func TestNewmanGreenFlow(t *testing.T) {
	t.Run("Newman-Based Green Flow Tests", func(t *testing.T) {
		db := setupNewmanGreenFlowTestDB(t)
		defer cleanupNewmanGreenFlowTestDB(t, db)

		// Initialize repositories
		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

		// Initialize handler
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Setup router
		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/sessions", parkingHandler.ParkVehicle).Methods("POST")
		api.HandleFunc("/sessions/{id}", parkingHandler.GetSession).Methods("GET")
		api.HandleFunc("/sessions/{id}/unpark", parkingHandler.UnparkVehicle).Methods("POST")

		// ========================================================================
		// GREEN FLOW TEST SCENARIOS
		// ========================================================================

		t.Run("Green Flow - Initialize System (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create entry points
			_ = createNewmanTestEntryPointGreenFlow(t, db.GetDB(), "A", "Entry Point A")
			_ = createNewmanTestEntryPointGreenFlow(t, db.GetDB(), "B", "Entry Point B")
			_ = createNewmanTestEntryPointGreenFlow(t, db.GetDB(), "C", "Entry Point C")

			// Create parking slots
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "SP-2", "SP", []int{15, 25, 35}, true)
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "MP-1", "MP", []int{10, 20, 30}, true)
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "MP-2", "MP", []int{15, 25, 35}, true)
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "LP-1", "LP", []int{10, 20, 30}, true)
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "LP-2", "LP", []int{15, 25, 35}, true)

			// Verify entry points were created
			entryPoints, err := entryPointRepo.List()
			require.NoError(t, err)
			assert.Len(t, entryPoints, 3, "Should have 3 entry points")

			// Verify parking slots were created
			slots, err := parkingSlotRepo.List()
			require.NoError(t, err)
			assert.Len(t, slots, 6, "Should have 6 parking slots")
		})

		t.Run("Green Flow - Small Vehicle (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Initialize system
			_ = createNewmanTestEntryPointGreenFlow(t, db.GetDB(), "A", "Entry Point A")
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)

			// Park small vehicle
			parkReq := dtos.ParkVehicleRequest{
				VehicleType:  "S",
				EntryPointID: "A",
			}
			reqBody, _ := json.Marshal(parkReq)

			req, err := http.NewRequest("POST", "/api/v1/sessions", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 201 Created
			assert.Equal(t, http.StatusCreated, rr.Code, "Parking small vehicle should return 201 Created")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.Equal(t, "S", data["vehicle_type"], "Vehicle type should be S")
				assert.NotEmpty(t, data["session_id"], "Session ID should be set")
				assert.NotEmpty(t, data["parking_slot"], "Parking slot should be set")
			}
		})

		t.Run("Green Flow - Medium Vehicle (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Initialize system
			_ = createNewmanTestEntryPointGreenFlow(t, db.GetDB(), "B", "Entry Point B")
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "MP-1", "MP", []int{10, 20, 30}, true)

			// Park medium vehicle
			parkReq := dtos.ParkVehicleRequest{
				VehicleType:  "M",
				EntryPointID: "B",
			}
			reqBody, _ := json.Marshal(parkReq)

			req, err := http.NewRequest("POST", "/api/v1/sessions", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 201 Created
			assert.Equal(t, http.StatusCreated, rr.Code, "Parking medium vehicle should return 201 Created")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.Equal(t, "M", data["vehicle_type"], "Vehicle type should be M")
			}
		})

		t.Run("Green Flow - Large Vehicle (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Initialize system
			_ = createNewmanTestEntryPointGreenFlow(t, db.GetDB(), "C", "Entry Point C")
			_ = createNewmanTestParkingSlotGreenFlow(t, db.GetDB(), "LP-1", "LP", []int{10, 20, 30}, true)

			// Park large vehicle
			parkReq := dtos.ParkVehicleRequest{
				VehicleType:  "L",
				EntryPointID: "C",
			}
			reqBody, _ := json.Marshal(parkReq)

			req, err := http.NewRequest("POST", "/api/v1/sessions", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 201 Created
			assert.Equal(t, http.StatusCreated, rr.Code, "Parking large vehicle should return 201 Created")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.Equal(t, "L", data["vehicle_type"], "Vehicle type should be L")
			}
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanGreenFlowSummary documents Newman-based test coverage
func TestNewmanGreenFlowSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED GREEN FLOW TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ Initialize System")
		t.Log("  ✓ Green Flow - Small Vehicle")
		t.Log("  ✓ Green Flow - Medium Vehicle")
		t.Log("  ✓ Green Flow - Large Vehicle")
		t.Log("")
		t.Log("API Endpoints:")
		t.Log("  - POST   /api/v1/sessions")
		t.Log("  - GET    /api/v1/sessions/:id")
		t.Log("  - POST   /api/v1/sessions/:id/unpark")
		t.Log("")
		t.Log("Request Format:")
		t.Log("  - Park Vehicle: {vehicle_type: \"S|M|L\", entry_point_id: \"<id>\"}")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 201 Created: Successful park")
		t.Log("  - 200 OK: Successful unpark")
		t.Log("")
		t.Log("Test Structure:")
		t.Log("  - API-level tests using httptest")
		t.Log("  - Mirrors Newman collection scenarios")
		t.Log("  - Follows Go testing conventions")
		t.Log("  - Uses testify/assert and testify/require")
		t.Log("")
	})
}
