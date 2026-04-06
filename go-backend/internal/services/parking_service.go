// Package services provides business logic for parking lot operations.
package services

import (
	"database/sql"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
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
	entryPointRepo      EntryPointRepository
	parkingSlotRepo     ParkingSlotRepository
	sessionRepo         ParkingSessionRepository
	vehicleRepo         VehicleRepository
	billingAuditLogRepo BillingAuditLogRepository
	kafkaEventRepo      KafkaEventRepository
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

// NewParkingServiceWithFullRepos creates a new parking service with all repositories
func NewParkingServiceWithFullRepos(
	entryPointRepo EntryPointRepository,
	parkingSlotRepo ParkingSlotRepository,
	sessionRepo ParkingSessionRepository,
	vehicleRepo VehicleRepository,
	billingAuditLogRepo BillingAuditLogRepository,
	kafkaEventRepo KafkaEventRepository,
) *ParkingService {
	return &ParkingService{
		entryPointRepo:      entryPointRepo,
		parkingSlotRepo:     parkingSlotRepo,
		sessionRepo:         sessionRepo,
		vehicleRepo:         vehicleRepo,
		billingAuditLogRepo: billingAuditLogRepo,
		kafkaEventRepo:      kafkaEventRepo,
	}
}

// ParkVehicle parks a vehicle at closest available slot
// previousSessionID is optional - if provided, validates continuous parking eligibility
// licensePlate is optional - vehicle identifier, used for continuous parking matching
func (ps *ParkingService) ParkVehicle(vehicleType, entryPointID, previousSessionID, licensePlate string, parkedAt *time.Time) (*models.ParkingSession, error) {
	// Validate vehicle type
	if vehicleType != "S" && vehicleType != "M" && vehicleType != "L" {
		return nil, ErrInvalidVehicleType
	}

	// Get entry point
	entryPoint, err := ps.entryPointRepo.GetByIDentifier(entryPointID)
	if err != nil {
		return nil, ErrEntryPointNotFound
	}

	// Map vehicle types to exact slot types for precise matching (matching Ruby backend)
	slotTypeMap := map[string]models.SlotType{
		"S": models.SlotTypeSmall,
		"M": models.SlotTypeMedium,
		"L": models.SlotTypeLarge,
	}
	exactSlotType := slotTypeMap[vehicleType]

	// Use provided parked_at if available, otherwise use current time in UTC
	var parkTime time.Time
	if parkedAt != nil {
		parkTime = *parkedAt
	} else {
		parkTime = time.Now().UTC()
	}

	// Begin transaction to ensure atomic slot assignment
	tx, err := ps.parkingSlotRepo.DB().Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p) // Re-panic after rollback
		}
	}()

	// Find and lock the closest available slot within transaction
	// This prevents race conditions where multiple goroutines could select the same slot
	slot, err := ps.parkingSlotRepo.FindAndLockAvailableSlot(tx, exactSlotType, entryPoint)
	if err != nil {
		_ = tx.Rollback()
		// Convert repository error to service error for consistent error handling
		// Use errors.Is() to properly check for ErrNoAvailableSlot
		if errors.Is(err, repositories.ErrNoAvailableSlot) {
			return nil, ErrNoAvailableSlot
		}
		return nil, err
	}

	// Create parking session within transaction - use UTC time to avoid timezone issues
	var licensePlatePtr *string
	if licensePlate != "" {
		licensePlatePtr = &licensePlate
	}

	session := &models.ParkingSession{
		VehicleType:   vehicleType,
		ParkingSlotID: slot.ID,
		EntryPointID:  entryPoint.ID,
		ParkedAt:      parkTime,
		LicensePlate:  licensePlatePtr,
		TotalFee:      0,
	}

	createdSession, err := ps.sessionRepo.Create(session)
	if err != nil {
		_ = tx.Rollback()
		return nil, fmt.Errorf("failed to create parking session: %w", err)
	}

	// Note: Slot availability is already updated atomically by FindAndLockAvailableSlot
	// No need to update it again here

	// Commit transaction - all operations succeed or fail together
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Validate previous session if provided (for explicit continuous parking)
	if previousSessionID != "" {
		if err := ps.ValidatePreviousSession(vehicleType, previousSessionID, licensePlate, parkTime); err != nil {
			return nil, fmt.Errorf("invalid previous session: %w", err)
		}
	}

	// Create Kafka event for vehicle.parked (non-blocking)
	if ps.kafkaEventRepo != nil {
		go func() {
			correlationID := uuid.New().String()
			idempotencyKey := fmt.Sprintf("park:%d", createdSession.ID)
			now := time.Now().UTC()
			kafkaOffset := int64(0)
			_, err := ps.kafkaEventRepo.Create(&models.KafkaEvent{
				ID:          uuid.New().String(),
				EventType:   models.EventTypeVehicleParked,
				Topic:       models.TopicMap[models.EventTypeVehicleParked],
				KafkaOffset: &kafkaOffset,
				EventPayload: models.EventPayload{
					"session_id":   fmt.Sprintf("%d", createdSession.ID),
					"vehicle_type": vehicleType,
					"slot_id":      fmt.Sprintf("%d", slot.ID),
					"slot_label":   slot.SlotLabel,
					"slot_type":    string(slot.SlotType),
					"entry_point":  entryPoint.Identifier,
					"parked_at":    parkTime.UTC().Format(time.RFC3339),
				},
				CorrelationID:  &correlationID,
				IdempotencyKey: &idempotencyKey,
				EventID:        uuid.New().String(),
				OccurredAt:     now,
				Status:         "pending",
				RetryCount:     0,
				Metadata:       models.EventMetadata{"source": "go-backend"},
				CreatedAt:      now,
				UpdatedAt:      now,
			})
			if err != nil {
				fmt.Printf("ERROR: Failed to create vehicle.parked Kafka event: %v\n", err)
			}
		}()
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
// Uses atomic conditional UPDATE to prevent double-unpark race conditions.
func (ps *ParkingService) UnparkVehicle(sessionID string, exitedAt *time.Time) (*dtos.UnparkVehicleResponse, error) {
	// Parse session ID
	id, err := strconv.ParseInt(sessionID, 10, 64)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	// Get session (read-only, no race risk)
	session, err := ps.sessionRepo.GetByID(id)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	// Quick check before doing expensive calculations
	if !session.Active() {
		return nil, ErrVehicleAlreadyUnparked
	}

	// Load associated models (read-only, no race risk)
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

	// Check for continuous parking (read-only)
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

	// Atomic update: only if session is still active (exited_at IS NULL) will this succeed.
	// This prevents double-unpark race conditions.
	ok, err := ps.sessionRepo.AtomicUnpark(session.ID, *session.ExitedAt, fee, session.ParkingSlotID)
	if err != nil {
		return nil, fmt.Errorf("failed to atomic unpark: %w", err)
	}
	if !ok {
		// Session was already unparked by another request
		return nil, ErrVehicleAlreadyUnparked
	}

	// Create billing audit log and Kafka events (non-blocking)
	if ps.billingAuditLogRepo != nil && ps.kafkaEventRepo != nil {
		go func() {
			sessionID := session.ID
			vehicleType := session.VehicleType
			slotLabel := slot.SlotLabel
			slotType := string(slot.SlotType)
			epIdentifier := entryPoint.Identifier
			parkedAt := session.ParkedAt
			exitedAt := *session.ExitedAt
			totalFee := fee
			isContinuous := breakdown.IsContinuous
			durationHours := breakdown.DurationHours

			// Create billing audit log
			kafkaOffset := int64(0)
			correlationID := uuid.New().String()
			auditIdempotencyKey := fmt.Sprintf("audit:%d", sessionID)
			auditLog := &models.BillingAuditLog{
				ParkingSessionID: sessionID,
				VehicleType:      vehicleType,
				SlotLabel:        slotLabel,
				SlotType:         slotType,
				EntryPoint:       epIdentifier,
				ParkedAt:         parkedAt,
				ExitedAt:         exitedAt,
				TotalFee:         totalFee,
				BaseFee:          breakdown.Remaining.BaseFee,
				ExceedingFee:     breakdown.Remaining.ExceedingFee,
				ExceedingHours:   breakdown.Remaining.ExceedingHours,
				LongTermDays:     breakdown.LongTerm.Days,
				LongTermFee:      breakdown.LongTerm.Fee,
				DurationHours:    durationHours,
				IsContinuous:     isContinuous,
				FeeBreakdown: models.FeeBreakdown{
					BaseFee:       breakdown.Remaining.BaseFee,
					ExceedingFee:  breakdown.Remaining.ExceedingFee,
					LongTermFee:   breakdown.LongTerm.Fee,
					TotalFee:      totalFee,
					DurationHours: durationHours,
				},
				CorrelationID:  &correlationID,
				IdempotencyKey: &auditIdempotencyKey,
				BillingVersion: "v1",
			}
			_, err := ps.billingAuditLogRepo.Create(auditLog)
			if err != nil {
				fmt.Printf("ERROR: Failed to create billing audit log for session %d: %v\n", sessionID, err)
			}

			// Create vehicle.unparked Kafka event
			unparkCorrelationID := uuid.New().String()
			unparkIdempotencyKey := fmt.Sprintf("unpark:%d", sessionID)
			now := time.Now().UTC()
			_, err = ps.kafkaEventRepo.Create(&models.KafkaEvent{
				ID:          uuid.New().String(),
				EventType:   models.EventTypeVehicleUnparked,
				Topic:       models.TopicMap[models.EventTypeVehicleUnparked],
				KafkaOffset: &kafkaOffset,
				EventPayload: models.EventPayload{
					"session_id":    fmt.Sprintf("%d", sessionID),
					"vehicle_type":  vehicleType,
					"slot_label":    slotLabel,
					"entry_point":   epIdentifier,
					"total_fee":     totalFee,
					"duration_hours": durationHours,
					"is_continuous": isContinuous,
				},
				CorrelationID:  &unparkCorrelationID,
				IdempotencyKey: &unparkIdempotencyKey,
				EventID:        uuid.New().String(),
				OccurredAt:     now,
				Status:         "pending",
				RetryCount:     0,
				Metadata:       models.EventMetadata{"source": "go-backend"},
				CreatedAt:      now,
				UpdatedAt:      now,
			})
			if err != nil {
				fmt.Printf("ERROR: Failed to create vehicle.unparked Kafka event: %v\n", err)
			}

			// Create billing.completed Kafka event
			billingCorrelationID := uuid.New().String()
			billingIdempotencyKey := fmt.Sprintf("billing:%d", sessionID)
			_, err = ps.kafkaEventRepo.Create(&models.KafkaEvent{
				ID:          uuid.New().String(),
				EventType:   models.EventTypeBillingCompleted,
				Topic:       models.TopicMap[models.EventTypeBillingCompleted],
				KafkaOffset: &kafkaOffset,
				EventPayload: models.EventPayload{
					"session_id":     fmt.Sprintf("%d", sessionID),
					"vehicle_type":   vehicleType,
					"slot_label":     slotLabel,
					"total_fee":      totalFee,
					"duration_hours": durationHours,
					"is_continuous":  isContinuous,
				},
				CorrelationID:  &billingCorrelationID,
				IdempotencyKey: &billingIdempotencyKey,
				EventID:        uuid.New().String(),
				OccurredAt:     now,
				Status:         "pending",
				RetryCount:     0,
				Metadata:       models.EventMetadata{"source": "go-backend"},
				CreatedAt:      now,
				UpdatedAt:      now,
			})
			if err != nil {
				fmt.Printf("ERROR: Failed to create billing.completed Kafka event: %v\n", err)
			}
		}()
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
// Uses exact matching: S→SP, M→MP, L→LP (matching Rails backend behavior)
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

	// Map vehicle types to exact slot types for precise matching (matching Rails backend)
	slotTypeMap := map[string]models.SlotType{
		"S": models.SlotTypeSmall,
		"M": models.SlotTypeMedium,
		"L": models.SlotTypeLarge,
	}
	exactSlotType := slotTypeMap[vehicleType]

	// Filter by exact slot type (matching Rails backend behavior)
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

// EntryPointRepository defines interface for entry point data operations
type EntryPointRepository interface {
	GetByIDentifier(identifier string) (*models.EntryPoint, error)
	GetByID(id int64) (*models.EntryPoint, error)
	List() ([]*models.EntryPoint, error)
	Create(ep *models.EntryPoint) (*models.EntryPoint, error)
	Update(ep *models.EntryPoint) error
	Delete(id int64) error
	FindOrCreate(identifier, name string) (*models.EntryPoint, error)
	DeleteAll() error
	DB() *sql.DB
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
	DeleteAll() error
	BackfillDistancesForNewEntryPoint(identifier string, defaultDistance int) error
	DB() *sql.DB
	FindAndLockAvailableSlot(tx *sql.Tx, slotType models.SlotType, entryPoint *models.EntryPoint) (*models.ParkingSlot, error)
	UpdateWithTx(tx *sql.Tx, slot *models.ParkingSlot) error
}

// ParkingSessionRepository defines interface for parking session data operations
type ParkingSessionRepository interface {
	Create(session *models.ParkingSession) (*models.ParkingSession, error)
	GetByID(id int64) (*models.ParkingSession, error)
	Update(session *models.ParkingSession) error
	AtomicUnpark(sessionID int64, exitedAt time.Time, totalFee float64, slotID int64) (bool, error)
	GetPreviousSessions(vehicleType string, since time.Time) ([]*models.ParkingSession, error)
	GetActiveSessionsBySlotID(slotID int64) ([]*models.ParkingSession, error)
	List() ([]*models.ParkingSession, error)
	ListPaginated(page, perPage int) ([]*models.ParkingSession, error)
	Count() (int, error)
	Delete(id int64) error
	DeleteActiveSessions() error
	DeleteAllSessions() error
	DB() *sql.DB
}

// VehicleRepository defines interface for vehicle data operations
type VehicleRepository interface {
	GetByID(id string) (*models.Vehicle, error)
	GetByLicensePlate(licensePlate string) (*models.Vehicle, error)
	List(page, perPage int) ([]*models.Vehicle, error)
	Count() (int, error)
	Create(vehicle *models.Vehicle) (*models.Vehicle, error)
	Update(vehicle *models.Vehicle) error
	Delete(id string) error
	FindOrCreate(licensePlate, vehicleType string) (*models.Vehicle, error)
}

// BillingAuditLogRepository defines interface for billing audit log data operations
type BillingAuditLogRepository interface {
	GetByID(id int64) (*models.BillingAuditLog, error)
	List(page, perPage int) ([]*models.BillingAuditLog, error)
	Count() (int, error)
	GetBySessionID(sessionID int64) ([]*models.BillingAuditLog, error)
	Create(log *models.BillingAuditLog) (*models.BillingAuditLog, error)
}

// KafkaEventRepository defines interface for Kafka event data operations
type KafkaEventRepository interface {
	GetByID(id string) (*models.KafkaEvent, error)
	List(page, perPage int) ([]*models.KafkaEvent, error)
	Count() (int, error)
	CountByStatus(status string) (int, error)
	CountByEventType(eventType string) (int, error)
	GetByStatus(status string, page, perPage int) ([]*models.KafkaEvent, error)
	GetByEventType(eventType string, page, perPage int) ([]*models.KafkaEvent, error)
	Create(event *models.KafkaEvent) (*models.KafkaEvent, error)
	Update(event *models.KafkaEvent) error
	Delete(id string) error
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
func (ps *ParkingService) ListSessionsPaginated(page, perPage int) ([]*models.ParkingSession, int, error) {
	sessions, err := ps.sessionRepo.ListPaginated(page, perPage)
	if err != nil {
		return nil, 0, err
	}

	totalCount, err := ps.sessionRepo.Count()
	if err != nil {
		return nil, 0, err
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

	return sessions, totalCount, nil
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
		Available: true, // New slots should always be available by default
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

	// Validate slot label - must not be empty (after trimming)
	if req.SlotLabel != nil && strings.TrimSpace(*req.SlotLabel) == "" {
		return nil, errors.New("slot label cannot be empty")
	}

	// Validate slot type - must be one of allowed values
	if req.SlotType != nil && strings.TrimSpace(*req.SlotType) == "" {
		return nil, errors.New("slot type cannot be empty")
	}
	// // Validate slot type is one of allowed values
	// if req.SlotType != nil {
	// 	slotType := strings.TrimSpace(*req.SlotType)
	// 	if slotType != "SP" && slotType != "MP" && slotType != "LP" {
	// 		return nil, errors.New("Invalid slot type. Must be one of: SP, MP, LP")
	// 	}
	// }

	// Update fields if provided
	if req.SlotLabel != nil {
		slot.SlotLabel = *req.SlotLabel
	}
	if req.SlotType != nil {
		slotType := strings.TrimSpace(*req.SlotType)
		slot.SlotType = models.SlotType(slotType)
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

// CreateEntryPoint creates a new entry point
func (ps *ParkingService) CreateEntryPoint(req *dtos.CreateEntryPointRequest) (*models.EntryPoint, error) {
	// Check if entry point with this identifier already exists
	_, err := ps.entryPointRepo.GetByIDentifier(req.Identifier)
	if err == nil {
		// Entry point with this identifier already exists
		return nil, errors.New("entry point with this identifier already exists")
	}

	// Create new entry point
	ep := &models.EntryPoint{
		Identifier: req.Identifier,
		Name:       req.Name,
	}
	createdEP, err := ps.entryPointRepo.Create(ep)
	if err != nil {
		return nil, err
	}

	// Backfill distances for the new entry point with default distance of 0
	if err := ps.parkingSlotRepo.BackfillDistancesForNewEntryPoint(req.Identifier, 0); err != nil {
		// Log error but don't fail the request - backfill is a nice-to-have feature
		fmt.Printf("Warning: Failed to backfill distances for new entry point %s: %v\n", req.Identifier, err)
	}

	return createdEP, nil
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

// DeleteEntryPoint deletes an entry point (idempotent - returns success even if not found)
func (ps *ParkingService) DeleteEntryPoint(id int64) error {

	return ps.entryPointRepo.Delete(id)
}

// DeleteSession deletes a parking session
func (ps *ParkingService) DeleteSession(id int64) error {
	return ps.sessionRepo.Delete(id)
}

// ClearSessions deletes all parking sessions to avoid continuous parking detection issues in tests
func (ps *ParkingService) ClearSessions() error {
	return ps.sessionRepo.DeleteAllSessions()
}

// GetPreviousSessions gets previous sessions for continuous parking check
func (ps *ParkingService) GetPreviousSessions(vehicleType string, since time.Time) ([]*models.ParkingSession, error) {
	return ps.sessionRepo.GetPreviousSessions(vehicleType, since)
}

// InitializeSystem initializes parking system with entry points and parking slots
func (ps *ParkingService) InitializeSystem(req *dtos.InitializeRequest) (*dtos.InitializeResponse, error) {
	entryPointsCreated := 0
	parkingSlotsCreated := 0

	// Wrap all database operations in a single transaction for atomicity
	// This ensures that either all operations succeed or all fail atomically
	tx, err := ps.entryPointRepo.DB().Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p) // Re-panic after rollback
		} else {
			_ = tx.Commit()
		}
	}()

	// Clear all existing parking sessions to allow reinitialization
	// This makes the endpoint idempotent like the Ruby backend
	// Using DeleteAllSessions instead of DeleteActiveSessions to prevent test data pollution
	if err := ps.sessionRepo.DeleteAllSessions(); err != nil {
		return nil, fmt.Errorf("failed to delete all parking sessions: %w", err)
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
			if !errors.Is(err, sql.ErrNoRows) {
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
				// Check for unique constraint violation
				if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "violates unique constraint") {
					return nil, fmt.Errorf("entry point with this identifier already exists")
				}
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
			if !errors.Is(err, sql.ErrNoRows) {
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
				Available: true, // New slots should always be available by default
			}
			_, err := ps.parkingSlotRepo.Create(newSlot)
			if err != nil {
				// Check for unique constraint violation
				if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "violates unique constraint") {
					return nil, fmt.Errorf("parking slot with this label already exists")
				}
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

// GetSlot retrieves a parking slot by ID
func (ps *ParkingService) GetSlot(id int64) (*models.ParkingSlot, error) {
	return ps.parkingSlotRepo.GetByID(id)
}

// GetEntryPoint retrieves an entry point by ID
func (ps *ParkingService) GetEntryPoint(id int64) (*models.EntryPoint, error) {
	return ps.entryPointRepo.GetByID(id)
}

// UpdateSession updates a parking session (only for completed sessions)
func (ps *ParkingService) UpdateSession(id int64, req *dtos.UpdateSessionRequest) (*models.ParkingSession, error) {
	// Get existing session
	session, err := ps.sessionRepo.GetByID(id)
	if err != nil {
		return nil, errors.New("parking session not found")
	}

	// Only allow updating completed sessions
	if session.Active() {
		return nil, errors.New("cannot update active parking session")
	}

	// Update fields if provided
	if req.ExitedAt != nil {
		parsedTime, err := time.Parse(time.RFC3339, *req.ExitedAt)
		if err != nil {
			return nil, errors.New("invalid exited_at format")
		}
		session.ExitedAt = &parsedTime
	}
	if req.TotalFee != nil {
		session.TotalFee = *req.TotalFee
	}

	if err := ps.sessionRepo.Update(session); err != nil {
		return nil, err
	}

	// Load associated models
	slot, err := ps.parkingSlotRepo.GetByID(session.ParkingSlotID)
	if err == nil {
		session.ParkingSlot = slot
	}

	entryPoint, err := ps.entryPointRepo.GetByID(session.EntryPointID)
	if err == nil {
		session.EntryPoint = entryPoint
	}

	return session, nil
}

// Vehicle CRUD operations

// GetVehicle retrieves a vehicle by ID
func (ps *ParkingService) GetBillingAuditLog(id int64) (*models.BillingAuditLog, error) {
	return ps.billingAuditLogRepo.GetByID(id)
}

// ListBillingAuditLogs retrieves all billing audit logs with pagination
func (ps *ParkingService) ListBillingAuditLogs(page, perPage int) ([]*models.BillingAuditLog, int, error) {
	logs, err := ps.billingAuditLogRepo.List(page, perPage)
	if err != nil {
		return nil, 0, err
	}
	totalCount, err := ps.billingAuditLogRepo.Count()
	if err != nil {
		return nil, 0, err
	}
	return logs, totalCount, nil
}

// GetBillingAuditLogsBySessionID retrieves billing audit logs by parking session ID
func (ps *ParkingService) GetBillingAuditLogsBySessionID(sessionID int64) ([]*models.BillingAuditLog, error) {
	return ps.billingAuditLogRepo.GetBySessionID(sessionID)
}

// Kafka Event read operations

// GetKafkaEvent retrieves a Kafka event by ID
func (ps *ParkingService) GetKafkaEvent(id string) (*models.KafkaEvent, error) {
	return ps.kafkaEventRepo.GetByID(id)
}

// ListKafkaEvents retrieves all Kafka events with pagination
func (ps *ParkingService) ListKafkaEvents(page, perPage int) ([]*models.KafkaEvent, int, error) {
	events, err := ps.kafkaEventRepo.List(page, perPage)
	if err != nil {
		return nil, 0, err
	}
	totalCount, err := ps.kafkaEventRepo.Count()
	if err != nil {
		return nil, 0, err
	}
	return events, totalCount, nil
}

// GetKafkaEventsByStatus retrieves Kafka events by status with pagination
func (ps *ParkingService) GetKafkaEventsByStatus(status string, page, perPage int) ([]*models.KafkaEvent, int, error) {
	events, err := ps.kafkaEventRepo.GetByStatus(status, page, perPage)
	if err != nil {
		return nil, 0, err
	}
	totalCount, err := ps.kafkaEventRepo.CountByStatus(status)
	if err != nil {
		return nil, 0, err
	}
	return events, totalCount, nil
}

// GetKafkaEventsByEventType retrieves Kafka events by event type with pagination
func (ps *ParkingService) GetKafkaEventsByEventType(eventType string, page, perPage int) ([]*models.KafkaEvent, int, error) {
	events, err := ps.kafkaEventRepo.GetByEventType(eventType, page, perPage)
	if err != nil {
		return nil, 0, err
	}
	totalCount, err := ps.kafkaEventRepo.CountByEventType(eventType)
	if err != nil {
		return nil, 0, err
	}
	return events, totalCount, nil
}

// ResetTestDatabase resets all test data to ensure clean state for Newman tests
func (ps *ParkingService) ResetTestDatabase() error {
	// Delete all parking sessions
	if err := ps.sessionRepo.DeleteAllSessions(); err != nil {
		return fmt.Errorf("failed to delete all parking sessions: %w", err)
	}

	// Reset all parking slots to available status
	if err := ps.parkingSlotRepo.ResetAllSlotsAvailability(); err != nil {
		return fmt.Errorf("failed to reset parking slots availability: %w", err)
	}

	// Delete all entry points
	if err := ps.entryPointRepo.DeleteAll(); err != nil {
		return fmt.Errorf("failed to delete all entry points: %w", err)
	}

	// Delete all parking slots
	if err := ps.parkingSlotRepo.DeleteAll(); err != nil {
		return fmt.Errorf("failed to delete all parking slots: %w", err)
	}

	return nil
}

// GetRecentExits returns completed sessions of a given vehicle type that exited within the last hour
// Used for displaying continuous parking options to users
func (ps *ParkingService) GetRecentExits(vehicleType string) ([]*dtos.RecentExitResponse, error) {
	// Get all sessions
	allSessions, err := ps.sessionRepo.List()
	if err != nil {
		return nil, fmt.Errorf("failed to get sessions: %w", err)
	}

	// Filter to matching vehicle type
	var sessions []*models.ParkingSession
	for _, session := range allSessions {
		if session.VehicleType == vehicleType {
			sessions = append(sessions, session)
		}
	}

	// Filter to only completed sessions that exited within the last hour
	oneHourAgo := time.Now().UTC().Add(-time.Hour)
	var recentExits []*dtos.RecentExitResponse

	for _, session := range sessions {
		// Only include completed sessions with an exit time
		if session.ExitedAt == nil {
			continue
		}

		// Only include sessions that exited within the last hour
		if session.ExitedAt.After(oneHourAgo) {
			minutesSinceExit := int(time.Now().UTC().Sub(*session.ExitedAt).Minutes())

			// Get slot label for display
			slotLabel := ""
			if session.ParkingSlot != nil {
				slotLabel = session.ParkingSlot.SlotLabel
			}

			// Get entry point identifier for display
			entryPointID := ""
			if session.EntryPoint != nil {
				entryPointID = session.EntryPoint.Identifier
			}

			// Get license plate for display
			licensePlate := ""
			if session.LicensePlate != nil {
				licensePlate = *session.LicensePlate
			}

			recentExits = append(recentExits, &dtos.RecentExitResponse{
				SessionID:        fmt.Sprintf("%d", session.ID),
				VehicleType:      session.VehicleType,
				LicensePlate:     licensePlate,
				SlotLabel:        slotLabel,
				EntryPoint:       entryPointID,
				ParkedAt:         session.ParkedAt.Format(time.RFC3339),
				ExitedAt:         session.ExitedAt.Format(time.RFC3339),
				MinutesSinceExit: minutesSinceExit,
				TotalFee:         session.TotalFee,
			})
		}
	}

	// Sort by exit time descending (most recent first)
	sort.Slice(recentExits, func(i, j int) bool {
		return recentExits[i].ExitedAt > recentExits[j].ExitedAt
	})

	return recentExits, nil
}

// ValidatePreviousSession validates that a previous session can be linked for continuous parking
// Returns error if the session is not eligible
// licensePlate is optional - if provided must match the previous session's license plate
func (ps *ParkingService) ValidatePreviousSession(vehicleType string, previousSessionID string, licensePlate string, parkedAt time.Time) error {
	// Parse session ID
	sessionID, err := strconv.ParseInt(previousSessionID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid previous session ID: %w", err)
	}

	// Get the session from repository
	session, err := ps.sessionRepo.GetByID(sessionID)
	if err != nil || session == nil {
		return fmt.Errorf("previous session not found")
	}

	// Verify it's the same vehicle type
	if session.VehicleType != vehicleType {
		return fmt.Errorf("previous session vehicle type (%s) does not match current vehicle type (%s)", session.VehicleType, vehicleType)
	}

	// Verify license plate matches if both are provided
	if licensePlate != "" && session.LicensePlate != nil && *session.LicensePlate != licensePlate {
		return fmt.Errorf("license plate mismatch: expected %s but got %s", *session.LicensePlate, licensePlate)
	}

	// Verify it's completed (has an exit time)
	if session.ExitedAt == nil {
		return fmt.Errorf("previous session is still active and cannot be linked")
	}

	// Verify it exited within the last hour
	timeSinceExit := parkedAt.Sub(*session.ExitedAt)
	if timeSinceExit < 0 || timeSinceExit >= time.Hour {
		minutes := int(math.Abs(timeSinceExit.Minutes()))
		return fmt.Errorf("previous session exited %d minutes ago; must be within 60 minutes for continuous parking", minutes)
	}

	return nil
}
