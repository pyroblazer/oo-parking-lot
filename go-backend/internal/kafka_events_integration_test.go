// Package internal provides integration tests for Kafka event creation
// during park/unpark operations.
//
// These tests verify that the ParkingService correctly creates Kafka events
// in goroutines when vehicles are parked and unparked, and that the events
// contain the expected fields, event types, and idempotency keys.
package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
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

// setupKafkaTestDB creates a test database connection with all required tables.
// It reuses the same pattern as the green_flow_integration_test.go setupTestDB.
func setupKafkaTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()
	os.Setenv("DATABASE_NAME", "oo_parking_lot_test")

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Drop tables that may have been created by Rails migrations with incompatible schemas.
	// We need the Go schema (kafka_offset, BIGSERIAL ids) for these tests.
	db.GetDB().Exec(`DROP TABLE IF EXISTS kafka_events CASCADE`)
	db.GetDB().Exec(`DROP TABLE IF EXISTS billing_audit_logs CASCADE`)

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
	db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS kafka_events (
			id VARCHAR(255) PRIMARY KEY,
			event_type VARCHAR(255) NOT NULL,
			topic VARCHAR(255) NOT NULL,
			partition INTEGER NOT NULL DEFAULT 0,
			kafka_offset BIGINT NOT NULL DEFAULT 0,
			event_key VARCHAR(255),
			event_payload JSONB NOT NULL DEFAULT '{}',
			correlation_id VARCHAR(255),
			causation_id VARCHAR(255),
			idempotency_key VARCHAR(255),
			event_id VARCHAR(255),
			occurred_at TIMESTAMP NOT NULL,
			published_at TIMESTAMP,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			retry_count INTEGER NOT NULL DEFAULT 0,
			error_message TEXT,
			metadata JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS billing_audit_logs (
			id BIGSERIAL PRIMARY KEY,
			parking_session_id BIGINT NOT NULL,
			vehicle_type VARCHAR(50) NOT NULL,
			slot_label VARCHAR(255) NOT NULL,
			slot_type VARCHAR(50) NOT NULL,
			entry_point VARCHAR(255) NOT NULL,
			parked_at TIMESTAMP NOT NULL,
			exited_at TIMESTAMP,
			total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
			base_fee DECIMAL(10,2) NOT NULL,
			exceeding_fee DECIMAL(10,2) NOT NULL,
			exceeding_hours INTEGER NOT NULL,
			long_term_days INTEGER NOT NULL DEFAULT 0,
			long_term_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
			duration_hours DECIMAL(10,2) NOT NULL,
			is_continuous BOOLEAN NOT NULL DEFAULT FALSE,
			base_start_time TIMESTAMP,
			fee_breakdown JSONB NOT NULL DEFAULT '{}',
			correlation_id VARCHAR(255),
			idempotency_key VARCHAR(255),
			billing_version VARCHAR(50) NOT NULL DEFAULT '1.0',
			calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)

	return db
}

// setupKafkaTestRouter creates a test router with full repositories including
// kafkaEventRepo and billingAuditLogRepo, so that the ParkingService will
// actually create Kafka events and billing audit logs in goroutines.
func setupKafkaTestRouter(t *testing.T) (http.Handler, *services.ParkingService, *sql.DB) {
	db := setupKafkaTestDB(t)
	sqlDB := db.GetDB()

	// Clean up all tables before test
	tables := []string{
		"kafka_events",
		"billing_audit_logs",
		"parking_sessions",
		"parking_slots",
		"entry_points",
	}
	for _, table := range tables {
		_, err := sqlDB.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		require.NoError(t, err, "Failed to truncate %s table", table)
	}

	// Clean up database after test
	t.Cleanup(func() {
		for _, table := range tables {
			_, err := sqlDB.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
			if err != nil {
				t.Logf("Warning: Failed to truncate %s table: %v", table, err)
			}
		}
		db.Close()
	})

	// Initialize all repositories including kafka and billing
	entryPointRepo := repositories.NewEntryPointRepository(sqlDB)
	parkingSlotRepo := repositories.NewParkingSlotRepository(sqlDB)
	sessionRepo := repositories.NewParkingSessionRepository(sqlDB)
	kafkaEventRepo := repositories.NewKafkaEventRepository(sqlDB)
	billingAuditLogRepo := repositories.NewBillingAuditLogRepository(sqlDB)

	// Use NewParkingServiceWithFullRepos so kafkaEventRepo and billingAuditLogRepo are set
	parkingService := services.NewParkingServiceWithFullRepos(
		entryPointRepo,
		parkingSlotRepo,
		sessionRepo,
		nil, // vehicleRepo - not needed for these tests
		billingAuditLogRepo,
		kafkaEventRepo,
	)

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

	// Create test entry points
	createTestEntryPoint(t, sqlDB, "A", "Entry Point A")
	createTestEntryPoint(t, sqlDB, "B", "Entry Point B")
	createTestEntryPoint(t, sqlDB, "C", "Entry Point C")

	// Create test parking slots
	createTestParkingSlot(t, sqlDB, "SP-1", "SP", []int{10, 20, 30}, true)
	createTestParkingSlot(t, sqlDB, "SP-2", "SP", []int{15, 25, 35}, true)
	createTestParkingSlot(t, sqlDB, "MP-1", "MP", []int{20, 30, 40}, true)
	createTestParkingSlot(t, sqlDB, "MP-2", "MP", []int{25, 35, 45}, true)
	createTestParkingSlot(t, sqlDB, "LP-1", "LP", []int{30, 40, 50}, true)
	createTestParkingSlot(t, sqlDB, "LP-2", "LP", []int{35, 45, 55}, true)

	return router, parkingService, sqlDB
}

