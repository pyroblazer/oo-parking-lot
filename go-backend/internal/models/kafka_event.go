// Package models provides data models for the parking lot system.
package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// EventMetadata represents additional metadata for Kafka events
type EventMetadata map[string]interface{}

// Scan implements the sql.Scanner interface for EventMetadata
func (em *EventMetadata) Scan(value interface{}) error {
	if value == nil {
		*em = EventMetadata{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, em)
}

// Value implements the driver.Valuer interface for EventMetadata
func (em EventMetadata) Value() (driver.Value, error) {
	return json.Marshal(em)
}

// EventPayload represents the payload of a Kafka event
type EventPayload map[string]interface{}

// Scan implements the sql.Scanner interface for EventPayload
func (ep *EventPayload) Scan(value interface{}) error {
	if value == nil {
		*ep = EventPayload{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, ep)
}

// Value implements the driver.Valuer interface for EventPayload
func (ep EventPayload) Value() (driver.Value, error) {
	return json.Marshal(ep)
}

// KafkaEvent represents a Kafka event for tracking event-driven architecture
type KafkaEvent struct {
	ID             string        `json:"id" db:"id"`
	EventType      string        `json:"event_type" db:"event_type"`
	Topic          string        `json:"topic" db:"topic"`
	Partition      int           `json:"partition" db:"partition"`
	KafkaOffset    *int64        `json:"offset" db:"kafka_offset"`
	EventKey       *string       `json:"event_key" db:"event_key"`
	EventPayload   EventPayload  `json:"event_payload" db:"event_payload"`
	CorrelationID  *string       `json:"correlation_id" db:"correlation_id"`
	CausationID    *string       `json:"causation_id" db:"causation_id"`
	IdempotencyKey *string       `json:"idempotency_key" db:"idempotency_key"`
	EventID        string        `json:"event_id" db:"event_id"`
	OccurredAt     time.Time     `json:"occurred_at" db:"occurred_at"`
	PublishedAt    *time.Time    `json:"published_at" db:"published_at"`
	Status         string        `json:"status" db:"status"`
	RetryCount     int           `json:"retry_count" db:"retry_count"`
	ErrorMessage   *string       `json:"error_message" db:"error_message"`
	Metadata       EventMetadata `json:"metadata" db:"metadata"`
	CreatedAt      time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at" db:"updated_at"`
}

// Event type constants
const (
	EventTypeVehicleParked   = "vehicle.parked"
	EventTypeVehicleUnparked = "vehicle.unparked"
	EventTypeSessionMerged  = "session.merged"
	EventTypeBillingCompleted = "billing.completed"
	EventTypeSlotAllocated  = "slot.allocated"
)

// Topic constants
var TopicMap = map[string]string{
	EventTypeVehicleParked:   "vehicle.parked",
	EventTypeVehicleUnparked: "vehicle.unparked",
	EventTypeSessionMerged:  "session.merged",
	EventTypeBillingCompleted: "billing.completed",
	EventTypeSlotAllocated:  "slot.allocated",
}

// GetTopic returns the topic for a given event type
func (k *KafkaEvent) GetTopic() string {
	if topic, ok := TopicMap[k.EventType]; ok {
		return topic
	}
	return k.Topic
}

// IsValidStatus checks if the status is valid
func (k *KafkaEvent) IsValidStatus() bool {
	return k.Status == "pending" || k.Status == "published" || k.Status == "failed" || k.Status == "retrying"
}

// IsPending checks if the event is pending
func (k *KafkaEvent) IsPending() bool {
	return k.Status == "pending"
}

// IsPublished checks if the event is published
func (k *KafkaEvent) IsPublished() bool {
	return k.Status == "published"
}

// IsFailed checks if the event is failed
func (k *KafkaEvent) IsFailed() bool {
	return k.Status == "failed"
}

// IsRetrying checks if the event is retrying
func (k *KafkaEvent) IsRetrying() bool {
	return k.Status == "retrying"
}

// CanRetry checks if the event can be retried
func (k *KafkaEvent) CanRetry() bool {
	return k.Status == "failed" && k.RetryCount < 5
}

// IncrementRetry increments the retry count
func (k *KafkaEvent) IncrementRetry() {
	k.RetryCount++
}

// MarkPublished marks the event as published
func (k *KafkaEvent) MarkPublished(partition int, offset int64) {
	k.Status = "published"
	k.Partition = partition
	k.KafkaOffset = &offset
	now := time.Now()
	k.PublishedAt = &now
}

// MarkFailed marks the event as failed with an error message
func (k *KafkaEvent) MarkFailed(errorMessage string) {
	k.Status = "failed"
	k.ErrorMessage = &errorMessage
}

// MarkRetrying marks the event as retrying
func (k *KafkaEvent) MarkRetrying() {
	k.Status = "retrying"
}
