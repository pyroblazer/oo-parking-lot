# Middleware Configuration
# Add security middleware after Rails is fully initialized

# Skip middleware initialization in test environment to avoid frozen array issues
if Rails.env.test?
  puts '[DEBUG] middleware.rb: Skipping middleware initialization in test environment'
  # Don't use return at top level - it causes issues
else
  puts '[DEBUG] middleware.rb: Adding Rack::Attack middleware'
  # Use Rack::Attack for rate limiting
  Rails.application.config.middleware.use Rack::Attack

  puts '[DEBUG] middleware.rb: Adding SecureHeaders middleware'
  # Use SecureHeaders for security headers
  # Note: SecureHeaders configuration is in secure_headers.rb initializer
  Rails.application.config.middleware.use SecureHeaders::Middleware
end
