// Package services provides business logic for parking lot operations.
package services

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

var (
	// ErrEntryPointNotFound is returned when an entry point cannot be found
	ErrEntryPointNotFound = errors.New("entry point not found")
	// ErrInvalidVehicleType is returned when an invalid vehicle type is provided
	ErrInvalidVehicleType = errors.New("invalid vehicle type")
	// ErrNoAvailableSlot is returned when no parking slot is available
	ErrNoAvailableSlot = errors.New("no available parking slot")
	// ErrSessionNotFound is returned when a parking session cannot be found
	ErrSessionNotFound = errors.New("parking session not found")
	// ErrVehicleAlreadyUnparked is returned when a vehicle is already unparked
	ErrVehicleAlreadyUnparked = errors.New("vehicle already unparked")
)

// ParkingService handles parking operations
type ParkingService struct {
	entryPointRepo  EntryPointRepository
	parkingSlotRepo ParkingSlotRepository
	sessionRepo     ParkingSessionRepository
}

// NewParkingService creates a new parking service
func NewParkingService(
	entryPointRepo EntryPointRepository,
	parkingSlotRepo ParkingSlotRepository,
	sessionRepo ParkingSessionRepository,
) *ParkingService {
	return &ParkingService{
		entryPointRepo:  entryPointRepo,
		parkingSlotRepo: parkingSlotRepo,
		sessionRepo:     sessionRepo,
	}
}

// ParkVehicle parks a vehicle at closest available slot
func (ps *ParkingService) ParkVehicle(vehicleType, entryPointID string, parkedAt *time.Time) (*models.ParkingSession, error) {
	// Validate vehicle type
	if vehicleType != "S" && vehicleType != "M" && vehicleType != "L" {
		return nil, ErrInvalidVehicleType
	}

	// Get entry point
	entryPoint, err := ps.entryPointRepo.GetByIDentifier(entryPointID)
	if err != nil {
		return nil, ErrEntryPointNotFound
	}

	// Find closest available slot
	slot, err := ps.findClosestAvailableSlot(vehicleType, entryPoint)
	if err != nil {
		return nil, err
	}

	// Use provided parked_at if available, otherwise use current time in UTC
	var parkTime time.Time
	if parkedAt != nil {
		parkTime = *parkedAt
	} else {
		parkTime = time.Now().UTC()
	}

	// Create parking session - use UTC time to avoid timezone issues
	session := &models.ParkingSession{
		VehicleType:   vehicleType,
		ParkingSlotID: slot.ID,
		EntryPointID:  entryPoint.ID,
		ParkedAt:      parkTime,
		TotalFee:      0,
	}

	createdSession, err := ps.sessionRepo.Create(session)
	if err != nil {
		return nil, fmt.Errorf("failed to create parking session: %w", err)
	}

	// Update slot availability to false
	// Create a new slot reference to avoid modifying the original slot struct
	slotToUpdate := &models.ParkingSlot{
		ID:        slot.ID,
		SlotLabel: slot.SlotLabel,
		SlotType:  slot.SlotType,
		Distances: slot.Distances,
		CreatedAt: slot.CreatedAt,
		UpdatedAt: parkTime,
		Available: false,
	}
	if err := ps.parkingSlotRepo.Update(slotToUpdate); err != nil {
		return nil, fmt.Errorf("failed to update parking slot availability: %w", err)
	}

	// Check for continuous parking (same vehicle type within 1 hour)
	previousSessions, err := ps.sessionRepo.GetPreviousSessions(vehicleType, parkTime)
	if err != nil {
		// Log error but don't fail the request
		// This is a nice-to-have feature
		previousSessions = []*models.ParkingSession{}
	}

	// Load associated models for response
	createdSession.ParkingSlot = slot
	createdSession.EntryPoint = entryPoint

	// Store is_continuous flag in session for later retrieval
	// We'll use a custom field or calculate it in the handler
	_ = createdSession.IsContinuous(previousSessions)

	return createdSession, nil
}

