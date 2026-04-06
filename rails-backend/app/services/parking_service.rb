# Service class for managing parking operations
class ParkingService
  attr_reader :errors

  def initialize
    @errors = []
  end

  # Park a vehicle at the closest available slot
  def park_vehicle(vehicle_type, entry_point_id, parked_at: nil, license_plate: nil, previous_session_id: nil)
    return add_error('vehicle_type is missing') if vehicle_type.blank?
    return add_error('entry_point_id is missing') if entry_point_id.blank?

    entry_point = EntryPoint.find_by(identifier: entry_point_id)
    return add_error('Entry point not found') unless entry_point

    vehicle_type = vehicle_type.upcase
    return add_error('Invalid vehicle type') unless %w[S M L].include?(vehicle_type)

    # Validate previous_session_id if provided
    if previous_session_id.present?
      prev_session = ParkingSession.find_by(id: previous_session_id)
      return add_error('previous session not found') unless prev_session
      return add_error('previous session is still active') if prev_session.active?
      return add_error('vehicle type mismatch') unless prev_session.vehicle_type == vehicle_type

      # Check if previous session exited within the last 1 hour
      park_time = parked_at || Time.current
      time_since_exit = (park_time - prev_session.exited_at).to_i
      if time_since_exit.negative? || time_since_exit > 3600
        return add_error('previous session not eligible for continuous parking (must have exited within 1 hour)')
      end

      # If license_plate is provided, validate it matches the previous session
      if license_plate.present? && prev_session.license_plate.present? && prev_session.license_plate != license_plate
        return add_error('license plate mismatch')
      end
    end

    # Find the closest available slot
    slot = find_closest_available_slot(vehicle_type, entry_point)
    return add_error('No available parking slot') unless slot

    # Use provided parked_at if available, otherwise use current time
    park_time = parked_at || Time.current

    # Create parking session within a transaction with database-level locking
    session = nil
    ParkingSlot.transaction do
      # Lock the slot at the database level to prevent race conditions
      # This ensures only one thread can proceed with this slot at a time
      slot.lock!

      # Double-check slot availability (should still be available after acquiring lock)
      raise ActiveRecord::Rollback, 'Slot is no longer available' unless slot.available?

      session = ParkingSession.create!(
        vehicle_type: vehicle_type,
        parking_slot: slot,
        entry_point: entry_point,
        parked_at: park_time,
        license_plate: license_plate
      )

      # Update slot status to occupied
      slot.update!(status: 'occupied', last_occupied_at: park_time)
    end

    # Publish Kafka event for vehicle.parked (non-blocking)
    if session
      begin
        correlation_id = SecureRandom.uuid
        KafkaEventWorker.perform_async(
          KafkaEvent::VEHICLE_PARKED,
          session.id,
          {},
          {
            'correlation_id' => correlation_id,
            'idempotency_key' => "park:#{session.id}"
          }
        )
      rescue StandardError => e
        Rails.logger.error("Failed to enqueue vehicle.parked Kafka event for session #{session.id}: #{e.message}")
      end
    end

    session
  rescue StandardError => e
    add_error(e.message)
    nil
  end

  # Unpark a vehicle and calculate fee
  def unpark_vehicle(session_id, exited_at: nil)
    session = ParkingSession.includes(:parking_slot, :entry_point).find(session_id)
    return add_error('Vehicle already unparked') unless session.active?
    return if @errors.any?

    # Update exit time - use provided exited_at if available, otherwise use current time
    exit_time = exited_at || Time.current

    # Wrap all updates in a transaction to ensure consistency
    # Wrap all updates in a transaction with row-level locking to ensure consistency
    # SELECT FOR UPDATE prevents double-unpark race conditions:
    # only one request can hold the row lock at a time
    result = nil
    ParkingSlot.transaction do
      # Lock the session row to prevent concurrent unparks
      session = ParkingSession.lock.find(session_id)
      return add_error('Vehicle already unparked') unless session.active?

      return if @errors.any?

      session.update!(exited_at: exit_time)
      # Update slot status back to available
      session.parking_slot.update!(status: 'available')

      # Calculate fee using PricingEngine
      pricing_engine = PricingEngine.new(session)
      fee = pricing_engine.calculate
      breakdown = pricing_engine.breakdown

      # Persist the calculated fee to the database
      session.update!(total_fee: fee, fee_breakdown: breakdown[:breakdown], billing_state: 'calculated')

      result = {
        session: session,
        fee: fee,
        breakdown: breakdown
      }
    end
    # Publish Kafka events asynchronously (non-blocking)
    if result
      begin
        correlation_id = SecureRandom.uuid

        # Deep stringify breakdown for Sidekiq strict args compatibility
        stringified_breakdown = deep_stringify_keys(result[:breakdown])

        # Publish vehicle.unparked event
        KafkaEventWorker.perform_async(
          KafkaEvent::VEHICLE_UNPARKED,
          session.id,
          {},
          {
            'correlation_id' => correlation_id,
            'idempotency_key' => "unpark:#{session.id}",
            'fee' => result[:fee],
            'breakdown' => stringified_breakdown
          }
        )

        # Enqueue billing audit log creation (which also publishes billing.completed)
        BillingAuditWorker.perform_async(
          session.id,
          result[:fee],
          stringified_breakdown
        )
      rescue StandardError => e
        Rails.logger.error("Failed to enqueue Kafka events for session #{session.id}: #{e.message}")
      end
    end

    result
  rescue ActiveRecord::RecordNotFound
    add_error('Parking session not found')
  rescue StandardError => e
    add_error(e.message)
    nil
  end

  # Get available slots for a vehicle type from an entry point
  def available_slots(vehicle_type, entry_point_id)
    entry_point = EntryPoint.find_by(identifier: entry_point_id)
    return add_error('Entry point not found') unless entry_point

    vehicle_type = vehicle_type.upcase
    return add_error('Invalid vehicle type') unless %w[S M L].include?(vehicle_type)

    # Map vehicle types to exact slot types for precise matching
    slot_type_map = { 'S' => 'SP', 'M' => 'MP', 'L' => 'LP' }
    exact_slot_type = slot_type_map[vehicle_type]

    ParkingSlot
      .available
      .where(slot_type: exact_slot_type)
      .sort_by { |slot| slot.distance_from(entry_point) }
  end

  # Get recent exit sessions for continuous parking selection
  def get_recent_exits(vehicle_type)
    vehicle_type = vehicle_type.upcase
    return add_error('Invalid vehicle type') unless %w[S M L].include?(vehicle_type)

    one_hour_ago = 1.hour.ago
    sessions = ParkingSession
               .includes(:parking_slot, :entry_point)
               .where(vehicle_type: vehicle_type)
               .where.not(exited_at: nil)
               .where(exited_at: one_hour_ago..)
               .order(exited_at: :desc)

    sessions.map do |session|
      minutes_since_exit = ((Time.current - session.exited_at) / 60).to_i
      {
        session_id: session.id,
        vehicle_type: session.vehicle_type,
        license_plate: session.license_plate || '',
        slot_label: session.parking_slot.slot_label,
        entry_point: session.entry_point.identifier,
        parked_at: session.parked_at.iso8601,
        exited_at: session.exited_at.iso8601,
        minutes_since_exit: minutes_since_exit,
        total_fee: session.total_fee
      }
    end
  end

  private

  # Find the closest available slot for a vehicle type from an entry point
  def find_closest_available_slot(vehicle_type, entry_point)
    # Map vehicle types to exact slot types for precise matching
    slot_type_map = { 'S' => 'SP', 'M' => 'MP', 'L' => 'LP' }
    exact_slot_type = slot_type_map[vehicle_type]

    # Get all available slots of the exact type first
    slots = ParkingSlot
            .available
            .where(slot_type: exact_slot_type)
            .to_a

    # If exact type not available, try compatible types (fall back)
    if slots.empty?
      slots = ParkingSlot
              .available
              .compatible_with(vehicle_type)
              .to_a
    end

    return nil if slots.empty?

    # Sort by distance from entry point, then by slot label (for ties)
    # Only consider slots with valid distances for this entry point
    slots_with_distance = slots.reject do |slot|
      slot.distance_from(entry_point) == BigDecimal::INFINITY
    end

    # If no slots have valid distances, return nil (shouldn't happen in normal operation)
    return nil if slots_with_distance.empty?

    slots_with_distance.min_by do |slot|
      [
        slot.distance_from(entry_point),
        slot.slot_label
      ]
    end
  end

  def add_error(message)
    @errors << message
    nil
  end

  # Deep stringify all keys and values in a hash for Sidekiq strict args compatibility
  def deep_stringify_keys(hash)
    return hash unless hash.is_a?(Hash)

    hash.each_with_object({}) do |(key, value), result|
      str_key = key.to_s
      result[str_key] = case value
                        when Hash then deep_stringify_keys(value)
                        when Array then value.map { |v| v.is_a?(Hash) ? deep_stringify_keys(v) : stringify_value(v) }
                        else stringify_value(value)
                        end
    end
  end

  # Convert non-native-JSON types to JSON-safe types
  def stringify_value(value)
    case value
    when Time, ActiveSupport::TimeWithZone, DateTime then value.iso8601
    when Date then value.iso8601
    when BigDecimal then value.to_f
    when Symbol then value.to_s
    else value
    end
  end
end
