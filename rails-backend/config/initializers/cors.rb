# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Configure Cross-Origin Resource Sharing (CORS) for the Rails API.

# Skip CORS initialization in test environment to avoid frozen array issues
if Rails.env.test?
  puts '[DEBUG] cors.rb: Skipping CORS initialization in test environment'
else
  puts '[DEBUG] cors.rb: Initializing CORS middleware'

  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      # Allow requests from localhost or 127.0.0.1 on any port.
      # Supports:
      # - http://localhost:* (any port)
      # - http://127.0.0.1:* (any port)
      # - http://localhost (no explicit port)
      # - http://127.0.0.1 (no explicit port)
      # - https://localhost:* (for secure development)
      # - https://127.0.0.1:* (for secure development)
      origins(%r{https?://(localhost|127\.0\.0\.1)(:\d+)?})

      # Allow all HTTP methods, including DELETE (required for session management)
      # and OPTIONS (required for CORS preflight requests).
      resource '*',
               headers: :any,
               methods: %i[get post put patch delete options head],
               expose: ['Authorization'],
               max_age: 86_400,
               credentials: true

      # Debug logging for CORS requests from localhost
      puts '[DEBUG] cors.rb: CORS configured to allow requests from localhost/127.0.0.1 origins' if Rails.env.development?
    end
  end

  puts '[DEBUG] cors.rb: CORS middleware configured successfully'
end