// UnparkVehicle unparks a vehicle and calculates fee
func (ps *ParkingService) UnparkVehicle(sessionID string, exitedAt *time.Time) (*dtos.UnparkVehicleResponse, error) {
	// Parse session ID
	id, err := strconv.ParseInt(sessionID, 10, 64)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	// Get session
	session, err := ps.sessionRepo.GetByID(id)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	// Check if already unparked
	if !session.Active() {
		return nil, ErrVehicleAlreadyUnparked
	}

	// Load associated models
	slot, err := ps.parkingSlotRepo.GetByID(session.ParkingSlotID)
	if err != nil {
		return nil, fmt.Errorf("failed to load parking slot: %w", err)
	}
	session.ParkingSlot = slot

	entryPoint, err := ps.entryPointRepo.GetByID(session.EntryPointID)
	if err != nil {
		return nil, fmt.Errorf("failed to load entry point: %w", err)
	}
	session.EntryPoint = entryPoint

	// Check for continuous parking
	previousSessions, err := ps.sessionRepo.GetPreviousSessions(session.VehicleType, session.ParkedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to check continuous parking: %w", err)
	}

	// Update exit time - use provided exitedAt for testing purposes, otherwise use current time
	if exitedAt != nil {
		session.ExitedAt = exitedAt
	} else {
		now := time.Now().UTC()
		session.ExitedAt = &now
	}

	// Calculate fee
	calculator := NewFeeCalculator(session)
	calculator.SetPreviousSessions(previousSessions)
	// Set exited_at for testing purposes if provided
	if exitedAt != nil {
		calculator.SetExitedAt(exitedAt)
	}
	fee := calculator.Calculate()
	breakdown := calculator.Breakdown()

	// Update session
	session.TotalFee = fee
	err = ps.sessionRepo.Update(session)
	if err != nil {
		return nil, fmt.Errorf("failed to update parking session: %w", err)
	}

	// Update slot availability back to true
	// Use UpdateAvailability to only update the available field
	if err := ps.parkingSlotRepo.UpdateAvailability(session.ParkingSlot.ID, true); err != nil {
		return nil, fmt.Errorf("failed to update parking slot availability: %w", err)
	}

	// Build response - format times in UTC to avoid timezone issues
	exitedAtStr := session.ExitedAt.UTC().Format(time.RFC3339)

	return &dtos.UnparkVehicleResponse{
		SessionID:   fmt.Sprintf("%d", session.ID),
		VehicleType: session.VehicleType,
		ParkingSlot: dtos.SlotInfo{
			ID:        fmt.Sprintf("%d", slot.ID),
			SlotLabel: slot.SlotLabel,
			SlotType:  string(slot.SlotType),
		},
		EntryPoint: dtos.EntryPointInfo{
			ID:         entryPoint.ID,
			Identifier: entryPoint.Identifier,
			Name:       entryPoint.Name,
			CreatedAt:  entryPoint.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:  entryPoint.UpdatedAt.UTC().Format(time.RFC3339),
		},
		ParkedAt:      session.ParkedAt.UTC().Format(time.RFC3339),
		ExitedAt:      exitedAtStr,
		DurationHours: breakdown.DurationHours,
		TotalFee:      fee,
		FeeBreakdown:  breakdown,
		Breakdown:     breakdown,
		IsContinuous:  breakdown.IsContinuous,
	}, nil
}

// AvailableSlots returns available slots for a vehicle type from an entry point
// Returns only exact slot type matches (S→SP, M→MP, L→LP)
func (ps *ParkingService) AvailableSlots(vehicleType, entryPointID string) ([]*models.ParkingSlot, error) {
	// Validate vehicle type
	if vehicleType != "S" && vehicleType != "M" && vehicleType != "L" {
		return nil, ErrInvalidVehicleType
	}

	// Get entry point
	entryPoint, err := ps.entryPointRepo.GetByIDentifier(entryPointID)
	if err != nil {
		return nil, ErrEntryPointNotFound
	}

	// Get all available slots
	slots, err := ps.parkingSlotRepo.GetAvailable()
	if err != nil {
		return nil, fmt.Errorf("failed to get available slots: %w", err)
	}

	// Filter by exact slot type match (S→SP, M→MP, L→LP)
	var exactSlotType models.SlotType
	switch vehicleType {
	case "S":
		exactSlotType = models.SlotTypeSmall
	case "M":
		exactSlotType = models.SlotTypeMedium
	case "L":
		exactSlotType = models.SlotTypeLarge
	}

	var compatibleSlots []*models.ParkingSlot
	for _, slot := range slots {
		if slot.SlotType == exactSlotType {
			compatibleSlots = append(compatibleSlots, slot)
		}
	}

	// Sort by distance from entry point
	sort.Slice(compatibleSlots, func(i, j int) bool {
		distI := compatibleSlots[i].DistanceFrom(entryPoint)
		distJ := compatibleSlots[j].DistanceFrom(entryPoint)
		if distI == distJ {
			return compatibleSlots[i].SlotLabel < compatibleSlots[j].SlotLabel
		}
		return distI < distJ
	})

	return compatibleSlots, nil
}

