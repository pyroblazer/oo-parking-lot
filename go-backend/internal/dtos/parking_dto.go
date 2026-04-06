// Package dtos provides data transfer objects for parking lot API.
package dtos

import (
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// ParkVehicleRequest represents a request to park a vehicle
type ParkVehicleRequest struct {
	VehicleType       string `json:"vehicle_type" validate:"required,oneof=S M L"`
	EntryPointID      string `json:"entry_point_id" validate:"required"`
	ParkedAt          string `json:"parked_at"` // Optional parked_at for testing purposes
	PreviousSessionID string `json:"previous_session_id"` // Optional - link to previous session for explicit continuous parking
	LicensePlate      string `json:"license_plate"` // Optional - vehicle license plate for identifying same vehicle
}

// ParkVehicleResponse represents a response after parking a vehicle
type ParkVehicleResponse struct {
	SessionID     string   `json:"session_id"`
	VehicleType   string   `json:"vehicle_type"`
	LicensePlate  string   `json:"license_plate"`
	ParkingSlot   SlotInfo `json:"parking_slot"`
	EntryPoint    string   `json:"entry_point"`
	ParkedAt      string   `json:"parked_at"`
	IsActive      bool     `json:"is_active"`
	IsContinuous  bool     `json:"is_continuous"`
	DurationHours float64  `json:"duration_hours"`
	TotalFee      float64  `json:"total_fee"`
}

// SlotInfo represents parking slot information
type SlotInfo struct {
	ID           string         `json:"id"`
	SlotLabel    string         `json:"slot_label"`
	SlotType     string         `json:"slot_type"`
	Distances    []int          `json:"distances"`
	DistancesMap map[string]int `json:"distances_map"`
}

// UnparkVehicleResponse represents a response after unparking a vehicle
type UnparkVehicleResponse struct {
	FeeBreakdown  FeeBreakdown   `json:"fee_breakdown"`
	Breakdown     FeeBreakdown   `json:"breakdown"`
	ParkingSlot   SlotInfo       `json:"parking_slot"`
	TotalFee      float64        `json:"total_fee"`
	DurationHours float64        `json:"duration_hours"`
	IsContinuous  bool           `json:"is_continuous"`
	SessionID     string         `json:"session_id"`
	VehicleType   string         `json:"vehicle_type"`
	LicensePlate  string         `json:"license_plate"`
	EntryPoint    EntryPointInfo `json:"entry_point"`
	ParkedAt      string         `json:"parked_at"`
	ExitedAt      string         `json:"exited_at"`
}

// FeeBreakdown represents a breakdown of parking fees
type FeeBreakdown struct {
	Remaining     RemainingInfo `json:"remaining"`
	LongTerm      LongTermInfo  `json:"long_term"`
	TotalFee      float64       `json:"total_fee"`
	DurationHours float64       `json:"duration_hours"`
	IsContinuous  bool          `json:"is_continuous"`
	BaseStartTime string        `json:"base_start_time"`
	Rate          float64       `json:"rate"`
}

// LongTermInfo represents long-term parking information
type LongTermInfo struct {
	Days int     `json:"days"`
	Fee  float64 `json:"fee"`
}

// RemainingInfo represents remaining hours information
type RemainingInfo struct {
	Total          float64 `json:"total"`
	BaseFee        float64 `json:"base_fee"`
	ExceedingHours int     `json:"exceeding_hours"`
	ExceedingFee   float64 `json:"exceeding_fee"`
	HourlyRate     float64 `json:"hourly_rate"`
}

// GetSessionResponse represents a response for getting a parking session
type GetSessionResponse struct {
	ParkingSlot   SlotInfo       `json:"parking_slot"`
	ExitedAt      *string        `json:"exited_at"`
	SessionID     string         `json:"session_id"`
	VehicleType   string         `json:"vehicle_type"`
	LicensePlate  string         `json:"license_plate"`
	EntryPoint    EntryPointInfo `json:"entry_point"`
	ParkedAt      string         `json:"parked_at"`
	IsActive      bool           `json:"is_active"`
	IsContinuous  bool           `json:"is_continuous"`
	DurationHours float64        `json:"duration_hours"`
	TotalFee      float64        `json:"total_fee"`
}

// RecentExitResponse represents a recent exit session for continuous parking selection
type RecentExitResponse struct {
	SessionID        string  `json:"session_id"`
	VehicleType      string  `json:"vehicle_type"`
	LicensePlate     string  `json:"license_plate"`
	SlotLabel        string  `json:"slot_label"`
	EntryPoint       string  `json:"entry_point"`
	ParkedAt         string  `json:"parked_at"`
	ExitedAt         string  `json:"exited_at"`
	MinutesSinceExit int     `json:"minutes_since_exit"`
	TotalFee         float64 `json:"total_fee"`
}

// AvailableSlotsResponse represents a response for available slots
type AvailableSlotsResponse struct {
	AvailableSlots []SlotWithDistance `json:"available_slots"`
	TotalAvailable int                `json:"total_available"`
}

// SlotWithDistance represents a slot with distance information
type SlotWithDistance struct {
	ID           string         `json:"id"`
	SlotLabel    string         `json:"slot_label"`
	SlotType     string         `json:"slot_type"`
	Distances    []int          `json:"distances"`
	DistancesMap map[string]int `json:"distances_map"`
	Available    bool           `json:"available"`
	CreatedAt    string         `json:"created_at"`
	UpdatedAt    string         `json:"updated_at"`
}

// EntryPointInfo represents entry point information
type EntryPointInfo struct {
	ID         int64  `json:"id"`
	Identifier string `json:"identifier"`
	Name       string `json:"name"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

// SuccessResponse represents a success response wrapper
type SuccessResponse struct {
	Data    interface{} `json:"data"`
	Success bool        `json:"success"`
}

// CreateSlotRequest represents a request to create a parking slot
type CreateSlotRequest struct {
	SlotLabel string `json:"slot_label" validate:"required"`
	SlotType  string `json:"slot_type" validate:"required,oneof=SP MP LP"`
	Distances []int  `json:"distances" validate:"required"`
}

// CreateSlotRequestWrapped represents a request to create a parking slot with wrapper (for Postman compatibility)
type CreateSlotRequestWrapped struct {
	Slot CreateSlotRequest `json:"parking_slot"`
}

// UpdateSlotRequest represents a request to update a parking slot
type UpdateSlotRequest struct {
	SlotLabel *string `json:"slot_label"`
	SlotType  *string `json:"slot_type" validate:"omitempty,oneof=SP MP LP"`
	Distances *[]int  `json:"distances"`
}

// UpdateSlotRequestWrapped represents a request to update a parking slot with wrapper (for Postman compatibility)
type UpdateSlotRequestWrapped struct {
	Slot *UpdateSlotRequest `json:"parking_slot"`
}

// CreateEntryPointRequest represents a request to create an entry point
type CreateEntryPointRequest struct {
	Identifier string `json:"identifier" validate:"required,len=1"`
	Name       string `json:"name" validate:"required"`
}

// UpdateEntryPointRequest represents a request to update an entry point
type UpdateEntryPointRequest struct {
	Identifier *string `json:"identifier" validate:"omitempty,len=1"`
	Name       *string `json:"name"`
}

// InitializeRequest represents a request to initialize parking system
type InitializeRequest struct {
	EntryPoints  []InitializeEntryPoint  `json:"entry_points" validate:"required"`
	ParkingSlots []InitializeParkingSlot `json:"parking_slots" validate:"required"`
}

// InitializeEntryPoint represents an entry point in initialize request
type InitializeEntryPoint struct {
	Identifier string `json:"identifier" validate:"required,len=1"`
	Name       string `json:"name" validate:"required"`
}

// InitializeParkingSlot represents a parking slot in initialize request
type InitializeParkingSlot struct {
	SlotLabel string `json:"slot_label" validate:"required"`
	SlotType  string `json:"slot_type" validate:"required,oneof=SP MP LP"`
	Distances []int  `json:"distances" validate:"required"`
}

// InitializeResponse represents a response for initializing the parking system
type InitializeResponse struct {
	EntryPointsCreated  int    `json:"entry_points_created"`
	ParkingSlotsCreated int    `json:"parking_slots_created"`
	Message             string `json:"message"`
}

// CreateEntryPointRequestWrapped represents a request to create an entry point with wrapper (for Postman compatibility)
type CreateEntryPointRequestWrapped struct {
	EntryPoint CreateEntryPointRequest `json:"entry_point"`
}

// UpdateEntryPointRequestWrapped represents a request to update an entry point with wrapper (for Postman compatibility)
type UpdateEntryPointRequestWrapped struct {
	EntryPoint UpdateEntryPointRequest `json:"entry_point"`
}

// VehicleInfo represents vehicle information
type VehicleInfo struct {
	ID               string                 `json:"id"`
	LicensePlate     string                 `json:"license_plate"`
	VehicleType      string                 `json:"vehicle_type"`
	Color            *string                `json:"color"`
	Brand            *string                `json:"brand"`
	Model            *string                `json:"model"`
	Year             *int                   `json:"year"`
	Metadata         map[string]interface{} `json:"metadata"`
	FirstSeenAt      string                 `json:"first_seen_at"`
	LastSeenAt       *string                `json:"last_seen_at"`
	TotalSessions    int                    `json:"total_sessions"`
	TotalSpent       float64                `json:"total_spent"`
	TotalHoursParked float64                `json:"total_hours_parked"`
	IsFrequent       bool                   `json:"is_frequent"`
	CreatedAt        string                 `json:"created_at"`
	UpdatedAt        string                 `json:"updated_at"`
}

// CreateVehicleRequest represents a request to create a vehicle
type CreateVehicleRequest struct {
	LicensePlate string                 `json:"license_plate" validate:"required"`
	VehicleType  string                 `json:"vehicle_type" validate:"required,oneof=S M L"`
	Color        *string                `json:"color"`
	Brand        *string                `json:"brand"`
	Model        *string                `json:"model"`
	Year         *int                   `json:"year"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// CreateVehicleRequestWrapped represents a request to create a vehicle with wrapper (for Postman compatibility)
type CreateVehicleRequestWrapped struct {
	Vehicle CreateVehicleRequest `json:"vehicle"`
}

// UpdateVehicleRequest represents a request to update a vehicle
type UpdateVehicleRequest struct {
	LicensePlate *string                `json:"license_plate"`
	VehicleType  *string                `json:"vehicle_type" validate:"omitempty,oneof=S M L"`
	Color        *string                `json:"color"`
	Brand        *string                `json:"brand"`
	Model        *string                `json:"model"`
	Year         *int                   `json:"year"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// UpdateVehicleRequestWrapped represents a request to update a vehicle with wrapper (for Postman compatibility)
type UpdateVehicleRequestWrapped struct {
	Vehicle *UpdateVehicleRequest `json:"vehicle"`
}

// PaginationMetadata represents pagination metadata for list responses
type PaginationMetadata struct {
	CurrentPage int `json:"page"` // Use "page" to match Newman test expectations
	PerPage     int `json:"per_page"`
	TotalPages  int `json:"total_pages"`
	TotalCount  int `json:"total"` // Use "total" to match Newman test expectations
}

// PaginatedResponse represents a paginated response with metadata
type PaginatedResponse struct {
	Success    bool               `json:"success"`
	Data       interface{}        `json:"data"`
	Pagination PaginationMetadata `json:"pagination"`
}

// BillingAuditLogInfo represents billing audit log information
type BillingAuditLogInfo struct {
	ID               int64               `json:"id"`
	ParkingSessionID int64               `json:"session_id"`
	VehicleType      string              `json:"vehicle_type"`
	SlotLabel        string              `json:"slot_label"`
	SlotType         string              `json:"slot_type"`
	EntryPoint       string              `json:"entry_point"`
	ParkedAt         string              `json:"parked_at"`
	ExitedAt         string              `json:"exited_at"`
	TotalFee         float64             `json:"total_fee"`
	BaseFee          float64             `json:"base_fee"`
	ExceedingFee     float64             `json:"exceeding_fee"`
	ExceedingHours   int                 `json:"exceeding_hours"`
	LongTermDays     int                 `json:"long_term_days"`
	LongTermFee      float64             `json:"long_term_fee"`
	DurationHours    float64             `json:"duration_hours"`
	IsContinuous     bool                `json:"is_continuous"`
	BaseStartTime    *string             `json:"base_start_time"`
	FeeBreakdown     BillingFeeBreakdown `json:"fee_breakdown"`
	CorrelationID    *string             `json:"correlation_id"`
	IdempotencyKey   *string             `json:"idempotency_key"`
	BillingVersion   string              `json:"billing_version"`
	CalculatedAt     string              `json:"calculated_at"`
	CreatedAt        string              `json:"created_at"`
	UpdatedAt        string              `json:"updated_at"`
}

// BillingFeeBreakdown represents the breakdown of parking fees for billing audit logs
type BillingFeeBreakdown struct {
	BaseFee       float64 `json:"base_fee"`
	ExceedingFee  float64 `json:"exceeding_fee"`
	LongTermFee   float64 `json:"long_term_fee"`
	TotalFee      float64 `json:"total_fee"`
	DurationHours float64 `json:"duration_hours"`
}

// KafkaEventInfo represents Kafka event information
type KafkaEventInfo struct {
	ID             string                 `json:"id"`
	EventType      string                 `json:"event_type"`
	Topic          string                 `json:"topic"`
	Partition      int                    `json:"partition"`
	Offset         *int64                 `json:"offset"`
	EventKey       *string                `json:"event_key"`
	EventPayload   map[string]interface{} `json:"payload"`
	CorrelationID  *string                `json:"correlation_id"`
	CausationID    *string                `json:"causation_id"`
	IdempotencyKey *string                `json:"idempotency_key"`
	EventID        string                 `json:"event_id"`
	OccurredAt     string                 `json:"occurred_at"`
	PublishedAt    *string                `json:"published_at"`
	Status         string                 `json:"status"`
	RetryCount     int                    `json:"retry_count"`
	ErrorMessage   *string                `json:"error_message"`
	Metadata       map[string]interface{} `json:"metadata"`
	CreatedAt      string                 `json:"created_at"`
	UpdatedAt      string                 `json:"updated_at"`
}

// UpdateSessionRequest represents a request to update a parking session
type UpdateSessionRequest struct {
	ExitedAt *string  `json:"exited_at"`
	TotalFee *float64 `json:"total_fee"`
}

// DistancesToMap converts a distances array to a key-value map based on entry point identifiers
// The distances array is indexed by entry point position in alphabetical order
// This function maps each entry point identifier to its corresponding distance value
func DistancesToMap(distances []int, entryPoints []*models.EntryPoint) map[string]int {
	result := make(map[string]int)
	for i, ep := range entryPoints {
		if i < len(distances) {
			result[ep.Identifier] = distances[i]
		} else {
			result[ep.Identifier] = 0 // Default distance for missing entries
		}
	}
	return result
}
