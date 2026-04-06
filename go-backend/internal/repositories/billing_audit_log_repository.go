// Package repositories provides data access layer for parking lot system.
package repositories

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// BillingAuditLogRepository handles billing audit log data operations
type BillingAuditLogRepository struct {
	db *sql.DB
}

// NewBillingAuditLogRepository creates a new billing audit log repository
func NewBillingAuditLogRepository(db *sql.DB) *BillingAuditLogRepository {
	return &BillingAuditLogRepository{db: db}
}

// GetByID retrieves a billing audit log by ID
func (r *BillingAuditLogRepository) GetByID(id int64) (*models.BillingAuditLog, error) {
	query := `
		SELECT id, parking_session_id, vehicle_type, slot_label, slot_type, entry_point,
			parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours,
			long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time,
			fee_breakdown, correlation_id, idempotency_key, billing_version,
			calculated_at, created_at, updated_at
		FROM billing_audit_logs
		WHERE id = $1
	`

	var log models.BillingAuditLog
	var feeBreakdownJSON []byte
	err := r.db.QueryRow(query, id).Scan(
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

	if err != nil {
		return nil, fmt.Errorf("failed to get billing audit log: %w", err)
	}

	if feeBreakdownJSON != nil {
		if err := json.Unmarshal(feeBreakdownJSON, &log.FeeBreakdown); err != nil {
			return nil, fmt.Errorf("failed to unmarshal fee breakdown: %w", err)
		}
	}

	return &log, nil
}

// List retrieves all billing audit logs with pagination
func (r *BillingAuditLogRepository) List(page, perPage int) ([]*models.BillingAuditLog, error) {
	offset := (page - 1) * perPage

	query := `
		SELECT id, parking_session_id, vehicle_type, slot_label, slot_type, entry_point,
			parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours,
			long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time,
			fee_breakdown, correlation_id, idempotency_key, billing_version,
			calculated_at, created_at, updated_at
		FROM billing_audit_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	fmt.Printf("DEBUG: BillingAuditLogRepository.List - Executing query: %s with params: page=%d, perPage=%d, offset=%d\n", query, page, perPage, offset)
	rows, err := r.db.Query(query, perPage, offset)
	if err != nil {
		fmt.Printf("DEBUG: BillingAuditLogRepository.List - Query failed: %v\n", err)
		return nil, fmt.Errorf("failed to list billing audit logs: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	// Initialize as empty slice to ensure JSON serialization returns [] instead of null
	logs := make([]*models.BillingAuditLog, 0)
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
		if err != nil {
			fmt.Printf("DEBUG: BillingAuditLogRepository.List - Scan failed: %v\n", err)
			return nil, fmt.Errorf("failed to scan billing audit log: %w", err)
		}

		if feeBreakdownJSON != nil {
			if err := json.Unmarshal(feeBreakdownJSON, &log.FeeBreakdown); err != nil {
				fmt.Printf("DEBUG: BillingAuditLogRepository.List - Unmarshal failed: %v\n", err)
				return nil, fmt.Errorf("failed to unmarshal fee breakdown: %w", err)
			}
		}

		logs = append(logs, &log)
	}

	fmt.Printf("DEBUG: BillingAuditLogRepository.List - Returning %d logs\n", len(logs))
	return logs, nil
}

// Count returns the total number of billing audit logs
func (r *BillingAuditLogRepository) Count() (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM billing_audit_logs`
	err := r.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count billing audit logs: %w", err)
	}
	return count, nil
}

