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

    def calculate
      duration = total_continuous_duration
      slot_type = session.parking_slot.slot_type

      # Return 0 for zero duration to avoid charging for zero-time parking
      return BigDecimal('0') if duration.zero?

      # Round duration up to nearest hour for fee calculation
      rounded_duration = duration.ceil

      # Calculate long-term parking (24+ hours)
      full_days, remaining_hours = calculate_long_term(rounded_duration)

      # Long-term fee is a flat rate for each full day (5000 pesos per 24 hours)
      # The base rate is NOT included in the long-term rate
      long_term_fee = BigDecimal(full_days.to_s) * LONG_TERM_RATE

      # Calculate fee for remaining hours (includes base rate)
      remaining_fee = calculate_remaining_fee(remaining_hours, slot_type, full_days: full_days)

      # Total fee is the sum of long-term fee and remaining fee
      # The base rate is already included in remaining_fee when applicable
      total_fee = long_term_fee + remaining_fee

      # Convert to integer if value is a whole number (for test compatibility)
      total_fee == total_fee.floor ? total_fee.to_i : total_fee

      # Removed verbose logging to improve performance in high-frequency calculations
      # logger.info('Standard pricing calculated',
      #             session_id: session.id,
      #             duration_hours: duration.to_f,
      #             rounded_duration: rounded_duration,
      #             slot_type: slot_type,
      #             total_fee: total_fee.to_f)
    end

    def breakdown
      duration = total_continuous_duration
      slot_type = session.parking_slot.slot_type

      # Round duration up to nearest hour for fee calculation
      rounded_duration = duration.ceil

      full_days, remaining_hours = calculate_long_term(rounded_duration)
      # Long-term fee is a flat rate for each full day (5000 pesos per 24 hours)
      # The base rate is NOT included in the long-term rate
      long_term_fee = (BigDecimal(full_days.to_s) * LONG_TERM_RATE).round(2)

      remaining_breakdown = calculate_remaining_breakdown(remaining_hours, slot_type, full_days: full_days)

      # Total fee is the sum of long-term fee and remaining fee
      # The base rate is already included in remaining_breakdown when applicable
      total_fee = (long_term_fee + remaining_breakdown[:total]).round(2)

      # Convert to integer if value is a whole number (for test compatibility)
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

    def calculate_remaining_fee(hours, slot_type, full_days: 0)
      # When there are full days, remaining hours are treated as a new parking segment
      # and charged at the base rate (not hourly rate)
      # Only charge base rate when there are full days AND remaining hours > 0
      if full_days.positive?
        # For long-term parking, remaining hours are charged at the base rate
        # Only charge base rate when there are actual remaining hours
        return BASE_RATE if hours > BigDecimal('0')

        return BigDecimal('0')
      end

      # Return 0 for zero or negative duration (only when no full days)
      return BigDecimal('0') if hours <= BigDecimal('0')

      # Use hours directly without rounding
      if hours <= BigDecimal(BASE_DURATION_HOURS.to_s)
        BASE_RATE
      else
        exceeding_hours = (hours - BigDecimal(BASE_DURATION_HOURS.to_s)).ceil
        BASE_RATE + (BigDecimal(exceeding_hours.to_s) * hourly_rate(slot_type))

      end
    end

    def calculate_remaining_breakdown(hours, slot_type, full_days: 0)
      # When there are full days, remaining hours are treated as a new parking segment
      # and charged at the base rate (not hourly rate)
      # Only charge base rate when there are full days AND remaining hours > 0
      if full_days.positive?
        # For long-term parking, remaining hours are charged at the base rate
        # Only charge base rate when there are actual remaining hours
        if hours > BigDecimal('0')
          return {
            total: BASE_RATE,
            base_fee: BASE_RATE,
            exceeding_hours: 0,
            exceeding_fee: BigDecimal('0'),
            hourly_rate: hourly_rate(slot_type)
          }
        else
          return {
            total: BigDecimal('0'),
            base_fee: BigDecimal('0'),
            exceeding_hours: 0,
            exceeding_fee: BigDecimal('0'),
            hourly_rate: hourly_rate(slot_type)
          }
        end
      end

      if hours <= BigDecimal('0')
        return { total: BigDecimal('0'), base_fee: BigDecimal('0'), exceeding_hours: 0, exceeding_fee: BigDecimal('0'),
                 hourly_rate: hourly_rate(slot_type) }
      end

      # Use hours directly without rounding
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
  end
end
