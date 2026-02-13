require 'active_support/core_ext/integer/time'

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = false
  config.public_file_server.enabled = true
  config.public_file_server.headers = {
    'Cache-Control' => "public, max-age=#{1.hour.to_i}"
  }
  config.consider_all_requests_local = true
  config.action_controller.perform_caching = false
  config.cache_store = :null_store
  config.action_dispatch.show_exceptions = :none
  config.action_controller.allow_forgery_protection = false
  config.action_mailer.perform_caching = false
  config.action_mailer.delivery_method = :test
  config.active_support.deprecation = :stderr
  config.active_support.disallowed_deprecation = :raise
  # NOTE: disallowed_deprecation_warnings is intentionally not set to avoid frozen array issues

  # Disable database selector for tests (no read/write splitting in test environment)
  config.active_record.database_selector = nil
  config.active_record.database_resolver = nil
  config.active_record.database_resolver_context = nil

  # Enable a dummy session store for API-only tests
  # This prevents ActionDispatch::Request::Session::DisabledSessionError
  config.session_store :cookie_store, key: '_test_session'

  # NOTE: Middleware cannot be added here in Rails 8.0 test environment
  # because the middleware stack is frozen during Rails.application.initialize!
  # Session middleware is added via config.session_store above, which is the
  # correct way to configure sessions in Rails 8.0.
  puts '[DEBUG] test.rb: Skipping middleware additions (middleware stack is frozen in Rails 8.0 test environment)'
end
