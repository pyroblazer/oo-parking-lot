// Package dtos provides data transfer objects for parking lot API.
package dtos

// ParkVehicleRequest represents a request to park a vehicle
type ParkVehicleRequest struct {
	VehicleType  string `json:"vehicle_type" validate:"required,oneof=S M L"`
	EntryPointID string `json:"entry_point_id" validate:"required"`
	ParkedAt     string `json:"parked_at"` // Optional parked_at for testing purposes
}

// ParkVehicleResponse represents a response after parking a vehicle
type ParkVehicleResponse struct {
	SessionID    string   `json:"session_id"`
	VehicleType  string   `json:"vehicle_type"`
	ParkingSlot  SlotInfo `json:"parking_slot"`
	EntryPoint   string   `json:"entry_point"`
	ParkedAt     string   `json:"parked_at"`
	IsActive     bool     `json:"is_active"`
	IsContinuous bool     `json:"is_continuous"`
	DurationHours float64 `json:"duration_hours"`
	TotalFee      float64 `json:"total_fee"`
}

// SlotInfo represents parking slot information
type SlotInfo struct {
	ID        string `json:"id"`
	SlotLabel string `json:"slot_label"`
	SlotType  string `json:"slot_type"`
	Distances []int  `json:"distances"`
}

// UnparkVehicleResponse represents a response after unparking a vehicle
type UnparkVehicleResponse struct {
	FeeBreakdown  FeeBreakdown `json:"fee_breakdown"`
	Breakdown     FeeBreakdown `json:"breakdown"`
	ParkingSlot   SlotInfo     `json:"parking_slot"`
	TotalFee      float64      `json:"total_fee"`
	DurationHours float64      `json:"duration_hours"`
	IsContinuous  bool         `json:"is_continuous"`
	SessionID     string       `json:"session_id"`
	VehicleType   string       `json:"vehicle_type"`
	EntryPoint    EntryPointInfo `json:"entry_point"`
	ParkedAt      string       `json:"parked_at"`
	ExitedAt      string       `json:"exited_at"`
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
	Total          float64       `json:"total"`
	BaseFee        float64       `json:"base_fee"`
	ExceedingHours int     `json:"exceeding_hours"`
	ExceedingFee   float64 `json:"exceeding_fee"`
	HourlyRate     float64 `json:"hourly_rate"`
}

// GetSessionResponse represents a response for getting a parking session
type GetSessionResponse struct {
	ParkingSlot  SlotInfo       `json:"parking_slot"`
	ExitedAt     *string        `json:"exited_at"`
	SessionID    string         `json:"session_id"`
	VehicleType  string         `json:"vehicle_type"`
	EntryPoint   EntryPointInfo `json:"entry_point"`
	ParkedAt     string         `json:"parked_at"`
	IsActive     bool           `json:"is_active"`
	IsContinuous bool           `json:"is_continuous"`
	DurationHours float64       `json:"duration_hours"`
	TotalFee      float64       `json:"total_fee"`
}

// AvailableSlotsResponse represents a response for available slots
type AvailableSlotsResponse struct {
	AvailableSlots []SlotWithDistance `json:"available_slots"`
	TotalAvailable int                `json:"total_available"`
}

// SlotWithDistance represents a slot with distance information
type SlotWithDistance struct {
	ID        string `json:"id"`
	SlotLabel string `json:"slot_label"`
	SlotType  string `json:"slot_type"`
	Distances []int  `json:"distances"`
	Available bool   `json:"available"`
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
	Distances []int  `json:"distances" validate:"required,min=3"`
}

// UpdateSlotRequest represents a request to update a parking slot
type UpdateSlotRequest struct {
	SlotLabel *string `json:"slot_label"`
	SlotType  *string `json:"slot_type" validate:"omitempty,oneof=SP MP LP"`
	Distances *[]int  `json:"distances" validate:"omitempty,min=3"`
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
	Distances []int  `json:"distances" validate:"required,min=3"`
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
