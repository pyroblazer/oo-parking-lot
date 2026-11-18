package services

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
)

var (
	// ErrNoReservableSlot is returned when every matching slot already has an
	// overlapping booking.
	ErrNoReservableSlot = errors.New("no parking slot available for the requested time")
	// ErrReservationNotFound is returned for an unknown reservation id.
	ErrReservationNotFound = errors.New("reservation not found")
	// ErrInvalidReservation is returned for malformed booking input.
	ErrInvalidReservation = errors.New("invalid reservation")
)

// Reservation limits: a booking must be at least 15 minutes and at most 30
// days, and cannot start more than 90 days ahead.
const (
	MinReservation = 15 * time.Minute
	MaxReservation = 30 * 24 * time.Hour
	MaxLeadTime    = 90 * 24 * time.Hour
)

var licensePlatePattern = regexp.MustCompile(`^[A-Za-z0-9 -]{2,20}$`)

// NormalizePlate validates and normalizes a license plate (" b 123 xyz " -> "B 123 XYZ").
func NormalizePlate(plate *string) (*string, error) {
	if plate == nil || strings.TrimSpace(*plate) == "" {
		return nil, nil
	}
	normalized := strings.ToUpper(strings.Join(strings.Fields(*plate), " "))
	if !licensePlatePattern.MatchString(normalized) {
		return nil, ErrInvalidReservation
	}
	return &normalized, nil
}

// ValidateReservationWindow checks the booking window and returns the end time.
func ValidateReservationWindow(start time.Time, duration time.Duration, now time.Time) (time.Time, error) {
	if duration < MinReservation {
		return time.Time{}, ErrInvalidReservation
	}
	if duration > MaxReservation {
		return time.Time{}, ErrInvalidReservation
	}
	if start.Before(now.Add(-time.Minute)) {
		return time.Time{}, ErrInvalidReservation // cannot book in the past
	}
	if start.After(now.Add(MaxLeadTime)) {
		return time.Time{}, ErrInvalidReservation
	}
	return start.Add(duration), nil
}

// Overlap reports whether [aStart,aEnd) intersects [bStart,bEnd).
func Overlap(aStart, aEnd, bStart, bEnd time.Time) bool {
	return aStart.Before(bEnd) && bStart.Before(aEnd)
}

// ReservationService books slots ahead of arrival.
type ReservationService struct {
	reservations *repositories.ReservationRepository
	slots        *repositories.ParkingSlotRepository
}

func NewReservationService(reservations *repositories.ReservationRepository, slots *repositories.ParkingSlotRepository) *ReservationService {
	return &ReservationService{reservations: reservations, slots: slots}
}

// Create books the first matching slot whose active bookings do not overlap
// the requested window.
func (s *ReservationService) Create(vehicleType string, licensePlate *string, start time.Time, duration time.Duration, now time.Time) (*models.Reservation, error) {
	if !validVehicleType(vehicleType) {
		return nil, ErrInvalidVehicleType
	}
	plate, err := NormalizePlate(licensePlate)
	if err != nil {
		return nil, err
	}
	end, err := ValidateReservationWindow(start, duration, now)
	if err != nil {
		return nil, err
	}

	available, err := s.slots.GetAvailable()
	if err != nil {
		return nil, err
	}
	var slots []*models.ParkingSlot
	for _, slot := range available {
		if string(slot.SlotType) == vehicleType {
			slots = append(slots, slot)
		}
	}
	if len(slots) == 0 {
		return nil, ErrNoReservableSlot
	}

	for _, slot := range slots {
		overlaps, err := s.reservations.SlotHasOverlap(slot.ID, start, end)
		if err != nil {
			return nil, err
		}
		if !overlaps {
			res := &models.Reservation{
				ParkingSlot:  *slot,
				VehicleType:  vehicleType,
				LicensePlate: plate,
				StartTime:    start,
				EndTime:      end,
				Status:       models.ReservationActive,
			}
			if err := s.reservations.Create(res); err != nil {
				return nil, err
			}
			return res, nil
		}
	}
	return nil, ErrNoReservableSlot
}

func (s *ReservationService) List(status string, now time.Time) ([]models.Reservation, error) {
	if _, err := s.reservations.MarkExpired(now); err != nil {
		return nil, err
	}
	return s.reservations.List(status)
}

func (s *ReservationService) Cancel(id int64) error {
	res, err := s.reservations.GetByID(id)
	if err != nil {
		return ErrReservationNotFound
	}
	if res.Status != models.ReservationActive {
		return ErrInvalidReservation
	}
	return s.reservations.UpdateStatus(id, models.ReservationCancelled)
}

func validVehicleType(vehicleType string) bool {
	switch models.SlotType(vehicleType) {
	case models.SlotTypeSmall, models.SlotTypeMedium, models.SlotTypeLarge:
		return true
	}
	return false
}
