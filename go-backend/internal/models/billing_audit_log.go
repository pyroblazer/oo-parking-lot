// Package models provides data models for the parking lot system.
package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// FeeBreakdown represents the breakdown of parking fees
type FeeBreakdown struct {
	BaseFee       float64 `json:"base_fee"`
	ExceedingFee  float64 `json:"exceeding_fee"`
	LongTermFee   float64 `json:"long_term_fee"`
	TotalFee      float64 `json:"total_fee"`
	DurationHours float64 `json:"duration_hours"`
}

// Scan implements the sql.Scanner interface for FeeBreakdown
func (fb *FeeBreakdown) Scan(value interface{}) error {
	if value == nil {
		*fb = FeeBreakdown{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, fb)
}

// Value implements the driver.Valuer interface for FeeBreakdown
func (fb FeeBreakdown) Value() (driver.Value, error) {
	return json.Marshal(fb)
}

// BillingAuditLog represents an immutable billing audit log for regulatory-grade traceability
type BillingAuditLog struct {
	ID              int64          `json:"id" db:"id"`
	ParkingSessionID int64         `json:"parking_session_id" db:"parking_session_id"`
	VehicleType     string         `json:"vehicle_type" db:"vehicle_type"`
	SlotLabel       string         `json:"slot_label" db:"slot_label"`
	SlotType        string         `json:"slot_type" db:"slot_type"`
	EntryPoint      string         `json:"entry_point" db:"entry_point"`
	ParkedAt        time.Time      `json:"parked_at" db:"parked_at"`
	ExitedAt        time.Time      `json:"exited_at" db:"exited_at"`
	TotalFee        float64        `json:"total_fee" db:"total_fee"`
	BaseFee         float64        `json:"base_fee" db:"base_fee"`
	ExceedingFee    float64        `json:"exceeding_fee" db:"exceeding_fee"`
	ExceedingHours  int            `json:"exceeding_hours" db:"exceeding_hours"`
	LongTermDays    int            `json:"long_term_days" db:"long_term_days"`
	LongTermFee     float64        `json:"long_term_fee" db:"long_term_fee"`
	DurationHours   float64        `json:"duration_hours" db:"duration_hours"`
	IsContinuous    bool           `json:"is_continuous" db:"is_continuous"`
	BaseStartTime   *time.Time     `json:"base_start_time" db:"base_start_time"`
	FeeBreakdown    FeeBreakdown   `json:"fee_breakdown" db:"fee_breakdown"`
	CorrelationID   *string        `json:"correlation_id" db:"correlation_id"`
	IdempotencyKey  *string        `json:"idempotency_key" db:"idempotency_key"`
	BillingVersion  string         `json:"billing_version" db:"billing_version"`
	CalculatedAt    time.Time      `json:"calculated_at" db:"calculated_at"`
	CreatedAt       time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at" db:"updated_at"`
}

// IsValidVehicleType checks if the vehicle type is valid
func (b *BillingAuditLog) IsValidVehicleType() bool {
	return b.VehicleType == "S" || b.VehicleType == "M" || b.VehicleType == "L"
}

// IsValidSlotType checks if the slot type is valid
func (b *BillingAuditLog) IsValidSlotType() bool {
	return b.SlotType == "SP" || b.SlotType == "MP" || b.SlotType == "LP"
}

// IsLongTerm checks if this is a long-term parking session
func (b *BillingAuditLog) IsLongTerm() bool {
	return b.LongTermDays > 0
}

// GetBreakdown returns the fee breakdown
func (b *BillingAuditLog) GetBreakdown() FeeBreakdown {
	return b.FeeBreakdown
}

// ToHash returns a hash representation of the audit log
func (b *BillingAuditLog) ToHash() map[string]interface{} {
	return map[string]interface{}{
		"id":               b.ID,
		"parking_session_id": b.ParkingSessionID,
		"vehicle_type":     b.VehicleType,
		"slot_label":       b.SlotLabel,
		"slot_type":        b.SlotType,
		"entry_point":      b.EntryPoint,
		"parked_at":        b.ParkedAt,
		"exited_at":        b.ExitedAt,
		"total_fee":        b.TotalFee,
		"base_fee":         b.BaseFee,
		"exceeding_fee":    b.ExceedingFee,
		"exceeding_hours":  b.ExceedingHours,
		"long_term_days":   b.LongTermDays,
		"long_term_fee":    b.LongTermFee,
		"duration_hours":   b.DurationHours,
		"is_continuous":    b.IsContinuous,
		"base_start_time":  b.BaseStartTime,
		"fee_breakdown":    b.FeeBreakdown,
		"correlation_id":   b.CorrelationID,
		"idempotency_key":  b.IdempotencyKey,
		"billing_version":  b.BillingVersion,
		"calculated_at":    b.CalculatedAt,
	}
}
