# Prometheus Metrics Configuration
# Business metrics for monitoring and alerting

# Skip Prometheus initialization in test environment
if Rails.env.test?
  # Create a simple mock object for test environment
  $parking_metrics = Object.new
  def $parking_metrics.track_billing_calculation_duration
    yield
  end

  def $parking_metrics.track_slot_allocation_duration
    yield
  end

  def $parking_metrics.update_active_sessions(count)
    # No-op in test environment
  end

  def $parking_metrics.update_slot_utilization(slot_type, utilization_rate)
    # No-op in test environment
  end

  def $parking_metrics.increment_total_revenue(amount)
    # No-op in test environment
  end

  def $parking_metrics.increment_sessions_by_vehicle_type(vehicle_type)
    # No-op in test environment
  end

  def $parking_metrics.increment_kafka_events_published(event_type)
    # No-op in test environment
  end

  def $parking_metrics.increment_kafka_events_failed(event_type)
    # No-op in test environment
  end
  return
end

# Skip prometheus initialization if client doesn't have required methods
begin
  require 'prometheus_exporter/middleware'
  require 'prometheus_exporter/instrumentation'
rescue LoadError, NoMethodError => e
  Rails.logger.warn "Prometheus exporter not available: #{e.message}"
  $parking_metrics = Object.new
  def $parking_metrics.track_billing_calculation_duration
    yield
  end

  def $parking_metrics.track_slot_allocation_duration
    yield
  end

  def $parking_metrics.update_active_sessions(count)
    # No-op
  end

  def $parking_metrics.update_slot_utilization(slot_type, utilization_rate)
    # No-op
  end

  def $parking_metrics.increment_total_revenue(amount)
    # No-op
  end

  def $parking_metrics.increment_sessions_by_vehicle_type(vehicle_type)
    # No-op
  end

  def $parking_metrics.increment_kafka_events_published(event_type)
    # No-op
  end

  def $parking_metrics.increment_kafka_events_failed(event_type)
    # No-op
  end
  return
end

# Temporarily disable prometheus initialization due to API issues
# require 'prometheus_exporter/middleware'
# require 'prometheus_exporter/instrumentation'

# Rails.application.configure do
#   # Add Prometheus middleware
#   config.middleware.use PrometheusExporter::Middleware
#
#   # Configure Prometheus exporter
#   config.prometheus_exporter = {
#     port: ENV.fetch('PROMETHEUS_EXPORTER_PORT', 9394).to_i,
#     timeout: 2,
#     verbose: Rails.env.development?
#   }
# end

# Custom metrics
# class ParkingMetrics
#   def initialize(client)
#     @client = client
#     setup_metrics
#   end
#
#   def setup_metrics
#     # Business metrics
#     @slot_allocation_duration = @client.register_histogram(
#       'parking_slot_allocation_duration_seconds',
#       'Time taken to allocate a parking slot',
#       {},
#       [0.1, 0.5, 1, 2, 5, 10]
#     )
#
#     @billing_calculation_duration = @client.register_histogram(
#       'parking_billing_calculation_duration_seconds',
#       'Time taken to calculate parking fees',
#       {},
#       [0.1, 0.5, 1, 2, 5]
#     )
#
#     @active_sessions = @client.register_gauge(
#       'parking_active_sessions',
#       'Number of active parking sessions'
#     )
#
#     @slot_utilization = @client.register_gauge(
#       'parking_slot_utilization',
#       'Parking slot utilization rate by slot type',
#       labels: [:slot_type]
#     )
#
#     @total_revenue = @client.register_counter(
#       'parking_total_revenue',
#       'Total parking revenue collected'
#     )
#
#     @sessions_by_vehicle_type = @client.register_counter(
#       'parking_sessions_by_vehicle_type',
#       'Number of parking sessions by vehicle type',
#       labels: [:vehicle_type]
#     )
#
#     @billing_errors = @client.register_counter(
#       'parking_billing_errors',
#       'Number of billing calculation errors'
#     )
#
#     @allocation_errors = @client.register_counter(
#       'parking_allocation_errors',
#       'Number of slot allocation errors'
#     )
#
#     @kafka_events_published = @client.register_counter(
#       'parking_kafka_events_published',
#       'Number of Kafka events published',
#       labels: [:event_type]
#     )
#
#     @kafka_events_failed = @client.register_counter(
#       'parking_kafka_events_failed',
#       'Number of Kafka events that failed to publish',
#       labels: [:event_type]
#     )
#   end
#
#   # Track slot allocation duration
#   def track_slot_allocation_duration
#     start_time = Time.current
#     result = yield
#     duration = Time.current - start_time
#     @slot_allocation_duration.observe(duration)
#     result
#   rescue StandardError
#     @allocation_errors.increment
#     raise
#   end
#
#   # Track billing calculation duration
#   def track_billing_calculation_duration
#     start_time = Time.current
#     result = yield
#     duration = Time.current - start_time
#     @billing_calculation_duration.observe(duration)
#     result
#   rescue StandardError
#     @billing_errors.increment
#     raise
#   end
#
#   # Update active sessions gauge
#   def update_active_sessions(count)
#     @active_sessions.set(count)
#   end
#
#   # Update slot utilization gauge
#   def update_slot_utilization(slot_type, utilization_rate)
#     @slot_utilization.set({ slot_type: slot_type }, utilization_rate)
#   end
#
#   # Increment total revenue
#   def increment_total_revenue(amount)
#     @total_revenue.increment(by: amount)
#   end
#
#   # Increment sessions by vehicle type
#   def increment_sessions_by_vehicle_type(vehicle_type)
#     @sessions_by_vehicle_type.increment(labels: { vehicle_type: vehicle_type })
#   end
#
#   # Increment Kafka events published
#   def increment_kafka_events_published(event_type)
#     @kafka_events_published.increment(labels: { event_type: event_type })
#   end
#
#   # Increment Kafka events failed
#   def increment_kafka_events_failed(event_type)
#     @kafka_events_failed.increment(labels: { event_type: event_type })
#   end
# end
#
# # Initialize metrics (only if not test environment)
# unless Rails.env.test?
#   $parking_metrics = ParkingMetrics.new(PrometheusExporter::Client.default)
#
#   # Instrument Sidekiq
#   PrometheusExporter::Instrumentation::Sidekiq.start(
#     client: PrometheusExporter::Client.default,
#     labels: { service: 'rails-backend' }
#   )
#
#   # Instrument Process
#   PrometheusExporter::Instrumentation::Process.start(
#     type: 'web',
#     client: PrometheusExporter::Client.default,
#     labels: { service: 'rails-backend' }
#   )
# end
