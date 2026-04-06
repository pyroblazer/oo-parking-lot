// Package internal provides Newman-based API tests for Kafka events functionality
//
// This test file mirrors the Newman test collection scenarios for Kafka events,
// providing comprehensive API-level tests that verify the Kafka events endpoints
// behave correctly according to Newman test specifications.
package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
		"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// setupNewmanKafkaEventsTestDB creates and initializes test database for Newman-based Kafka events tests
func setupNewmanKafkaEventsTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data
	db.GetDB().Exec("DELETE FROM kafka_events")

	// Create table for testing
	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS kafka_events (
			id BIGSERIAL PRIMARY KEY,
			event_type VARCHAR(255) NOT NULL,
			topic VARCHAR(255) NOT NULL,
			partition INTEGER,
			kafka_offset BIGINT,
			event_key VARCHAR(255),
			event_payload JSONB,
			correlation_id VARCHAR(255),
			causation_id VARCHAR(255),
			idempotency_key VARCHAR(255),
			event_id VARCHAR(255),
			occurred_at TIMESTAMP NOT NULL,
			published_at TIMESTAMP,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			retry_count INTEGER DEFAULT 0,
			error_message TEXT,
			metadata JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	return db
}

// cleanupNewmanKafkaEventsTestDB cleans up test database after tests
func cleanupNewmanKafkaEventsTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM kafka_events")
	db.Close()
}

// createNewmanTestKafkaEvent creates a test Kafka event for Newman-based tests
func createNewmanTestKafkaEvent(t *testing.T, db *sql.DB, eventType, status string) *models.KafkaEvent {
	occurredAt := time.Now()
	eventID := uuid.New().String()
	query := `INSERT INTO kafka_events (id, event_type, topic, partition, kafka_offset, event_key, event_payload, correlation_id, causation_id, idempotency_key, event_id, occurred_at, published_at, status, retry_count, error_message, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()) RETURNING id, event_type, topic, partition, kafka_offset, event_key, event_payload, correlation_id, causation_id, idempotency_key, event_id, occurred_at, published_at, status, retry_count, error_message, created_at, updated_at`
	var event models.KafkaEvent
	err := db.QueryRow(query, eventID, eventType, "parking-events", 0, 123, "test-key", "{\"test\": \"payload\"}", "test-correlation", "test-causation", "test-idempotency", "test-event-id", occurredAt, nil, status, 0, nil).Scan(
		&event.ID, &event.EventType, &event.Topic, &event.Partition, &event.KafkaOffset,
		&event.EventKey, &event.EventPayload, &event.CorrelationID, &event.CausationID,
		&event.IdempotencyKey, &event.EventID, &event.OccurredAt, &event.PublishedAt,
		&event.Status, &event.RetryCount, &event.ErrorMessage, &event.CreatedAt, &event.UpdatedAt,
	)
	require.NoError(t, err)
	return &event
}

// ============================================================================
// Newman-Based API Tests - Kafka Events
// ============================================================================

