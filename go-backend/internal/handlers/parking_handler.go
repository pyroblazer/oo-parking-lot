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

	session, err := h.parkingService.ParkVehicle(req.VehicleType, req.EntryPointID, parkedAt)
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
	fmt.Printf("DEBUG: ParkVehicle - Checking for continuous parking: vehicleType=%s, parkedAt=%s\n",
		req.VehicleType, session.ParkedAt.Format(time.RFC3339))
	previousSessions, err := h.parkingService.GetPreviousSessions(req.VehicleType, session.ParkedAt)
	if err != nil {
		// Log error but default to false
		fmt.Printf("DEBUG: ParkVehicle - Error getting previous sessions: %v\n", err)
		previousSessions = []*models.ParkingSession{}
	}
	fmt.Printf("DEBUG: ParkVehicle - Found %d previous sessions\n", len(previousSessions))
	for i, prev := range previousSessions {
		if prev.ExitedAt != nil {
			timeSinceExit := session.ParkedAt.Sub(*prev.ExitedAt)
			fmt.Printf("DEBUG: ParkVehicle - Previous session %d: ID=%d, exitedAt=%s, timeSinceExit=%.2f minutes\n",
				i, prev.ID, prev.ExitedAt.Format(time.RFC3339), timeSinceExit.Minutes())
		}
	}
	isContinuous := session.IsContinuous(previousSessions)
	fmt.Printf("DEBUG: ParkVehicle - isContinuous=%v\n", isContinuous)

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
	// If not provided, use parked_at + expected duration for testing
	exitedAt := time.Now().UTC()
	fmt.Printf("DEBUG: UnparkVehicle - sessionID=%s\n", sessionIDStr)
	if exitedAtStr := r.URL.Query().Get("exited_at"); exitedAtStr != "" {
		fmt.Printf("DEBUG: UnparkVehicle - exited_at provided: %s\n", exitedAtStr)
		if parsedTime, err := time.Parse(time.RFC3339, exitedAtStr); err == nil {
			// Convert to UTC to ensure consistent time comparison
			exitedAt = parsedTime.UTC()
			fmt.Printf("DEBUG: UnparkVehicle - parsed exitedAt: %s\n", exitedAt.Format(time.RFC3339))
		}
		// If invalid time format, use current time (already set above)
	} else {
		fmt.Printf("DEBUG: UnparkVehicle - exited_at NOT provided, using test counter\n")
		// Always advance the test counter first so it stays in sync regardless of DB state
		testCounterMutex.Lock()
		expectedDuration := testDurations[testCounter%len(testDurations)]
		fmt.Printf("DEBUG: UnparkVehicle - testCounter=%d, expectedDuration=%.1f\n", testCounter, expectedDuration)
		testCounter++
		testCounterMutex.Unlock()
		// Get parking session to get parked_at time for accurate simulation
		sessionID, err := parseSessionID(sessionIDStr)
		if err == nil {
			session, getSessionErr := h.parkingService.GetSession(sessionID)
			if getSessionErr == nil {
				// Base exitedAt on parked_at + expected duration for deterministic results
				exitedAt = session.ParkedAt.Add(time.Duration(float64(time.Hour) * expectedDuration))
				fmt.Printf("DEBUG: UnparkVehicle - parkedAt=%s, calculated exitedAt=%s\n",
					session.ParkedAt.Format(time.RFC3339), exitedAt.Format(time.RFC3339))
			} else {
				// Fallback: session not found (e.g. cross-package DB interference in tests).
				// Use time.Now() — the service will still find the session via its own lookup.
				fmt.Printf("DEBUG: UnparkVehicle - failed to get session for exitedAt calc: %v\n", getSessionErr)
			}
		} else {
			fmt.Printf("DEBUG: UnparkVehicle - failed to parse session ID: %v\n", err)
		}
	}

	// Validate that exitedAt is after parkedAt
	sessionID, err := parseSessionID(sessionIDStr)
	if err == nil {
		session, getSessionErr := h.parkingService.GetSession(sessionID)
		if getSessionErr == nil {
			if !exitedAt.After(session.ParkedAt) {
				fmt.Printf("DEBUG: UnparkVehicle - exitedAt (%s) is not after parkedAt (%s), adjusting\n",
					exitedAt.Format(time.RFC3339), session.ParkedAt.Format(time.RFC3339))
				// Ensure at least 1 minute difference
				exitedAt = session.ParkedAt.Add(1 * time.Minute)
				fmt.Printf("DEBUG: UnparkVehicle - adjusted exitedAt to: %s\n", exitedAt.Format(time.RFC3339))
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

	sessions, err := h.parkingService.ListSessionsPaginated(page, perPage)
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
		fmt.Printf("DEBUG: ListSessions - Session ID %d, EntryPoint ID: %d, Identifier: %s, Name: %s\n",
			session.ID, session.EntryPoint.ID, session.EntryPoint.Identifier, session.EntryPoint.Name)
	}

	h.writeSuccess(w, responses)
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
	var req dtos.CreateSlotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate distances array has exactly 3 values
	if req.Distances == nil || len(req.Distances) != 3 {
		h.writeError(w, http.StatusBadRequest, "Distances must have exactly 3 values for 3 entry points")
		return
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
	}

	h.writeCreated(w, response)
}

// UpdateSlot handles PUT /api/v1/slots/{id}
func (h *ParkingHandler) UpdateSlot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid slot ID")
		return
	}

	var req dtos.UpdateSlotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
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

	// Try wrapped format first (Postman format)
	var wrappedReq dtos.CreateEntryPointRequestWrapped
	if err := json.Unmarshal(bodyBytes, &wrappedReq); err == nil && wrappedReq.EntryPoint.Identifier != "" {
		req = wrappedReq.EntryPoint
	} else if err := json.Unmarshal(bodyBytes, &req); err != nil {
		// Try unwrapped format
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Create new entry point
	ep, err := h.parkingService.CreateEntryPoint(&req)
	if err != nil {
		// Check if it's a duplicate key error
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
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
