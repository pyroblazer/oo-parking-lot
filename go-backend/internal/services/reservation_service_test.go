package services

import (
	"testing"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

func TestValidateReservationWindow(t *testing.T) {
	now := time.Date(2025, 6, 1, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name     string
		start    time.Time
		duration time.Duration
		wantErr  bool
	}{
		{"ok one hour ahead", now.Add(time.Hour), time.Hour, false},
		{"too short", now.Add(time.Hour), 5 * time.Minute, true},
		{"too long", now.Add(time.Hour), 31 * 24 * time.Hour, true},
		{"in the past", now.Add(-time.Hour), time.Hour, true},
		{"too far ahead", now.Add(91 * 24 * time.Hour), time.Hour, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ValidateReservationWindow(tc.start, tc.duration, now)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr = %v", err, tc.wantErr)
			}
		})
	}

	end, err := ValidateReservationWindow(now.Add(time.Hour), 90*time.Minute, now)
	if err != nil || end.Sub(now.Add(time.Hour)) != 90*time.Minute {
		t.Fatalf("end = %v, err = %v", end, err)
	}
}

func TestOverlap(t *testing.T) {
	base := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)
	existingStart, existingEnd := base, base.Add(2*time.Hour)

	overlapping := [][2]time.Time{
		{base.Add(30 * time.Minute), base.Add(3 * time.Hour)},   // inside
		{base.Add(-time.Hour), base.Add(time.Hour)},              // straddles start
		{base.Add(90 * time.Minute), base.Add(95 * time.Minute)}, // contained
	}
	for _, w := range overlapping {
		if !Overlap(w[0], w[1], existingStart, existingEnd) {
			t.Errorf("expected overlap for %v - %v", w[0], w[1])
		}
	}

	disjoint := [][2]time.Time{
		{base.Add(-2 * time.Hour), base},                     // ends exactly when booking starts
		{existingEnd, existingEnd.Add(time.Hour)},            // starts exactly when booking ends
		{base.Add(5 * time.Hour), base.Add(6 * time.Hour)},   // after
	}
	for _, w := range disjoint {
		if Overlap(w[0], w[1], existingStart, existingEnd) {
			t.Errorf("unexpected overlap for %v - %v", w[0], w[1])
		}
	}
}

func TestNormalizePlate(t *testing.T) {
	raw := " b 123 xyz "
	plate, err := NormalizePlate(&raw)
	if err != nil || plate == nil || *plate != "B 123 XYZ" {
		t.Fatalf("plate = %v, err = %v", plate, err)
	}

	if p, err := NormalizePlate(nil); err != nil || p != nil {
		t.Fatalf("nil plate should pass through: %v %v", p, err)
	}

	empty := "   "
	if p, err := NormalizePlate(&empty); err != nil || p != nil {
		t.Fatalf("blank plate should become nil: %v %v", p, err)
	}

	bad := "B;DROP TABLE"
	if _, err := NormalizePlate(&bad); err != ErrInvalidReservation {
		t.Fatalf("invalid plate err = %v", err)
	}
}

func TestValidVehicleType(t *testing.T) {
	for _, vt := range []string{"SP", "MP", "LP"} {
		if !validVehicleType(vt) {
			t.Errorf("%s should be valid", vt)
		}
	}
	for _, vt := range []string{"XL", "", "sp"} {
		if validVehicleType(vt) {
			t.Errorf("%s should be invalid", vt)
		}
	}
}

func TestReservationStatusValues(t *testing.T) {
	// The handler whitelists these exact strings; keep them in sync with the model.
	if models.ReservationActive != "active" || models.ReservationCancelled != "cancelled" ||
		models.ReservationExpired != "expired" || models.ReservationCheckedIn != "checked_in" {
		t.Fatal("reservation status values changed")
	}
}
