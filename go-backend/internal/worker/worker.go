// Package worker provides background job processing for the parking lot system.
package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
)

const (
	// TypeSlotAllocation represents a slot allocation task type
	TypeSlotAllocation = "parking:slot_allocation"
	// TypeSessionReconciliation represents a session reconciliation task type
	TypeSessionReconciliation = "parking:session_reconciliation"
	// TypeKafkaEventRetry represents a Kafka event retry task type
	TypeKafkaEventRetry = "parking:kafka_event_retry"
	// TypeAnalyticsReport represents an analytics report task type
	TypeAnalyticsReport = "parking:analytics_report"
)

// SlotAllocationPayload represents the payload for slot allocation tasks
type SlotAllocationPayload struct {
	SessionID   string `json:"session_id"`
	VehicleType string `json:"vehicle_type"`
	SlotID      string `json:"slot_id"`
}

// SessionReconciliationPayload represents the payload for session reconciliation tasks
type SessionReconciliationPayload struct {
	Since time.Time `json:"since"`
}

// KafkaEventRetryPayload represents the payload for Kafka event retry tasks
type KafkaEventRetryPayload struct {
	EventID string `json:"event_id"`
}

// AnalyticsReportPayload represents the payload for analytics report tasks
type AnalyticsReportPayload struct {
	Date time.Time `json:"date"`
}

// Worker handles background job processing
type Worker struct {
	server *asynq.Server
	client *asynq.Client
	logger zerolog.Logger
}

// NewWorker creates a new worker instance
func NewWorker(redisAddr string, logger *zerolog.Logger) *Worker {
	// Configure server
	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			RetryDelayFunc: func(_ int, _ error, _ *asynq.Task) time.Duration {
				return time.Duration(1) * time.Minute
			},
		},
	)

	// Configure client
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})

	return &Worker{
		server: server,
		client: client,
		logger: *logger,
	}
}

// Start starts the worker server
func (w *Worker) Start() error {
	mux := asynq.NewServeMux()

	// Register handlers
	mux.HandleFunc(TypeSlotAllocation, w.handleSlotAllocation)
	mux.HandleFunc(TypeSessionReconciliation, w.handleSessionReconciliation)
	mux.HandleFunc(TypeKafkaEventRetry, w.handleKafkaEventRetry)
	mux.HandleFunc(TypeAnalyticsReport, w.handleAnalyticsReport)

	w.logger.Info().Msg("Starting worker server")

	return w.server.Run(mux)
}

// Stop stops the worker server
func (w *Worker) Stop() {
	w.logger.Info().Msg("Stopping worker server")
	w.server.Shutdown()
}

// EnqueueSlotAllocation enqueues a slot allocation task
func (w *Worker) EnqueueSlotAllocation(_ context.Context, payload SlotAllocationPayload) error {
	task := asynq.NewTask(TypeSlotAllocation, payloadToBytes(payload))

	info, err := w.client.Enqueue(
		task,
		asynq.Queue("critical"),
		asynq.MaxRetry(5),
		asynq.Timeout(5*time.Minute),
	)

	if err != nil {
		return err
	}

	w.logger.Info().
		Str("task_id", info.ID).
		Str("queue", info.Queue).
		Msg("Slot allocation task enqueued")

	return nil
}

// EnqueueSessionReconciliation enqueues a session reconciliation task
func (w *Worker) EnqueueSessionReconciliation(_ context.Context, payload SessionReconciliationPayload) error {
	task := asynq.NewTask(TypeSessionReconciliation, payloadToBytes(payload))

	info, err := w.client.Enqueue(
		task,
		asynq.Queue("low"),
		asynq.MaxRetry(3),
		asynq.Timeout(10*time.Minute),
	)

	if err != nil {
		return err
	}

	w.logger.Info().
		Str("task_id", info.ID).
		Str("queue", info.Queue).
		Msg("Session reconciliation task enqueued")

	return nil
}

// EnqueueAnalyticsReport enqueues an analytics report task
func (w *Worker) EnqueueAnalyticsReport(_ context.Context, payload AnalyticsReportPayload) error {
	task := asynq.NewTask(TypeAnalyticsReport, payloadToBytes(payload))

	info, err := w.client.Enqueue(
		task,
		asynq.Queue("low"),
		asynq.MaxRetry(1),
		asynq.Timeout(5*time.Minute),
	)

	if err != nil {
		return err
	}

	w.logger.Info().
		Str("task_id", info.ID).
		Str("queue", info.Queue).
		Msg("Analytics report task enqueued")

	return nil
}

// Handlers
func (w *Worker) handleSlotAllocation(_ context.Context, t *asynq.Task) error {
	var payload SlotAllocationPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal slot allocation payload: %w", err)
	}

	w.logger.Info().
		Str("session_id", payload.SessionID).
		Str("vehicle_type", payload.VehicleType).
		Str("slot_id", payload.SlotID).
		Msg("Slot allocation processed")

	// In production, this would:
	// - Update slot status metrics
	// - Trigger slot utilization alerts
	// - Update real-time dashboards

	return nil
}

func (w *Worker) handleSessionReconciliation(_ context.Context, t *asynq.Task) error {
	var payload SessionReconciliationPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal session reconciliation payload: %w", err)
	}

	w.logger.Info().
		Time("since", payload.Since).
		Msg("Session reconciliation processed")

	// In production, this would:
	// - Query DB for sessions active longer than expected
	// - Detect orphaned sessions (slot available but session still active)
	// - Send alerts for anomalies

	return nil
}

func (w *Worker) handleKafkaEventRetry(_ context.Context, t *asynq.Task) error {
	var payload KafkaEventRetryPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal Kafka event retry payload: %w", err)
	}

	w.logger.Info().
		Str("event_id", payload.EventID).
		Msg("Kafka event retry processed")

	// In production, this would:
	// - Query kafka_events table for failed events
	// - Republish events to Kafka broker
	// - Update event status to 'retrying' or 'published'

	return nil
}

func (w *Worker) handleAnalyticsReport(_ context.Context, t *asynq.Task) error {
	var payload AnalyticsReportPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal analytics report payload: %w", err)
	}

	w.logger.Info().
		Time("date", payload.Date).
		Msg("Analytics report processed")

	// In production, this would:
	// - Aggregate session data for the given date
	// - Calculate utilization rates, revenue metrics
	// - Publish metrics to Prometheus

	return nil
}

// Helper functions
func payloadToBytes(payload interface{}) []byte {
	bytes, err := json.Marshal(payload)
	if err != nil {
		log.Fatalf("Failed to marshal payload: %v", err)
	}
	return bytes
}
