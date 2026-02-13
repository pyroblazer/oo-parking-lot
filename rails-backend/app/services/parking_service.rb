# Service class for managing parking operations
class ParkingService
  attr_reader :errors

  def initialize
    @errors = []
  end

  # Park a vehicle at the closest available slot
  def park_vehicle(vehicle_type, entry_point_id, parked_at: nil)
    return add_error('vehicle_type is missing') if vehicle_type.blank?
    return add_error('entry_point_id is missing') if entry_point_id.blank?

    entry_point = EntryPoint.find_by(identifier: entry_point_id)
    return add_error('Entry point not found') unless entry_point

    vehicle_type = vehicle_type.upcase
    return add_error('Invalid vehicle type') unless %w[S M L].include?(vehicle_type)

    # Find the closest available slot
    slot = find_closest_available_slot(vehicle_type, entry_point)
    return add_error('No available parking slot') unless slot

    # Use provided parked_at if available, otherwise use current time
    park_time = parked_at || Time.current

    # Create parking session within a transaction
    session = nil
    ParkingSlot.transaction do
      # Double-check slot availability (prevent race conditions)
      slot.reload
      raise ActiveRecord::Rollback, 'Slot is no longer available' unless slot.available?

      session = ParkingSession.create!(
        vehicle_type: vehicle_type,
        parking_slot: slot,
        entry_point: entry_point,
        parked_at: park_time
      )

      # Update slot status to occupied
      slot.update!(status: 'occupied', last_occupied_at: park_time)
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
    ParkingSlot.transaction do
      session.update!(exited_at: exit_time)

      # Update slot status back to available
      session.parking_slot.update!(status: 'available')

      # Calculate fee using PricingEngine
      pricing_engine = PricingEngine.new(session)
      fee = pricing_engine.calculate
      breakdown = pricing_engine.breakdown

      # Persist the calculated fee to the database
      session.update!(total_fee: fee, fee_breakdown: breakdown[:breakdown], billing_state: 'calculated')

      {
        session: session,
        fee: fee,
        breakdown: breakdown
      }
    end
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

  private

  # Find the closest available slot for a vehicle type from an entry point
  def find_closest_available_slot(vehicle_type, entry_point)
    # Get all compatible and available slots
    slots = ParkingSlot
            .available
            .compatible_with(vehicle_type)
            .to_a

    return nil if slots.empty?

    # Sort by distance from entry point, then by slot label (for ties)
    # Only consider slots with valid distances for this entry point
    slots_with_distance = slots.reject do |slot|
      slot.distance_from(entry_point) == BigDecimal::INFINITY
    end

    # For small vehicles, prefer SP slots over MP/LP slots
    # This ensures exact slot type matching: S -> SP, M -> MP, L -> LP
    if vehicle_type == 'S'
      sp_slots = slots_with_distance.select { |slot| slot.slot_type == 'SP' }
      return sp_slots.min_by { |slot| [slot.distance_from(entry_point), slot.slot_label] } if sp_slots.any?
    end

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
end
