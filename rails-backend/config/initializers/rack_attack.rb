# Rack::Attack Configuration
# Rate limiting and security middleware for Rails API

require 'rack/attack'

# Skip Rack::Attack initialization in test and development environments
# In Docker, requests appear from non-local IPs that get blocked
return if Rails.env.local?

# Cache store for Rack::Attack (using Redis)
# Use Rails.cache which is already configured
# Set this after Rails is initialized to avoid frozen array issues
Rails.application.config.after_initialize do
  Rack::Attack.cache.store = Rails.cache
end

# ============================================================================
# Rate Limiting Rules
# ============================================================================

# Throttle requests by IP address (general API limit)
Rack::Attack.throttle('req/ip', limit: 300, period: 1.minute) do |req|
  req.ip unless req.path.start_with?('/health', '/metrics')
end

# Throttle parking requests (to prevent abuse)
Rack::Attack.throttle('parking/requests/ip', limit: 10, period: 1.minute) do |req|
  req.ip if req.path == '/api/v1/sessions' && req.post?
end

# Throttle unparking requests
Rack::Attack.throttle('unparking/requests/ip', limit: 10, period: 1.minute) do |req|
  req.ip if req.path.match(%r{^/api/v1/sessions/.*/unpark$}) && req.post?
end

# Throttle session lookups
Rack::Attack.throttle('session/lookup/ip', limit: 100, period: 1.minute) do |req|
  req.ip if req.path.match(%r{^/api/v1/sessions/}) && req.get?
end

# Throttle available slots queries
Rack::Attack.throttle('slots/lookup/ip', limit: 50, period: 1.minute) do |req|
  req.ip if req.path == '/api/v1/parking/slots/available' && req.get?
end

# ============================================================================
# Blocklist Rules
# ============================================================================

# Block suspicious user agents (DISABLED in development/test environments)
# In production, you may want to enable this to block automated bots
unless Rails.env.local?
  Rack::Attack.blocklist('block suspicious user agents') do |req|
    suspicious_user_agents = [
      /bot/i,
      /spider/i,
      /crawler/i,
      /scraper/i
    ]

    user_agent = req.user_agent.to_s.downcase
    suspicious_user_agents.any? { |pattern| user_agent.match?(pattern) } unless req.path == '/health'
  end
end

# Block requests with suspicious parameters (SQL injection patterns)
Rack::Attack.blocklist('block sql injection attempts') do |req|
  sql_injection_patterns = [
    /(%27)|(')|(--)|(%23)|(#)/i,
    /(%3D)|(=)[^\n]*(%27)|(')(%3D)|(=)/i,
    /union.*select/i,
    /select.*from/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /exec.*\(/i
  ]

  query_string = req.query_string.to_s.downcase
  body = req.body.to_s.downcase
  sql_injection_patterns.any? { |pattern| query_string.match?(pattern) || body.match?(pattern) }
end

# ============================================================================
# Allowlist Rules
# ============================================================================

# Allow health checks and metrics to bypass rate limiting
# Also allow Docker network IPs (172.18.0.0/16) and localhost
Rack::Attack.safelist('allow from localhost and docker') do |req|
  # Allow localhost
  ['127.0.0.1', '::1'].include?(req.ip) ||
    # Allow Docker networks (172.17.0.0/16 and 172.18.0.0/16)
    req.ip.start_with?('172.17.') ||
    req.ip.start_with?('172.18.') ||
    # Allow Docker Desktop for Mac (192.168.65.1)
    req.ip == '192.168.65.1'
end

# Safelist health check and metrics endpoints - always allow these
Rack::Attack.safelist('allow health and metrics endpoints') do |req|
  ['/health', '/metrics'].include?(req.path)
end

# ============================================================================
# Custom Responses
# ============================================================================

# Custom response for throttled requests
Rack::Attack.throttled_responder = lambda do |_env|
  [
    429,
    { 'Content-Type' => 'application/json' },
    [{ success: false, error: 'Rate limit exceeded. Please try again later.' }.to_json]
  ]
end

# Custom response for blocklisted requests
Rack::Attack.blocklisted_responder = lambda do |_env|
  [
    403,
    { 'Content-Type' => 'application/json' },
    [{ success: false, error: 'Request blocked by security policy.' }.to_json]
  ]
end

# ============================================================================
# Logging
# ============================================================================

# Log blocked and throttled requests
ActiveSupport::Notifications.subscribe('rack.attack') do |name, _start, _finish, request_id, payload|
  Rails.logger.warn(
    "Rack::Attack: #{name} - request_id: #{request_id}, " \
    "ip: #{payload[:request].ip}, path: #{payload[:request].path}, " \
    "matched: #{payload[:match_data]}"
  )
end
