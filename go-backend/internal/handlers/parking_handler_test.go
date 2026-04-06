package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// TestMain sets up test databases before running tests
func TestMain(m *testing.M) {
	// Setup test databases
	if err := database.SetupTestDatabases(); err != nil {
		log.Fatalf("Failed to setup test databases: %v", err)
	}

	// Run tests
	exitCode := m.Run()

	// Optional: Drop test databases after tests complete
	// Commented out by default for debugging purposes
	// if err := database.DropTestDatabases(); err != nil {
	// 	log.Printf("Warning: Failed to drop test databases: %v", err)
	// }

	// Exit with the test result code
	os.Exit(exitCode)
}

func setupTestDB(t *testing.T) *database.DB {
	// Setup test environment with sensible defaults
	database.SetupTestEnvironment()
	// Ensure we use the handlers test database for unit tests
	os.Setenv("DATABASE_NAME", "oo_parking_lot_handlers_test")

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
			license_plate VARCHAR(20),
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	db.GetDB().Exec(`ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);`)

	return db
}

func setupTestRouter(t *testing.T) (*mux.Router, *services.ParkingService, *database.DB, func()) {
	db := setupTestDB(t)

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
	parkingHandler := NewParkingHandler(parkingService)

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
	api.HandleFunc("/entry_points", parkingHandler.CreateEntryPoint).Methods("POST")

	// Health check (inline handler for testing)
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Check database connectivity
		dbStatus := "healthy"
		if err := db.GetDB().Ping(); err != nil {
			dbStatus = "unhealthy"
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			w.WriteHeader(http.StatusOK)
		}

		healthResponse := map[string]interface{}{
			"status":    "ok",
			"service":   "parking-lot-api",
			"version":   "1.0.0",
			"timestamp": "2024-01-15T10:30:00Z",
			"checks": map[string]interface{}{
				"database": map[string]interface{}{
					"status": dbStatus,
				},
			},
		}

		if err := json.NewEncoder(w).Encode(healthResponse); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}).Methods("GET")

	return router, parkingService, db, cleanup
}

func createTestEntryPoint(t *testing.T, db *sql.DB, identifier, name string) *models.EntryPoint {
	query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
	var ep models.EntryPoint
	err := db.QueryRow(query, identifier, name).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
	require.NoError(t, err)
	return &ep
}

func createTestParkingSlot(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
	distancesBytes, _ := json.Marshal(distances)
	query := `INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at`
	var slot models.ParkingSlot
	var distancesJSON []byte
	err := db.QueryRow(query, slotLabel, slotType, distancesBytes, available).Scan(&slot.ID, &slot.SlotLabel, &slot.SlotType, &distancesJSON, &slot.Available, &slot.CreatedAt, &slot.UpdatedAt)
	require.NoError(t, err)
	json.Unmarshal(distancesJSON, &slot.Distances)
	return &slot
}

// Health Check Tests
func TestHealthCheck(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	req, err := http.NewRequest("GET", "/health", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "status")
	assert.Equal(t, "ok", response["status"])
	assert.Contains(t, response, "service")
	assert.Equal(t, "parking-lot-api", response["service"])
	assert.Contains(t, response, "version")
	assert.Contains(t, response, "timestamp")
	assert.Contains(t, response, "checks")
	assert.Contains(t, response["checks"], "database")

	checks := response["checks"].(map[string]interface{})
	dbCheck := checks["database"].(map[string]interface{})
	assert.Contains(t, dbCheck, "status")
	assert.Equal(t, "healthy", dbCheck["status"])
}

