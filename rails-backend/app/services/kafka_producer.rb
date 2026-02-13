# Kafka Producer Service
# Handles publishing events to Kafka with idempotency guarantees
class KafkaProducer
  include SemanticLogger::Loggable

  class PublishError < StandardError; end

  attr_reader :client

  def initialize
    @client = build_kafka_client
  end

  # Publish an event to Kafka
  def publish(event_type:, event_key:, payload:, correlation_id: nil, causation_id: nil, idempotency_key: nil)
    # Check idempotency
    if idempotency_key && already_published?(event_type, idempotency_key)
      logger.info('Event already published', event_type: event_type, idempotency_key: idempotency_key)
      return
    end

    # Generate event ID
    event_id = SecureRandom.uuid
    topic = KafkaEvent::TOPICS[event_type]

    # Create event record
    event_record = KafkaEvent.create!(
      event_type: event_type,
      topic: topic,
      event_key: event_key,
      event_id: event_id,
      event_payload: payload,
      correlation_id: correlation_id,
      causation_id: causation_id,
      idempotency_key: idempotency_key,
      occurred_at: Time.current,
      status: 'pending',
      metadata: {
        service: 'rails-backend',
        version: '1.0.0'
      }
    )

    # Publish to Kafka
    begin
      result = client.message_sync(
        topic: topic,
        key: event_key,
        payload: payload.to_json,
        partition_key: event_key
      )

      # Update event record with Kafka metadata
      event_record.mark_published!(partition: result.partition, offset: result.offset)

      logger.info('Event published successfully',
                  event_type: event_type,
                  event_id: event_id,
                  topic: topic,
                  partition: result.partition,
                  offset: result.offset)

      event_record
    rescue StandardError => e
      event_record.mark_failed!(error_message: e.message)
      logger.error('Failed to publish event',
                   event_type: event_type,
                   event_id: event_id,
                   error: e.message,
                   backtrace: e.backtrace.first(5))
      raise PublishError, "Failed to publish event: #{e.message}"
    end
  end

  # Publish vehicle parked event
  def vehicle_parked(session:, idempotency_key: nil)
    payload = {
      session_id: session.id,
      vehicle_id: session.vehicle_id,
      vehicle_type: session.vehicle_type,
      slot_id: session.parking_slot_id,
      slot_label: session.parking_slot.slot_label,
      slot_type: session.parking_slot.slot_type,
      entry_point: session.entry_point.identifier,
      parked_at: session.parked_at.iso8601,
      correlation_id: session.correlation_id
    }

    publish(
      event_type: KafkaEvent::VEHICLE_PARKED,
      event_key: session.id,
      payload: payload,
      correlation_id: session.correlation_id,
      idempotency_key: idempotency_key || "park:#{session.id}"
    )
  end

  # Publish vehicle unparked event
  def vehicle_unparked(session:, fee:, breakdown:, idempotency_key: nil)
    payload = {
      session_id: session.id,
      vehicle_id: session.vehicle_id,
      vehicle_type: session.vehicle_type,
      slot_id: session.parking_slot_id,
      slot_label: session.parking_slot.slot_label,
      slot_type: session.parking_slot.slot_type,
      entry_point: session.entry_point.identifier,
      parked_at: session.parked_at.iso8601,
      exited_at: session.exited_at.iso8601,
      duration_hours: breakdown[:duration_hours],
      total_fee: fee,
      fee_breakdown: breakdown,
      correlation_id: session.correlation_id
    }

    publish(
      event_type: KafkaEvent::VEHICLE_UNPARKED,
      event_key: session.id,
      payload: payload,
      correlation_id: session.correlation_id,
      idempotency_key: idempotency_key || "unpark:#{session.id}"
    )
  end

  # Publish slot allocated event
  def slot_allocated(session:, idempotency_key: nil)
    payload = {
      session_id: session.id,
      vehicle_type: session.vehicle_type,
      slot_id: session.parking_slot_id,
      slot_label: session.parking_slot.slot_label,
      slot_type: session.parking_slot.slot_type,
      entry_point: session.entry_point.identifier,
      allocated_at: session.parked_at.iso8601,
      correlation_id: session.correlation_id
    }

    publish(
      event_type: KafkaEvent::SLOT_ALLOCATED,
      event_key: session.parking_slot_id,
      payload: payload,
      correlation_id: session.correlation_id,
      idempotency_key: idempotency_key || "allocate:#{session.parking_slot_id}:#{session.parked_at.to_i}"
    )
  end

  # Publish billing completed event
  def billing_completed(session:, audit_log:, idempotency_key: nil)
    payload = {
      session_id: session.id,
      audit_log_id: audit_log.id,
      vehicle_type: session.vehicle_type,
      slot_label: session.parking_slot.slot_label,
      slot_type: session.parking_slot.slot_type,
      parked_at: session.parked_at.iso8601,
      exited_at: session.exited_at.iso8601,
      total_fee: audit_log.total_fee,
      fee_breakdown: audit_log.fee_breakdown,
      billing_version: audit_log.billing_version,
      calculated_at: audit_log.calculated_at.iso8601,
      correlation_id: session.correlation_id
    }

    publish(
      event_type: KafkaEvent::BILLING_COMPLETED,
      event_key: session.id,
      payload: payload,
      correlation_id: session.correlation_id,
      idempotency_key: idempotency_key || "billing:#{session.id}"
    )
  end

  # Publish session merged event
  def session_merged(original_session:, merged_session:, idempotency_key: nil)
    payload = {
      original_session_id: original_session.id,
      merged_session_id: merged_session.id,
      vehicle_type: merged_session.vehicle_type,
      slot_label: merged_session.parking_slot.slot_label,
      merged_at: merged_session.parked_at.iso8601,
      base_start_time: merged_session.base_start_time.iso8601,
      correlation_id: merged_session.correlation_id
    }

    publish(
      event_type: KafkaEvent::SESSION_MERGED,
      event_key: merged_session.id,
      payload: payload,
      correlation_id: merged_session.correlation_id,
      idempotency_key: idempotency_key || "merge:#{original_session.id}:#{merged_session.id}"
    )
  end

  private

  def build_kafka_client
    WaterDrop::Producer.new do |config|
      config.kafka = {
        'bootstrap.servers': ENV.fetch('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
        'client.id': 'rails-backend-parking'
      }
      config.deliver = true
    end
  end

  def already_published?(event_type, idempotency_key)
    KafkaEvent.for_idempotency(idempotency_key)
              .where(event_type: event_type)
              .where.not(status: 'failed')
              .exists?
  end
end
