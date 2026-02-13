# Logging Configuration
# Structured JSON logging with Semantic Logger and Lograge

# Load Semantic Logger in all environments
begin
  require 'semantic_logger'

  # Semantic Logger configuration
  SemanticLogger.add_appender(
    io: $stdout,
    level: ENV.fetch('LOG_LEVEL', 'info').to_sym,
    formatter: :json
  )

  # Set Rails logger to use Semantic Logger
  Rails.logger = SemanticLogger['Rails']
  ActiveRecord::Base.logger = SemanticLogger['ActiveRecord']
  ActionController::Base.logger = SemanticLogger['ActionController']

  # Add broadcast_to method to SemanticLogger::Logger for Rails 8.0.4 compatibility
  # Rails 8.0.4's server command expects this method to exist
  module SemanticLogger
    class Logger
      def broadcast_to(target)
        # For Rails 8.0.4 compatibility - this method is called by the server command
        # but Semantic Logger already handles logging to stdout via appenders
        # This is a no-op since we already configured the stdout appender above
        self
      end
    end
  end
rescue LoadError => e
  # Fallback to standard Rails logger if Semantic Logger is not available
  Rails.logger.warn("Semantic Logger not available: #{e.message}")
end
