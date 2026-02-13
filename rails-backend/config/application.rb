require_relative 'boot'

# Only require Rails components we need for an API-only application
# This avoids loading ActionText, ActionView, and other view-related components
require 'active_record/railtie'
require 'action_controller/railtie'
require 'action_mailer/railtie'
require 'active_job/railtie'
require 'action_cable/engine'
require 'rails/test_unit/railtie'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module OoParkingLot
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments/, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # Use UTC timezone
    config.time_zone = 'UTC'

    # ============================================================================
    # Security Configuration
    # ============================================================================

    # Use Rack::Attack for rate limiting
    # Note: Middleware is added in a separate initializer to avoid frozen array issues

    # Use SecureHeaders for security headers
    # Note: Middleware is added in a separate initializer to avoid frozen array issues

    # ============================================================================
    # Performance Configuration
    # ============================================================================

    # Enable eager loading for associations
    config.active_record.eager_load = true if Rails.env.production?

    # Enable database connection pooling and read/write splitting (production only)
    if Rails.env.production?
      config.active_record.database_selector = { delay: 2.seconds }
      config.active_record.database_resolver = ActiveRecord::Middleware::DatabaseSelector::Resolver
      config.active_record.database_resolver_context = ActiveRecord::Middleware::DatabaseSelector::Resolver::Session
    end

    # ============================================================================
    # API Configuration
    # ============================================================================

    # Use JSON for responses
    # HTML entity escaping in JSON is configured in production.rb with:
    # config.action_view.escape_html_entities_in_json = true
    # to prevent XSS attacks

    # ============================================================================
    # Logging Configuration
    # ============================================================================

    # Filter sensitive parameters from logs
    config.filter_parameters = %i[
      password token api_key secret authorization
      credit_card ssn social_security_number
    ]
  end
end
