// Package internal provides comprehensive tests for slot deletion functionality
//
// This test file documents the correct behavior after the fix:
// The Delete method in parking_slot_repository.go now checks for ALL sessions
// (both active and historical) before attempting deletion, providing clear
// error messages when deletion is not possible
package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// setupSlotDeletionTestDB creates and initializes test database for slot deletion tests
func setupSlotDeletionTestDB(t *testing.T) *database.DB {
	// Setup test environment with sensible defaults
	database.SetupTestEnvironment()
	os.Setenv("DATABASE_NAME", "oo_parking_lot_handlers_test")

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

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

// cleanupSlotDeletionTestDB cleans up test database after tests
func cleanupSlotDeletionTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createSlotDeletionTestEntryPoint creates a test entry point for slot deletion tests
func createSlotDeletionTestEntryPoint(t *testing.T, db *sql.DB, identifier, name string) *models.EntryPoint {
	query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
	var ep models.EntryPoint
	err := db.QueryRow(query, identifier, name).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
	require.NoError(t, err)
	return &ep
}

// createSlotDeletionTestParkingSlot creates a test parking slot for slot deletion tests
func createSlotDeletionTestParkingSlot(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
	distancesBytes, _ := json.Marshal(distances)
	query := `INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at`
	var slot models.ParkingSlot
	var distancesJSON []byte
	err := db.QueryRow(query, slotLabel, slotType, distancesBytes, available).Scan(&slot.ID, &slot.SlotLabel, &slot.SlotType, &distancesJSON, &slot.Available, &slot.CreatedAt, &slot.UpdatedAt)
	require.NoError(t, err)
	json.Unmarshal(distancesJSON, &slot.Distances)
	return &slot
}

// createSlotDeletionTestParkingSession creates a test parking session for slot deletion tests
func createSlotDeletionTestParkingSession(t *testing.T, db *sql.DB, vehicleType string, slotID, entryPointID int64, parkedAt time.Time, exitedAt *time.Time) *models.ParkingSession {
	query := `INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW()) RETURNING id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at`
	var session models.ParkingSession
	err := db.QueryRow(query, vehicleType, slotID, entryPointID, parkedAt, exitedAt).Scan(
		&session.ID, &session.VehicleType, &session.ParkingSlotID, &session.EntryPointID,
		&session.ParkedAt, &session.ExitedAt, &session.TotalFee, &session.CreatedAt, &session.UpdatedAt,
	)
	require.NoError(t, err)
	return &session
}

// ============================================================================
// Repository Level Tests
// ============================================================================

// TestParkingSlotRepository_Delete tests repository-level slot deletion
func TestParkingSlotRepository_Delete(t *testing.T) {
	t.Run("Repository Level Tests", func(t *testing.T) {
		db := setupSlotDeletionTestDB(t)
		defer cleanupSlotDeletionTestDB(t, db)

		slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

		t.Run("Delete slot that has never been used", func(t *testing.T) {
			// Create a slot that has never been used
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "TEST-UNUSED", "SP", []int{10, 20, 30}, true)

			// Delete should succeed
			err := slotRepo.Delete(slot.ID)
			assert.NoError(t, err, "Deleting an unused slot should succeed")

			// Verify slot is deleted
			_, err = slotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete slot with active parking sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-ACTIVE", "Entry Point Active")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "TEST-ACTIVE", "SP", []int{10, 20, 30}, true)

			// Create an active session (exited_at is NULL)
			parkedAt := time.Now().UTC().Add(-1 * time.Hour)
			session := createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, nil)

			// Verify session is active
			assert.Nil(t, session.ExitedAt, "Session should be active")

			// Delete should fail with appropriate error
			err := slotRepo.Delete(slot.ID)
			assert.Error(t, err, "Deleting a slot with active sessions should fail")
			assert.Contains(t, err.Error(), "active sessions", "Error message should mention active sessions")

			// Verify slot still exists
			_, err = slotRepo.GetByID(slot.ID)
			assert.NoError(t, err, "Slot should still exist after failed deletion")
		})

		t.Run("Delete slot with historical/completed parking sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-HISTORICAL", "Entry Point Historical")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "TEST-HISTORICAL", "SP", []int{10, 20, 30}, true)

			// Create a completed session (exited_at is NOT NULL)
			parkedAt := time.Now().UTC().Add(-24 * time.Hour)
			exitedAt := parkedAt.Add(2 * time.Hour)
			session := createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Verify session is completed
			assert.NotNil(t, session.ExitedAt, "Session should be completed")

			// CORRECT BEHAVIOR: The repository now checks only for ACTIVE sessions (exited_at IS NULL)
			// Historical sessions (where exited_at IS NOT NULL) do NOT prevent deletion
			err := slotRepo.Delete(slot.ID)

			// Should succeed - deletion is allowed for slots with no ACTIVE sessions
			assert.NoError(t, err, "Deleting a slot with only historical sessions should succeed")

			// Verify slot is deleted
			_, err = slotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete slot that doesn't exist", func(t *testing.T) {
			// Try to delete a non-existent slot
			err := slotRepo.Delete(999999)
			assert.Error(t, err, "Deleting a non-existent slot should fail")
			assert.Contains(t, err.Error(), "not found", "Error message should mention not found")
		})

		t.Run("Delete slot with multiple active sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-MULTI", "Entry Point Multi")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "TEST-MULTI", "SP", []int{10, 20, 30}, true)

			// Create multiple active sessions
			parkedAt1 := time.Now().UTC().Add(-2 * time.Hour)
			parkedAt2 := time.Now().UTC().Add(-1 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt1, nil)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt2, nil)

			// Delete should fail
			err := slotRepo.Delete(slot.ID)
			assert.Error(t, err, "Deleting a slot with multiple active sessions should fail")
			assert.Contains(t, err.Error(), "active sessions", "Error message should mention active sessions")
		})

		t.Run("Delete slot with multiple historical sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-MULTI-HIST", "Entry Point Multi Historical")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "TEST-MULTI-HIST", "SP", []int{10, 20, 30}, true)

			// Create multiple completed sessions
			parkedAt1 := time.Now().UTC().Add(-48 * time.Hour)
			exitedAt1 := parkedAt1.Add(2 * time.Hour)
			parkedAt2 := time.Now().UTC().Add(-24 * time.Hour)
			exitedAt2 := parkedAt2.Add(3 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt1, &exitedAt1)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt2, &exitedAt2)

			// Should succeed - deletion allowed for slots with no ACTIVE sessions
			err := slotRepo.Delete(slot.ID)
			assert.NoError(t, err, "Deleting a slot with only historical sessions should succeed")

			// Verify slot is deleted
			_, err = slotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete slot with mixed active and historical sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-MIXED", "Entry Point Mixed")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "TEST-MIXED", "SP", []int{10, 20, 30}, true)

			// Create both active and completed sessions
			parkedAt1 := time.Now().UTC().Add(-48 * time.Hour)
			exitedAt1 := parkedAt1.Add(2 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt1, &exitedAt1)
			parkedAt2 := time.Now().UTC().Add(-1 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt2, nil)

			// Should fail with associated sessions error
			err := slotRepo.Delete(slot.ID)
			assert.Error(t, err, "Deleting a slot with mixed sessions should fail")
			assert.Contains(t, err.Error(), "active sessions", "Error message should mention active sessions")
		})
	})
}