// findClosestAvailableSlot finds closest available slot for a vehicle type
func (ps *ParkingService) findClosestAvailableSlot(vehicleType string, entryPoint *models.EntryPoint) (*models.ParkingSlot, error) {
	// Get all available slots
	slots, err := ps.parkingSlotRepo.GetAvailable()
	if err != nil {
		return nil, fmt.Errorf("failed to get available slots: %w", err)
	}

	// Filter by vehicle compatibility
	var compatibleSlots []*models.ParkingSlot
	for _, slot := range slots {
		if slot.CompatibleWith(vehicleType) {
			compatibleSlots = append(compatibleSlots, slot)
		}
	}

	// Sort by slot type preference, then by distance from entry point
	// Preference: S→SP, M→MP, L→LP (matching slot types first)
	sort.Slice(compatibleSlots, func(i, j int) bool {
		// Determine slot type preference for each slot
		getPreference := func(slot *models.ParkingSlot) int {
			switch vehicleType {
			case "S":
				// Prefer SP (Small Parking) for small vehicles
				if slot.SlotType == models.SlotTypeSmall {
					return 0
				}
				if slot.SlotType == models.SlotTypeMedium {
					return 1
				}
				return 2 // LP is least preferred
			case "M":
				// Prefer MP (Medium Parking) for medium vehicles
				if slot.SlotType == models.SlotTypeMedium {
					return 0
				}
				return 1 // LP is less preferred
			case "L":
				// Only LP (Large Parking) for large vehicles
				return 0
			default:
				return 3
			}
		}

		prefI := getPreference(compatibleSlots[i])
		prefJ := getPreference(compatibleSlots[j])

		// Primary sort by preference (lower is better)
		if prefI != prefJ {
			return prefI < prefJ
		}

		// Secondary sort by distance from entry point
		distI := compatibleSlots[i].DistanceFrom(entryPoint)
		distJ := compatibleSlots[j].DistanceFrom(entryPoint)
		if distI == distJ {
			return compatibleSlots[i].SlotLabel < compatibleSlots[j].SlotLabel
		}
		return distI < distJ
	})

	// Check if any compatible slot is available
	if len(compatibleSlots) == 0 {
		return nil, ErrNoAvailableSlot
	}

	return compatibleSlots[0], nil
}

// EntryPointRepository defines interface for entry point data operations
type EntryPointRepository interface {
	GetByIDentifier(identifier string) (*models.EntryPoint, error)
	GetByID(id int64) (*models.EntryPoint, error)
	List() ([]*models.EntryPoint, error)
	Create(ep *models.EntryPoint) (*models.EntryPoint, error)
	Update(ep *models.EntryPoint) error
	Delete(id int64) error
	FindOrCreate(identifier, name string) (*models.EntryPoint, error)
}

// ParkingSlotRepository defines interface for parking slot data operations
type ParkingSlotRepository interface {
	GetByID(id int64) (*models.ParkingSlot, error)
	GetAvailable() ([]*models.ParkingSlot, error)
	List() ([]*models.ParkingSlot, error)
	Create(slot *models.ParkingSlot) (*models.ParkingSlot, error)
	Update(slot *models.ParkingSlot) error
	UpdateAvailability(id int64, available bool) error
	Delete(id int64) error
	GetBySlotLabel(slotLabel string) (*models.ParkingSlot, error)
	ResetAllSlotsAvailability() error
}

// ParkingSessionRepository defines interface for parking session data operations
type ParkingSessionRepository interface {
	Create(session *models.ParkingSession) (*models.ParkingSession, error)
	GetByID(id int64) (*models.ParkingSession, error)
	Update(session *models.ParkingSession) error
	GetPreviousSessions(vehicleType string, since time.Time) ([]*models.ParkingSession, error)
	List() ([]*models.ParkingSession, error)
	ListPaginated(page, perPage int) ([]*models.ParkingSession, error)
	Delete(id int64) error
	DeleteActiveSessions() error
}

