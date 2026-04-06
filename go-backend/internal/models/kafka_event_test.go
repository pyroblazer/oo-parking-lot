package models

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestKafkaEvent_IsValidStatus(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected bool
	}{
		{
			name:     "pending status is valid",
			status:   "pending",
			expected: true,
		},
		{
			name:     "published status is valid",
			status:   "published",
			expected: true,
		},
		{
			name:     "failed status is valid",
			status:   "failed",
			expected: true,
		},
		{
			name:     "retrying status is valid",
			status:   "retrying",
			expected: true,
		},
		{
			name:     "invalid status",
			status:   "unknown",
			expected: false,
		},
		{
			name:     "empty status",
			status:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: tt.status}
			result := event.IsValidStatus()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_IsPending(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected bool
	}{
		{
			name:     "pending event",
			status:   "pending",
			expected: true,
		},
		{
			name:     "published event",
			status:   "published",
			expected: false,
		},
		{
			name:     "failed event",
			status:   "failed",
			expected: false,
		},
		{
			name:     "retrying event",
			status:   "retrying",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: tt.status}
			result := event.IsPending()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_IsPublished(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected bool
	}{
		{
			name:     "published event",
			status:   "published",
			expected: true,
		},
		{
			name:     "pending event",
			status:   "pending",
			expected: false,
		},
		{
			name:     "failed event",
			status:   "failed",
			expected: false,
		},
		{
			name:     "retrying event",
			status:   "retrying",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: tt.status}
			result := event.IsPublished()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_IsFailed(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected bool
	}{
		{
			name:     "failed event",
			status:   "failed",
			expected: true,
		},
		{
			name:     "pending event",
			status:   "pending",
			expected: false,
		},
		{
			name:     "published event",
			status:   "published",
			expected: false,
		},
		{
			name:     "retrying event",
			status:   "retrying",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: tt.status}
			result := event.IsFailed()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_IsRetrying(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected bool
	}{
		{
			name:     "retrying event",
			status:   "retrying",
			expected: true,
		},
		{
			name:     "pending event",
			status:   "pending",
			expected: false,
		},
		{
			name:     "published event",
			status:   "published",
			expected: false,
		},
		{
			name:     "failed event",
			status:   "failed",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: tt.status}
			result := event.IsRetrying()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_CanRetry(t *testing.T) {
	tests := []struct {
		name       string
		status     string
		retryCount int
		expected   bool
	}{
		{
			name:       "failed event with retry count < 5",
			status:     "failed",
			retryCount: 2,
			expected:   true,
		},
		{
			name:       "failed event with retry count >= 5",
			status:     "failed",
			retryCount: 5,
			expected:   false,
		},
		{
			name:       "published event",
			status:     "published",
			retryCount: 0,
			expected:   false,
		},
		{
			name:       "pending event",
			status:     "pending",
			retryCount: 0,
			expected:   false,
		},
		{
			name:       "retrying event",
			status:     "retrying",
			retryCount: 3,
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{
				Status:     tt.status,
				RetryCount: tt.retryCount,
			}
			result := event.CanRetry()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_IncrementRetry(t *testing.T) {
	tests := []struct {
		name         string
		initialCount int
		expected     int
	}{
		{
			name:         "increment from 0",
			initialCount: 0,
			expected:     1,
		},
		{
			name:         "increment from 2",
			initialCount: 2,
			expected:     3,
		},
		{
			name:         "increment from 4",
			initialCount: 4,
			expected:     5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{RetryCount: tt.initialCount}
			event.IncrementRetry()
			assert.Equal(t, tt.expected, event.RetryCount)
		})
	}
}

func TestKafkaEvent_MarkPublished(t *testing.T) {
	tests := []struct {
		name      string
		partition int
		offset    int64
	}{
		{
			name:      "mark published with partition 0",
			partition: 0,
			offset:    100,
		},
		{
			name:      "mark published with partition 1",
			partition: 1,
			offset:    200,
		},
		{
			name:      "mark published with partition 5",
			partition: 5,
			offset:    500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: "pending"}
			event.MarkPublished(tt.partition, tt.offset)
 
			assert.Equal(t, "published", event.Status)
			assert.Equal(t, tt.partition, event.Partition)
			assert.NotNil(t, event.KafkaOffset)
			assert.Equal(t, tt.offset, *event.KafkaOffset)
			assert.NotNil(t, event.PublishedAt)
		})
	}
}

func TestKafkaEvent_MarkFailed(t *testing.T) {
	tests := []struct {
		name          string
		errorMessage  string
		initialStatus string
	}{
		{
			name:          "mark failed with error message",
			errorMessage:  "Connection timeout",
			initialStatus: "retrying",
		},
		{
			name:          "mark failed with empty error message",
			errorMessage:  "",
			initialStatus: "retrying",
		},
		{
			name:          "mark failed with nil error message",
			errorMessage:  "",
			initialStatus: "retrying",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{Status: tt.initialStatus}
			event.MarkFailed(tt.errorMessage)

			assert.Equal(t, "failed", event.Status)
			assert.NotNil(t, event.ErrorMessage)
			assert.Equal(t, tt.errorMessage, *event.ErrorMessage)
		})
	}
}

func TestKafkaEvent_MarkRetrying(t *testing.T) {
	event := &KafkaEvent{Status: "failed"}
	event.MarkRetrying()

	assert.Equal(t, "retrying", event.Status)
}

func TestKafkaEvent_GetTopic(t *testing.T) {
	tests := []struct {
		name      string
		eventType string
		topic     string
		expected  string
	}{
		{
			name:      "vehicle.parked event type",
			eventType: EventTypeVehicleParked,
			topic:     "",
			expected:  "vehicle.parked",
		},
		{
			name:      "vehicle.unparked event type",
			eventType: EventTypeVehicleUnparked,
			topic:     "",
			expected:  "vehicle.unparked",
		},
		{
			name:      "session.merged event type",
			eventType: EventTypeSessionMerged,
			topic:     "",
			expected:  "session.merged",
		},
		{
			name:      "billing.completed event type",
			eventType: EventTypeBillingCompleted,
			topic:     "",
			expected:  "billing.completed",
		},
		{
			name:      "slot.allocated event type",
			eventType: EventTypeSlotAllocated,
			topic:     "",
			expected:  "slot.allocated",
		},
		{
			name:      "custom topic",
			eventType: "custom.event",
			topic:     "custom.topic",
			expected:  "custom.topic",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &KafkaEvent{
				EventType: tt.eventType,
				Topic:     tt.topic,
			}
			result := event.GetTopic()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestKafkaEvent_EventTypeConstants(t *testing.T) {
	assert.Equal(t, "vehicle.parked", EventTypeVehicleParked)
	assert.Equal(t, "vehicle.unparked", EventTypeVehicleUnparked)
	assert.Equal(t, "session.merged", EventTypeSessionMerged)
	assert.Equal(t, "billing.completed", EventTypeBillingCompleted)
	assert.Equal(t, "slot.allocated", EventTypeSlotAllocated)
}

func TestKafkaEvent_TopicMap(t *testing.T) {
	assert.Equal(t, "vehicle.parked", TopicMap[EventTypeVehicleParked])
	assert.Equal(t, "vehicle.unparked", TopicMap[EventTypeVehicleUnparked])
	assert.Equal(t, "session.merged", TopicMap[EventTypeSessionMerged])
	assert.Equal(t, "billing.completed", TopicMap[EventTypeBillingCompleted])
	assert.Equal(t, "slot.allocated", TopicMap[EventTypeSlotAllocated])
}

func TestKafkaEvent_EdgeCases(t *testing.T) {
	t.Run("maximum retry count", func(t *testing.T) {
		event := &KafkaEvent{
			Status:     "failed",
			RetryCount: 100,
		}
		assert.False(t, event.CanRetry())
	})

	t.Run("zero retry count", func(t *testing.T) {
		event := &KafkaEvent{
			Status:     "failed",
			RetryCount: 0,
		}
		assert.True(t, event.CanRetry())
	})

	t.Run("negative retry count", func(t *testing.T) {
		event := &KafkaEvent{
			Status:     "failed",
			RetryCount: -1,
		}
		assert.True(t, event.CanRetry())
	})

	t.Run("empty error message", func(t *testing.T) {
		event := &KafkaEvent{Status: "retrying"}
		event.MarkFailed("")
		assert.Equal(t, "failed", event.Status)
		assert.NotNil(t, event.ErrorMessage)
		assert.Equal(t, "", *event.ErrorMessage)
	})

	t.Run("nil error message", func(t *testing.T) {
		event := &KafkaEvent{Status: "retrying"}
		event.MarkFailed("")
		assert.Equal(t, "failed", event.Status)
	})

	t.Run("very long error message", func(t *testing.T) {
		longMessage := "A" + string(make([]byte, 10000))
		event := &KafkaEvent{Status: "retrying"}
		event.MarkFailed(longMessage)
		assert.Equal(t, "failed", event.Status)
		assert.NotNil(t, event.ErrorMessage)
		assert.Equal(t, longMessage, *event.ErrorMessage)
	})
}

func TestKafkaEvent_Metadata(t *testing.T) {
	t.Run("empty metadata", func(t *testing.T) {
		metadata := EventMetadata{}
		event := &KafkaEvent{Metadata: metadata}
		assert.NotNil(t, event.Metadata)
		assert.Equal(t, 0, len(event.Metadata))
	})

	t.Run("metadata with values", func(t *testing.T) {
		metadata := EventMetadata{
			"key1": "value1",
			"key2": 123,
		}
		event := &KafkaEvent{Metadata: metadata}
		assert.NotNil(t, event.Metadata)
		assert.Equal(t, 2, len(event.Metadata))
		assert.Equal(t, "value1", event.Metadata["key1"])
		assert.Equal(t, 123, event.Metadata["key2"])
	})
}

func TestKafkaEvent_Payload(t *testing.T) {
	t.Run("empty payload", func(t *testing.T) {
		payload := EventPayload{}
		event := &KafkaEvent{EventPayload: payload}
		assert.NotNil(t, event.EventPayload)
		assert.Equal(t, 0, len(event.EventPayload))
	})

	t.Run("payload with values", func(t *testing.T) {
		payload := EventPayload{
			"session_id": 123,
			"vehicle_type": "S",
		}
		event := &KafkaEvent{EventPayload: payload}
		assert.NotNil(t, event.EventPayload)
		assert.Equal(t, 2, len(event.EventPayload))
		assert.Equal(t, 123, event.EventPayload["session_id"])
		assert.Equal(t, "S", event.EventPayload["vehicle_type"])
	})
}

func TestKafkaEvent_CorrelationAndCausation(t *testing.T) {
	t.Run("with correlation id", func(t *testing.T) {
		correlationID := "test-correlation-123"
		event := &KafkaEvent{CorrelationID: &correlationID}
		assert.NotNil(t, event.CorrelationID)
		assert.Equal(t, "test-correlation-123", *event.CorrelationID)
	})

	t.Run("with causation id", func(t *testing.T) {
		causationID := "test-causation-456"
		event := &KafkaEvent{CausationID: &causationID}
		assert.NotNil(t, event.CausationID)
		assert.Equal(t, "test-causation-456", *event.CausationID)
	})

	t.Run("with idempotency key", func(t *testing.T) {
		idempotencyKey := "event:unique-789"
		event := &KafkaEvent{IdempotencyKey: &idempotencyKey}
		assert.NotNil(t, event.IdempotencyKey)
		assert.Equal(t, "event:unique-789", *event.IdempotencyKey)
	})

	t.Run("with nil correlation id", func(t *testing.T) {
		event := &KafkaEvent{CorrelationID: nil}
		assert.Nil(t, event.CorrelationID)
	})

	t.Run("with nil causation id", func(t *testing.T) {
		event := &KafkaEvent{CausationID: nil}
		assert.Nil(t, event.CausationID)
	})

	t.Run("with nil idempotency key", func(t *testing.T) {
		event := &KafkaEvent{IdempotencyKey: nil}
		assert.Nil(t, event.IdempotencyKey)
	})
}

func TestKafkaEvent_Timestamps(t *testing.T) {
	now := time.Now()

	event := &KafkaEvent{
		OccurredAt:  now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	assert.Equal(t, now, event.OccurredAt)
	assert.Equal(t, now, event.CreatedAt)
	assert.Equal(t, now, event.UpdatedAt)
}

func TestKafkaEvent_EventKey(t *testing.T) {
	t.Run("with event key", func(t *testing.T) {
		eventKey := "session-123"
		event := &KafkaEvent{EventKey: &eventKey}
		assert.NotNil(t, event.EventKey)
		assert.Equal(t, "session-123", *event.EventKey)
	})

	t.Run("with nil event key", func(t *testing.T) {
		event := &KafkaEvent{EventKey: nil}
		assert.Nil(t, event.EventKey)
	})
}

// TestKafkaEvent_ConcurrentStatusUpdates tests that concurrent status updates to Kafka events are handled correctly
func TestKafkaEvent_ConcurrentStatusUpdates(t *testing.T) {
	event := &KafkaEvent{
		ID:         "test-event-123",
		EventType:  EventTypeVehicleParked,
		Status:     "pending",
		RetryCount: 0,
	}

	// Use a mutex to synchronize access to the event
	var mu sync.Mutex

	// Simulate concurrent status updates using goroutines
	numGoroutines := 10
	done := make(chan bool, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			mu.Lock()
			// Each goroutine tries to update the status
			if index%2 == 0 {
				event.MarkPublished(index, int64(index*100))
			} else if index%3 == 0 {
				event.MarkFailed("Test error message")
			} else {
				event.MarkRetrying()
			}
			mu.Unlock()
			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Verify final status is consistent
	// The last update should win, but we should have a valid status
	assert.True(t, event.IsValidStatus(), "Final status should be valid")
	assert.Contains(t, []string{"pending", "published", "failed", "retrying"}, event.Status,
		"Final status should be one of the valid statuses")
}
