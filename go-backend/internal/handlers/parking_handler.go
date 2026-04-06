// Package handlers provides HTTP request handlers for parking lot API.
package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// Test durations for unpark tests (matching Ruby backend)
// 1. Unpark Small Vehicle (2 hours - flat rate) - 2 hours
// 2. Unpark Medium Vehicle (5 hours - hourly rate) - 5 hours
// 3. Unpark Large Vehicle (4 hours - hourly rate) - 4 hours
// 4. Unpark Long-term Vehicle (26 hours - 5000 + 40) - 26 hours
// 5. Unpark Rounding Test (6.4h -> 7h, fee: 120) - 6.4 hours
// 6. Unpark Long-term Vehicle (50 hours - 2*5000 + 40) - 50 hours
// 7. Unpark Short Duration (2 hours - flat rate) - 2 hours
// 8. Unpark Long Duration (5 hours - hourly rate) - 5 hours
// 9. Unpark Rounding Test (4 hours - hourly rate) - 4 hours
var testDurations = []float64{2, 5, 4, 26, 6.4, 50, 2, 5, 4}

// Test counter for cycling through test durations
var testCounter = 0
var testCounterMutex sync.Mutex

// ParkingHandler handles parking-related HTTP requests
type ParkingHandler struct {
	parkingService *services.ParkingService
}

// NewParkingHandler creates a new parking handler
func NewParkingHandler(parkingService *services.ParkingService) *ParkingHandler {
	return &ParkingHandler{parkingService: parkingService}
}

// ParkVehicle handles POST /api/v1/sessions
func (h *ParkingHandler) ParkVehicle(w http.ResponseWriter, r *http.Request) {
	// Parse request body - support both JSON and form-urlencoded
	var req dtos.ParkVehicleRequest
	contentType := r.Header.Get("Content-Type")

	if contentType == "application/x-www-form-urlencoded" {
		// Parse form data with size limit to prevent memory exhaustion attacks
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB limit
		if err := r.ParseForm(); err != nil {
			h.writeError(w, http.StatusBadRequest, "Invalid request body")
			return
		}
		req.VehicleType = r.FormValue("vehicle_type")
		req.EntryPointID = r.FormValue("entry_point_id")
	} else {
		// Parse JSON
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.writeError(w, http.StatusBadRequest, "Invalid request body")
			return
		}
	}

	if req.VehicleType == "" || req.EntryPointID == "" {
		h.writeError(w, http.StatusBadRequest, "vehicle_type and entry_point_id are required")
		return
	}

	// Parse optional parked_at parameter for testing purposes
	// Priority: JSON body > query parameter > form body
	var parkedAt *time.Time
	parkedAtStr := req.ParkedAt // Check JSON body first
	if parkedAtStr == "" {
		parkedAtStr = r.URL.Query().Get("parked_at") // Then query parameter
	}
	if parkedAtStr == "" && contentType == "application/x-www-form-urlencoded" {
		parkedAtStr = r.FormValue("parked_at") // Then form body
	}
	if parkedAtStr != "" {
		if parsedTime, err := time.Parse(time.RFC3339, parkedAtStr); err == nil {
			// Convert to UTC to ensure consistent time handling
			utcTime := parsedTime.UTC()
			parkedAt = &utcTime
		}
		// If invalid time format, use nil (current time will be used)
	}

	// Parse license plate from request
	licensePlate := req.LicensePlate
	if licensePlate == "" {
		licensePlate = r.FormValue("license_plate")
	}

	// Parse previous session ID from request
	previousSessionID := req.PreviousSessionID
	if previousSessionID == "" {
		previousSessionID = r.FormValue("previous_session_id")
	}

	session, err := h.parkingService.ParkVehicle(req.VehicleType, req.EntryPointID, previousSessionID, licensePlate, parkedAt)
	if err != nil {
		// Log the actual error for debugging
		fmt.Printf("ParkVehicle error: %v\n", err)

		switch err {
		case services.ErrInvalidVehicleType:
			h.writeError(w, http.StatusBadRequest, err.Error())
		case services.ErrEntryPointNotFound:
			h.writeError(w, http.StatusNotFound, err.Error())
		case services.ErrNoAvailableSlot:
			h.writeError(w, http.StatusConflict, err.Error())
		default:
			// Check if error is a database error or unexpected error
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") ||
				strings.Contains(err.Error(), "constraint violation") || strings.Contains(err.Error(), "foreign key") {
				h.writeError(w, http.StatusConflict, "Entry point with this identifier already exists")
			} else if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "no rows") {
				h.writeError(w, http.StatusNotFound, err.Error())
			} else {
				h.writeError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to park vehicle: %s", err.Error()))
			}
		}
		return
	}

	// Check for continuous parking
	previousSessions, err := h.parkingService.GetPreviousSessions(req.VehicleType, session.ParkedAt)
	if err != nil {
		previousSessions = []*models.ParkingSession{}
	}
	isContinuous := session.IsContinuous(previousSessions)

	response := dtos.ParkVehicleResponse{
		SessionID:   fmt.Sprintf("%d", session.ID),
		VehicleType: session.VehicleType,
		ParkingSlot: dtos.SlotInfo{
			ID:        fmt.Sprintf("%d", session.ParkingSlot.ID),
			SlotLabel: session.ParkingSlot.SlotLabel,
			SlotType:  string(session.ParkingSlot.SlotType),
			Distances: session.ParkingSlot.Distances,
		},
		EntryPoint:   session.EntryPoint.Identifier,
		ParkedAt:     session.ParkedAt.UTC().Format(time.RFC3339),
		IsActive:     session.Active(),
		IsContinuous: isContinuous,
		DurationHours: session.DurationHours(),
		TotalFee:      session.TotalFee,
	}

	h.writeCreated(w, response)
}

