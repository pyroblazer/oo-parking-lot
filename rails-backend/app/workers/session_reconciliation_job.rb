# Scheduled job for session reconciliation
# Detects anomalies and ensures data consistency
class SessionReconciliationJob
  include Sidekiq::Worker
  include SemanticLogger::Loggable

  sidekiq_options queue: 'audit', retry: 1, backtrace: true

  def perform
    logger.info('Starting session reconciliation')

    # Find active sessions that have been active for more than 24 hours
    long_active_sessions = ParkingSession
                           .where(exited_at: nil)
                           .where('parked_at < ?', 24.hours.ago)

    logger.info("Found #{long_active_sessions.count} long-active sessions")

    long_active_sessions.each do |session|
      logger.warn('Long-active session detected',
                  session_id: session.id,
                  parked_at: session.parked_at,
                  duration_hours: ((Time.current - session.parked_at) / 3600.0).round(2))

      # Send alert to monitoring
      Sentry.capture_message(
        'Long-active parking session detected',
        level: 'warning',
        extra: {
          session_id: session.id,
          parked_at: session.parked_at,
          duration_hours: ((Time.current - session.parked_at) / 3600.0).round(2)
        }
      )
    end

    # Find sessions with inconsistent state
    inconsistent_sessions = ParkingSession
                            .where.not(state: %w[active exited])
                            .where(exited_at: nil)

    logger.info("Found #{inconsistent_sessions.count} inconsistent sessions")

    inconsistent_sessions.each do |session|
      logger.error('Inconsistent session state',
                   session_id: session.id,
                   state: session.state,
                   exited_at: session.exited_at)

      # Attempt to fix state
      session.update!(state: 'active')
    end

    # Check for orphaned slots (slots that should be available but have no active session)
    # A slot is considered orphaned if it has no active parking sessions
    orphaned_slots = ParkingSlot.all.select do |slot|
      !slot.available? && slot.parking_sessions.where(exited_at: nil).empty?
    end

    logger.info("Found #{orphaned_slots.count} orphaned slots")

    orphaned_slots.each do |slot|
      logger.warn('Orphaned slot detected',
                  slot_id: slot.id,
                  slot_label: slot.slot_label)

      # NOTE: Slot status is determined by active sessions, not a status column
      # This log entry serves as documentation for manual review if needed
    end

    logger.info('Session reconciliation completed')
  end
end