// TestNewmanKafkaEvents provides comprehensive API-level tests mirroring Newman collection
func TestNewmanKafkaEvents(t *testing.T) {
	t.Run("Newman-Based Kafka Events Tests", func(t *testing.T) {
		db := setupNewmanKafkaEventsTestDB(t)
		defer cleanupNewmanKafkaEventsTestDB(t, db)

		// Initialize repositories
		kafkaEventRepo := repositories.NewKafkaEventRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingServiceWithFullRepos(nil, nil, nil, nil, nil, kafkaEventRepo)

		// Initialize handler
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Setup router
		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		// Register more specific routes first to avoid conflicts
		api.HandleFunc("/kafka_events/status", parkingHandler.GetKafkaEventsByStatus).Methods("GET")
		api.HandleFunc("/kafka_events/event_type", parkingHandler.GetKafkaEventsByEventType).Methods("GET")
		api.HandleFunc("/kafka_events/{id}", parkingHandler.GetKafkaEvent).Methods("GET")
		api.HandleFunc("/kafka_events", parkingHandler.ListKafkaEvents).Methods("GET")

		// ========================================================================
		// SUCCESSFUL READ TESTS
		// ========================================================================

		t.Run("GET /api/v1/kafka_events - List Kafka Events (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing events before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM kafka_events")

			// Create some test Kafka events
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_parked", "published")
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_unparked", "published")
			createNewmanTestKafkaEvent(t, db.GetDB(), "fee_calculated", "pending")

			// Make GET request
			req, err := http.NewRequest("GET", "/api/v1/kafka_events", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Listing Kafka events should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both nested and flat response formats
			var events []interface{}
			if data, ok := response["data"].([]interface{}); ok {
				// Flat format: {success: true, data: [...]}
				events = data
			} else if data, ok := response["data"].(map[string]interface{}); ok {
				// Nested format: {success: true, data: {data: [...]}}
				events = data["data"].([]interface{})
			}
			assert.NotEmpty(t, events, "Should return Kafka events")
			assert.Len(t, events, 3, "Should return 3 Kafka events")
		})

		t.Run("GET /api/v1/kafka_events/:id - Get Kafka Event by ID (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing events before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM kafka_events")

			// Create a test Kafka event
			event := createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_parked", "published")

			// Make GET request
			req, err := http.NewRequest("GET", fmt.Sprintf("/api/v1/kafka_events/%s", event.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Getting Kafka event by ID should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, fmt.Sprintf("%s", event.ID), data["id"], "ID should match")
			assert.Equal(t, "vehicle_parked", data["event_type"], "Event type should match")
			assert.Equal(t, "published", data["status"], "Status should match")
		})

		t.Run("GET /api/v1/kafka_events/status?status=pending - Get Kafka Events by Status (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing events before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM kafka_events")

			// Create test Kafka events with different statuses
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_parked", "pending")
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_unparked", "pending")
			createNewmanTestKafkaEvent(t, db.GetDB(), "fee_calculated", "published")

			// Make GET request with status query parameter
			req, err := http.NewRequest("GET", "/api/v1/kafka_events/status?status=pending", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Getting Kafka events by status should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both nested and flat response formats
			var events []interface{}
			if data, ok := response["data"].([]interface{}); ok {
				// Flat format: {success: true, data: [...]}
				events = data
			} else if data, ok := response["data"].(map[string]interface{}); ok {
				// Nested format: {success: true, data: {data: [...]}}
				events = data["data"].([]interface{})
			}
			assert.NotEmpty(t, events, "Should return Kafka events")
			assert.Len(t, events, 2, "Should return 2 pending events")
		})

		t.Run("GET /api/v1/kafka_events/event_type?event_type=vehicle_parked - Get Kafka Events by Event Type (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing events before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM kafka_events")

			// Create test Kafka events with different event types
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_parked", "published")
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_parked", "published")
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_unparked", "published")

			// Make GET request with event_type query parameter
			req, err := http.NewRequest("GET", "/api/v1/kafka_events/event_type?event_type=vehicle_parked", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Getting Kafka events by event type should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both nested and flat response formats
			var events []interface{}
			if data, ok := response["data"].([]interface{}); ok {
				// Flat format: {success: true, data: [...]}
				events = data
			} else if data, ok := response["data"].(map[string]interface{}); ok {
				// Nested format: {success: true, data: {data: [...]}}
				events = data["data"].([]interface{})
			}
			assert.NotEmpty(t, events, "Should return Kafka events")
			assert.Len(t, events, 2, "Should return 2 vehicle_parked events")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - NOT FOUND
		// ========================================================================

		t.Run("GET /api/v1/kafka_events/:id - Get Not Found (Newman Scenario)", func(t *testing.T) {
			// Make GET request for non-existent Kafka event
			req, err := http.NewRequest("GET", "/api/v1/kafka_events/999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Getting non-existent Kafka event should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"].(string), "not found", "Error message should mention not found")
		})

		t.Run("GET /api/v1/kafka_events/status?status=invalid - Invalid Status (Newman Scenario)", func(t *testing.T) {
			// Make GET request with invalid status
			req, err := http.NewRequest("GET", "/api/v1/kafka_events/status?status=invalid", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request
			assert.Equal(t, http.StatusBadRequest, rr.Code, "Getting Kafka events with invalid status should return 400 Bad Request")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"].(string), "Invalid status", "Error message should mention invalid status")
		})

		t.Run("GET /api/v1/kafka_events/status?status=published - Status Not Found (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing events before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM kafka_events")

			// Make GET request for status with no events (using valid status value)
			req, err := http.NewRequest("GET", "/api/v1/kafka_events/status?status=published", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK with empty array (no error for empty results)
			assert.Equal(t, http.StatusOK, rr.Code, "Getting Kafka events for status with no events should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both array and nested object response formats
			if data, ok := response["data"].([]interface{}); ok {
				assert.Len(t, data, 0, "Should return empty array for status with no events")
			} else if data, ok := response["data"].(map[string]interface{}); ok {
				events := data["data"].([]interface{})
				assert.Len(t, events, 0, "Should return empty array for status with no events")
			}
		})

		t.Run("GET /api/v1/kafka_events/event_type?event_type=notfound - Event Type Not Found (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing events before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM kafka_events")

			// Create test Kafka events with different event types
			createNewmanTestKafkaEvent(t, db.GetDB(), "vehicle_parked", "published")

			// Make GET request for event type with no events
			req, err := http.NewRequest("GET", "/api/v1/kafka_events/event_type?event_type=notfound", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK with empty array (no error for empty results)
			assert.Equal(t, http.StatusOK, rr.Code, "Getting Kafka events for event type with no events should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both array and nested object response formats
			if data, ok := response["data"].([]interface{}); ok {
				assert.Len(t, data, 0, "Should return empty array for event type with no events")
			} else if data, ok := response["data"].(map[string]interface{}); ok {
				events := data["data"].([]interface{})
				assert.Len(t, events, 0, "Should return empty array for event type with no events")
			}
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanKafkaEventsSummary documents Newman-based test coverage
func TestNewmanKafkaEventsSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED KAFKA EVENTS TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ List Kafka Events (GET /api/v1/kafka_events)")
		t.Log("  ✓ Get Kafka Event by ID (GET /api/v1/kafka_events/:id)")
		t.Log("  ✓ Get Kafka Events by Status (GET /api/v1/kafka_events/status?status=pending)")
		t.Log("  ✓ Get Kafka Events by Event Type (GET /api/v1/kafka_events/event_type?event_type=vehicle_parked)")
		t.Log("")
		t.Log("Additional Test Scenarios:")
		t.Log("  ✓ Get Not Found (GET /api/v1/kafka_events/:id)")
		t.Log("  ✓ Invalid Status (GET /api/v1/kafka_events/status?status=invalid)")
		t.Log("  ✓ Status Not Found (GET /api/v1/kafka_events/status?status=notfound)")
		t.Log("  ✓ Event Type Not Found (GET /api/v1/kafka_events/event_type?event_type=notfound)")
		t.Log("")
		t.Log("API Endpoints:")
		t.Log("  - GET /api/v1/kafka_events")
		t.Log("  - GET /api/v1/kafka_events/:id")
		t.Log("  - GET /api/v1/kafka_events/status?status=pending")
		t.Log("  - GET /api/v1/kafka_events/event_type?event_type=vehicle_parked")
		t.Log("")
		t.Log("Query Parameters:")
		t.Log("  - status: pending | published | failed | retrying")
		t.Log("  - event_type: any valid event type string")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 200 OK: Successful GET")
		t.Log("  - 400 Bad Request: Invalid status value")
		t.Log("  - 404 Not Found: Resource doesn't exist")
		t.Log("")
		t.Log("Response Structure:")
		t.Log("  {")
		t.Log("    \"success\": true,")
		t.Log("    \"data\": {")
		t.Log("      \"data\": [...] // for list endpoint")
		t.Log("      // or")
		t.Log("      { ... } // for single record endpoint")
		t.Log("    }")
		t.Log("  }")
		t.Log("")
		t.Log("Test Structure:")
		t.Log("  - API-level tests using httptest")
		t.Log("  - Mirrors Newman collection scenarios")
		t.Log("  - Follows Go testing conventions")
		t.Log("  - Uses testify/assert and testify/require")
		t.Log("")
	})
}