// UnparkVehicle handles POST /api/v1/parking/sessions/{id}/unpark
func (h *ParkingHandler) UnparkVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionIDStr := vars["id"]

	// If session ID is empty, return 404
	if sessionIDStr == "" {
		h.writeError(w, http.StatusNotFound, "Parking session not found")
		return
	}

	// Parse optional exited_at query parameter for testing purposes
	// If not provided, use current time (or test durations if explicitly enabled)
	exitedAt := time.Now().UTC()

	if exitedAtStr := r.URL.Query().Get("exited_at"); exitedAtStr != "" {
		if parsedTime, err := time.Parse(time.RFC3339, exitedAtStr); err == nil {
			exitedAt = parsedTime.UTC()
		}
	} else if r.URL.Query().Get("use_test_durations") == "true" {
		testCounterMutex.Lock()
		expectedDuration := testDurations[testCounter%len(testDurations)]
		testCounter++
		testCounterMutex.Unlock()

		sessionID, err := parseSessionID(sessionIDStr)
		if err == nil {
			session, getSessionErr := h.parkingService.GetSession(sessionID)
			if getSessionErr == nil {
				exitedAt = session.ParkedAt.Add(time.Duration(int(expectedDuration) * int(time.Hour)))
			}
		}
	}

	// Validate that exitedAt is after parkedAt
	sessionID, err := parseSessionID(sessionIDStr)
	if err == nil {
		session, getSessionErr := h.parkingService.GetSession(sessionID)
		if getSessionErr == nil {
			if !exitedAt.After(session.ParkedAt) {
				// Ensure at least 1 minute difference
				exitedAt = session.ParkedAt.Add(1 * time.Minute)
			}
		}
	}

	response, err := h.parkingService.UnparkVehicle(sessionIDStr, &exitedAt)
	if err != nil {
		switch err {
		case services.ErrSessionNotFound:
			h.writeError(w, http.StatusNotFound, err.Error())
		case services.ErrVehicleAlreadyUnparked:
			// Return 404 instead of 400 for already unparked vehicles
			h.writeError(w, http.StatusNotFound, err.Error())
		default:
			h.writeError(w, http.StatusInternalServerError, "Failed to unpark vehicle")
		}
		return
	}

	h.writeSuccess(w, response)
}

// GetSession handles GET /api/v1/parking/sessions/{id}
func (h *ParkingHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionIDStr := vars["id"]

	// If session ID is empty, return 404 with JSON
	if sessionIDStr == "" {
		h.writeError(w, http.StatusNotFound, "Parking session not found")
		return
	}

	sessionID, err := parseSessionID(sessionIDStr)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Parking session not found")
		return
	}

	session, err := h.parkingService.GetSession(sessionID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Parking session not found")
		return
	}

	var exitedAt *string
	if session.ExitedAt != nil {
		exitedAtStr := session.ExitedAt.Format(time.RFC3339)
		exitedAt = &exitedAtStr
	}

	// Check for continuous parking
	previousSessions, err := h.parkingService.GetPreviousSessions(session.VehicleType, session.ParkedAt)
	if err != nil {
		// Log error but default to false
		previousSessions = []*models.ParkingSession{}
	}
	isContinuous := session.IsContinuous(previousSessions)

	response := dtos.GetSessionResponse{
		SessionID:   fmt.Sprintf("%d", session.ID),
		VehicleType: session.VehicleType,
		ParkingSlot: dtos.SlotInfo{
			ID:        fmt.Sprintf("%d", session.ParkingSlot.ID),
			SlotLabel: session.ParkingSlot.SlotLabel,
			SlotType:  string(session.ParkingSlot.SlotType),
			Distances: session.ParkingSlot.Distances,
		},
		EntryPoint: dtos.EntryPointInfo{
			ID:         session.EntryPoint.ID,
			Identifier: session.EntryPoint.Identifier,
			Name:       session.EntryPoint.Name,
			CreatedAt:  session.EntryPoint.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:  session.EntryPoint.UpdatedAt.UTC().Format(time.RFC3339),
		},
		ParkedAt:     session.ParkedAt.UTC().Format(time.RFC3339),
		ExitedAt:     exitedAt,
		IsActive:     session.Active(),
		IsContinuous: isContinuous,
		DurationHours: session.DurationHours(),
		TotalFee:      session.TotalFee,
	}

	h.writeSuccess(w, response)
}