// Entry Points Tests
func TestListEntryPoints(t *testing.T) {
	router, _, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Clean up any existing data to ensure test isolation
	db.GetDB().Exec("DELETE FROM entry_points WHERE identifier IN ('A', 'B', 'C')")

	// Create test entry points using repository
	createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	createTestEntryPoint(t, db.GetDB(), "B", "Entry Point B")
	createTestEntryPoint(t, db.GetDB(), "C", "Entry Point C")

	req, err := http.NewRequest("GET", "/api/v1/entry_points", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify wrapper format
	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].([]interface{})
	assert.Greater(t, len(data), 0)

	// Check each entry point has required fields
	for _, item := range data {
		ep := item.(map[string]interface{})
		assert.Contains(t, ep, "id")
		assert.Contains(t, ep, "identifier")
		assert.Contains(t, ep, "name")
		assert.Contains(t, ep, "created_at")
		assert.Contains(t, ep, "updated_at")

		// Check valid identifiers
		identifier := ep["identifier"].(string)
		assert.Contains(t, []string{"A", "B", "C"}, identifier)

		// Check timestamp fields are valid ISO dates
		createdAt := ep["created_at"].(string)
		updatedAt := ep["updated_at"].(string)
		assert.Regexp(t, `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, createdAt)
		assert.Regexp(t, `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, updatedAt)
	}

	// Check no duplicate identifiers
	identifiers := make([]string, len(data))
	for i, item := range data {
		ep := item.(map[string]interface{})
		identifiers[i] = ep["identifier"].(string)
	}
	assert.Equal(t, len(identifiers), len(uniqueStrings(identifiers)))
}

