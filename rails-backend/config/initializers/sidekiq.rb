# Sidekiq Configuration
# Background job processing for Rails backend

require 'sidekiq'
require 'sidekiq-cron'

# Skip Sidekiq initialization in development and test environments to avoid Redis connection issues
# In test environment, Sidekiq is configured in rails_helper.rb with inline mode
return if Rails.env.development? || Rails.env.test?

Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0')
  }

  # Server middleware
  config.server_middleware do |chain|
    chain.add Sidekiq::Middleware::Server::RetryJobs, max_retries: 5
    chain.add Sidekiq::Middleware::Server::Logging
  end

  # Error handlers
  config.error_handlers = [
    proc { |ex, ctx_hash|
      Rails.logger.error("Sidekiq error: #{ex.message}", ex: ex, context: ctx_hash)
      Sentry.capture_exception(ex, extra: ctx_hash)
    }
  ]

  # Concurrency
  config.concurrency = ENV.fetch('SIDEKIQ_CONCURRENCY', 10).to_i

  # Queues
  config.queues = %w[
    default
    kafka_events
    billing
    audit
    analytics
  ]
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0')
  }
end

# Load schedule file
schedule_file = 'config/sidekiq_schedule.yml'

Sidekiq::Cron::Job.load_from_hash(YAML.load_file(schedule_file), logger: Rails.logger) if File.exist?(schedule_file)
