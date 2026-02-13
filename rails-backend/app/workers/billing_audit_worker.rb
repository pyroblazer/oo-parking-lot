# Worker for creating billing audit logs
# Handles asynchronous audit log creation for regulatory compliance
class BillingAuditWorker
  include Sidekiq::Worker
  include SemanticLogger::Loggable

  sidekiq_options queue: 'billing', retry: 3, backtrace: true

  def perform(session_id, fee, breakdown)
    logger.info('Creating billing audit log', session_id: session_id)

    session = ParkingSession.find(session_id)

    audit_log = BillingAuditLog.create!(
      parking_session_id: session.id,
      vehicle_type: session.vehicle_type,
      slot_label: session.parking_slot.slot_label,
      slot_type: session.parking_slot.slot_type,
      entry_point: session.entry_point.identifier,
      parked_at: session.parked_at,
      exited_at: session.exited_at,
      total_fee: fee,
      base_fee: breakdown[:base_fee],
      exceeding_fee: breakdown[:exceeding_fee],
      exceeding_hours: breakdown[:exceeding_hours],
      long_term_days: breakdown.dig(:long_term, :days) || 0,
      long_term_fee: breakdown.dig(:long_term, :fee) || 0,
      duration_hours: breakdown[:duration_hours],
      is_continuous: breakdown[:is_continuous],
      base_start_time: breakdown[:base_start_time],
      fee_breakdown: breakdown,
      correlation_id: session.correlation_id,
      idempotency_key: "audit:#{session.id}",
      calculated_at: Time.current
    )

    logger.info('Billing audit log created', audit_log_id: audit_log.id)

    # Publish billing completed event
    KafkaEventWorker.perform_async(
      KafkaEvent::BILLING_COMPLETED,
      session_id,
      { 'audit_log_id' => audit_log.id },
      {
        'correlation_id' => session.correlation_id,
        'idempotency_key' => "billing:#{session.id}"
      }
    )

    audit_log
  end
end