// Sessions Tests
func TestParkVehicle(t *testing.T) {
	router, _, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Clean up database completely before this test to ensure isolation
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Check existing entry points before creating new ones
	var existingEPCount int
	db.GetDB().QueryRow("SELECT COUNT(*) FROM entry_points").Scan(&existingEPCount)
	t.Logf("DEBUG: Existing entry points before test: %d", existingEPCount)

	var existingSlotCount int
	db.GetDB().QueryRow("SELECT COUNT(*) FROM parking_slots").Scan(&existingSlotCount)
	t.Logf("DEBUG: Existing parking slots before test: %d", existingSlotCount)

	// Create test data using repository
	t.Logf("DEBUG: Creating entry point A and parking slot SP-1")
	createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)

	// Check entry points and slots after creation
	var newEPCount int
	db.GetDB().QueryRow("SELECT COUNT(*) FROM entry_points").Scan(&newEPCount)
	t.Logf("DEBUG: Entry points after creation: %d", newEPCount)

	var newSlotCount int
	db.GetDB().QueryRow("SELECT COUNT(*) FROM parking_slots").Scan(&newSlotCount)
	t.Logf("DEBUG: Parking slots after creation: %d", newSlotCount)

	// Test successful parking
	formData := url.Values{}
	formData.Set("vehicle_type", "S")
	formData.Set("entry_point_id", "A")

	req, err := http.NewRequest("POST", "/api/v1/sessions", strings.NewReader(formData.Encode()))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	t.Logf("DEBUG: Response status code=%d, body=%s", rr.Code, rr.Body.String())

	// Postman collection tests
	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	t.Logf("DEBUG: Parsed response: %+v", response)

	// Verify wrapper format
	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	// Check if data is nil before type assertion
	if response["data"] == nil {
		t.Fatalf("DEBUG: response['data'] is nil, cannot proceed with test")
	}

	data := response["data"].(map[string]interface{})
	assert.Contains(t, data, "session_id")
	assert.NotEmpty(t, data["session_id"])
	assert.Contains(t, data, "parking_slot")
	assert.Contains(t, data, "entry_point")
	assert.Contains(t, data, "parked_at")
	assert.Contains(t, data, "is_active")
	assert.Contains(t, data, "is_continuous")
	assert.Contains(t, data, "duration_hours")
	assert.Contains(t, data, "total_fee")

	// Check is_active and is_continuous are booleans
	assert.IsType(t, true, data["is_active"])
	assert.IsType(t, true, data["is_continuous"])

	// Check duration_hours and total_fee are numbers
	assert.IsType(t, 0.0, data["duration_hours"])
	assert.IsType(t, 0.0, data["total_fee"])
	assert.GreaterOrEqual(t, data["duration_hours"].(float64), 0.0)
	assert.GreaterOrEqual(t, data["total_fee"].(float64), 0.0)

	// Check parking slot has required fields
	parkingSlot := data["parking_slot"].(map[string]interface{})
	assert.Contains(t, parkingSlot, "id")
	assert.Contains(t, parkingSlot, "slot_label")
	assert.Contains(t, parkingSlot, "slot_type")

	// Check parked_at is valid ISO date
	parkedAt := data["parked_at"].(string)
	assert.Regexp(t, `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, parkedAt)
}

func TestParkVehicleNoSlots(t *testing.T) {
	router, parkingService, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Create test data
	createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	createTestParkingSlot(t, db.GetDB(), "LP-1", "LP", []int{20, 30, 40}, true)

	// Park a vehicle first to mark the slot as unavailable
	_, err := parkingService.ParkVehicle("L", "A", "", "", nil)
	require.NoError(t, err)

	// Now try to park another vehicle - should fail with no available slots
	formData := url.Values{}
	formData.Set("vehicle_type", "L")
	formData.Set("entry_point_id", "A")

	req, err := http.NewRequest("POST", "/api/v1/sessions", strings.NewReader(formData.Encode()))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusConflict, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "error")
	assert.NotEmpty(t, response["error"])
}

func TestGetSession(t *testing.T) {
	router, parkingService, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Clean up database completely before this test to ensure isolation
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create test data using repository
	createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	slot := createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)

	session, err := parkingService.ParkVehicle("S", "A", "", "", nil)
	require.NoError(t, err)

	sessionID := session.ID
	req, err := http.NewRequest("GET", "/api/v1/sessions/"+int64ToString(sessionID), nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].(map[string]interface{})
	assert.Contains(t, data, "session_id")
	assert.Contains(t, data, "vehicle_type")
	assert.Contains(t, data, "parking_slot")
	assert.Contains(t, data, "entry_point")
	assert.Contains(t, data, "parked_at")
	assert.Contains(t, data, "exited_at")
	assert.Contains(t, data, "is_active")
	assert.Contains(t, data, "is_continuous")

	// Check valid vehicle type
	vehicleType := data["vehicle_type"].(string)
	assert.Contains(t, []string{"S", "M", "L"}, vehicleType)

	// Check is_active and is_continuous are booleans
	assert.IsType(t, true, data["is_active"])
	assert.IsType(t, true, data["is_continuous"])

	// Check parked_at is valid ISO date
	parkedAt := data["parked_at"].(string)
	assert.Regexp(t, `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, parkedAt)

	// Check parking slot information
	parkingSlot := data["parking_slot"].(map[string]interface{})
	assert.Contains(t, parkingSlot, "id")
	assert.Contains(t, parkingSlot, "slot_label")
	assert.Contains(t, parkingSlot, "slot_type")
	assert.Equal(t, fmt.Sprintf("%d", slot.ID), parkingSlot["id"])
	assert.Equal(t, "SP-1", parkingSlot["slot_label"])
}

func TestGetSessionNotFound(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	req, err := http.NewRequest("GET", "/api/v1/sessions/999999", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "error")
}