// parkVehicleHelper parks a vehicle via the HTTP router and returns the parsed response.
func parkVehicleHelper(t *testing.T, router http.Handler, vehicleType, entryPointID string) map[string]interface{} {
	parkRequest := map[string]interface{}{
		"vehicle_type":   vehicleType,
		"entry_point_id": entryPointID,
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	require.Equal(t, http.StatusCreated, parkRecorder.Code)

	var parkResponse map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
	require.NoError(t, err)
	require.True(t, parkResponse["success"].(bool))

	return parkResponse
}

// extractSessionID extracts the session_id from a park response, handling both
// float64 and string types.
func extractSessionID(t *testing.T, response map[string]interface{}) int64 {
	data := response["data"].(map[string]interface{})
	switch v := data["session_id"].(type) {
	case float64:
		return int64(v)
	case string:
		id, err := strconv.ParseInt(v, 10, 64)
		require.NoError(t, err)
		return id
	default:
		require.Fail(t, "session_id is neither float64 nor string")
		return 0
	}
}

// getKafkaEventsByEventType queries the database directly for kafka events of a given type.
func getKafkaEventsByEventType(t *testing.T, sqlDB *sql.DB, eventType string) []*models.KafkaEvent {
	query := `
		SELECT id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at
		FROM kafka_events
		WHERE event_type = $1
		ORDER BY created_at ASC
	`

	rows, err := sqlDB.Query(query, eventType)
	require.NoError(t, err)
	defer rows.Close()

	var events []*models.KafkaEvent
	for rows.Next() {
		var event models.KafkaEvent
		var eventPayloadJSON []byte
		var metadataJSON []byte
		err := rows.Scan(
			&event.ID,
			&event.EventType,
			&event.Topic,
			&event.Partition,
			&event.KafkaOffset,
			&event.EventKey,
			&eventPayloadJSON,
			&event.CorrelationID,
			&event.CausationID,
			&event.IdempotencyKey,
			&event.EventID,
			&event.OccurredAt,
			&event.PublishedAt,
			&event.Status,
			&event.RetryCount,
			&event.ErrorMessage,
			&metadataJSON,
			&event.CreatedAt,
			&event.UpdatedAt,
		)
		require.NoError(t, err)

		if eventPayloadJSON != nil {
			json.Unmarshal(eventPayloadJSON, &event.EventPayload)
		}
		if metadataJSON != nil {
			json.Unmarshal(metadataJSON, &event.Metadata)
		}

		events = append(events, &event)
	}

	return events
}

// getBillingAuditLogsBySessionID queries the database directly for billing audit logs.
func getBillingAuditLogsBySessionID(t *testing.T, sqlDB *sql.DB, sessionID int64) []*models.BillingAuditLog {
	query := `
		SELECT id, parking_session_id, vehicle_type, slot_label, slot_type, entry_point,
			parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours,
			long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time,
			fee_breakdown, correlation_id, idempotency_key, billing_version,
			calculated_at, created_at, updated_at
		FROM billing_audit_logs
		WHERE parking_session_id = $1
		ORDER BY created_at ASC
	`

	rows, err := sqlDB.Query(query, sessionID)
	require.NoError(t, err)
	defer rows.Close()

	var logs []*models.BillingAuditLog
	for rows.Next() {
		var log models.BillingAuditLog
		var feeBreakdownJSON []byte
		err := rows.Scan(
			&log.ID,
			&log.ParkingSessionID,
			&log.VehicleType,
			&log.SlotLabel,
			&log.SlotType,
			&log.EntryPoint,
			&log.ParkedAt,
			&log.ExitedAt,
			&log.TotalFee,
			&log.BaseFee,
			&log.ExceedingFee,
			&log.ExceedingHours,
			&log.LongTermDays,
			&log.LongTermFee,
			&log.DurationHours,
			&log.IsContinuous,
			&log.BaseStartTime,
			&feeBreakdownJSON,
			&log.CorrelationID,
			&log.IdempotencyKey,
			&log.BillingVersion,
			&log.CalculatedAt,
			&log.CreatedAt,
			&log.UpdatedAt,
		)
		require.NoError(t, err)

		if feeBreakdownJSON != nil {
			json.Unmarshal(feeBreakdownJSON, &log.FeeBreakdown)
		}

		logs = append(logs, &log)
	}

	return logs
}

// TestKafkaEventCreation_ParkVehicle verifies that parking a vehicle creates
// a vehicle.parked KafkaEvent in the database with correct fields.
func TestKafkaEventCreation_ParkVehicle(t *testing.T) {
	router, _, sqlDB := setupKafkaTestRouter(t)

	// Park a small vehicle at entry point A
	parkResponse := parkVehicleHelper(t, router, "S", "A")
	sessionID := extractSessionID(t, parkResponse)

	// Wait for goroutine to complete creating the Kafka event
	time.Sleep(100 * time.Millisecond)

	// Verify vehicle.parked Kafka event was created
	events := getKafkaEventsByEventType(t, sqlDB, models.EventTypeVehicleParked)
	require.Len(t, events, 1, "Expected exactly one vehicle.parked Kafka event")

	event := events[0]

	// Verify event_type
	assert.Equal(t, models.EventTypeVehicleParked, event.EventType)

	// Verify topic
	assert.Equal(t, models.TopicMap[models.EventTypeVehicleParked], event.Topic)

	// Verify status
	assert.Equal(t, "pending", event.Status)

	// Verify retry_count
	assert.Equal(t, 0, event.RetryCount)

	// Verify metadata contains source
	assert.Equal(t, "go-backend", event.Metadata["source"])

	// Verify event_id is a valid UUID (non-empty)
	assert.NotEmpty(t, event.EventID)

	// Verify id is a valid UUID (non-empty)
	assert.NotEmpty(t, event.ID)

	// Verify idempotency_key follows the pattern "park:<session_id>"
	require.NotNil(t, event.IdempotencyKey)
	expectedIdempotencyKey := fmt.Sprintf("park:%d", sessionID)
	assert.Equal(t, expectedIdempotencyKey, *event.IdempotencyKey)

	// Verify correlation_id is set (non-nil UUID)
	assert.NotNil(t, event.CorrelationID)
	assert.NotEmpty(t, *event.CorrelationID)

	// Verify occurred_at is a valid recent timestamp
	assert.WithinDuration(t, time.Now().UTC(), event.OccurredAt, 5*time.Second)

	// Verify event_payload contains expected fields
	assert.Equal(t, "S", event.EventPayload["vehicle_type"])
	assert.Equal(t, fmt.Sprintf("%d", sessionID), event.EventPayload["session_id"])
	assert.Equal(t, "SP", event.EventPayload["slot_type"])
	assert.Equal(t, "A", event.EventPayload["entry_point"])
	assert.Contains(t, event.EventPayload, "slot_id")
	assert.Contains(t, event.EventPayload, "slot_label")
	assert.Contains(t, event.EventPayload, "parked_at")

	// Verify no unparked or billing events were created
	unparkedEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeVehicleUnparked)
	assert.Len(t, unparkedEvents, 0, "Expected no vehicle.unparked events after park")

	billingEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeBillingCompleted)
	assert.Len(t, billingEvents, 0, "Expected no billing.completed events after park")
}