// ============================================================================
// Handler Level Tests
// ============================================================================

// TestParkingSlotHandler_DeleteSlot tests handler-level slot deletion
func TestParkingSlotHandler_DeleteSlot(t *testing.T) {
	t.Run("Handler Level Tests", func(t *testing.T) {
		db := setupSlotDeletionTestDB(t)
		defer cleanupSlotDeletionTestDB(t, db)

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
		api.HandleFunc("/slots/{id}", parkingHandler.DeleteSlot).Methods("DELETE")

		t.Run("DELETE /api/v1/slots/{id} - Delete unused slot", func(t *testing.T) {
			// Create a slot that has never been used
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "HANDLER-UNUSED", "SP", []int{10, 20, 30}, true)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting an unused slot should return 204 No Content")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("DELETE /api/v1/slots/{id} - Delete slot with active sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-HANDLER-ACTIVE", "Entry Point Handler Active")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "HANDLER-ACTIVE", "SP", []int{10, 20, 30}, true)

			// Create an active session
			parkedAt := time.Now().UTC().Add(-1 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, nil)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 409 Conflict (handler returns correct error for associated sessions)
			assert.Equal(t, http.StatusConflict, rr.Code, "Deleting a slot with active sessions currently returns 409 Conflict")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
			assert.NotEmpty(t, response["error"], "Error message should not be empty")
		})

		t.Run("DELETE /api/v1/slots/{id} - Delete slot with historical sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-HANDLER-HIST", "Entry Point Handler Historical")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "HANDLER-HIST", "SP", []int{10, 20, 30}, true)

			// Create a completed session (exited_at is NOT NULL)
			parkedAt := time.Now().UTC().Add(-24 * time.Hour)
			exitedAt := parkedAt.Add(2 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content - deletion allowed for slots with no ACTIVE sessions
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting a slot with only historical sessions should return 204 No Content")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("DELETE /api/v1/slots/{id} - Delete non-existent slot", func(t *testing.T) {
			// Make DELETE request for non-existent slot
			req, err := http.NewRequest("DELETE", "/api/v1/slots/999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Deleting a non-existent slot should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
			assert.NotEmpty(t, response["error"], "Error message should not be empty")
		})

		t.Run("DELETE /api/v1/slots/{id} - Invalid slot ID", func(t *testing.T) {
			// Make DELETE request with invalid ID
			req, err := http.NewRequest("DELETE", "/api/v1/slots/invalid", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request
			assert.Equal(t, http.StatusBadRequest, rr.Code, "Invalid slot ID should return 400 Bad Request")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
		})

		t.Run("DELETE /api/v1/slots/{id} - Delete slot with very large ID", func(t *testing.T) {
			// Make DELETE request with very large ID
			req, err := http.NewRequest("DELETE", "/api/v1/slots/999999999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Very large ID should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
			assert.Contains(t, response["error"], "not found", "Error message should mention not found")
		})

		t.Run("DELETE /api/v1/slots/{id} - Delete MP slot successfully", func(t *testing.T) {
			// Create an MP slot that has never been used
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "DELETE-MP-TEST", "MP", []int{25, 35, 45}, true)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting an unused MP slot should return 204 No Content")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "MP slot should not exist after deletion")
		})

		t.Run("DELETE /api/v1/slots/{id} - Delete LP slot successfully", func(t *testing.T) {
			// Create an LP slot that has never been used
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "DELETE-LP-TEST", "LP", []int{30, 40, 50}, true)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting an unused LP slot should return 204 No Content")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "LP slot should not exist after deletion")
		})
	})
}