func TestListSessions(t *testing.T) {
	router, _, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Clean up database completely before this test to ensure isolation
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create test data using repository
	ep := createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	slot := createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)

	// Create multiple sessions
	_, err := db.GetDB().Exec("INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, total_fee, created_at, updated_at) VALUES ('S', $1, $2, NOW(), 0, NOW(), NOW())", slot.ID, ep.ID)
	require.NoError(t, err)
	_, err = db.GetDB().Exec("INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, total_fee, created_at, updated_at) VALUES ('S', $1, $2, NOW(), 0, NOW(), NOW())", slot.ID, ep.ID)
	require.NoError(t, err)
	_, err = db.GetDB().Exec("INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, total_fee, created_at, updated_at) VALUES ('S', $1, $2, NOW(), 0, NOW(), NOW())", slot.ID, ep.ID)
	require.NoError(t, err)

	req, err := http.NewRequest("GET", "/api/v1/sessions", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].([]interface{})
	assert.Greater(t, len(data), 0)

	// Check each session has required fields
	for _, item := range data {
		session := item.(map[string]interface{})
		assert.Contains(t, session, "session_id")
		assert.Contains(t, session, "vehicle_type")
		assert.Contains(t, session, "parking_slot")
		assert.Contains(t, session, "entry_point")
		assert.Contains(t, session, "parked_at")
		assert.Contains(t, session, "exited_at")
		assert.Contains(t, session, "is_active")
		assert.Contains(t, session, "is_continuous")

		// Check valid vehicle type
		vehicleType := session["vehicle_type"].(string)
		assert.Contains(t, []string{"S", "M", "L"}, vehicleType)

		// Check is_active and is_continuous are booleans
		assert.IsType(t, true, session["is_active"])
		assert.IsType(t, true, session["is_continuous"])

		// Check parked_at is valid ISO date
		parkedAt := session["parked_at"].(string)
		assert.Regexp(t, `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, parkedAt)
	}

	// Check no duplicate session IDs
	sessionIDs := make([]string, len(data))
	for i, item := range data {
		session := item.(map[string]interface{})
		sessionIDs[i] = session["session_id"].(string)
	}
	assert.Equal(t, len(sessionIDs), len(uniqueStrings(sessionIDs)))
}

func TestUnparkVehicle(t *testing.T) {
	router, _, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Clean up database completely before this test to ensure isolation
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create test data using repository
	ep := createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	slot := createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)

	// Create a session directly with parked_at in the past
	var sessionID int64
	parkedAt := "2024-01-15 10:00:00"
	err := db.GetDB().QueryRow("INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, total_fee, created_at, updated_at) VALUES ('S', $1, $2, $3, 0, NOW(), NOW()) RETURNING id", slot.ID, ep.ID, parkedAt).Scan(&sessionID)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", "/api/v1/sessions/"+int64ToString(sessionID)+"/unpark", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].(map[string]interface{})
	assert.Contains(t, data, "session_id")
	assert.Contains(t, data, "vehicle_type")
	assert.Contains(t, data, "parking_slot")
	assert.Contains(t, data, "entry_point")
	assert.Contains(t, data, "parked_at")
	assert.Contains(t, data, "exited_at")
	assert.Contains(t, data, "duration_hours")
	assert.Contains(t, data, "total_fee")
	assert.Contains(t, data, "fee_breakdown")
	assert.Contains(t, data, "breakdown")
	assert.Contains(t, data, "is_continuous")

	// Check duration_hours is number and non-negative
	durationHours := data["duration_hours"].(float64)
	assert.GreaterOrEqual(t, durationHours, 0.0)

	// Check total_fee is number and non-negative
	totalFee := data["total_fee"].(float64)
	assert.GreaterOrEqual(t, totalFee, 0.0)

	// Check exited_at is valid ISO date
	exitedAt := data["exited_at"].(string)
	assert.Regexp(t, `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, exitedAt)

	// Check fee_breakdown structure
	feeBreakdown := data["fee_breakdown"].(map[string]interface{})
	assert.Contains(t, feeBreakdown, "total_fee")
	assert.Contains(t, feeBreakdown, "duration_hours")
	assert.Contains(t, feeBreakdown, "long_term")
	assert.Contains(t, feeBreakdown, "remaining")

	// Check long_term structure
	longTerm := feeBreakdown["long_term"].(map[string]interface{})
	assert.Contains(t, longTerm, "days")
	assert.Contains(t, longTerm, "fee")

	// Check remaining structure
	remaining := feeBreakdown["remaining"].(map[string]interface{})
	assert.Contains(t, remaining, "total")
	assert.Contains(t, remaining, "base_fee")
	assert.Contains(t, remaining, "exceeding_hours")
	assert.Contains(t, remaining, "exceeding_fee")
	assert.Contains(t, remaining, "hourly_rate")

	// Check for base_start_time in continuous parking scenarios
	if data["is_continuous"].(bool) {
		assert.Contains(t, feeBreakdown, "base_start_time")
		assert.NotEmpty(t, feeBreakdown["base_start_time"])
	}
}

