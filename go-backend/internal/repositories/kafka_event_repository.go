// Package repositories provides data access layer for parking lot system.
package repositories

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// KafkaEventRepository handles Kafka event data operations
type KafkaEventRepository struct {
	db *sql.DB
}

// NewKafkaEventRepository creates a new Kafka event repository
func NewKafkaEventRepository(db *sql.DB) *KafkaEventRepository {
	return &KafkaEventRepository{db: db}
}

// GetByID retrieves a Kafka event by ID
func (r *KafkaEventRepository) GetByID(id string) (*models.KafkaEvent, error) {
	query := `
		SELECT id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at
		FROM kafka_events
		WHERE id = $1
	`

	var event models.KafkaEvent
	var eventPayloadJSON []byte
	var metadataJSON []byte
	err := r.db.QueryRow(query, id).Scan(
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

	if err != nil {
		return nil, fmt.Errorf("failed to get Kafka event: %w", err)
	}

	if eventPayloadJSON != nil {
		if err := json.Unmarshal(eventPayloadJSON, &event.EventPayload); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event payload: %w", err)
		}
	}

	if metadataJSON != nil {
		if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return &event, nil
}

// List retrieves all Kafka events with pagination
func (r *KafkaEventRepository) List(page, perPage int) ([]*models.KafkaEvent, error) {
	offset := (page - 1) * perPage

	query := `
		SELECT id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at
		FROM kafka_events
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list Kafka events: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if err != nil {
			return nil, fmt.Errorf("failed to scan Kafka event: %w", err)
		}

		if eventPayloadJSON != nil {
			if err := json.Unmarshal(eventPayloadJSON, &event.EventPayload); err != nil {
				return nil, fmt.Errorf("failed to unmarshal event payload: %w", err)
			}
		}

		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		events = append(events, &event)
	}

	return events, nil
}

// Count returns the total number of Kafka events
func (r *KafkaEventRepository) Count() (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM kafka_events`
	err := r.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count Kafka events: %w", err)
	}
	return count, nil
}

// CountByStatus returns the total number of Kafka events with a specific status
func (r *KafkaEventRepository) CountByStatus(status string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM kafka_events WHERE status = $1`
	err := r.db.QueryRow(query, status).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count Kafka events by status: %w", err)
	}
	return count, nil
}

// CountByEventType returns the total number of Kafka events with a specific event type
func (r *KafkaEventRepository) CountByEventType(eventType string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM kafka_events WHERE event_type = $1`
	err := r.db.QueryRow(query, eventType).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count Kafka events by event type: %w", err)
	}
	return count, nil
}

// GetByStatus retrieves Kafka events by status with pagination
func (r *KafkaEventRepository) GetByStatus(status string, page, perPage int) ([]*models.KafkaEvent, error) {
	offset := (page - 1) * perPage

	query := `
		SELECT id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at
		FROM kafka_events
		WHERE status = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, status, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get Kafka events by status: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if err != nil {
			return nil, fmt.Errorf("failed to scan Kafka event: %w", err)
		}

		if eventPayloadJSON != nil {
			if err := json.Unmarshal(eventPayloadJSON, &event.EventPayload); err != nil {
				return nil, fmt.Errorf("failed to unmarshal event payload: %w", err)
			}
		}

		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		events = append(events, &event)
	}

	return events, nil
}

// GetByEventType retrieves Kafka events by event type with pagination
func (r *KafkaEventRepository) GetByEventType(eventType string, page, perPage int) ([]*models.KafkaEvent, error) {
	offset := (page - 1) * perPage

	query := `
		SELECT id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at
		FROM kafka_events
		WHERE event_type = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, eventType, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get Kafka events by event type: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if err != nil {
			return nil, fmt.Errorf("failed to scan Kafka event: %w", err)
		}

		if eventPayloadJSON != nil {
			if err := json.Unmarshal(eventPayloadJSON, &event.EventPayload); err != nil {
				return nil, fmt.Errorf("failed to unmarshal event payload: %w", err)
			}
		}

		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		events = append(events, &event)
	}

	return events, nil
}

// Create creates a new Kafka event
func (r *KafkaEventRepository) Create(event *models.KafkaEvent) (*models.KafkaEvent, error) {
	eventPayloadJSON, err := json.Marshal(event.EventPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal event payload: %w", err)
	}

	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO kafka_events (id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id, event_type, topic, "partition", kafka_offset, event_key, event_payload,
			correlation_id, causation_id, idempotency_key, event_id, occurred_at,
			published_at, status, retry_count, error_message, metadata, created_at, updated_at
	`

	err = r.db.QueryRow(
		query,
		event.ID,
		event.EventType,
		event.Topic,
		event.Partition,
		event.KafkaOffset,
		event.EventKey,
		eventPayloadJSON,
		event.CorrelationID,
		event.CausationID,
		event.IdempotencyKey,
		event.EventID,
		event.OccurredAt,
		event.PublishedAt,
		event.Status,
		event.RetryCount,
		event.ErrorMessage,
		metadataJSON,
		event.CreatedAt,
		event.UpdatedAt,
	).Scan(
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

	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka event: %w", err)
	}

	if eventPayloadJSON != nil {
		if err := json.Unmarshal(eventPayloadJSON, &event.EventPayload); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event payload: %w", err)
		}
	}

	if metadataJSON != nil {
		if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return event, nil
}

// Update updates a Kafka event
func (r *KafkaEventRepository) Update(event *models.KafkaEvent) error {
	eventPayloadJSON, err := json.Marshal(event.EventPayload)
	if err != nil {
		return fmt.Errorf("failed to marshal event payload: %w", err)
	}

	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE kafka_events
		SET topic = $1, "partition" = $2, kafka_offset = $3, event_key = $4, event_payload = $5,
			correlation_id = $6, causation_id = $7, idempotency_key = $8, event_id = $9,
			occurred_at = $10, published_at = $11, status = $12, retry_count = $13,
			error_message = $14, metadata = $15, updated_at = $16
		WHERE id = $17
	`

	_, err = r.db.Exec(
		query,
		event.Topic,
		event.Partition,
		event.KafkaOffset,
		event.EventKey,
		eventPayloadJSON,
		event.CorrelationID,
		event.CausationID,
		event.IdempotencyKey,
		event.EventID,
		event.OccurredAt,
		event.PublishedAt,
		event.Status,
		event.RetryCount,
		event.ErrorMessage,
		metadataJSON,
		event.UpdatedAt,
		event.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update Kafka event: %w", err)
	}

	return nil
}

// Delete deletes a Kafka event
func (r *KafkaEventRepository) Delete(id string) error {
	query := `DELETE FROM kafka_events WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete Kafka event: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("kafka event not found")
	}

	return nil
}
