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

# Custom metrics
class ParkingMetrics
  def initialize(client)
    @client = client
    setup_metrics
  end

  def setup_metrics
    # Business metrics
    @slot_allocation_duration = @client.register(
      :histogram,
      'parking_slot_allocation_duration_seconds',
      'Time taken to allocate a parking slot'
    )

    @billing_calculation_duration = @client.register(
      :histogram,
      'parking_billing_calculation_duration_seconds',
      'Time taken to calculate parking fees'
    )

    @active_sessions = @client.register(
      :gauge,
      'parking_active_sessions',
      'Number of active parking sessions'
    )

    @slot_utilization = @client.register(
      :gauge,
      'parking_slot_utilization',
      'Parking slot utilization rate by slot type'
    )

    @total_revenue = @client.register(
      :counter,
      'parking_total_revenue',
      'Total parking revenue collected'
    )

    @sessions_by_vehicle_type = @client.register(
      :counter,
      'parking_sessions_by_vehicle_type',
      'Number of parking sessions by vehicle type'
    )

    @billing_errors = @client.register(
      :counter,
      'parking_billing_errors',
      'Number of billing calculation errors'
    )

    @allocation_errors = @client.register(
      :counter,
      'parking_allocation_errors',
      'Number of slot allocation errors'
    )

    @kafka_events_published = @client.register(
      :counter,
      'parking_kafka_events_published',
      'Number of Kafka events published'
    )

    @kafka_events_failed = @client.register(
      :counter,
      'parking_kafka_events_failed',
      'Number of Kafka events that failed to publish'
    )
  rescue StandardError => e
    Rails.logger.error "Failed to setup Prometheus metrics: #{e.message}"
  end

  # Track slot allocation duration
  def track_slot_allocation_duration
    start_time = Time.current
    result = yield
    duration = Time.current - start_time
    @slot_allocation_duration.observe(duration)
    result
  rescue StandardError => e
    begin
      @allocation_errors.increment
    rescue StandardError
      # Silently ignore metric recording errors
    end
    raise e
  end

  # Track billing calculation duration
  def track_billing_calculation_duration
    start_time = Time.current
    result = yield
    duration = Time.current - start_time
    @billing_calculation_duration.observe(duration)
    result
  rescue StandardError => e
    begin
      @billing_errors.increment
    rescue StandardError
      # Silently ignore metric recording errors
    end
    raise e
  end

  # Update active sessions gauge
  def update_active_sessions(count)
    @active_sessions.observe(count)
  rescue StandardError => e
    Rails.logger.warn "Failed to update active sessions metric: #{e.message}"
  end

  # Update slot utilization gauge
  def update_slot_utilization(slot_type, utilization_rate)
    @slot_utilization.observe(utilization_rate, slot_type: slot_type)
  rescue StandardError => e
    Rails.logger.warn "Failed to update slot utilization metric: #{e.message}"
  end

  # Increment total revenue
  def increment_total_revenue(amount)
    @total_revenue.increment(nil, amount)
  rescue StandardError => e
    Rails.logger.warn "Failed to increment total revenue metric: #{e.message}"
  end

  # Increment sessions by vehicle type
  def increment_sessions_by_vehicle_type(vehicle_type)
    @sessions_by_vehicle_type.increment({ vehicle_type: vehicle_type })
  rescue StandardError => e
    Rails.logger.warn "Failed to increment sessions by vehicle type metric: #{e.message}"
  end

  # Increment Kafka events published
  def increment_kafka_events_published(event_type)
    @kafka_events_published.increment({ event_type: event_type })
  rescue StandardError => e
    Rails.logger.warn "Failed to increment kafka events published metric: #{e.message}"
  end

  # Increment Kafka events failed
  def increment_kafka_events_failed(event_type)
    @kafka_events_failed.increment({ event_type: event_type })
  rescue StandardError => e
    Rails.logger.warn "Failed to increment kafka events failed metric: #{e.message}"
  end
end

# Initialize Prometheus with error handling
begin
  require 'prometheus_exporter/middleware'
  require 'prometheus_exporter/instrumentation'

  # Add PrometheusExporter::Middleware to Rails config
  Rails.application.configure do
    config.middleware.use PrometheusExporter::Middleware
  end

  # Initialize metrics (only if not test environment)
  $parking_metrics = ParkingMetrics.new(PrometheusExporter::Client.default)

  # Instrument Sidekiq
  begin
    PrometheusExporter::Instrumentation::Sidekiq.start(
      client: PrometheusExporter::Client.default,
      labels: { service: 'rails-backend' }
    )
  rescue StandardError => e
    Rails.logger.warn "Failed to instrument Sidekiq for Prometheus: #{e.message}"
  end

  # Instrument Process
  begin
    PrometheusExporter::Instrumentation::Process.start(
      type: 'web',
      client: PrometheusExporter::Client.default,
      labels: { service: 'rails-backend' }
    )
  rescue StandardError => e
    Rails.logger.warn "Failed to instrument Process for Prometheus: #{e.message}"
  end
rescue LoadError, StandardError => e
  Rails.logger.warn "Prometheus exporter not available: #{e.message}"

  # Provide no-op fallback so the rest of the app doesn't break
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
end