func TestUnparkVehicleNotFound(t *testing.T) {
	router, _, _, cleanup := setupTestRouter(t)
	defer cleanup()

	req, err := http.NewRequest("POST", "/api/v1/sessions/999999/unpark", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "error")
}

// Slots Tests
func TestListSlots(t *testing.T) {
	router, _, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Clean up database completely before this test to ensure isolation
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create test data using repository
	createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)
	createTestParkingSlot(t, db.GetDB(), "MP-1", "MP", []int{15, 25, 35}, true)
	createTestParkingSlot(t, db.GetDB(), "LP-1", "LP", []int{20, 30, 40}, false)

	req, err := http.NewRequest("GET", "/api/v1/slots", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].([]interface{})
	assert.Greater(t, len(data), 0)

	// Check each slot has required fields
	for _, item := range data {
		slot := item.(map[string]interface{})
		assert.Contains(t, slot, "id")
		assert.Contains(t, slot, "slot_label")
		assert.Contains(t, slot, "slot_type")
		assert.Contains(t, slot, "distances")
		assert.Contains(t, slot, "available")

		// Check valid slot type
		slotType := slot["slot_type"].(string)
		assert.Contains(t, []string{"SP", "MP", "LP"}, slotType)

		// Check distances is array with 3 values
		distances := slot["distances"].([]interface{})
		assert.Len(t, distances, 3)

		// Check distances are non-negative
		for _, d := range distances {
			distance := d.(float64)
			assert.GreaterOrEqual(t, distance, 0.0)
		}

		// Check available is boolean
		assert.IsType(t, true, slot["available"])
	}

	// Check no duplicate slot labels
	slotLabels := make([]string, len(data))
	for i, item := range data {
		slot := item.(map[string]interface{})
		slotLabels[i] = slot["slot_label"].(string)
	}
	assert.Equal(t, len(slotLabels), len(uniqueStrings(slotLabels)))
}

func TestAvailableSlots(t *testing.T) {
	router, _, db, cleanup := setupTestRouter(t)
	defer cleanup()

	// Create test data using repository
	createTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
	createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)
	createTestParkingSlot(t, db.GetDB(), "SP-2", "SP", []int{15, 25, 35}, true)

	req, err := http.NewRequest("GET", "/api/v1/slots/available?vehicle_type=S&entry_point_id=A", nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Postman collection tests
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var response map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "success")
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "data")

	data := response["data"].(map[string]interface{})
	assert.Contains(t, data, "available_slots")
	assert.Contains(t, data, "total_available")

	availableSlots := data["available_slots"].([]interface{})
	totalAvailable := data["total_available"].(float64)

	// Check total_available is number and non-negative
	assert.GreaterOrEqual(t, totalAvailable, 0.0)
	assert.Equal(t, len(availableSlots), int(totalAvailable))

	// Check each slot has required fields
	for _, item := range availableSlots {
		slot := item.(map[string]interface{})
		assert.Contains(t, slot, "id")
		assert.Contains(t, slot, "slot_label")
		assert.Contains(t, slot, "slot_type")
		assert.Contains(t, slot, "distances")
		assert.Contains(t, slot, "available")

		// Check all slots are available
		assert.True(t, slot["available"].(bool))

		// Check slot type matches requested vehicle type
		slotType := slot["slot_type"].(string)
		assert.Equal(t, "SP", slotType)

		// Check distances is array with 3 values
		distances := slot["distances"].([]interface{})
		assert.Len(t, distances, 3)

		// Check distances are non-negative
		for _, d := range distances {
			distance := d.(float64)
			assert.GreaterOrEqual(t, distance, 0.0)
		}
	}

	// Check no duplicate slot labels
	slotLabels := make([]string, len(availableSlots))
	for i, item := range availableSlots {
		slot := item.(map[string]interface{})
		slotLabels[i] = slot["slot_label"].(string)
	}
	assert.Equal(t, len(slotLabels), len(uniqueStrings(slotLabels)))
}