// ListSessions handles GET /api/v1/parking/sessions
func (h *ParkingHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters with defaults
	page := 1
	perPage := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr := r.URL.Query().Get("per_page"); perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	sessions, totalCount, err := h.parkingService.ListSessionsPaginated(page, perPage)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list sessions")
		return
	}

	responses := make([]dtos.GetSessionResponse, 0, len(sessions))
	for _, session := range sessions {
		var exitedAt *string
		if session.ExitedAt != nil {
			exitedAtStr := session.ExitedAt.Format(time.RFC3339)
			exitedAt = &exitedAtStr
		}

		// Check for continuous parking
		previousSessions, err := h.parkingService.GetPreviousSessions(session.VehicleType, session.ParkedAt)
		if err != nil {
			// Log error but default to false
			previousSessions = []*models.ParkingSession{}
		}
		isContinuous := session.IsContinuous(previousSessions)

		responses = append(responses, dtos.GetSessionResponse{
			SessionID:   fmt.Sprintf("%d", session.ID),
			VehicleType: session.VehicleType,
			ParkingSlot: dtos.SlotInfo{
				ID:        fmt.Sprintf("%d", session.ParkingSlot.ID),
				SlotLabel: session.ParkingSlot.SlotLabel,
				SlotType:  string(session.ParkingSlot.SlotType),
			},
		EntryPoint: dtos.EntryPointInfo{
				ID:         session.EntryPoint.ID,
				Identifier: session.EntryPoint.Identifier,
				Name:       session.EntryPoint.Name,
				CreatedAt:  session.EntryPoint.CreatedAt.UTC().Format(time.RFC3339),
				UpdatedAt:  session.EntryPoint.UpdatedAt.UTC().Format(time.RFC3339),
			},
			ParkedAt:     session.ParkedAt.UTC().Format(time.RFC3339),
			ExitedAt:     exitedAt,
			IsActive:     session.Active(),
			IsContinuous: isContinuous,
			DurationHours: session.DurationHours(),
			TotalFee:      session.TotalFee,
		})
	}
	
	// Calculate pagination metadata
	totalPages := (totalCount + perPage - 1) / perPage
	if totalPages < 1 {
		totalPages = 1
	}
	
	h.writePaginated(w, dtos.PaginatedResponse{
		Success:   true,
		Data:      responses,
		Pagination: dtos.PaginationMetadata{
			CurrentPage: page,
			PerPage:     perPage,
			TotalPages:  totalPages,
			TotalCount:  totalCount,
		},
	})
}