// GetBySessionID retrieves billing audit logs by parking session ID
func (r *BillingAuditLogRepository) GetBySessionID(sessionID int64) ([]*models.BillingAuditLog, error) {
	query := `
		SELECT id, parking_session_id, vehicle_type, slot_label, slot_type, entry_point,
			parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours,
			long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time,
			fee_breakdown, correlation_id, idempotency_key, billing_version,
			calculated_at, created_at, updated_at
		FROM billing_audit_logs
		WHERE parking_session_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get billing audit logs by session ID: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

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
		if err != nil {
			return nil, fmt.Errorf("failed to scan billing audit log: %w", err)
		}

		if feeBreakdownJSON != nil {
			if err := json.Unmarshal(feeBreakdownJSON, &log.FeeBreakdown); err != nil {
				return nil, fmt.Errorf("failed to unmarshal fee breakdown: %w", err)
			}
		}

		logs = append(logs, &log)
	}

	return logs, nil
}

// Create creates a new billing audit log
func (r *BillingAuditLogRepository) Create(log *models.BillingAuditLog) (*models.BillingAuditLog, error) {
	newLog := &models.BillingAuditLog{
		ParkingSessionID: log.ParkingSessionID,
		VehicleType:      log.VehicleType,
		SlotLabel:        log.SlotLabel,
		SlotType:         log.SlotType,
		EntryPoint:       log.EntryPoint,
		ParkedAt:         log.ParkedAt,
		ExitedAt:         log.ExitedAt,
		TotalFee:         log.TotalFee,
		BaseFee:          log.BaseFee,
		ExceedingFee:     log.ExceedingFee,
		ExceedingHours:   log.ExceedingHours,
		LongTermDays:     log.LongTermDays,
		LongTermFee:      log.LongTermFee,
		DurationHours:    log.DurationHours,
		IsContinuous:     log.IsContinuous,
		BaseStartTime:    log.BaseStartTime,
		FeeBreakdown:     log.FeeBreakdown,
		CorrelationID:    log.CorrelationID,
		IdempotencyKey:   log.IdempotencyKey,
		BillingVersion:   log.BillingVersion,
		CalculatedAt:     time.Now(),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	feeBreakdownJSON, err := json.Marshal(newLog.FeeBreakdown)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal fee breakdown: %w", err)
	}

	query := `
		INSERT INTO billing_audit_logs (parking_session_id, vehicle_type, slot_label, slot_type, entry_point,
			parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours,
			long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time,
			fee_breakdown, correlation_id, idempotency_key, billing_version,
			calculated_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
		RETURNING id, parking_session_id, vehicle_type, slot_label, slot_type, entry_point,
			parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours,
			long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time,
			fee_breakdown, correlation_id, idempotency_key, billing_version,
			calculated_at, created_at, updated_at
	`

	err = r.db.QueryRow(
		query,
		newLog.ParkingSessionID,
		newLog.VehicleType,
		newLog.SlotLabel,
		newLog.SlotType,
		newLog.EntryPoint,
		newLog.ParkedAt,
		newLog.ExitedAt,
		newLog.TotalFee,
		newLog.BaseFee,
		newLog.ExceedingFee,
		newLog.ExceedingHours,
		newLog.LongTermDays,
		newLog.LongTermFee,
		newLog.DurationHours,
		newLog.IsContinuous,
		newLog.BaseStartTime,
		feeBreakdownJSON,
		newLog.CorrelationID,
		newLog.IdempotencyKey,
		newLog.BillingVersion,
		newLog.CalculatedAt,
		newLog.CreatedAt,
		newLog.UpdatedAt,
	).Scan(
		&newLog.ID,
		&newLog.ParkingSessionID,
		&newLog.VehicleType,
		&newLog.SlotLabel,
		&newLog.SlotType,
		&newLog.EntryPoint,
		&newLog.ParkedAt,
		&newLog.ExitedAt,
		&newLog.TotalFee,
		&newLog.BaseFee,
		&newLog.ExceedingFee,
		&newLog.ExceedingHours,
		&newLog.LongTermDays,
		&newLog.LongTermFee,
		&newLog.DurationHours,
		&newLog.IsContinuous,
		&newLog.BaseStartTime,
		&feeBreakdownJSON,
		&newLog.CorrelationID,
		&newLog.IdempotencyKey,
		&newLog.BillingVersion,
		&newLog.CalculatedAt,
		&newLog.CreatedAt,
		&newLog.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create billing audit log: %w", err)
	}

	if feeBreakdownJSON != nil {
		if err := json.Unmarshal(feeBreakdownJSON, &newLog.FeeBreakdown); err != nil {
			return nil, fmt.Errorf("failed to unmarshal fee breakdown: %w", err)
		}
	}

	return newLog, nil
}