// Create Entry Point Tests
func TestCreateEntryPoint(t *testing.T) {
	t.Run("successfully creates entry point and backfills distances", func(t *testing.T) {
		router, parkingService, db, cleanup := setupTestRouter(t)
		defer cleanup()

		// Create test parking slots with existing distances
		createTestParkingSlot(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)
		createTestParkingSlot(t, db.GetDB(), "MP-1", "MP", []int{15, 25, 35}, true)
		createTestParkingSlot(t, db.GetDB(), "LP-1", "LP", []int{20, 30, 40}, true)

		// Create a new entry point
		requestBody := `{"entry_point": {"identifier": "D", "name": "Entry Point D"}}`
		req, err := http.NewRequest("POST", "/api/v1/entry_points", strings.NewReader(requestBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Verify response
		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "success")
		assert.True(t, response["success"].(bool))
		assert.Contains(t, response, "data")

		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "id")
		assert.Contains(t, data, "identifier")
		assert.Contains(t, data, "name")
		assert.Equal(t, "D", data["identifier"])
		assert.Equal(t, "Entry Point D", data["name"])

		// Verify that parking slots now have 4 distances (3 original + 1 new)
		slots, err := parkingService.ListSlots()
		require.NoError(t, err)
		assert.Len(t, slots, 3)

		for _, slot := range slots {
			assert.Len(t, slot.Distances, 4, "Slot %s should have 4 distances after creating entry point D", slot.SlotLabel)
			// The backfilled distance should be 0 (default backfill value)
			// Check that one of the distances is the inserted 0
			hasZero := false
			for _, d := range slot.Distances {
				if d == 0 {
					hasZero = true
					break
				}
			}
			assert.True(t, hasZero, "Slot %s should have a 0 value after backfill for entry point D", slot.SlotLabel)
		}
	})

	t.Run("creates entry point with no existing slots", func(t *testing.T) {
		router, _, _, cleanup := setupTestRouter(t)
		defer cleanup()

		// Create a new entry point with no parking slots
		requestBody := `{"entry_point": {"identifier": "D", "name": "Entry Point D"}}`
		req, err := http.NewRequest("POST", "/api/v1/entry_points", strings.NewReader(requestBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Verify response
		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "success")
		assert.True(t, response["success"].(bool))
	})

	t.Run("rejects duplicate identifier", func(t *testing.T) {
		router, _, db, cleanup := setupTestRouter(t)
		defer cleanup()

		// Create first entry point
		createTestEntryPoint(t, db.GetDB(), "D", "Entry Point D")

		// Try to create duplicate entry point
		requestBody := `{"entry_point": {"identifier": "D", "name": "Entry Point D Duplicate"}}`
		req, err := http.NewRequest("POST", "/api/v1/entry_points", strings.NewReader(requestBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Verify conflict response
		assert.Equal(t, http.StatusConflict, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "error")
		assert.Contains(t, response["error"].(string), "already exists")
	})

	t.Run("rejects missing wrapper", func(t *testing.T) {
		router, _, _, cleanup := setupTestRouter(t)
		defer cleanup()

		// Try to create entry point without wrapper
		requestBody := `{"identifier": "D", "name": "Entry Point D"}`
		req, err := http.NewRequest("POST", "/api/v1/entry_points", strings.NewReader(requestBody))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Verify bad request response
		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "error")
	})
}

// Helper functions
func int64ToString(n int64) string {
	return fmt.Sprintf("%d", n)
}

func uniqueStrings(slice []string) []string {
	keys := make(map[string]bool)
	list := []string{}
	for _, entry := range slice {
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}