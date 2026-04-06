# BillingAuditLog
# Immutable billing logs for regulatory-grade traceability
class BillingAuditLog < ApplicationRecord
  self.table_name = 'billing_audit_logs'

  # Associations
  belongs_to :parking_session, optional: false

  # Validations
  validates :vehicle_type, presence: true, inclusion: { in: %w[S M L] }
  validates :slot_label, presence: true
  validates :slot_type, presence: true, inclusion: { in: %w[SP MP LP] }
  validates :entry_point, presence: true
  validates :total_fee, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :calculated_at, presence: true
  validates :duration_hours, numericality: { greater_than_or_equal_to: 0 }

  # Scopes
  scope :by_vehicle_type, ->(vehicle_type) { where(vehicle_type: vehicle_type) }
  scope :by_entry_point, ->(entry_point) { where(entry_point: entry_point) }
  scope :continuous, -> { where(is_continuous: true) }
  scope :long_term, -> { where.not(long_term_days: nil).where('long_term_days > 0') }
  scope :recent, ->(hours = 24) { where(calculated_at: hours.hours.ago..) }

  # Instance methods
  def breakdown
    fee_breakdown || {}
  end

  def to_h
    {
      id: id,
      parking_session_id: parking_session_id,
      vehicle_type: vehicle_type,
      slot_label: slot_label,
      slot_type: slot_type,
      entry_point: entry_point,
      parked_at: parked_at,
      exited_at: exited_at,
      total_fee: total_fee,
      base_fee: base_fee,
      exceeding_fee: exceeding_fee,
      exceeding_hours: exceeding_hours,
      long_term_days: long_term_days,
      long_term_fee: long_term_fee,
      duration_hours: duration_hours,
      is_continuous: is_continuous,
      base_start_time: base_start_time,
      fee_breakdown: breakdown,
      correlation_id: correlation_id,
      idempotency_key: idempotency_key,
      billing_version: billing_version,
      calculated_at: calculated_at
    }
  end
end