// TestKafkaEventCreation_UnparkVehicle verifies that unparking a vehicle creates
// vehicle.unparked and billing.completed KafkaEvents, plus a BillingAuditLog.
func TestKafkaEventCreation_UnparkVehicle(t *testing.T) {
	router, _, sqlDB := setupKafkaTestRouter(t)

	// Park a small vehicle
	parkResponse := parkVehicleHelper(t, router, "S", "A")
	sessionID := extractSessionID(t, parkResponse)

	// Get parked_at time from response for calculating exited_at
	data := parkResponse["data"].(map[string]interface{})
	parkedAtStr := data["parked_at"].(string)
	parkedAt, err := time.Parse(time.RFC3339, parkedAtStr)
	require.NoError(t, err)

	// Wait for the park Kafka event goroutine
	time.Sleep(100 * time.Millisecond)

	// Unpark after 2 hours (within flat rate)
	exitedAt := parkedAt.Add(2 * time.Hour)
	unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+int64ToString(sessionID)+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
	unparkRecorder := httptest.NewRecorder()
	router.ServeHTTP(unparkRecorder, unparkReq)

	require.Equal(t, http.StatusOK, unparkRecorder.Code)

	var unparkResponse map[string]interface{}
	err = json.Unmarshal(unparkRecorder.Body.Bytes(), &unparkResponse)
	require.NoError(t, err)
	require.True(t, unparkResponse["success"].(bool))

	// Wait for goroutines to complete creating Kafka events and billing audit log
	time.Sleep(100 * time.Millisecond)

	// Verify vehicle.parked Kafka event exists (created during park)
	parkedEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeVehicleParked)
	require.Len(t, parkedEvents, 1, "Expected exactly one vehicle.parked Kafka event")

	// Verify vehicle.unparked Kafka event was created
	unparkedEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeVehicleUnparked)
	require.Len(t, unparkedEvents, 1, "Expected exactly one vehicle.unparked Kafka event")

	unparkedEvent := unparkedEvents[0]
	assert.Equal(t, models.EventTypeVehicleUnparked, unparkedEvent.EventType)
	assert.Equal(t, models.TopicMap[models.EventTypeVehicleUnparked], unparkedEvent.Topic)
	assert.Equal(t, "pending", unparkedEvent.Status)
	assert.Equal(t, 0, unparkedEvent.RetryCount)
	assert.Equal(t, "go-backend", unparkedEvent.Metadata["source"])

	// Verify unparked event payload
	assert.Equal(t, fmt.Sprintf("%d", sessionID), unparkedEvent.EventPayload["session_id"])
	assert.Equal(t, "S", unparkedEvent.EventPayload["vehicle_type"])
	assert.Contains(t, unparkedEvent.EventPayload, "slot_label")
	assert.Equal(t, "A", unparkedEvent.EventPayload["entry_point"])
	assert.Contains(t, unparkedEvent.EventPayload, "total_fee")
	assert.Contains(t, unparkedEvent.EventPayload, "duration_hours")
	assert.Contains(t, unparkedEvent.EventPayload, "is_continuous")

	// Verify billing.completed Kafka event was created
	billingEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeBillingCompleted)
	require.Len(t, billingEvents, 1, "Expected exactly one billing.completed Kafka event")

	billingEvent := billingEvents[0]
	assert.Equal(t, models.EventTypeBillingCompleted, billingEvent.EventType)
	assert.Equal(t, models.TopicMap[models.EventTypeBillingCompleted], billingEvent.Topic)
	assert.Equal(t, "pending", billingEvent.Status)
	assert.Equal(t, 0, billingEvent.RetryCount)
	assert.Equal(t, "go-backend", billingEvent.Metadata["source"])

	// Verify billing event payload
	assert.Equal(t, fmt.Sprintf("%d", sessionID), billingEvent.EventPayload["session_id"])
	assert.Equal(t, "S", billingEvent.EventPayload["vehicle_type"])
	assert.Contains(t, billingEvent.EventPayload, "slot_label")
	assert.Contains(t, billingEvent.EventPayload, "total_fee")
	assert.Contains(t, billingEvent.EventPayload, "duration_hours")

	// Verify BillingAuditLog was created
	auditLogs := getBillingAuditLogsBySessionID(t, sqlDB, sessionID)
	require.Len(t, auditLogs, 1, "Expected exactly one billing audit log")

	auditLog := auditLogs[0]
	assert.Equal(t, sessionID, auditLog.ParkingSessionID)
	assert.Equal(t, "S", auditLog.VehicleType)
	assert.Equal(t, "SP", auditLog.SlotType)
	assert.Equal(t, "A", auditLog.EntryPoint)
	assert.Equal(t, 40.0, auditLog.TotalFee) // Flat rate within 3 hours
	assert.Equal(t, 2.0, auditLog.DurationHours)
	assert.False(t, auditLog.IsContinuous)
	assert.Equal(t, "v1", auditLog.BillingVersion)
}

