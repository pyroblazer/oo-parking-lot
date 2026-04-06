# OpenTelemetry Configuration
# Distributed tracing for end-to-end observability

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

# Skip OpenTelemetry initialization in test and development environment to avoid frozen array issues
if Rails.env.local?
  # Define stub Tracing module for test/development environment
  module Tracing
    def self.included(base)
      base.extend(ClassMethods)
    end

    module ClassMethods
      def trace_instrumentation(name)
        define_method(name) do |*args, &block|
          super(*args, &block)
        end
      end
    end

    def tracer
      OpenTelemetry.tracer_provider.tracer('rails-backend', '1.0.0')
    end

    def with_span(name, attributes: {})
      # Create a mock span object for test/development environment
      mock_span = Object.new
      def mock_span.set_attribute(key, value)
        # No-op in test/development environment
      end

      def mock_span.record_exception(error)
        # No-op in test/development environment
      end

      def mock_span.status=(value)
        # No-op in test/development environment
      end
      yield mock_span
    end

    def set_error(span, error)
      # No-op in test/development environment
    end
  end

  return
end

Rails.application.configure do
  # Initialize OpenTelemetry
  OpenTelemetry::SDK.configure do |c|
    c.service_name = ENV.fetch('OTEL_SERVICE_NAME', 'rails-backend')
    c.service_version = ENV.fetch('APP_VERSION', '1.0.0')
    c.use_all # Enable all instrumentations

    # Configure sampling
    if Rails.env.production?
      c.add_span_processor(
        OpenTelemetry::SDK::Trace::Export::BatchSpanProcessor.new(
          OpenTelemetry::Exporter::OTLP::Exporter.new(
            endpoint: ENV.fetch('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
            headers: {
              'Authorization' => "Bearer #{ENV['OTEL_EXPORTER_OTLP_HEADERS']}"
            }.compact
          )
        )
      )
    else
      # Development: use console exporter with always-on sampling
      c.add_span_processor(
        OpenTelemetry::SDK::Trace::Export::SimpleSpanProcessor.new(
          OpenTelemetry::SDK::Trace::Export::ConsoleSpanExporter.new
        )
      )
    end
  end
end

# Custom tracing module
module Tracing
  def self.included(base)
    base.extend(ClassMethods)
  end

  module ClassMethods
    def trace_instrumentation(name)
      define_method(name) do |*args, &block|
        tracer.in_span(
          "#{self.class.name}##{name}",
          attributes: {
            'service.name' => 'rails-backend',
            'service.version' => ENV.fetch('APP_VERSION', '1.0.0'),
            'correlation_id' => Thread.current[:correlation_id]
          }
        ) do
          super(*args, &block)
        end
      end
    end
  end

  def tracer
    OpenTelemetry.tracer_provider.tracer('rails-backend', '1.0.0')
  end

  def with_span(name, attributes: {}, &block)
    tracer.in_span(
      name,
      attributes: attributes.merge(
        'correlation_id' => Thread.current[:correlation_id]
      ), &block
    )
  end

  def set_error(span, error)
    span.record_exception(error)
    span.status = OpenTelemetry::Trace::Status.error(error.message)
  end
end

# Include tracing in controllers
ActiveSupport.on_load(:action_controller) { include Tracing }

# Add tracing to requests
ActiveSupport::Notifications.subscribe('process_action.action_controller') do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  # Get current span
  current_span = OpenTelemetry::Trace.current_span

  # Add request attributes
  current_span.set_attribute('http.method', payload[:method])
  current_span.set_attribute('http.url', payload[:path])
  current_span.set_attribute('http.status_code', payload[:status])
  current_span.set_attribute('http.route', "#{payload[:controller]}##{payload[:action]}")
  current_span.set_attribute('http.user_agent', payload[:headers]['HTTP_USER_AGENT'])
  current_span.set_attribute('http.client_ip', payload[:headers]['REMOTE_ADDR'])
  current_span.set_attribute('correlation_id', Thread.current[:correlation_id])

  # Add database query attributes
  current_span.set_attribute('db.duration', payload[:db_runtime]) if payload[:db_runtime]

  # Add view rendering attributes
  current_span.set_attribute('view.duration', payload[:view_runtime]) if payload[:view_runtime]
end

# Add tracing to database queries
ActiveSupport::Notifications.subscribe('sql.active_record') do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  # Get current span
  current_span = OpenTelemetry::Trace.current_span

  # Add SQL attributes
  current_span.set_attribute('db.system', 'postgresql')
  current_span.set_attribute('db.name', payload[:connection]&.current_database)
  current_span.set_attribute('db.statement', payload[:sql].truncate(1000))
  current_span.set_attribute('db.duration', event.duration)
end

# Add tracing to Sidekiq jobs
ActiveSupport::Notifications.subscribe('perform.sidekiq') do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  # Get current span
  current_span = OpenTelemetry::Trace.current_span

  # Add job attributes
  current_span.set_attribute('messaging.system', 'sidekiq')
  current_span.set_attribute('messaging.destination', payload[:queue])
  current_span.set_attribute('messaging.message_id', payload[:jid])
  current_span.set_attribute('messaging.operation', payload[:job])
  current_span.set_attribute('correlation_id', Thread.current[:correlation_id])
end
