# Scheduled job for retrying failed Kafka events
# Ensures event delivery even after temporary failures
class KafkaEventRetryJob
  include Sidekiq::Worker
  include SemanticLogger::Loggable

  sidekiq_options queue: 'kafka_events', retry: 1, backtrace: true

  def perform
    logger.info('Starting Kafka event retry')

    # Find failed events that can be retried
    retryable_events = KafkaEvent
                       .failed
                       .where('retry_count < 5')
                       .order(:occurred_at)
                       .limit(100)

    logger.info("Found #{retryable_events.count} retryable events")

    retryable_events.each do |event|
      logger.info('Retrying event',
                  event_id: event.event_id,
                  event_type: event.event_type,
                  retry_count: event.retry_count)

      # Republish the event
      producer = KafkaProducer.new
      producer.publish(
        event_type: event.event_type,
        event_key: event.event_key,
        payload: event.event_payload,
        correlation_id: event.correlation_id,
        causation_id: event.causation_id,
        idempotency_key: event.idempotency_key
      )

      # Update the original event status to published
      event.update!(status: 'published', error_message: nil)
      logger.info('Event retry successful', event_id: event.event_id)
    rescue StandardError => e
      logger.error('Event retry failed',
                   event_id: event.event_id,
                   error: e.message)

      event.increment_retry!
      event.update!(status: 'retrying', error_message: e.message)
    end

    logger.info('Kafka event retry completed')
  end
end
