package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// writeReservationJSON writes a JSON response with the shared content type.
func writeReservationJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// ReservationHandler handles booking-ahead HTTP requests.
type ReservationHandler struct {
	reservationService *services.ReservationService
}

func NewReservationHandler(reservationService *services.ReservationService) *ReservationHandler {
	return &ReservationHandler{reservationService: reservationService}
}

// Create handles POST /api/v1/reservations.
func (h *ReservationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		VehicleType   string  `json:"vehicle_type"`
		LicensePlate  *string `json:"license_plate"`
		StartTime     string  `json:"start_time"`
		DurationHours float64 `json:"duration_hours"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	start := time.Now().UTC()
	if req.StartTime != "" {
		parsed, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			http.Error(w, "start_time must be RFC3339", http.StatusBadRequest)
			return
		}
		start = parsed
	}
	if req.DurationHours <= 0 || req.DurationHours > 24*30 {
		http.Error(w, "duration_hours must be between 0 and 720", http.StatusBadRequest)
		return
	}

	res, err := h.reservationService.Create(req.VehicleType, req.LicensePlate, start, time.Duration(req.DurationHours*float64(time.Hour)), time.Now().UTC())
	if err != nil {
		switch err {
		case services.ErrInvalidVehicleType, services.ErrInvalidReservation:
			http.Error(w, err.Error(), http.StatusBadRequest)
		case services.ErrNoReservableSlot:
			http.Error(w, err.Error(), http.StatusConflict)
		default:
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	writeReservationJSON(w, http.StatusCreated, res)
}

// List handles GET /api/v1/reservations?status=active
func (h *ReservationHandler) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && status != "active" && status != "cancelled" && status != "expired" && status != "checked_in" {
		http.Error(w, "invalid status filter", http.StatusBadRequest)
		return
	}
	list, err := h.reservationService.List(status, time.Now().UTC())
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []models.Reservation{}
	}
	writeReservationJSON(w, http.StatusOK, list)
}

// Cancel handles POST /api/v1/reservations/{id}/cancel
func (h *ReservationHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	if err != nil || id <= 0 {
		http.Error(w, "invalid reservation id", http.StatusBadRequest)
		return
	}
	if err := h.reservationService.Cancel(id); err != nil {
		switch err {
		case services.ErrReservationNotFound:
			http.Error(w, err.Error(), http.StatusNotFound)
		case services.ErrInvalidReservation:
			http.Error(w, "only active reservations can be cancelled", http.StatusConflict)
		default:
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	writeReservationJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}
