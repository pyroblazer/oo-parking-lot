class ParkingSession < ApplicationRecord
  belongs_to :parking_slot
  belongs_to :entry_point

  validates :vehicle_type, presence: true, inclusion: { in: %w[S M L] }
  validates :parked_at, presence: true
  validates :entry_point, presence: true # rubocop:disable Rails/RedundantPresenceValidationOnBelongsTo

  # Scope for active sessions
  scope :active, -> { where(exited_at: nil) }

  # Check if session is active (vehicle still parked)
  def active?
    exited_at.nil?
  end

  # Get session state as a string
  def state
    active? ? 'active' : 'exited'
  end

  # Calculate parking duration in hours using BigDecimal
  def duration_hours
    exit_time = exited_at || Time.current
    # Use integer arithmetic to avoid floating-point precision issues
    seconds = (exit_time - parked_at).to_i
    # Convert to hours using integer division and BigDecimal for precision
    duration = BigDecimal(seconds.to_s) / BigDecimal('3600')

    # Round to 2 decimal places to ensure precision for pricing calculations
    # This prevents floating-point issues like 4.00003086 being treated as > 4 hours
    duration = duration.round(2)

    # Round up to nearest integer (ceiling rounding as per specification)
    # Use floor for values that are already very close to integers to avoid floating-point issues
    # e.g., 5.0000380275 should be treated as 5, not 6
    rounded_duration = duration.ceil
    # If decimal part is very small (< 0.001), use floor instead to avoid floating-point issues
    decimal_part = duration - duration.floor
    decimal_part < BigDecimal('0.001') ? duration.floor : rounded_duration
  end

  # Find previous session for continuous parking check
  # Finds the most recent completed session that exited within 1 hour before exit_time,
  # and has not already been "claimed" by another active session that parked after it.
  #
  # Per spec: "A vehicle leaving parking complex and returning within one hour...must be
  # charged a continuous rate." Matches by vehicle_type AND license_plate (if previous session has one).
  # This prevents different vehicles of the same type from being incorrectly marked as continuous.
  def self.previous_session(vehicle_type, exit_time, license_plate: nil, exclude_id: nil)
    query = where(vehicle_type: vehicle_type)
            .where.not(exited_at: nil)
            .where('exited_at < ? AND exited_at > ?', exit_time, exit_time - 1.hour)

    # If license_plate is provided, match it; otherwise include all (backward compatibility)
    query = query.where(license_plate: license_plate) if license_plate.present?

    # Exclude current session to prevent self-matching
    query = query.where.not(id: exclude_id) if exclude_id

    candidates = query.order(exited_at: :desc).to_a

    # DEBUG: Log candidates for troubleshooting
    Rails.logger.debug do
      "Previous session candidates for vehicle_type: #{vehicle_type}, license_plate: #{license_plate}, " \
        "exit_time: #{exit_time}, exclude_id: #{exclude_id}"
    end
    candidates.each_with_index do |candidate, index|
      Rails.logger.debug("  Candidate #{index}: ID=#{candidate.id}, License Plate: #{candidate.license_plate}, " \
                         "Exited at: #{candidate.exited_at}")
    end

    # Filter candidates by license plate matching (if previous session has a license plate, require current to match)
    candidates_with_matching_plate = candidates.select do |candidate|
      # If candidate has a license_plate, current session MUST have a matching one
      if candidate.license_plate.present?
        license_plate.present? && candidate.license_plate == license_plate
      else
        # If candidate has no license_plate, allow match (backward compatibility)
        true
      end
    end

    Rails.logger.debug { "After license plate filtering: #{candidates_with_matching_plate.length} candidates remain" }

    # Filter out candidates already claimed by an active session.
    # A candidate is "claimed" if an active (exited_at IS NULL) session of the same type
    # (and license_plate if provided) parked between the candidate's exit and the new session's park time.
    # This prevents a newly parking vehicle from inheriting a continuous chain that
    # already has another vehicle actively parked in it.
    result = candidates_with_matching_plate.find do |candidate|
      active_query = where(vehicle_type: vehicle_type, exited_at: nil)
                     .where('parked_at > ? AND parked_at < ?', candidate.exited_at, exit_time)
                     .where.not(id: exclude_id)
      active_query = active_query.where(license_plate: license_plate) if license_plate.present?
      active_claimant_exists = active_query.exists?
      Rails.logger.debug { "  Candidate #{candidate.id}: active_claimant_exists=#{active_claimant_exists}, result=#{!active_claimant_exists}" }
      !active_claimant_exists
    end

    Rails.logger.debug { "Selected previous session: #{result&.id}" } if result
    result
  end

  # Check if this is a continuous parking session
  # Continuous parking is when a previous session of the same vehicle type
  # (and license_plate if provided) exited WITHIN 1 hour (inclusive) before this session started
  # Optimized: Cache result to avoid repeated database queries
  def continuous?
    # Clear cached value to ensure fresh calculation
    @continuous = nil

    previous_session = ParkingSession.previous_session(vehicle_type, parked_at, license_plate: license_plate, exclude_id: id)
    time_diff = previous_session.present? ? (parked_at - previous_session.exited_at) : 0

    # DEBUG: Log timing information
    Rails.logger.debug { "Continuous parking check - Session ID: #{id}, Vehicle Type: #{vehicle_type}, License Plate: #{license_plate}" }
    Rails.logger.debug { " Parked at: #{parked_at}" }
    Rails.logger.debug { "  Previous session: #{previous_session&.id}, Exited at: #{previous_session&.exited_at}" }
    Rails.logger.debug { " Time diff: #{time_diff.inspect}, Time diff in hours: #{time_diff / 3600.0}" }
    Rails.logger.debug { " Is continuous: #{previous_session.present? && time_diff < 1.hour}" }

    @continuous = previous_session.present? && time_diff < 1.hour
    @continuous
  end

  # Alias for continuous? to match API expectations
  alias is_continuous continuous?

  # Calculate total duration including continuous parking using BigDecimal
  def total_continuous_duration
    exit_time = exited_at || Time.current
    base_time = base_start_time
    # Use integer arithmetic to avoid floating-point precision issues
    seconds = (exit_time - base_time).to_i
    # Convert to hours using integer division and BigDecimal for precision
    duration = BigDecimal(seconds.to_s) / BigDecimal('3600')

    # Round to 2 decimal places to ensure precision for pricing calculations
    # This prevents floating-point issues like 4.00003086 being treated as > 4 hours
    duration = duration.round(2)

    # Round up to nearest integer (ceiling rounding as per specification)
    # Use floor for values that are already very close to integers to avoid floating-point issues
    # e.g., 5.0000380275 should be treated as 5, not 6
    rounded_duration = duration.ceil
    # If decimal part is very small (< 0.001), use floor instead to avoid floating-point issues
    decimal_part = duration - duration.floor
    decimal_part < BigDecimal('0.001') ? duration.floor : rounded_duration
  end

  # Get base start time for continuous parking (public method)
  # Recursively traces back through continuous sessions to find the
  # earliest parked_at in the continuous chain.
  def base_start_time
    # Clear cached value to ensure fresh calculation
    @base_start_time = nil

    @base_start_time = if continuous?
                         previous = ParkingSession.previous_session(vehicle_type, parked_at, license_plate: license_plate, exclude_id: id)
                         # Recursively get the base_start_time of the previous session
                         previous ? previous.base_start_time : parked_at
                       else
                         parked_at
                       end
  end
end
