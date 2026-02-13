# Worker for publishing Kafka events
# Handles asynchronous event publishing with retry logic
class KafkaEventWorker
  include Sidekiq::Worker
  include SemanticLogger::Loggable

  sidekiq_options queue: 'kafka_events', retry: 5, backtrace: true

  def perform(event_type, event_key, payload, options = {})
    correlation_id = options['correlation_id']
    options['causation_id']
    idempotency_key = options['idempotency_key']

    logger.info('Publishing Kafka event',
                event_type: event_type,
                event_key: event_key,
                correlation_id: correlation_id)

    producer = KafkaProducer.new

    case event_type
    when KafkaEvent::VEHICLE_PARKED
      session = ParkingSession.find(event_key)
      producer.vehicle_parked(session: session, idempotency_key: idempotency_key)
    when KafkaEvent::VEHICLE_UNPARKED
      session = ParkingSession.find(event_key)
      fee = options['fee']
      breakdown = options['breakdown']
      producer.vehicle_unparked(session: session, fee: fee, breakdown: breakdown, idempotency_key: idempotency_key)
    when KafkaEvent::SLOT_ALLOCATED
      session = ParkingSession.find(options['session_id'])
      producer.slot_allocated(session: session, idempotency_key: idempotency_key)
    when KafkaEvent::BILLING_COMPLETED
      session = ParkingSession.find(event_key)
      audit_log_id = payload['audit_log_id'] || options['audit_log_id']
      audit_log = BillingAuditLog.find(audit_log_id)
      producer.billing_completed(session: session, audit_log: audit_log, idempotency_key: idempotency_key)
    when KafkaEvent::SESSION_MERGED
      original_session = ParkingSession.find(options['original_session_id'])
      merged_session = ParkingSession.find(event_key)
      producer.session_merged(original_session: original_session, merged_session: merged_session, idempotency_key: idempotency_key)
    else
      logger.error('Unknown event type', event_type: event_type)
      raise ArgumentError, "Unknown event type: #{event_type}"
    end

    logger.info('Kafka event published successfully', event_type: event_type, event_key: event_key)
  end
end
