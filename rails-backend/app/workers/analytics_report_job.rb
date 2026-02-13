# Scheduled job for generating daily analytics reports
# Provides business insights and KPIs
class AnalyticsReportJob
  include Sidekiq::Worker
  include SemanticLogger::Loggable

  sidekiq_options queue: 'analytics', retry: 1, backtrace: true

  def perform
    logger.info('Starting analytics report generation')

    yesterday = 1.day.ago.beginning_of_day
    today = Time.current.beginning_of_day

    # Daily parking sessions
    daily_sessions = ParkingSession.where(parked_at: yesterday..today)

    total_sessions = daily_sessions.count
    active_sessions = daily_sessions.where(exited_at: nil).count
    completed_sessions = daily_sessions.where.not(exited_at: nil).count

    # Revenue
    total_revenue = daily_sessions.where.not(total_fee: nil).sum(:total_fee)

    # Vehicle type distribution
    vehicle_distribution = daily_sessions.group(:vehicle_type).count

    # Slot utilization
    total_slots = ParkingSlot.count
    occupied_slots = total_slots - ParkingSlot.available.count
    # Calculate utilization rate using BigDecimal for precision
    # Return nil when there are no slots (division by zero)
    utilization_rate = ((BigDecimal(occupied_slots.to_s) / BigDecimal(total_slots.to_s) * BigDecimal('100')).round(2) if total_slots.positive?)

    # Average session duration
    avg_duration = if completed_sessions.positive?
                     daily_sessions.where.not(exited_at: nil)
                                   .map { |s| (s.exited_at - s.parked_at) / 3600.0 }
                                   .sum / completed_sessions
                   else
                     0
                   end

    report = {
      date: yesterday.to_date,
      total_sessions: total_sessions,
      active_sessions: active_sessions,
      completed_sessions: completed_sessions,
      total_revenue: total_revenue,
      vehicle_distribution: vehicle_distribution,
      slot_utilization: {
        total_slots: total_slots,
        occupied_slots: occupied_slots,
        utilization_rate: utilization_rate
      },
      average_session_duration_hours: avg_duration.round(2)
    }

    logger.info('Analytics report generated', report: report)

    # Store report metadata for Prometheus metrics
    PrometheusExporter::Client.default.send_json(
      type: 'analytics_report',
      metrics: report
    )

    report
  end
end
