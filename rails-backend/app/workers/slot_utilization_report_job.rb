# Scheduled job for generating slot utilization reports
# Tracks slot performance and availability
class SlotUtilizationReportJob
  include Sidekiq::Worker
  include SemanticLogger::Loggable

  sidekiq_options queue: 'analytics', retry: 1, backtrace: true

  def perform
    logger.info('Starting slot utilization report generation')

    # Overall slot utilization
    total_slots = ParkingSlot.count
    occupied_slots = total_slots - ParkingSlot.available.count
    available_slots = ParkingSlot.available.count
    maintenance_slots = 0 # No maintenance status column - would require migration if needed

    # Utilization by slot type
    utilization_by_type = ParkingSlot.group(:slot_type).group(:status).count

    # Most frequently used slots
    slot_usage = ParkingSession
                 .group(:parking_slot_id)
                 .count
                 .sort_by { |_, count| -count }
                 .first(10)

    # Average occupancy duration by slot type
    avg_occupancy_by_type = {}
    %w[SP MP LP].each do |slot_type|
      sessions = ParkingSession.joins(:parking_slot)
                               .where(parking_slots: { slot_type: slot_type })
                               .where.not(exited_at: nil)

      if sessions.any?
        avg_duration = sessions.sum { |s| (s.exited_at - s.parked_at) / 3600.0 } / sessions.count
        avg_occupancy_by_type[slot_type] = avg_duration.round(2)
      else
        avg_occupancy_by_type[slot_type] = 0
      end
    end

    # Calculate utilization rate using BigDecimal for precision
    # Return nil when there are no slots (division by zero)
    utilization_rate = ((BigDecimal(occupied_slots.to_s) / BigDecimal(total_slots.to_s) * BigDecimal('100')).round(2) if total_slots.positive?)

    report = {
      timestamp: Time.current,
      overall: {
        total_slots: total_slots,
        occupied_slots: occupied_slots,
        available_slots: available_slots,
        maintenance_slots: maintenance_slots,
        utilization_rate: utilization_rate
      },
      by_type: utilization_by_type,
      most_used_slots: slot_usage.map { |slot_id, count| { slot_id: slot_id, usage_count: count } },
      average_occupancy_hours_by_type: avg_occupancy_by_type
    }

    logger.info('Slot utilization report generated', report: report)

    # Store report metadata for Prometheus metrics
    PrometheusExporter::Client.default.send_json(
      type: 'slot_utilization_report',
      metrics: report
    )

    report
  end
end
