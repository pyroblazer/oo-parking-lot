# Base class for pricing strategies
# Implements Strategy pattern for extensible pricing rules
module Pricing
  # rubocop:disable Layout/EmptyLinesAfterModuleInclusion
  class BasePricingStrategy
    # Include SemanticLogger::Loggable if available
    begin
      include SemanticLogger::Loggable
    rescue NameError, LoadError
      # rubocop:enable Layout/EmptyLinesAfterModuleInclusion
      # Fallback: define logger method if SemanticLogger is not available
      def logger
        @logger ||= Rails.logger
      end
    end

    attr_reader :session

    def initialize(session)
      raise ArgumentError, 'Session cannot be nil' if session.nil?

      @session = session
    end

    # Calculate total fee - must be implemented by subclasses
    def calculate(is_continuous: false)
      raise NotImplementedError, 'Subclasses must implement #calculate'
    end

    # Get detailed breakdown - must be implemented by subclasses
    def breakdown(is_continuous: false)
      raise NotImplementedError, 'Subclasses must implement #breakdown'
    end

    protected

    # Calculate duration in hours using BigDecimal
    def duration_hours
      exit_time = session.exited_at || Time.current
      duration = BigDecimal((exit_time - session.parked_at).to_s) / BigDecimal('3600')
      # Treat very small durations as 0 to avoid floating point precision issues
      duration < BigDecimal('0.01') ? BigDecimal('0') : duration
    end

    # Calculate total continuous duration including merged sessions using BigDecimal
    def total_continuous_duration
      # Use's session's own method to calculate continuous duration
      # The session.total_continuous_duration method already rounds to 2 decimal places and calls ceil
      session.total_continuous_duration
    end

    # Calculate long-term parking (24+ hours)
    # Returns [full_days (Integer), remaining_hours (BigDecimal)]
    def calculate_long_term(duration)
      duration_bd = duration.is_a?(BigDecimal) ? duration : BigDecimal(duration.to_s)
      full_days = (duration_bd / BigDecimal('24')).floor
      remaining_hours = duration_bd - (BigDecimal(full_days.to_s) * BigDecimal('24'))
      # Ensure remaining_hours has proper precision
      remaining_hours = remaining_hours.round(10)
      [full_days, remaining_hours]
    end

    # Get hourly rate for slot type
    def hourly_rate(slot_type)
      HOURLY_RATES[slot_type] || BigDecimal('20.0')
    end

    # Constants - use BigDecimal for precise monetary calculations
    BASE_RATE = BigDecimal('40.0')
    BASE_DURATION_HOURS = 3
    HOURLY_RATES = {
      'SP' => BigDecimal('20.0'),
      'MP' => BigDecimal('60.0'),
      'LP' => BigDecimal('100.0')
    }.freeze
    LONG_TERM_RATE = BigDecimal('5000.0')
    LONG_TERM_HOURS = 24
  end
end
