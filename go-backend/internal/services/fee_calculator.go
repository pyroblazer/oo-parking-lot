// Package services provides business logic for parking lot operations.
package services

import (
	"log"
	"math"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

const (
	// BaseRate is the base parking rate for the first 3 hours
	BaseRate float64 = 40.0
	// BaseDuration is the duration covered by the base rate
	BaseDuration float64 = 3.0
	// LongTermRate is the daily rate for long-term parking
	LongTermRate float64 = 5000.0
	// LongTermHours defines what constitutes a full day
	LongTermHours float64 = 24.0
)

// HourlyRates maps slot types to their hourly rates
var HourlyRates = map[models.SlotType]float64{
	models.SlotTypeSmall:  20.0,
	models.SlotTypeMedium: 60.0,
	models.SlotTypeLarge:  100.0,
}

// FeeCalculator handles parking fee calculations
type FeeCalculator struct {
	session          *models.ParkingSession
	previousSessions []*models.ParkingSession
	exitedAt         *time.Time // Optional override for testing
}

// NewFeeCalculator creates a new fee calculator
func NewFeeCalculator(session *models.ParkingSession) *FeeCalculator {
	return &FeeCalculator{session: session, previousSessions: []*models.ParkingSession{}, exitedAt: nil}
}

// SetPreviousSessions sets the previous sessions for continuous parking check
func (fc *FeeCalculator) SetPreviousSessions(previousSessions []*models.ParkingSession) {
	fc.previousSessions = previousSessions
}

// SetExitedAt sets the optional exited_at for testing purposes
func (fc *FeeCalculator) SetExitedAt(exitedAt *time.Time) {
	fc.exitedAt = exitedAt
}

// Calculate calculates total parking fee
func (fc *FeeCalculator) Calculate() float64 {
	duration := fc.calculateDuration()
	slotType := fc.session.ParkingSlot.SlotType

	// Calculate long-term parking (24+ hours)
	fullDays, remainingHours := fc.calculateLongTerm(duration)
	// Long-term fee is a flat rate for each full day (5000 pesos per 24 hours)
	// The base rate is NOT included in the long-term rate
	longTermFee := float64(fullDays) * LongTermRate

	// Calculate fee for remaining hours
	remainingFee := fc.calculateRemainingFee(remainingHours, slotType)

	// Debug logging
	log.Printf("DEBUG: Go FeeCalculator.Calculate - duration=%.6f, fullDays=%d, remainingHours=%.6f, longTermFee=%.2f, remainingFee=%.2f, totalFee=%.2f",
		duration, fullDays, remainingHours, longTermFee, remainingFee, longTermFee+remainingFee)

	return longTermFee + remainingFee
}

// Breakdown returns a detailed fee breakdown
func (fc *FeeCalculator) Breakdown() dtos.FeeBreakdown {
	duration := fc.calculateDuration()
	slotType := fc.session.ParkingSlot.SlotType

	fullDays, remainingHours := fc.calculateLongTerm(duration)
	// Long-term fee is a flat rate for each full day (5000 pesos per 24 hours)
	// The base rate is NOT included in the long-term rate
	longTermFee := float64(fullDays) * LongTermRate

	remainingBreakdown := fc.calculateRemainingBreakdown(remainingHours, slotType)

	// Check for continuous parking and calculate base start time
	isContinuous := fc.session.IsContinuous(fc.previousSessions)
	baseStartTime := ""
	if isContinuous {
		baseStart := fc.session.CalculateBaseStartTime(fc.previousSessions, []int64{})
		baseStartTime = baseStart.UTC().Format(time.RFC3339)
	}

	return dtos.FeeBreakdown{
		TotalFee:      longTermFee + remainingBreakdown.Total,
		DurationHours: math.Ceil(duration - 0.000001),
		IsContinuous:  isContinuous,
		BaseStartTime: baseStartTime,
		Rate:          BaseRate,
		LongTerm: dtos.LongTermInfo{
			Days: fullDays,
			Fee:  longTermFee,
		},
		Remaining: remainingBreakdown,
	}
}

// calculateDuration calculates total duration in hours
func (fc *FeeCalculator) calculateDuration() float64 {
	exitTime := time.Now()
	if fc.exitedAt != nil {
		exitTime = *fc.exitedAt
	}

	// Calculate duration and ensure it's non-negative
	duration := exitTime.Sub(fc.session.ParkedAt).Hours()
	if duration < 0 {
		return 0
	}
	return duration
}

// calculateLongTerm calculates full 24-hour blocks
func (fc *FeeCalculator) calculateLongTerm(duration float64) (int, float64) {
	fullDays := int(math.Floor(duration / LongTermHours))
	remainingHours := duration - (float64(fullDays) * LongTermHours)
	return fullDays, remainingHours
}

// calculateRemainingFee calculates fee for remaining hours
func (fc *FeeCalculator) calculateRemainingFee(hours float64, slotType models.SlotType) float64 {
	if hours <= 0 {
		return 0
	}

	// Check if hours are within base duration BEFORE rounding (matches Ruby behavior)
	// Use small epsilon to handle floating point precision issues
	if hours <= BaseDuration+0.000001 {
		log.Printf("DEBUG: Go calculateRemainingFee - within base duration: hours=%.6f, baseDuration=%.0f, fee=%.2f",
			hours, BaseDuration, BaseRate)
		return BaseRate
	}

	// Round up hours for exceeding fee calculation
	// Use small epsilon to handle floating point precision issues
	hoursRounded := math.Ceil(hours - 0.000001)
	log.Printf("DEBUG: Go calculateRemainingFee - BEFORE rounding: hours=%.15f, hoursRounded=%.15f", hours, hoursRounded)

	hourlyRate := HourlyRates[slotType]
	exceedingHours := hoursRounded - BaseDuration
	exceedingFee := exceedingHours * hourlyRate
	totalFee := BaseRate + exceedingFee

	log.Printf("DEBUG: Go calculateRemainingFee - exceeding hours: hours=%.6f, hoursRounded=%.0f, baseDuration=%.0f, exceedingHours=%.0f, hourlyRate=%.2f, baseFee=%.2f, exceedingFee=%.2f, totalFee=%.2f",
		hours, hoursRounded, BaseDuration, exceedingHours, hourlyRate, BaseRate, exceedingFee, totalFee)

	return totalFee
}

// calculateRemainingBreakdown returns detailed breakdown for remaining hours
func (fc *FeeCalculator) calculateRemainingBreakdown(hours float64, slotType models.SlotType) dtos.RemainingInfo {
	if hours <= 0 {
		return dtos.RemainingInfo{
			Total:          0,
			BaseFee:        0,
			ExceedingHours: 0,
			ExceedingFee:   0,
			HourlyRate:     HourlyRates[slotType],
		}
	}

	// Check if hours are within base duration BEFORE rounding (matches Ruby behavior)
	// Use small epsilon to handle floating point precision issues
	if hours <= BaseDuration+0.000001 {
		return dtos.RemainingInfo{
			Total:          BaseRate,
			BaseFee:        BaseRate,
			ExceedingHours: 0,
			ExceedingFee:   0,
		}
	}

	// Round up hours for exceeding fee calculation
	// Use small epsilon to handle floating point precision issues
	hoursRounded := math.Ceil(hours - 0.000001)
	exceedingHours := hoursRounded - BaseDuration
	hourlyRate := HourlyRates[slotType]
	exceedingFee := exceedingHours * hourlyRate

	return dtos.RemainingInfo{
		Total:          BaseRate + exceedingFee,
		BaseFee:        BaseRate,
		ExceedingHours: int(exceedingHours),
		ExceedingFee:   exceedingFee,
		HourlyRate:     hourlyRate,
	}
}
