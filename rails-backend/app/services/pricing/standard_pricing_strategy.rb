# Standard pricing strategy
# Implements default parking fee calculation rules
module Pricing
  class StandardPricingStrategy < BasePricingStrategy
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

    def calculate(is_continuous: false)
      # Use continuous duration only when session is actually continuous
      duration = is_continuous ? total_continuous_duration : duration_hours
      slot_type = session.parking_slot.slot_type

      # Return 0 for zero duration to avoid charging for zero-time parking
      return BigDecimal('0') if duration.zero?

      # Duration is already ceiling-rounded in duration_hours / total_continuous_duration
      rounded_duration = duration

      # Calculate long-term parking (24+ hours)
      full_days, remaining_hours = calculate_long_term(rounded_duration)

      # Long-term fee is a flat rate for each full day (5000 pesos per 24 hours)
      # The base rate is NOT included in the long-term rate
      long_term_fee = BigDecimal(full_days.to_s) * LONG_TERM_RATE

      # Calculate fee for remaining hours (includes base rate)
      remaining_fee = calculate_remaining_fee(remaining_hours, slot_type)

      # Total fee is the sum of long-term fee and remaining fee
      total_fee = long_term_fee + remaining_fee

      # Convert to integer if value is a whole number (for test compatibility)
      total_fee == total_fee.floor ? total_fee.to_i : total_fee
    end

    def breakdown(is_continuous: false)
      # Use continuous duration only when session is actually continuous
      duration = is_continuous ? total_continuous_duration : duration_hours
      slot_type = session.parking_slot.slot_type

      # Duration is already ceiling-rounded in duration_hours / total_continuous_duration
      rounded_duration = duration

      full_days, remaining_hours = calculate_long_term(rounded_duration)
      long_term_fee = (BigDecimal(full_days.to_s) * LONG_TERM_RATE).round(2)

      remaining_breakdown = calculate_remaining_breakdown(remaining_hours, slot_type)

      total_fee = (long_term_fee + remaining_breakdown[:total]).round(2)
      total_fee_int = total_fee == total_fee.floor ? total_fee.to_i : total_fee

      {
        total_fee: total_fee_int,
        duration_hours: rounded_duration,
        is_continuous: session.continuous?,
        base_start_time: session.base_start_time,
        breakdown: {
          long_term: {
            days: full_days,
            fee: long_term_fee,
            rate: LONG_TERM_RATE
          },
          remaining: remaining_breakdown
        }
      }
    end

    private

    def calculate_remaining_fee(hours, slot_type, full_days: 0, is_continuous: false)
      return BigDecimal('0') if hours <= BigDecimal('0')
      return BigDecimal('0') if hours < BigDecimal('0.01')

      if hours <= BigDecimal(BASE_DURATION_HOURS.to_s)
        BASE_RATE
      else
        exceeding_hours = (hours - BigDecimal(BASE_DURATION_HOURS.to_s)).ceil
        BASE_RATE + (BigDecimal(exceeding_hours.to_s) * hourly_rate(slot_type))
      end
    end

    def calculate_remaining_breakdown(hours, slot_type, full_days: 0, is_continuous: false)
      if hours <= BigDecimal('0')
        return { total: BigDecimal('0'), base_fee: BigDecimal('0'), exceeding_hours: 0, exceeding_fee: BigDecimal('0'),
                 hourly_rate: hourly_rate(slot_type) }
      end

      if hours < BigDecimal('0.01')
        return { total: BigDecimal('0'), base_fee: BigDecimal('0'), exceeding_hours: 0, exceeding_fee: BigDecimal('0'),
                 hourly_rate: hourly_rate(slot_type) }
      end

      if hours <= BigDecimal(BASE_DURATION_HOURS.to_s)
        {
          total: BASE_RATE,
          base_fee: BASE_RATE,
          exceeding_hours: 0,
          exceeding_fee: BigDecimal('0'),
          hourly_rate: hourly_rate(slot_type)
        }
      else
        exceeding_hours = (hours - BigDecimal(BASE_DURATION_HOURS.to_s)).ceil
        exceeding_fee = (BigDecimal(exceeding_hours.to_s) * hourly_rate(slot_type)).round(2)

        {
          total: (BASE_RATE + exceeding_fee).round(2),
          base_fee: BASE_RATE,
          exceeding_hours: exceeding_hours,
          exceeding_fee: exceeding_fee,
          hourly_rate: hourly_rate(slot_type)
        }
      end
    end

    protected

    # Calculate duration in hours using BigDecimal with ceiling rounding
    # Matches the rounding logic in ParkingSession#duration_hours
    def duration_hours
      exit_time = session.exited_at || Time.current
      # Use integer seconds to avoid floating-point precision issues
      seconds = (exit_time - session.parked_at).to_i
      duration = BigDecimal(seconds.to_s) / BigDecimal('3600')
      duration = duration.round(2)
      # Treat very small durations as 0 to avoid floating point precision issues
      return BigDecimal('0') if duration < BigDecimal('0.01')

      # Ceiling rounding: round up to nearest integer
      # But use floor when decimal part is negligible (< 0.001) to handle FP noise
      rounded = duration.ceil
      decimal_part = duration - duration.floor
      decimal_part < BigDecimal('0.001') ? duration.floor : rounded
    end

    # Calculate total continuous duration including merged sessions using BigDecimal
    def total_continuous_duration
      # Use session's own method to calculate continuous duration
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
  end
end
