# Service class for managing parking operations
class ParkingServiceTemp
  attr_reader :errors

  def initialize
    @errors = []
  end

  # Park a vehicle at the closest available slot
  def park_vehicle(vehicle_type, entry_point_id)
    return add_error('vehicle_type is missing') if vehicle_type.blank?
    return add_error('entry_point_id is missing') if entry_point_id.blank?

    entry_point = EntryPoint.find_by(identifier: entry_point_id)
    return add_error('Entry point not found') unless entry_point

    vehicle_type = vehicle_type.upcase
    return add_error('Invalid vehicle type') unless %w[S M L].include?(vehicle_type)

    # Find the closest available slot
    slot = find_closest_available_slot(vehicle_type, entry_point)
    return add_error('No available parking slot') unless slot

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
        parked_at: Time.current
      )

      # Update slot status to occupied
      slot.update!(status: 'occupied', last_occupied_at: Time.current)
    end

    session
  rescue StandardError => e
    add_error(e.message)
    nil
  end

  # Unpark a vehicle and calculate fee
  def unpark_vehicle(session_id)
    session = ParkingSession.find(session_id)
    return add_error('Vehicle already unparked') unless session.active?
    return if @errors.any?

    # Update exit time
    session.update!(exited_at: Time.current)

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
  rescue ActiveRecord::RecordNotFound
    add_error('Parking session not found')
  end

  # Get available slots for a vehicle type from an entry point
  def available_slots(vehicle_type, entry_point_id)
    entry_point = EntryPoint.find_by(identifier: entry_point_id)
    return add_error('Entry point not found') unless entry_point

    vehicle_type = vehicle_type.upcase
    return add_error('Invalid vehicle type') unless %w[S M L].include?(vehicle_type)

    ParkingSlot
      .available
      .compatible_with(vehicle_type)
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

    # Sort by slot type preference, then by distance from entry point
    # Preference: S→SP, M→MP, L→LP (matching slot types first)

    # Define slot type preference for each vehicle type
    slot_preference = lambda do |slot|
      case vehicle_type
      when 'S'
        # Prefer SP (Small Parking) for small vehicles
        return 0 if slot.slot_type == 'SP'
        return 1 if slot.slot_type == 'MP'

        2 # LP is least preferred
      when 'M'
        # Prefer MP (Medium Parking) for medium vehicles
        return 0 if slot.slot_type == 'MP'

        1 # LP is less preferred
      when 'L'
        # Only LP (Large Parking) for large vehicles
        0
      else
        3
      end
    end

    # Sort by preference (lower is better), then by distance
    slots_with_distance = slots.sort_by do |slot_a, slot_b|
      pref_a = slot_preference.call(slot_a)
      pref_b = slot_preference.call(slot_b)

      # Primary sort by preference
      if pref_a == pref_b
        # Secondary sort by distance from entry point
        dist_a = slot_a.distance_from(entry_point)
        dist_b = slot_b.distance_from(entry_point)

        if dist_a == dist_b
          slot_a.slot_label <=> slot_b.slot_label
        else
          dist_a <=> dist_b
        end
      else
        pref_a <=> pref_b
      end
    end

    slots_with_distance.first
  end

  def add_error(message)
    @errors << message
    nil
  end
end
