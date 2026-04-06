# Sentry Configuration
# Error tracking and performance monitoring

# Skip Sentry initialization in test environment
return if Rails.env.test?

Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.breadcrumbs_logger = %i[active_support_logger http_logger]

  # Set environment
  config.environment = Rails.env

  # Set release
  config.release = ENV.fetch('APP_VERSION', '1.0.0')

  # Sample rate for error tracking
  config.sample_rate = ENV.fetch('SENTRY_SAMPLE_RATE', '1.0').to_f

  # Sample rate for performance monitoring
  config.traces_sample_rate = ENV.fetch('SENTRY_TRACES_SAMPLE_RATE', '0.1').to_f

  # Enable profiling
  config.profiles_sample_rate = ENV.fetch('SENTRY_PROFILES_SAMPLE_RATE', '0.1').to_f

  # Filter sensitive data and add correlation ID to all events
  config.before_send = lambda do |event, _hint|
    # Remove sensitive data from request headers
    if event.request && event.request.headers
      event.request.headers.delete('Authorization')
      event.request.headers.delete('Cookie')
    end

    # Remove sensitive data from extra
    if event.extra
      event.extra.delete('password')
      event.extra.delete('token')
      event.extra.delete('api_key')
    end

    # Add correlation ID and service tags
    event.tags[:correlation_id] = Thread.current[:correlation_id]
    event.tags[:service] = 'rails-backend'

    # Add user context
    event.contexts[:user][:service] = 'rails-backend' if event.contexts && event.contexts[:user]

    event
  end

  # Ignore specific exceptions
  config.excluded_exceptions = [
    'ActionController::RoutingError',
    'ActiveRecord::RecordNotFound',
    'ActionController::InvalidAuthenticityToken'
  ]

  # Set integrations
  config.rails.report_rescued_exceptions = true

  # Enable Sidekiq integration (configured via sentry-sidekiq gem)
  # Note: sentry-sidekiq integration is loaded automatically by the gem

  # Custom tags (set via set_tags method)
  # Note: set_tags method is not available in current Sentry version
  # config.set_tags(
  #   service: 'rails-backend',
  #   version: ENV.fetch('APP_VERSION', '1.0.0')
  # )
end

# Custom error reporting module
module ErrorReporting
  def capture_exception(exception, **context)
    Sentry.capture_exception(exception, extra: context.merge(
      correlation_id: Thread.current[:correlation_id],
      service: 'rails-backend'
    ))
  end

  def capture_message(message, level: :warning, **context)
    Sentry.capture_message(message, level: level, extra: context.merge(
      correlation_id: Thread.current[:correlation_id],
      service: 'rails-backend'
    ))
  end

  def set_user_context(user)
    Sentry.set_user(
      id: user.id,
      email: user.email,
      username: user.username
    )
  end

  def clear_user_context
    Sentry.set_user(nil)
  end
end

# Include error reporting in controllers
ActiveSupport.on_load(:action_controller) { include ErrorReporting }

# Custom exception handler
class ExceptionHandler
  def self.handle(exception, **context)
    Rails.logger.error('Exception occurred',
                       exception: exception.message,
                       backtrace: exception.backtrace.first(5),
                       context: context)

    # Report to Sentry
    Sentry.capture_exception(exception, extra: context.merge(
      correlation_id: Thread.current[:correlation_id]
    ))

    # Return error response
    {
      success: false,
      error: exception.message,
      correlation_id: Thread.current[:correlation_id]
    }
  end
end
