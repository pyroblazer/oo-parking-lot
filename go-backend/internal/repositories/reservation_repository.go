package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// ReservationRepository handles reservation data operations.
type ReservationRepository struct {
	db *sql.DB
}

func NewReservationRepository(db *sql.DB) *ReservationRepository {
	return &ReservationRepository{db: db}
}

const reservationColumns = `id, parking_slot_id, vehicle_type, license_plate, start_time, end_time, status, created_at, updated_at`

// Create inserts a new reservation.
func (r *ReservationRepository) Create(res *models.Reservation) error {
	return r.db.QueryRow(`
		INSERT INTO reservations (parking_slot_id, vehicle_type, license_plate, start_time, end_time, status)
		VALUES ($1, $2, $3, $4, $5, 'active')
		RETURNING id, created_at, updated_at`,
		res.ParkingSlot.ID, res.VehicleType, res.LicensePlate, res.StartTime, res.EndTime,
	).Scan(&res.ID, &res.CreatedAt, &res.UpdatedAt)
}

// GetByID fetches one reservation joined with its slot.
func (r *ReservationRepository) GetByID(id int64) (*models.Reservation, error) {
	row := r.db.QueryRow(`
		SELECT res.`+reservationColumns+`, ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at
		FROM reservations res
		JOIN parking_slots ps ON ps.id = res.parking_slot_id
		WHERE res.id = $1`, id)
	return scanReservationWithSlot(row).Get()
}

// List returns reservations filtered by status, newest first.
func (r *ReservationRepository) List(status string) ([]models.Reservation, error) {
	query := `
		SELECT res.` + reservationColumns + `, ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at
		FROM reservations res
		JOIN parking_slots ps ON ps.id = res.parking_slot_id`
	args := []any{}
	if status != "" {
		query += ` WHERE res.status = $1`
		args = append(args, status)
	}
	query += ` ORDER BY res.start_time ASC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Reservation
	for rows.Next() {
		res, err := scanReservationWithSlot(rows).Get()
		if err != nil {
			return nil, err
		}
		out = append(out, *res)
	}
	return out, rows.Err()
}

// SlotHasOverlap reports whether the slot already has an active reservation
// overlapping [start, end).
func (r *ReservationRepository) SlotHasOverlap(slotID int64, start, end time.Time) (bool, error) {
	var count int
	err := r.db.QueryRow(`
		SELECT COUNT(*) FROM reservations
		WHERE parking_slot_id = $1
		  AND status = 'active'
		  AND start_time < $3 AND end_time > $2`,
		slotID, start, end,
	).Scan(&count)
	return count > 0, err
}

// UpdateStatus transitions a reservation to a new status.
func (r *ReservationRepository) UpdateStatus(id int64, status models.ReservationStatus) error {
	res, err := r.db.Exec(`UPDATE reservations SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, id, status)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("reservation %d not found", id)
	}
	return nil
}

// MarkExpired flips past-due active reservations to expired.
func (r *ReservationRepository) MarkExpired(now time.Time) (int64, error) {
	res, err := r.db.Exec(`
		UPDATE reservations SET status = 'expired', updated_at = CURRENT_TIMESTAMP
		WHERE status = 'active' AND end_time < $1`, now)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

type rowScanner interface{ Scan(dest ...any) error }

type reservationOrError struct {
	res *models.Reservation
	err error
}

func (r reservationOrError) Get() (*models.Reservation, error) { return r.res, r.err }

func scanReservationWithSlot(row rowScanner) reservationOrError {
	var res models.Reservation
	var distancesJSON []byte
	var licensePlate sql.NullString
	err := row.Scan(
		&res.ID, &res.ParkingSlot.ID, &res.VehicleType, &licensePlate,
		&res.StartTime, &res.EndTime, &res.Status, &res.CreatedAt, &res.UpdatedAt,
		&res.ParkingSlot.ID, &res.ParkingSlot.SlotLabel, &res.ParkingSlot.SlotType,
		&distancesJSON, &res.ParkingSlot.CreatedAt, &res.ParkingSlot.UpdatedAt,
	)
	if err != nil {
		return reservationOrError{err: err}
	}
	if licensePlate.Valid {
	 plate := licensePlate.String
		res.LicensePlate = &plate
	}
	if err := res.ParkingSlot.Scan(distancesJSON); err != nil {
		return reservationOrError{err: err}
	}
	return reservationOrError{res: &res}
}