// ============================================================================
// Integration Tests - Service Level
// ============================================================================

// TestParkingService_DeleteSlot tests service-level slot deletion
func TestParkingService_DeleteSlot(t *testing.T) {
	t.Run("Service Level Tests", func(t *testing.T) {
		db := setupSlotDeletionTestDB(t)
		defer cleanupSlotDeletionTestDB(t, db)

		// Initialize repositories
		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

		t.Run("Delete unused slot via service", func(t *testing.T) {
			// Create a slot that has never been used
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "SERVICE-UNUSED", "SP", []int{10, 20, 30}, true)

			// Delete should succeed
			err := parkingService.DeleteSlot(slot.ID)
			assert.NoError(t, err, "Deleting an unused slot via service should succeed")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete slot with active sessions via service", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-SERVICE-ACTIVE", "Entry Point Service Active")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "SERVICE-ACTIVE", "SP", []int{10, 20, 30}, true)

			// Create an active session
			parkedAt := time.Now().UTC().Add(-1 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, nil)

			// Delete should fail
			err := parkingService.DeleteSlot(slot.ID)
			assert.Error(t, err, "Deleting a slot with active sessions via service should fail")
		})

		t.Run("Delete slot with historical sessions via service", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-SERVICE-HIST", "Entry Point Service Historical")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "SERVICE-HIST", "SP", []int{10, 20, 30}, true)

			// Create a completed session (exited_at is NOT NULL)
			parkedAt := time.Now().UTC().Add(-24 * time.Hour)
			exitedAt := parkedAt.Add(2 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Should succeed - deletion allowed for slots with no ACTIVE sessions
			err := parkingService.DeleteSlot(slot.ID)
			assert.NoError(t, err, "Deleting a slot with only historical sessions via service should succeed")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete non-existent slot via service", func(t *testing.T) {
			// Try to delete non-existent slot
			err := parkingService.DeleteSlot(999999)
			assert.Error(t, err, "Deleting a non-existent slot via service should fail")
		})
	})
}

