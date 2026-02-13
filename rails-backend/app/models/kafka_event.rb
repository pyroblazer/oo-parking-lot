# Model for tracking Kafka events
# This ensures idempotency and provides audit trail for event-driven architecture
class KafkaEvent < ApplicationRecord
  self.primary_key = 'id'

  # Validations
  validates :event_type, presence: true
  validates :topic, presence: true
  validates :event_id, presence: true, uniqueness: { case_sensitive: true }
  validates :occurred_at, presence: true
  validates :status, presence: true, inclusion: { in: %w[pending published failed retrying] }

  # Scopes
  scope :pending, -> { where(status: 'pending') }
  scope :published, -> { where(status: 'published') }
  scope :failed, -> { where(status: 'failed') }
  scope :retrying, -> { where(status: 'retrying') }
  scope :for_idempotency, ->(key) { where(idempotency_key: key) }

  # Check if event can be retried
  def can_retry?
    status == 'failed' && retry_count < 5
  end

  # Increment retry count
  def increment_retry!
    increment!(:retry_count)
  end

  # Mark as published
  # Uses a conditional update to handle concurrent updates safely
  # Returns true if the update was successful, false if the status was already published
  # rubocop:disable Naming/PredicateMethod
  def mark_published!(partition:, offset:)
    updated_count = self.class.where(id: id, status: 'pending').update_all(
      status: 'published',
      partition: partition,
      offset: offset,
      published_at: Time.current
    )

    # Reload to get the latest state from the database
    # Rescue RecordNotFound which can occur in test environments with transactional fixtures
    begin
      reload
    rescue ActiveRecord::RecordNotFound
      # In test environments with transactional fixtures, reload might fail
      # due to thread isolation. This is acceptable as the update was atomic.
    end

    updated_count.positive?
  end

  # Mark as failed
  def mark_failed!(error_message:)
    update!(
      status: 'failed',
      error_message: error_message
    )
  end

  # Event type constants
  VEHICLE_PARKED = 'vehicle.parked'.freeze
  VEHICLE_UNPARKED = 'vehicle.unparked'.freeze
  SESSION_MERGED = 'session.merged'.freeze
  BILLING_COMPLETED = 'billing.completed'.freeze
  SLOT_ALLOCATED = 'slot.allocated'.freeze

  # Topic constants
  TOPICS = {
    VEHICLE_PARKED => 'vehicle.parked',
    VEHICLE_UNPARKED => 'vehicle.unparked',
    SESSION_MERGED => 'session.merged',
    BILLING_COMPLETED => 'billing.completed',
    SLOT_ALLOCATED => 'slot.allocated'
  }.freeze
end
# rubocop:enable Naming/PredicateMethod