// ListSessions retrieves all parking sessions
func (ps *ParkingService) ListSessions() ([]*models.ParkingSession, error) {
	sessions, err := ps.sessionRepo.List()
	if err != nil {
		return nil, err
	}

	// Load associated models
	for _, session := range sessions {
		slot, err := ps.parkingSlotRepo.GetByID(session.ParkingSlotID)
		if err == nil {
			session.ParkingSlot = slot
		}

		entryPoint, err := ps.entryPointRepo.GetByID(session.EntryPointID)
		if err == nil {
			session.EntryPoint = entryPoint
		}
	}

	return sessions, nil
}

// ListSessionsPaginated retrieves parking sessions with pagination
func (ps *ParkingService) ListSessionsPaginated(page, perPage int) ([]*models.ParkingSession, error) {
	sessions, err := ps.sessionRepo.ListPaginated(page, perPage)
	if err != nil {
		return nil, err
	}

	// Load associated models
	for _, session := range sessions {
		slot, err := ps.parkingSlotRepo.GetByID(session.ParkingSlotID)
		if err == nil {
			session.ParkingSlot = slot
		}

		entryPoint, err := ps.entryPointRepo.GetByID(session.EntryPointID)
		if err == nil {
			session.EntryPoint = entryPoint
		}
	}

	return sessions, nil
}

// ListSlots retrieves all parking slots
func (ps *ParkingService) ListSlots() ([]*models.ParkingSlot, error) {
	return ps.parkingSlotRepo.List()
}

// ListEntryPoints retrieves all entry points
func (ps *ParkingService) ListEntryPoints() ([]*models.EntryPoint, error) {
	return ps.entryPointRepo.List()
}

// GetSession retrieves a parking session by ID
func (ps *ParkingService) GetSession(sessionID int64) (*models.ParkingSession, error) {
	session, err := ps.sessionRepo.GetByID(sessionID)
	if err != nil {
		return nil, err
	}

	// Load associated models
	slot, err := ps.parkingSlotRepo.GetByID(session.ParkingSlotID)
	if err != nil {
		return nil, fmt.Errorf("failed to load parking slot: %w", err)
	}
	session.ParkingSlot = slot

	entryPoint, err := ps.entryPointRepo.GetByID(session.EntryPointID)
	if err != nil {
		return nil, fmt.Errorf("failed to load entry point: %w", err)
	}

	session.EntryPoint = entryPoint

	return session, nil
}

// CreateSlot creates a new parking slot
func (ps *ParkingService) CreateSlot(req *dtos.CreateSlotRequest) (*models.ParkingSlot, error) {
	slot := &models.ParkingSlot{
		SlotLabel: req.SlotLabel,
		SlotType:  models.SlotType(req.SlotType),
		Distances: req.Distances,
	}

	return ps.parkingSlotRepo.Create(slot)
}

// UpdateSlot updates an existing parking slot
func (ps *ParkingService) UpdateSlot(id int64, req *dtos.UpdateSlotRequest) (*models.ParkingSlot, error) {
	// Get existing slot
	slot, err := ps.parkingSlotRepo.GetByID(id)
	if err != nil {
		return nil, errors.New("parking slot not found")
	}

	// Update fields if provided
	if req.SlotLabel != nil {
		slot.SlotLabel = *req.SlotLabel
	}
	if req.SlotType != nil {
		slot.SlotType = models.SlotType(*req.SlotType)
	}
	if req.Distances != nil {
		slot.Distances = *req.Distances
	}

	if err := ps.parkingSlotRepo.Update(slot); err != nil {
		return nil, err
	}

	return slot, nil
}

// DeleteSlot deletes a parking slot
func (ps *ParkingService) DeleteSlot(id int64) error {
	return ps.parkingSlotRepo.Delete(id)
}

// CreateEntryPoint creates a new entry point (idempotent - finds or creates)
func (ps *ParkingService) CreateEntryPoint(req *dtos.CreateEntryPointRequest) (*models.EntryPoint, error) {
	// Use FindOrCreate to make the operation idempotent like Ruby backend
	return ps.entryPointRepo.FindOrCreate(req.Identifier, req.Name)
}

// UpdateEntryPoint updates an existing entry point
func (ps *ParkingService) UpdateEntryPoint(id int64, req *dtos.UpdateEntryPointRequest) (*models.EntryPoint, error) {
	// Get existing entry point
	ep, err := ps.entryPointRepo.GetByID(id)
	if err != nil {
		return nil, errors.New("entry point not found")
	}

	// Update fields if provided
	if req.Identifier != nil {
		ep.Identifier = *req.Identifier
	}
	if req.Name != nil {
		ep.Name = *req.Name
	}

	if err := ps.entryPointRepo.Update(ep); err != nil {
		return nil, err
	}

	return ep, nil
}