// TestKafkaEvent_IdempotencyKeys verifies that idempotency keys match the expected
// patterns: park:<session_id>, unpark:<session_id>, billing:<session_id>.
func TestKafkaEvent_IdempotencyKeys(t *testing.T) {
	router, _, sqlDB := setupKafkaTestRouter(t)

	// Park a small vehicle
	parkResponse := parkVehicleHelper(t, router, "S", "A")
	sessionID := extractSessionID(t, parkResponse)

	// Get parked_at time from response for calculating exited_at
	data := parkResponse["data"].(map[string]interface{})
	parkedAtStr := data["parked_at"].(string)
	parkedAt, err := time.Parse(time.RFC3339, parkedAtStr)
	require.NoError(t, err)

	// Wait for park goroutine
	time.Sleep(100 * time.Millisecond)

	// Verify park idempotency key
	parkedEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeVehicleParked)
	require.Len(t, parkedEvents, 1, "Expected one vehicle.parked event")

	parkedEvent := parkedEvents[0]
	require.NotNil(t, parkedEvent.IdempotencyKey, "Idempotency key should not be nil for parked event")
	assert.Equal(t, fmt.Sprintf("park:%d", sessionID), *parkedEvent.IdempotencyKey,
		"Park event idempotency key should follow pattern park:<session_id>")

	// Unpark
	exitedAt := parkedAt.Add(2 * time.Hour)
	unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+int64ToString(sessionID)+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
	unparkRecorder := httptest.NewRecorder()
	router.ServeHTTP(unparkRecorder, unparkReq)
	require.Equal(t, http.StatusOK, unparkRecorder.Code)

	// Wait for unpark goroutines
	time.Sleep(100 * time.Millisecond)

	// Verify unpark idempotency key
	unparkedEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeVehicleUnparked)
	require.Len(t, unparkedEvents, 1, "Expected one vehicle.unparked event")

	unparkedEvent := unparkedEvents[0]
	require.NotNil(t, unparkedEvent.IdempotencyKey, "Idempotency key should not be nil for unparked event")
	assert.Equal(t, fmt.Sprintf("unpark:%d", sessionID), *unparkedEvent.IdempotencyKey,
		"Unpark event idempotency key should follow pattern unpark:<session_id>")

	// Verify billing idempotency key
	billingEvents := getKafkaEventsByEventType(t, sqlDB, models.EventTypeBillingCompleted)
	require.Len(t, billingEvents, 1, "Expected one billing.completed event")

	billingEvent := billingEvents[0]
	require.NotNil(t, billingEvent.IdempotencyKey, "Idempotency key should not be nil for billing event")
	assert.Equal(t, fmt.Sprintf("billing:%d", sessionID), *billingEvent.IdempotencyKey,
		"Billing event idempotency key should follow pattern billing:<session_id>")

	// Verify all three idempotency keys are distinct from each other
	assert.NotEqual(t, *parkedEvent.IdempotencyKey, *unparkedEvent.IdempotencyKey,
		"Park and unpark idempotency keys should be different")
	assert.NotEqual(t, *parkedEvent.IdempotencyKey, *billingEvent.IdempotencyKey,
		"Park and billing idempotency keys should be different")
	assert.NotEqual(t, *unparkedEvent.IdempotencyKey, *billingEvent.IdempotencyKey,
		"Unpark and billing idempotency keys should be different")

	// Verify billing audit log idempotency key follows audit pattern
	auditLogs := getBillingAuditLogsBySessionID(t, sqlDB, sessionID)
	require.Len(t, auditLogs, 1, "Expected one billing audit log")
	auditLog := auditLogs[0]
	require.NotNil(t, auditLog.IdempotencyKey, "Idempotency key should not be nil for billing audit log")
	assert.Equal(t, fmt.Sprintf("audit:%d", sessionID), *auditLog.IdempotencyKey,
		"Billing audit log idempotency key should follow pattern audit:<session_id>")

	// Verify correlation IDs are all unique UUIDs
	require.NotNil(t, parkedEvent.CorrelationID)
	require.NotNil(t, unparkedEvent.CorrelationID)
	require.NotNil(t, billingEvent.CorrelationID)
	assert.NotEqual(t, *parkedEvent.CorrelationID, *unparkedEvent.CorrelationID,
		"Park and unpark correlation IDs should be unique")
	assert.NotEqual(t, *parkedEvent.CorrelationID, *billingEvent.CorrelationID,
		"Park and billing correlation IDs should be unique")
	assert.NotEqual(t, *unparkedEvent.CorrelationID, *billingEvent.CorrelationID,
		"Unpark and billing correlation IDs should be unique")

	// Verify all event_ids are unique
	assert.NotEqual(t, parkedEvent.EventID, unparkedEvent.EventID,
		"Park and unpark event IDs should be unique")
	assert.NotEqual(t, parkedEvent.EventID, billingEvent.EventID,
		"Park and billing event IDs should be unique")
	assert.NotEqual(t, unparkedEvent.EventID, billingEvent.EventID,
		"Unpark and billing event IDs should be unique")
}