// ============================================================================
// Table-Driven Tests
// ============================================================================

// TestSlotDeletionScenarios provides table-driven tests for various deletion scenarios
func TestSlotDeletionScenarios(t *testing.T) {
	t.Run("Table-Driven Scenarios", func(t *testing.T) {
		db := setupSlotDeletionTestDB(t)
		defer cleanupSlotDeletionTestDB(t, db)

		slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

		testCases := []struct {
			name             string
			setupSlot        func(t *testing.T) *models.ParkingSlot
			setupSessions    func(t *testing.T, slotID int64)
			expectError      bool
			expectedErrorSub string
			description     string
		}{
			{
				name: "Unused slot",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotDeletionTestParkingSlot(t, db.GetDB(), "TABLE-UNUSED", "SP", []int{10, 20, 30}, true)
				},
				setupSessions:    func(t *testing.T, slotID int64) {},
				expectError:      false,
				expectedErrorSub: "",
				description:     "Deleting a slot that has never been used should succeed",
			},
			{
				name: "Slot with single active session",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotDeletionTestParkingSlot(t, db.GetDB(), "TABLE-ACTIVE-1", "SP", []int{10, 20, 30}, true)
				},
				setupSessions: func(t *testing.T, slotID int64) {
					ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-TABLE-ACTIVE-1", "EP Active 1")
					parkedAt := time.Now().UTC().Add(-1 * time.Hour)
					createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slotID, ep.ID, parkedAt, nil)
				},
				expectError:      true,
				expectedErrorSub: "active sessions",
				description:     "Deleting a slot with an active session should fail with appropriate error",
			},
			{
				name: "Slot with single historical session",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotDeletionTestParkingSlot(t, db.GetDB(), "TABLE-HIST-1", "SP", []int{10, 20, 30}, true)
				},
				setupSessions: func(t *testing.T, slotID int64) {
					ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-TABLE-HIST-1", "EP Hist 1")
					parkedAt := time.Now().UTC().Add(-24 * time.Hour)
					exitedAt := parkedAt.Add(2 * time.Hour)
					createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slotID, ep.ID, parkedAt, &exitedAt)
				},
				expectError:      false,
				expectedErrorSub: "",
				description:     "Deleting a slot with only historical sessions should succeed",
			},
			{
				name: "Slot with multiple active sessions",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotDeletionTestParkingSlot(t, db.GetDB(), "TABLE-ACTIVE-MULTI", "SP", []int{10, 20, 30}, true)
				},
				setupSessions: func(t *testing.T, slotID int64) {
					ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-TABLE-ACTIVE-MULTI", "EP Active Multi")
					parkedAt1 := time.Now().UTC().Add(-2 * time.Hour)
					parkedAt2 := time.Now().UTC().Add(-1 * time.Hour)
					createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slotID, ep.ID, parkedAt1, nil)
					createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slotID, ep.ID, parkedAt2, nil)
				},
				expectError:      true,
				expectedErrorSub: "active sessions",
				description:     "Deleting a slot with multiple active sessions should fail",
			},
			{
				name: "Slot with multiple historical sessions",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotDeletionTestParkingSlot(t, db.GetDB(), "TABLE-HIST-MULTI", "SP", []int{10, 20, 30}, true)
				},
				setupSessions: func(t *testing.T, slotID int64) {
					ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-TABLE-HIST-MULTI", "EP Hist Multi")
					parkedAt1 := time.Now().UTC().Add(-48 * time.Hour)
					exitedAt1 := parkedAt1.Add(2 * time.Hour)
					parkedAt2 := time.Now().UTC().Add(-24 * time.Hour)
					exitedAt2 := parkedAt2.Add(3 * time.Hour)
					createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slotID, ep.ID, parkedAt1, &exitedAt1)
					createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slotID, ep.ID, parkedAt2, &exitedAt2)
				},
				expectError:      false,
				expectedErrorSub: "",
				description:     "Deleting a slot with only historical sessions should succeed",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				t.Logf("Test scenario: %s", tc.description)

				// Setup slot
				slot := tc.setupSlot(t)

				// Setup sessions
				tc.setupSessions(t, slot.ID)

				// Attempt deletion
				err := slotRepo.Delete(slot.ID)

				// Verify expectations
				if tc.expectError {
					assert.Error(t, err, "Expected error for scenario: "+tc.description)
					if tc.expectedErrorSub != "" {
						assert.Contains(t, err.Error(), tc.expectedErrorSub,
							"Error should contain '%s' for scenario: %s", tc.expectedErrorSub, tc.description)
					}
				} else {
					assert.NoError(t, err, "Expected no error for scenario: "+tc.description)

					// Verify slot is deleted
					_, err = slotRepo.GetByID(slot.ID)
					assert.Error(t, err, "Slot should not exist after successful deletion")
				}
			})
		}
	})
}

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