// DeleteEntryPoint deletes an entry point (idempotent - always returns success)
func (ps *ParkingService) DeleteEntryPoint(id int64) error {
	// Always return success for idempotency (like Ruby backend)
	// Even if record doesn't exist, consider the operation successful
	_ = ps.entryPointRepo.Delete(id)
	return nil
}

// DeleteSession deletes a parking session
func (ps *ParkingService) DeleteSession(id int64) error {
	return ps.sessionRepo.Delete(id)
}

// GetPreviousSessions gets previous sessions for continuous parking check
func (ps *ParkingService) GetPreviousSessions(vehicleType string, since time.Time) ([]*models.ParkingSession, error) {
	return ps.sessionRepo.GetPreviousSessions(vehicleType, since)
}

// InitializeSystem initializes parking system with entry points and parking slots
func (ps *ParkingService) InitializeSystem(req *dtos.InitializeRequest) (*dtos.InitializeResponse, error) {
	entryPointsCreated := 0
	parkingSlotsCreated := 0

	// Clear any existing active parking sessions to allow reinitialization
	// This makes the endpoint idempotent like the Ruby backend
	if err := ps.sessionRepo.DeleteActiveSessions(); err != nil {
		return nil, fmt.Errorf("failed to delete active parking sessions: %w", err)
	}

	// Reset all parking slots to available status
	if err := ps.parkingSlotRepo.ResetAllSlotsAvailability(); err != nil {
		return nil, fmt.Errorf("failed to reset parking slots availability: %w", err)
	}

	// Create or update entry points (find or create, count all as created)
	for _, epReq := range req.EntryPoints {
		// Try to find existing entry point by identifier
		existingEP, err := ps.entryPointRepo.GetByIDentifier(epReq.Identifier)
		if err != nil {
			// If error is "no rows", proceed to create entry point
			// Otherwise, return the error
			if err != sql.ErrNoRows {
				return nil, fmt.Errorf("failed to check entry point: %w", err)
			}
		}

		if existingEP != nil {
			// Entry point exists, update it
			existingEP.Name = epReq.Name
			if err := ps.entryPointRepo.Update(existingEP); err != nil {
				return nil, fmt.Errorf("failed to update entry point: %w", err)
			}
		} else {
			// Entry point doesn't exist, create it
			newEP := &models.EntryPoint{
				Identifier: epReq.Identifier,
				Name:       epReq.Name,
			}
			_, err := ps.entryPointRepo.Create(newEP)
			if err != nil {
				return nil, fmt.Errorf("failed to create entry point: %w", err)
			}
		}
		// Count all entry points as "created" (new or updated)
		entryPointsCreated++
	}

	// Create or update parking slots (find or create, count all as created)
	for _, slotReq := range req.ParkingSlots {
		// Try to find existing parking slot by slot label
		existingSlot, err := ps.parkingSlotRepo.GetBySlotLabel(slotReq.SlotLabel)
		if err != nil {
			// If error is "no rows", proceed to create parking slot
			// Otherwise, return the error
			if err != sql.ErrNoRows {
				return nil, fmt.Errorf("failed to check parking slot: %w", err)
			}
		}

		if existingSlot != nil {
			// Parking slot exists, update it
			existingSlot.SlotType = models.SlotType(slotReq.SlotType)
			existingSlot.Distances = slotReq.Distances
			if err := ps.parkingSlotRepo.Update(existingSlot); err != nil {
				return nil, fmt.Errorf("failed to update parking slot: %w", err)
			}
		} else {
			// Parking slot doesn't exist, create it
			newSlot := &models.ParkingSlot{
				SlotLabel: slotReq.SlotLabel,
				SlotType:  models.SlotType(slotReq.SlotType),
				Distances: slotReq.Distances,
			}
			_, err := ps.parkingSlotRepo.Create(newSlot)
			if err != nil {
				return nil, fmt.Errorf("failed to create parking slot: %w", err)
			}
		}
		// Count all parking slots as "created" (new or updated)
		parkingSlotsCreated++
	}

	return &dtos.InitializeResponse{
		EntryPointsCreated:  entryPointsCreated,
		ParkingSlotsCreated: parkingSlotsCreated,
		Message:             "System initialized successfully",
	}, nil
}
