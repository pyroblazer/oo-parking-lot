# config/initializers/secure_headers.rb
# Secure Headers Configuration
# Sets security-related HTTP headers for all responses

# Configure SecureHeaders with environment-specific policies
SecureHeaders::Configuration.default do |config|
  # Test environment: minimal configuration to prevent NotYetConfiguredError
  # The middleware is still skipped in middleware.rb for test environment
  if Rails.env.test?
    Rails.logger.debug '[DEBUG] secure_headers.rb: Configuring minimal policy for test environment'
    config.csp = {
      default_src: ["'self'"],
      script_src: ["'self'"]
    }
    config.x_frame_options = 'DENY'
    config.x_content_type_options = 'nosniff'
    config.x_xss_protection = '1; mode=block'
    config.referrer_policy = 'strict-origin-when-cross-origin'
    next
  end

  # Production/Development: Full security configuration
  # CSP (Content Security Policy)
  # Enabled for secure_headers gem 6.7.0 with proper source format
  # Uses single-quoted strings for keyword sources to comply with gem validation
  config.csp = {
    default_src: ["'self'"],
    base_uri: ["'self'"],
    connect_src: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*'],
    font_src: ["'self'", "'data'"],
    img_src: ["'self'", "'data'", "'https:'"],
    script_src: ["'self'"],
    style_src: ["'self'", "'unsafe-inline'"], # unsafe-inline needed for some CSS frameworks
    frame_ancestors: ["'none'"],
    form_action: ["'self'"],
    frame_src: ["'none'"],
    object_src: ["'none'"],
    plugin_types: ["'application/pdf'"]
  }

  # X-Frame-Options
  # Prevent clickjacking attacks
  config.x_frame_options = 'DENY'

  # X-Content-Type-Options
  # Prevent MIME type sniffing
  config.x_content_type_options = 'nosniff'

  # X-XSS-Protection
  # Enable XSS protection in browsers
  config.x_xss_protection = '1; mode=block'

  # Referrer-Policy
  # Control how much referrer information is sent
  config.referrer_policy = 'strict-origin-when-cross-origin'

  # Clear Site Data
  # Clear sensitive data on logout
  config.clear_site_data = %w[cookies storage execution_contexts]
end
