// Package worker provides tests for background job processing
package worker

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestWorker(t *testing.T) *Worker {
	t.Helper()
	logger := zerolog.Nop()
	return &Worker{
		logger: logger,
	}
}

// TestWorker_Configuration verifies task type constants and queue priorities
func TestWorker_Configuration(t *testing.T) {
	t.Run("task type constants are defined", func(t *testing.T) {
		assert.Equal(t, "parking:slot_allocation", TypeSlotAllocation)
		assert.Equal(t, "parking:session_reconciliation", TypeSessionReconciliation)
		assert.Equal(t, "parking:kafka_event_retry", TypeKafkaEventRetry)
		assert.Equal(t, "parking:analytics_report", TypeAnalyticsReport)
	})

	t.Run("payload types have correct JSON tags", func(t *testing.T) {
		sa := SlotAllocationPayload{SessionID: "1", VehicleType: "S", SlotID: "2"}
		data, err := json.Marshal(sa)
		require.NoError(t, err)

		var parsed map[string]interface{}
		require.NoError(t, json.Unmarshal(data, &parsed))

		assert.Contains(t, parsed, "session_id")
		assert.Contains(t, parsed, "vehicle_type")
		assert.Contains(t, parsed, "slot_id")
	})
}

// TestWorker_PayloadSerialization verifies round-trip JSON encode/decode
func TestWorker_PayloadSerialization(t *testing.T) {
	t.Run("SlotAllocationPayload round-trip", func(t *testing.T) {
		original := SlotAllocationPayload{
			SessionID:   "42",
			VehicleType: "S",
			SlotID:      "7",
		}

		data, err := json.Marshal(original)
		require.NoError(t, err)

		var decoded SlotAllocationPayload
		require.NoError(t, json.Unmarshal(data, &decoded))

		assert.Equal(t, original, decoded)
	})

	t.Run("SessionReconciliationPayload round-trip", func(t *testing.T) {
		original := SessionReconciliationPayload{
			Since: time.Date(2026, 3, 30, 0, 0, 0, 0, time.UTC),
		}

		data, err := json.Marshal(original)
		require.NoError(t, err)

		var decoded SessionReconciliationPayload
		require.NoError(t, json.Unmarshal(data, &decoded))

		assert.WithinDuration(t, original.Since, decoded.Since, time.Second)
	})

	t.Run("KafkaEventRetryPayload round-trip", func(t *testing.T) {
		original := KafkaEventRetryPayload{
			EventID: "evt-123",
		}

		data, err := json.Marshal(original)
		require.NoError(t, err)

		var decoded KafkaEventRetryPayload
		require.NoError(t, json.Unmarshal(data, &decoded))

		assert.Equal(t, original, decoded)
	})

	t.Run("AnalyticsReportPayload round-trip", func(t *testing.T) {
		original := AnalyticsReportPayload{
			Date: time.Date(2026, 3, 30, 12, 0, 0, 0, time.UTC),
		}

		data, err := json.Marshal(original)
		require.NoError(t, err)

		var decoded AnalyticsReportPayload
		require.NoError(t, json.Unmarshal(data, &decoded))

		assert.WithinDuration(t, original.Date, decoded.Date, time.Second)
	})
}

// TestWorker_HandlerExecution verifies handlers process valid payloads without error
func TestWorker_HandlerExecution(t *testing.T) {
	w := newTestWorker(t)
	ctx := context.Background()

	t.Run("handleSlotAllocation processes valid payload", func(t *testing.T) {
		payload := SlotAllocationPayload{
			SessionID:   "1",
			VehicleType: "S",
			SlotID:      "5",
		}
		data, err := json.Marshal(payload)
		require.NoError(t, err)

		task := asynq.NewTask(TypeSlotAllocation, data)
		err = w.handleSlotAllocation(ctx, task)
		assert.NoError(t, err)
	})

	t.Run("handleSessionReconciliation processes valid payload", func(t *testing.T) {
		payload := SessionReconciliationPayload{
			Since: time.Now().Add(-24 * time.Hour),
		}
		data, err := json.Marshal(payload)
		require.NoError(t, err)

		task := asynq.NewTask(TypeSessionReconciliation, data)
		err = w.handleSessionReconciliation(ctx, task)
		assert.NoError(t, err)
	})

	t.Run("handleKafkaEventRetry processes valid payload", func(t *testing.T) {
		payload := KafkaEventRetryPayload{
			EventID: "evt-abc-123",
		}
		data, err := json.Marshal(payload)
		require.NoError(t, err)

		task := asynq.NewTask(TypeKafkaEventRetry, data)
		err = w.handleKafkaEventRetry(ctx, task)
		assert.NoError(t, err)
	})

	t.Run("handleAnalyticsReport processes valid payload", func(t *testing.T) {
		payload := AnalyticsReportPayload{
			Date: time.Now(),
		}
		data, err := json.Marshal(payload)
		require.NoError(t, err)

		task := asynq.NewTask(TypeAnalyticsReport, data)
		err = w.handleAnalyticsReport(ctx, task)
		assert.NoError(t, err)
	})
}

// TestWorker_HandlerInvalidPayload verifies error handling for invalid JSON
func TestWorker_HandlerInvalidPayload(t *testing.T) {
	w := newTestWorker(t)
	ctx := context.Background()
	invalidData := []byte(`{invalid json`)

	t.Run("handleSlotAllocation returns error for invalid payload", func(t *testing.T) {
		task := asynq.NewTask(TypeSlotAllocation, invalidData)
		err := w.handleSlotAllocation(ctx, task)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to unmarshal")
	})

	t.Run("handleSessionReconciliation returns error for invalid payload", func(t *testing.T) {
		task := asynq.NewTask(TypeSessionReconciliation, invalidData)
		err := w.handleSessionReconciliation(ctx, task)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to unmarshal")
	})

	t.Run("handleKafkaEventRetry returns error for invalid payload", func(t *testing.T) {
		task := asynq.NewTask(TypeKafkaEventRetry, invalidData)
		err := w.handleKafkaEventRetry(ctx, task)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to unmarshal")
	})

	t.Run("handleAnalyticsReport returns error for invalid payload", func(t *testing.T) {
		task := asynq.NewTask(TypeAnalyticsReport, invalidData)
		err := w.handleAnalyticsReport(ctx, task)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to unmarshal")
	})
}

// TestWorker_PayloadToBytes verifies the helper function
func TestWorker_PayloadToBytes(t *testing.T) {
	t.Run("payloadToBytes marshals correctly", func(t *testing.T) {
		payload := SlotAllocationPayload{
			SessionID:   "1",
			VehicleType: "M",
			SlotID:      "3",
		}
		data := payloadToBytes(payload)

		var parsed SlotAllocationPayload
		require.NoError(t, json.Unmarshal(data, &parsed))
		assert.Equal(t, payload, parsed)
	})
}