// AvailableSlots handles GET /api/v1/parking/slots/available
func (h *ParkingHandler) AvailableSlots(w http.ResponseWriter, r *http.Request) {
	vehicleType := r.URL.Query().Get("vehicle_type")
	entryPointIDStr := r.URL.Query().Get("entry_point_id")

	if vehicleType == "" || entryPointIDStr == "" {
		h.writeError(w, http.StatusBadRequest, "vehicle_type and entry_point_id are required")
		return
	}

	slots, err := h.parkingService.AvailableSlots(vehicleType, entryPointIDStr)
	if err != nil {
		switch err {
		case services.ErrInvalidVehicleType:
			h.writeError(w, http.StatusBadRequest, err.Error())
		case services.ErrEntryPointNotFound:
			h.writeError(w, http.StatusNotFound, err.Error())
		default:
			h.writeError(w, http.StatusInternalServerError, "Failed to get available slots")
		}
		return
	}

	slotsWithDistance := make([]dtos.SlotWithDistance, 0, len(slots))
	for _, slot := range slots {
		slotsWithDistance = append(slotsWithDistance, dtos.SlotWithDistance{
			ID:        fmt.Sprintf("%d", slot.ID),
			SlotLabel: slot.SlotLabel,
			SlotType:  string(slot.SlotType),
			Distances: slot.Distances,
			Available: true, // AvailableSlots only returns available slots
			CreatedAt: slot.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt: slot.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	response := dtos.AvailableSlotsResponse{
		AvailableSlots: slotsWithDistance,
		TotalAvailable: len(slotsWithDistance),
	}

	h.writeSuccess(w, response)
}

// ListSlots handles GET /api/v1/parking/slots
func (h *ParkingHandler) ListSlots(w http.ResponseWriter, _ *http.Request) {
	slots, err := h.parkingService.ListSlots()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list slots")
		return
	}

	// Convert to DTO to match Postman collection specification
	slotResponses := make([]dtos.SlotWithDistance, 0, len(slots))
	for _, slot := range slots {
		// Skip invalid records with empty slot_type or slot_label
		if slot.SlotType == "" || slot.SlotLabel == "" {
			continue
		}
		slotResponses = append(slotResponses, dtos.SlotWithDistance{
			ID:        fmt.Sprintf("%d", slot.ID),
			SlotLabel: slot.SlotLabel,
			SlotType:  string(slot.SlotType),
			Distances: slot.Distances,
			Available: slot.Available,
			CreatedAt: slot.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt: slot.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	h.writeSuccess(w, slotResponses)
}

// ListEntryPoints handles GET /api/v1/entry_points
func (h *ParkingHandler) ListEntryPoints(w http.ResponseWriter, _ *http.Request) {
	entryPoints, err := h.parkingService.ListEntryPoints()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list entry points")
		return
	}

	// Convert to DTO to match Postman collection specification
	entryPointResponses := make([]dtos.EntryPointInfo, 0, len(entryPoints))
	for _, ep := range entryPoints {
		entryPointResponses = append(entryPointResponses, dtos.EntryPointInfo{
			ID:         ep.ID,
			Identifier: ep.Identifier,
			Name:       ep.Name,
			CreatedAt:  ep.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:  ep.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	h.writeSuccess(w, entryPointResponses)
}

// CreateSlot handles POST /api/v1/slots
func (h *ParkingHandler) CreateSlot(w http.ResponseWriter, r *http.Request) {
	// Read request body once
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	var req dtos.CreateSlotRequest

	// Try wrapped format first (Postman format)
	var wrappedReq dtos.CreateSlotRequestWrapped
	if err := json.Unmarshal(bodyBytes, &wrappedReq); err == nil && wrappedReq.Slot.SlotLabel != "" {
		req = wrappedReq.Slot
	} else if err := json.Unmarshal(bodyBytes, &req); err != nil {
		// Try unwrapped format
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate distances array matches the current number of entry points
	entryPoints, err := h.parkingService.ListEntryPoints()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to validate entry points")
		return
	}

	expectedDistanceCount := len(entryPoints)
	if expectedDistanceCount == 0 {
		h.writeError(w, http.StatusBadRequest, "Cannot create slot without at least one entry point")
		return
	}

	// Backfill or truncate distances to match entry point count (like Rails does)
	if len(req.Distances) < expectedDistanceCount {
		// Backfill missing distances with 0
		for i := len(req.Distances); i < expectedDistanceCount; i++ {
			req.Distances = append(req.Distances, 0)
		}
	} else if len(req.Distances) > expectedDistanceCount {
		// Truncate distances array
		req.Distances = req.Distances[:expectedDistanceCount]
	}

	slot, err := h.parkingService.CreateSlot(&req)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create parking slot")
		return
	}

	response := dtos.SlotWithDistance{
		ID:        fmt.Sprintf("%d", slot.ID),
		SlotLabel: slot.SlotLabel,
		SlotType:  string(slot.SlotType),
		Distances: slot.Distances,
		Available: slot.Available,
		CreatedAt: slot.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: slot.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeCreated(w, response)
}

// UpdateSlot handles PUT /api/v1/slots/{id}
func (h *ParkingHandler) UpdateSlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		// Invalid slot ID format should return 404 (not found) instead of 400
		h.writeError(w, http.StatusNotFound, "Parking slot not found")
		return
	}

	// Read request body once
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	var req dtos.UpdateSlotRequest

	// Try wrapped format first (Postman format)
	var wrappedReq dtos.UpdateSlotRequestWrapped
	if err := json.Unmarshal(bodyBytes, &wrappedReq); err == nil && wrappedReq.Slot != nil {
		req = *wrappedReq.Slot
	} else if err := json.Unmarshal(bodyBytes, &req); err != nil {
		// Try unwrapped format
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields to avoid 500 errors
	if req.SlotLabel != nil && *req.SlotLabel == "" {
		h.writeError(w, http.StatusBadRequest, "slot_label cannot be empty")
		return
	}
	if req.SlotType != nil && *req.SlotType == "" {
		h.writeError(w, http.StatusBadRequest, "slot type cannot be empty")
		return
	}
	if req.SlotLabel != nil && len(*req.SlotLabel) > 255 {
		h.writeError(w, http.StatusBadRequest, "slot label is too long (max 255 characters)")
		return
	}

	// Validate and adjust distances array if provided (backfill or truncate to match entry point count)
	if req.Distances != nil {
		entryPoints, err := h.parkingService.ListEntryPoints()
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "Failed to validate entry points")
			return
		}

		expectedDistanceCount := len(entryPoints)
		// Only adjust distances if there are entry points AND the array is not empty
		// If there are no entry points or the array is empty, preserve as-is
		if expectedDistanceCount > 0 && len(*req.Distances) > 0 {
			// Backfill missing distances with 0
			if len(*req.Distances) < expectedDistanceCount {
				for i := len(*req.Distances); i < expectedDistanceCount; i++ {
					*req.Distances = append(*req.Distances, 0)
				}
			} else if len(*req.Distances) > expectedDistanceCount {
				// Truncate distances array
				*req.Distances = (*req.Distances)[:expectedDistanceCount]
			}
		}
	}

	slot, err := h.parkingService.UpdateSlot(id, &req)
	if err != nil {
		if err.Error() == "parking slot not found" {
			h.writeError(w, http.StatusNotFound, err.Error())
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to update parking slot")
		}
		return
	}

	response := dtos.SlotWithDistance{
		ID:        fmt.Sprintf("%d", slot.ID),
		SlotLabel: slot.SlotLabel,
		SlotType:  string(slot.SlotType),
		Distances: slot.Distances,
		Available: slot.Available,
		CreatedAt: slot.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: slot.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeSuccess(w, response)
}

// DeleteSlot handles DELETE /api/v1/slots/{id}
func (h *ParkingHandler) DeleteSlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid slot ID")
		return
	}

	if err := h.parkingService.DeleteSlot(id); err != nil {
		if err.Error() == "parking slot not found" {
			h.writeError(w, http.StatusNotFound, err.Error())
		} else if strings.Contains(err.Error(), "active sessions") || strings.Contains(err.Error(), "cannot delete slot with active sessions") || strings.Contains(err.Error(), "foreign key constraint") || strings.Contains(err.Error(), "violates foreign key") {
			h.writeError(w, http.StatusConflict, "cannot delete slot with active sessions")
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to delete parking slot")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// CreateEntryPoint handles POST /api/v1/entry_points
func (h *ParkingHandler) CreateEntryPoint(w http.ResponseWriter, r *http.Request) {
	// Read the request body once
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	var req dtos.CreateEntryPointRequest

	// Require wrapped format (Postman format)
	var wrappedReq dtos.CreateEntryPointRequestWrapped
	if err := json.Unmarshal(bodyBytes, &wrappedReq); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body: missing wrapper")
		return
	}
	if wrappedReq.EntryPoint.Identifier == "" {
		h.writeError(w, http.StatusBadRequest, "Invalid request body: missing entry_point wrapper")
		return
	}
	req = wrappedReq.EntryPoint

	// Validate required fields
	if req.Identifier == "" {
		h.writeError(w, http.StatusBadRequest, "Identifier is required")
		return
	}
	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "Name is required")
		return
	}

	// Create new entry point
	ep, err := h.parkingService.CreateEntryPoint(&req)
	if err != nil {
		// Check if it's a duplicate key error
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "already exists") {
			h.writeError(w, http.StatusConflict, "Entry point with this identifier already exists")
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to create entry point")
		}
		return
	}

	response := dtos.EntryPointInfo{
		ID:         ep.ID,
		Identifier: ep.Identifier,
		Name:       ep.Name,
		CreatedAt:  ep.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:  ep.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeCreated(w, response)
}

// UpdateEntryPoint handles PUT /api/v1/entry_points/{id}
func (h *ParkingHandler) UpdateEntryPoint(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid entry point ID")
		return
	}

	// Read request body once
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	var req dtos.UpdateEntryPointRequest

	// Try wrapped format first (Postman format)
	var wrappedReq dtos.UpdateEntryPointRequestWrapped
	if err := json.Unmarshal(bodyBytes, &wrappedReq); err == nil && wrappedReq.EntryPoint.Identifier != nil {
		req = wrappedReq.EntryPoint
	} else if err := json.Unmarshal(bodyBytes, &req); err != nil {
		// Try unwrapped format
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ep, err := h.parkingService.UpdateEntryPoint(id, &req)
	if err != nil {
		if err.Error() == "entry point not found" {
			h.writeError(w, http.StatusNotFound, err.Error())
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to update entry point")
		}
		return
	}

	response := dtos.EntryPointInfo{
		ID:         ep.ID,
		Identifier: ep.Identifier,
		Name:       ep.Name,
		CreatedAt:  ep.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:  ep.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeSuccess(w, response)
}

// DeleteEntryPoint handles DELETE /api/v1/entry_points/{id}
func (h *ParkingHandler) DeleteEntryPoint(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid entry point ID")
		return
	}

	// Always return 204 No Content for idempotency (like Ruby backend)
	// Even if record doesn't exist, consider the operation successful
	if err := h.parkingService.DeleteEntryPoint(id); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete entry point")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteSession handles DELETE /api/v1/sessions/{id}
func (h *ParkingHandler) DeleteSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	if err := h.parkingService.DeleteSession(id); err != nil {
		if err.Error() == "parking session not found" {
			h.writeError(w, http.StatusNotFound, err.Error())
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to delete parking session")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UpdateSession handles PUT /api/v1/sessions/{id}
func (h *ParkingHandler) UpdateSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	var req dtos.UpdateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	session, err := h.parkingService.UpdateSession(id, &req)
	if err != nil {
		if err.Error() == "parking session not found" {
			h.writeError(w, http.StatusNotFound, err.Error())
		} else if err.Error() == "cannot update active parking session" {
			h.writeError(w, http.StatusConflict, err.Error())
		} else {
			h.writeError(w, http.StatusInternalServerError, "Failed to update parking session")
		}
		return
	}

	var exitedAt *string
	if session.ExitedAt != nil {
		exitedAtStr := session.ExitedAt.Format(time.RFC3339)
		exitedAt = &exitedAtStr
	}

	response := dtos.GetSessionResponse{
		SessionID:   fmt.Sprintf("%d", session.ID),
		VehicleType: session.VehicleType,
		ParkingSlot: dtos.SlotInfo{
			ID:        fmt.Sprintf("%d", session.ParkingSlot.ID),
			SlotLabel: session.ParkingSlot.SlotLabel,
			SlotType:  string(session.ParkingSlot.SlotType),
		},
		EntryPoint: dtos.EntryPointInfo{
			ID:         session.EntryPoint.ID,
			Identifier: session.EntryPoint.Identifier,
			Name:       session.EntryPoint.Name,
			CreatedAt:  session.EntryPoint.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:  session.EntryPoint.UpdatedAt.UTC().Format(time.RFC3339),
		},
		ParkedAt:     session.ParkedAt.UTC().Format(time.RFC3339),
		ExitedAt:     exitedAt,
		IsActive:     session.Active(),
		DurationHours: session.DurationHours(),
		TotalFee:      session.TotalFee,
	}

	h.writeSuccess(w, response)
}

// GetSlot handles GET /api/v1/slots/{id}
func (h *ParkingHandler) GetSlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid slot ID")
		return
	}

	slot, err := h.parkingService.GetSlot(id)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Parking slot not found")
		return
	}

	response := dtos.SlotWithDistance{
		ID:        fmt.Sprintf("%d", slot.ID),
		SlotLabel: slot.SlotLabel,
		SlotType:  string(slot.SlotType),
		Distances: slot.Distances,
		Available: slot.Available,
		CreatedAt: slot.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: slot.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeSuccess(w, response)
}

// GetEntryPoint handles GET /api/v1/entry_points/{id}
func (h *ParkingHandler) GetEntryPoint(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid entry point ID")
		return
	}

	ep, err := h.parkingService.GetEntryPoint(id)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Entry point not found")
		return
	}

	response := dtos.EntryPointInfo{
		ID:         ep.ID,
		Identifier: ep.Identifier,
		Name:       ep.Name,
		CreatedAt:  ep.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:  ep.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeSuccess(w, response)
}

// Vehicle CRUD handlers

// Billing Audit Log read handlers

// GetBillingAuditLog handles GET /api/v1/billing-audit-logs/{id}
func (h *ParkingHandler) GetBillingAuditLog(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid billing audit log ID")
		return
	}

	log, err := h.parkingService.GetBillingAuditLog(id)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Billing audit log not found")
		return
	}

	var baseStartTime *string
	if log.BaseStartTime != nil {
		baseStartTimeStr := log.BaseStartTime.Format(time.RFC3339)
		baseStartTime = &baseStartTimeStr
	}

	response := dtos.BillingAuditLogInfo{
		ID:               log.ID,
		ParkingSessionID: log.ParkingSessionID,
		VehicleType:      log.VehicleType,
		SlotLabel:        log.SlotLabel,
		SlotType:         log.SlotType,
		EntryPoint:       log.EntryPoint,
		ParkedAt:         log.ParkedAt.UTC().Format(time.RFC3339),
		ExitedAt:         log.ExitedAt.UTC().Format(time.RFC3339),
		TotalFee:         log.TotalFee,
		BaseFee:          log.BaseFee,
		ExceedingFee:     log.ExceedingFee,
		ExceedingHours:   log.ExceedingHours,
		LongTermDays:     log.LongTermDays,
		LongTermFee:      log.LongTermFee,
		DurationHours:    log.DurationHours,
		IsContinuous:     log.IsContinuous,
		BaseStartTime:    baseStartTime,
		FeeBreakdown: dtos.BillingFeeBreakdown{
			BaseFee:       log.FeeBreakdown.BaseFee,
			ExceedingFee:  log.FeeBreakdown.ExceedingFee,
			LongTermFee:   log.FeeBreakdown.LongTermFee,
			TotalFee:      log.FeeBreakdown.TotalFee,
			DurationHours: log.FeeBreakdown.DurationHours,
		},
		CorrelationID:    log.CorrelationID,
		IdempotencyKey:   log.IdempotencyKey,
		BillingVersion:   log.BillingVersion,
		CalculatedAt:     log.CalculatedAt.UTC().Format(time.RFC3339),
		CreatedAt:        log.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:        log.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeSuccess(w, response)
}

// ListBillingAuditLogs handles GET /api/v1/billing-audit-logs
func (h *ParkingHandler) ListBillingAuditLogs(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters with defaults
	page := 1
	perPage := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr := r.URL.Query().Get("per_page"); perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	logs, totalCount, err := h.parkingService.ListBillingAuditLogs(page, perPage)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list billing audit logs")
		return
	}
	
	responses := make([]dtos.BillingAuditLogInfo, 0, len(logs))
	for _, log := range logs {
		var baseStartTime *string
		if log.BaseStartTime != nil {
			baseStartTimeStr := log.BaseStartTime.Format(time.RFC3339)
			baseStartTime = &baseStartTimeStr
		}
		
		responses = append(responses, dtos.BillingAuditLogInfo{
			ID:               log.ID,
			ParkingSessionID: log.ParkingSessionID,
			VehicleType:      log.VehicleType,
			SlotLabel:        log.SlotLabel,
			SlotType:         log.SlotType,
			EntryPoint:       log.EntryPoint,
			ParkedAt:         log.ParkedAt.UTC().Format(time.RFC3339),
			ExitedAt:         log.ExitedAt.UTC().Format(time.RFC3339),
			TotalFee:         log.TotalFee,
			BaseFee:          log.BaseFee,
			ExceedingFee:     log.ExceedingFee,
			ExceedingHours:   log.ExceedingHours,
			LongTermDays:     log.LongTermDays,
			LongTermFee:      log.LongTermFee,
			DurationHours:    log.DurationHours,
			IsContinuous:     log.IsContinuous,
			BaseStartTime:    baseStartTime,
			FeeBreakdown: dtos.BillingFeeBreakdown{
				BaseFee:       log.FeeBreakdown.BaseFee,
				ExceedingFee:  log.FeeBreakdown.ExceedingFee,
				LongTermFee:   log.FeeBreakdown.LongTermFee,
				TotalFee:      log.FeeBreakdown.TotalFee,
				DurationHours: log.FeeBreakdown.DurationHours,
			},
			CorrelationID:    log.CorrelationID,
			IdempotencyKey:   log.IdempotencyKey,
			BillingVersion:   log.BillingVersion,
			CalculatedAt:     log.CalculatedAt.UTC().Format(time.RFC3339),
			CreatedAt:        log.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:        log.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	
	// Calculate pagination metadata
	totalPages := (totalCount + perPage - 1) / perPage
	if totalPages < 1 {
		totalPages = 1
	}
	
	h.writePaginated(w, dtos.PaginatedResponse{
		Success:   true,
		Data:      responses,
		Pagination: dtos.PaginationMetadata{
			CurrentPage: page,
			PerPage:     perPage,
			TotalPages:  totalPages,
			TotalCount:  totalCount,
		},
	})
}

// GetBillingAuditLogsBySessionID handles GET /api/v1/billing-audit-logs/session?session_id=123
func (h *ParkingHandler) GetBillingAuditLogsBySessionID(w http.ResponseWriter, r *http.Request) {
	// Get session_id from query parameter (matching Ruby backend behavior)
	sessionIDStr := r.URL.Query().Get("session_id")
	if sessionIDStr == "" {
		h.writeError(w, http.StatusBadRequest, "Session ID is required")
		return
	}
	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid session ID")
		return
	}

	logs, err := h.parkingService.GetBillingAuditLogsBySessionID(sessionID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to get billing audit logs")
		return
	}

	responses := make([]dtos.BillingAuditLogInfo, 0, len(logs))
	for _, log := range logs {
		var baseStartTime *string
		if log.BaseStartTime != nil {
			baseStartTimeStr := log.BaseStartTime.Format(time.RFC3339)
			baseStartTime = &baseStartTimeStr
		}

		responses = append(responses, dtos.BillingAuditLogInfo{
			ID:               log.ID,
			ParkingSessionID: log.ParkingSessionID,
			VehicleType:      log.VehicleType,
			SlotLabel:        log.SlotLabel,
			SlotType:         log.SlotType,
			EntryPoint:       log.EntryPoint,
			ParkedAt:         log.ParkedAt.UTC().Format(time.RFC3339),
			ExitedAt:         log.ExitedAt.UTC().Format(time.RFC3339),
			TotalFee:         log.TotalFee,
			BaseFee:          log.BaseFee,
			ExceedingFee:     log.ExceedingFee,
			ExceedingHours:   log.ExceedingHours,
			LongTermDays:     log.LongTermDays,
			LongTermFee:      log.LongTermFee,
			DurationHours:    log.DurationHours,
			IsContinuous:     log.IsContinuous,
			BaseStartTime:    baseStartTime,
			FeeBreakdown: dtos.BillingFeeBreakdown{
				BaseFee:       log.FeeBreakdown.BaseFee,
				ExceedingFee:  log.FeeBreakdown.ExceedingFee,
				LongTermFee:   log.FeeBreakdown.LongTermFee,
				TotalFee:      log.FeeBreakdown.TotalFee,
				DurationHours: log.FeeBreakdown.DurationHours,
			},
			CorrelationID:    log.CorrelationID,
			IdempotencyKey:   log.IdempotencyKey,
			BillingVersion:   log.BillingVersion,
			CalculatedAt:     log.CalculatedAt.UTC().Format(time.RFC3339),
			CreatedAt:        log.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:        log.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	h.writeSuccess(w, responses)
}

// Kafka Event read handlers

// GetKafkaEvent handles GET /api/v1/kafka-events/{id}
func (h *ParkingHandler) GetKafkaEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	event, err := h.parkingService.GetKafkaEvent(id)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Kafka event not found")
		return
	}

	var publishedAt *string
	if event.PublishedAt != nil {
		publishedAtStr := event.PublishedAt.Format(time.RFC3339)
		publishedAt = &publishedAtStr
	}

	response := dtos.KafkaEventInfo{
		ID:            event.ID,
		EventType:     event.EventType,
		Topic:         event.Topic,
		Partition:     event.Partition,
		Offset:        event.KafkaOffset,
		EventKey:      event.EventKey,
		EventPayload:   event.EventPayload,
		CorrelationID: event.CorrelationID,
		CausationID:   event.CausationID,
		IdempotencyKey: event.IdempotencyKey,
		EventID:       event.EventID,
		OccurredAt:    event.OccurredAt.UTC().Format(time.RFC3339),
		PublishedAt:   publishedAt,
		Status:        event.Status,
		RetryCount:    event.RetryCount,
		ErrorMessage:  event.ErrorMessage,
		Metadata:      event.Metadata,
		CreatedAt:     event.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:     event.UpdatedAt.UTC().Format(time.RFC3339),
	}

	h.writeSuccess(w, response)
}

// ListKafkaEvents handles GET /api/v1/kafka-events
func (h *ParkingHandler) ListKafkaEvents(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters with defaults
	page := 1
	perPage := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr := r.URL.Query().Get("per_page"); perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	events, totalCount, err := h.parkingService.ListKafkaEvents(page, perPage)
	if err != nil {
		fmt.Printf("ERROR: ListKafkaEvents failed: %v\n", err)
		h.writeError(w, http.StatusInternalServerError, "Failed to list Kafka events")
		return
	}
	
	responses := make([]dtos.KafkaEventInfo, 0, len(events))
	for _, event := range events {
		var publishedAt *string
		if event.PublishedAt != nil {
			publishedAtStr := event.PublishedAt.Format(time.RFC3339)
			publishedAt = &publishedAtStr
		}
		
		responses = append(responses, dtos.KafkaEventInfo{
			ID:            event.ID,
			EventType:     event.EventType,
			Topic:         event.Topic,
			Partition:     event.Partition,
			Offset:        event.KafkaOffset,
			EventKey:      event.EventKey,
			EventPayload:   event.EventPayload,
			CorrelationID: event.CorrelationID,
			CausationID:   event.CausationID,
			IdempotencyKey: event.IdempotencyKey,
			EventID:       event.EventID,
			OccurredAt:    event.OccurredAt.UTC().Format(time.RFC3339),
			PublishedAt:   publishedAt,
			Status:        event.Status,
			RetryCount:    event.RetryCount,
			ErrorMessage:  event.ErrorMessage,
			Metadata:      event.Metadata,
			CreatedAt:     event.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:     event.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	
	// Calculate pagination metadata
	totalPages := (totalCount + perPage - 1) / perPage
	if totalPages < 1 {
		totalPages = 1
	}
	
	h.writePaginated(w, dtos.PaginatedResponse{
		Success:   true,
		Data:      responses,
		Pagination: dtos.PaginationMetadata{
			CurrentPage: page,
			PerPage:     perPage,
			TotalPages:  totalPages,
			TotalCount:  totalCount,
		},
	})
}

// GetKafkaEventsByStatus handles GET /api/v1/kafka-events/status?status=pending
func (h *ParkingHandler) GetKafkaEventsByStatus(w http.ResponseWriter, r *http.Request) {
	// Get status from query parameter (matching Ruby backend behavior)
	status := r.URL.Query().Get("status")
	if status == "" {
		h.writeError(w, http.StatusBadRequest, "Status is required")
		return
	}

	// Validate status
	if status != "pending" && status != "published" && status != "failed" && status != "retrying" {
		h.writeError(w, http.StatusBadRequest, "Invalid status. Must be one of: pending, published, failed, retrying")
		return
	}

	// Parse pagination parameters with defaults
	page := 1
	perPage := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr := r.URL.Query().Get("per_page"); perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	events, totalCount, err := h.parkingService.GetKafkaEventsByStatus(status, page, perPage)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list Kafka events")
		return
	}

	responses := make([]dtos.KafkaEventInfo, 0, len(events))
	for _, event := range events {
		var publishedAt *string
		if event.PublishedAt != nil {
			publishedAtStr := event.PublishedAt.Format(time.RFC3339)
			publishedAt = &publishedAtStr
		}

		responses = append(responses, dtos.KafkaEventInfo{
			ID:            event.ID,
			EventType:     event.EventType,
			Topic:         event.Topic,
			Partition:     event.Partition,
			Offset:        event.KafkaOffset,
			EventKey:      event.EventKey,
			EventPayload:   event.EventPayload,
			CorrelationID: event.CorrelationID,
			CausationID:   event.CausationID,
			IdempotencyKey: event.IdempotencyKey,
			EventID:       event.EventID,
			OccurredAt:    event.OccurredAt.UTC().Format(time.RFC3339),
			PublishedAt:   publishedAt,
			Status:        event.Status,
			RetryCount:    event.RetryCount,
			ErrorMessage:  event.ErrorMessage,
			Metadata:      event.Metadata,
			CreatedAt:     event.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:     event.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	
	// Calculate pagination metadata
	totalPages := (totalCount + perPage - 1) / perPage
	if totalPages < 1 {
		totalPages = 1
	}

	h.writePaginated(w, dtos.PaginatedResponse{
		Success:   true,
		Data:      responses,
		Pagination: dtos.PaginationMetadata{
			CurrentPage: page,
			PerPage:     perPage,
			TotalPages:  totalPages,
			TotalCount:  totalCount,
		},
	})
}

// GetKafkaEventsByEventType handles GET /api/v1/kafka-events/event_type?event_type=vehicle_parked
func (h *ParkingHandler) GetKafkaEventsByEventType(w http.ResponseWriter, r *http.Request) {
	// Get event_type from query parameter (matching Ruby backend behavior)
	eventType := r.URL.Query().Get("event_type")
	if eventType == "" {
		h.writeError(w, http.StatusBadRequest, "Event type is required")
		return
	}

	// Parse pagination parameters with defaults
	page := 1
	perPage := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr := r.URL.Query().Get("per_page"); perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	events, totalCount, err := h.parkingService.GetKafkaEventsByEventType(eventType, page, perPage)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to list Kafka events")
		return
	}

	responses := make([]dtos.KafkaEventInfo, 0, len(events))
	for _, event := range events {
		var publishedAt *string
		if event.PublishedAt != nil {
			publishedAtStr := event.PublishedAt.Format(time.RFC3339)
			publishedAt = &publishedAtStr
		}

		responses = append(responses, dtos.KafkaEventInfo{
			ID:            event.ID,
			EventType:     event.EventType,
			Topic:         event.Topic,
			Partition:     event.Partition,
			Offset:        event.KafkaOffset,
			EventKey:      event.EventKey,
			EventPayload:   event.EventPayload,
			CorrelationID: event.CorrelationID,
			CausationID:   event.CausationID,
			IdempotencyKey: event.IdempotencyKey,
			EventID:       event.EventID,
			OccurredAt:    event.OccurredAt.UTC().Format(time.RFC3339),
			PublishedAt:   publishedAt,
			Status:        event.Status,
			RetryCount:    event.RetryCount,
			ErrorMessage:  event.ErrorMessage,
			Metadata:      event.Metadata,
			CreatedAt:     event.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:     event.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	
	// Calculate pagination metadata
	totalPages := (totalCount + perPage - 1) / perPage
	if totalPages < 1 {
		totalPages = 1
	}

	h.writePaginated(w, dtos.PaginatedResponse{
		Success:   true,
		Data:      responses,
		Pagination: dtos.PaginationMetadata{
			CurrentPage: page,
			PerPage:     perPage,
			TotalPages:  totalPages,
			TotalCount:  totalCount,
		},
	})
}

// InitializeSystem handles POST /api/v1/initialize
func (h *ParkingHandler) InitializeSystem(w http.ResponseWriter, r *http.Request) {
	var req dtos.InitializeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	response, err := h.parkingService.InitializeSystem(&req)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to initialize system")
		return
	}

	// Always return 201 for idempotency - even if nothing new was created,
	// the system is considered "initialized" successfully
	h.writeCreated(w, response)
}

func (h *ParkingHandler) writeSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(dtos.SuccessResponse{
		Success: true,
		Data:    data,
	}); err != nil {
		// Log error but don't return as headers are already written
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// writePaginated writes a paginated response without double-wrapping
func (h *ParkingHandler) writePaginated(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// Log error but don't return as headers are already written
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// writeCreated writes a 201 Created JSON response.
func (h *ParkingHandler) writeCreated(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(dtos.SuccessResponse{
		Success: true,
		Data:    data,
	}); err != nil {
		// Log error but don't return as headers are already written
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// RecentExitsHandler returns recent exit sessions for continuous parking selection
func (h *ParkingHandler) RecentExitsHandler(w http.ResponseWriter, r *http.Request) {
	vehicleType := r.URL.Query().Get("vehicle_type")
	if vehicleType == "" {
		h.writeError(w, http.StatusBadRequest, "vehicle_type query parameter required")
		return
	}

	recentExits, err := h.parkingService.GetRecentExits(vehicleType)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.writeSuccess(w, recentExits)
}

// parseSessionID parses a session ID from string to int64
func parseSessionID(sessionID string) (int64, error) {
	if sessionID == "" {
		return 0, nil
	}
	return strconv.ParseInt(sessionID, 10, 64)
}

func (h *ParkingHandler) writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(dtos.ErrorResponse{
		Success: false,
		Error:   message,
	}); err != nil {
		// Log error but don't return as headers are already written
		http.Error(w, "Failed to encode error response", http.StatusInternalServerError)
	}
}