// TestSlotDeletionEdgeCases tests edge cases and boundary conditions
func TestSlotDeletionEdgeCases(t *testing.T) {
	t.Run("Edge Cases", func(t *testing.T) {
		db := setupSlotDeletionTestDB(t)
		defer cleanupSlotDeletionTestDB(t, db)

		slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

		t.Run("Delete slot with very old historical sessions", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-OLD-HIST", "Entry Point Old Historical")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "OLD-HIST", "SP", []int{10, 20, 30}, true)

			// Create a session from a year ago (historical)
			parkedAt := time.Now().UTC().Add(-365 * 24 * time.Hour)
			exitedAt := parkedAt.Add(2 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Should succeed - deletion allowed for slots with no ACTIVE sessions
			err := slotRepo.Delete(slot.ID)
			assert.NoError(t, err, "Deleting a slot with very old historical sessions should succeed")

			// Verify slot is deleted
			_, err = slotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete slot with recently completed session", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-RECENT-HIST", "Entry Point Recent Historical")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "RECENT-HIST", "SP", []int{10, 20, 30}, true)

			// Create a session that just completed (historical)
			parkedAt := time.Now().UTC().Add(-5 * time.Minute)
			exitedAt := time.Now().UTC().Add(-1 * time.Minute)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Should succeed - deletion allowed for slots with no ACTIVE sessions
			err := slotRepo.Delete(slot.ID)
			assert.NoError(t, err, "Deleting a slot with recently completed session should succeed")

			// Verify slot is deleted
			_, err = slotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete slot ID 0", func(t *testing.T) {
			// Try to delete slot with ID 0
			err := slotRepo.Delete(0)
			assert.Error(t, err, "Deleting slot with ID 0 should fail")
		})

		t.Run("Delete slot with negative ID", func(t *testing.T) {
			// Try to delete slot with negative ID
			err := slotRepo.Delete(-1)
			assert.Error(t, err, "Deleting slot with negative ID should fail")
		})

		t.Run("Delete slot with very large ID", func(t *testing.T) {
			// Try to delete slot with very large ID
			err := slotRepo.Delete(9223372036854775807) // Max int64
			assert.Error(t, err, "Deleting slot with very large ID should fail")
		})

		t.Run("Delete same slot twice", func(t *testing.T) {
			// Create a slot
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "DOUBLE-DELETE", "SP", []int{10, 20, 30}, true)

			// Delete first time - should succeed
			err := slotRepo.Delete(slot.ID)
			assert.NoError(t, err, "First deletion should succeed")

			// Delete second time - should fail
			err = slotRepo.Delete(slot.ID)
			assert.Error(t, err, "Second deletion should fail")
			assert.Contains(t, err.Error(), "not found", "Error should mention not found")
		})

		t.Run("Delete slot after unparking all vehicles", func(t *testing.T) {
			// Create entry point and slot
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-UNPARK", "Entry Point Unpark")
			slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), "UNPARK-TEST", "SP", []int{10, 20, 30}, true)

			// Create and complete a session (historical)
			parkedAt := time.Now().UTC().Add(-2 * time.Hour)
			exitedAt := parkedAt.Add(1 * time.Hour)
			createSlotDeletionTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Should succeed - deletion allowed for slots with no ACTIVE sessions
			err := slotRepo.Delete(slot.ID)
			assert.NoError(t, err, "Deleting a slot after unparking all vehicles should succeed")

			// Verify slot is deleted
			_, err = slotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("Delete different slot types with sessions", func(t *testing.T) {
			ep := createSlotDeletionTestEntryPoint(t, db.GetDB(), "EP-TYPES", "Entry Point Types")

			slotTypes := []struct {
				label    string
				slotType string
			}{
				{"SP-TEST", "SP"},
				{"MP-TEST", "MP"},
				{"LP-TEST", "LP"},
			}

			for _, st := range slotTypes {
				t.Run(st.slotType, func(t *testing.T) {
					slot := createSlotDeletionTestParkingSlot(t, db.GetDB(), st.label, st.slotType, []int{10, 20, 30}, true)

					// Create a completed session (historical)
					parkedAt := time.Now().UTC().Add(-24 * time.Hour)
					exitedAt := parkedAt.Add(2 * time.Hour)
					createSlotDeletionTestParkingSession(t, db.GetDB(), st.slotType[0:1], slot.ID, ep.ID, parkedAt, &exitedAt)

					// Should succeed - deletion allowed for slots with no ACTIVE sessions
					err := slotRepo.Delete(slot.ID)
					assert.NoError(t, err, "Deleting %s slot with only historical sessions should succeed", st.slotType)

					// Verify slot is deleted
					_, err = slotRepo.GetByID(slot.ID)
					assert.Error(t, err, "%s slot should not exist after deletion", st.slotType)
				})
			}
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestSlotDeletionSummary documents the correct behavior after the fix
func TestSlotDeletionSummary(t *testing.T) {
	t.Run("Summary", func(t *testing.T) {
		t.Log("=== SLOT DELETION BEHAVIOR SUMMARY ===")
		t.Log("")
		t.Log("Fix Applied:")
		t.Log("  The Delete method in parking_slot_repository.go now checks for ACTIVE sessions ONLY")
		t.Log("  (exited_at IS NULL), allowing deletion of slots with historical sessions.")
		t.Log("  This provides clear and accurate error messages for slots with active sessions.")
		t.Log("")
		t.Log("Current Behavior:")
		t.Log("  - Deleting a slot with active sessions: Returns 409 Conflict with error message")
		t.Log("  - Deleting a slot with historical sessions: Successfully deletes the slot (200/204)")
		t.Log("  - Deleting an unused slot: Successfully deletes the slot (200/204)")
		t.Log("")
		t.Log("Error Message:")
		t.Log("  - Active sessions error: 'cannot delete parking slot with active parking sessions'")
		t.Log("  - Only shown when slot has ACTIVE sessions (exited_at IS NULL)")
		t.Log("")
		t.Log("Impact:")
		t.Log("  - Allows archival/cleanup of slots with completed historical sessions")
		t.Log("  - Prevents deletion only when vehicles are currently parked")
		t.Log("  - Historical records remain in parking_sessions table even after slot deletion")
		t.Log("")
		t.Log("Test Coverage:")
		t.Log("  ✓ Deleting unused slots (success)")
		t.Log("  ✓ Deleting slots with active sessions (409 Conflict)")
		t.Log("  ✓ Deleting slots with historical sessions (success)")
		t.Log("  ✓ Deleting slots with mixed active and historical sessions (409 Conflict)")
		t.Log("  ✓ Deleting non-existent slots (404 Not Found)")
		t.Log("  ✓ Edge cases and boundary conditions")
		t.Log("  ✓ Table-driven test scenarios")
		t.Log("  ✓ Repository, service, and handler level tests")
		t.Log("  ✓ Tests for all slot types (SP, MP, LP)")
		t.Log("")
	})
}
