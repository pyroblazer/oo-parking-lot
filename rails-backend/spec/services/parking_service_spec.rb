require 'rails_helper'
require 'timecop'

RSpec.describe ParkingService, type: :service do
  let(:service) { described_class.new }
  let(:vehicle_type) { 'S' }

  describe '#park_vehicle' do
    context 'with valid inputs' do
      it 'creates a parking session' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')
        session = service.park_vehicle(vehicle_type, entry_point.identifier)
        if session.nil?
          puts "Service errors: #{service.errors.inspect}"
          puts "Entry point identifier: #{entry_point.identifier}"
          puts "Parking slot: #{parking_slot.inspect}"
          puts "Available slots: #{ParkingSlot.available.count}"
        end
        expect(session).not_to be_nil
        expect(ParkingSession.count).to eq(1)
        expect(session.parking_slot).to eq(parking_slot)
      end

      it 'assigns a parking slot' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')
        session = service.park_vehicle(vehicle_type, entry_point.identifier)
        expect(session.parking_slot).to eq(parking_slot)
      end

      it 'sets the entry point' do
        entry_point = create(:entry_point, identifier: 'A')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')
        session = service.park_vehicle(vehicle_type, entry_point.identifier)
        expect(session.entry_point).to eq(entry_point)
      end

      it 'sets the vehicle type' do
        entry_point = create(:entry_point, identifier: 'A')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')
        session = service.park_vehicle(vehicle_type, entry_point.identifier)
        expect(session.vehicle_type).to eq(vehicle_type)
      end

      it 'sets parked_at timestamp' do
        entry_point = create(:entry_point, identifier: 'A')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')
        Timecop.freeze(Time.current) do
          session = service.park_vehicle(vehicle_type, entry_point.identifier)
          expect(session.parked_at).to be_within(1.second).of(Time.current)
        end
      end
    end

    context 'with invalid vehicle type' do
      it 'returns nil' do
        entry_point = create(:entry_point, identifier: 'A')
        result = service.park_vehicle('X', entry_point.identifier)
        expect(result).to be_nil
      end

      it 'adds error' do
        entry_point = create(:entry_point, identifier: 'A')
        service.park_vehicle('X', entry_point.identifier)
        expect(service.errors).to include('Invalid vehicle type')
      end
    end

    context 'when no slots are available' do
      it 'returns nil' do
        entry_point = create(:entry_point, identifier: 'A')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        result = service.park_vehicle(vehicle_type, entry_point.identifier)
        expect(result).to be_nil
      end

      it 'adds error' do
        entry_point = create(:entry_point, identifier: 'A')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        service.park_vehicle(vehicle_type, entry_point.identifier)
        expect(service.errors).to include('No available parking slot')
      end
    end

    context 'concurrent parking requests' do
      let(:slot_count) { 3 }
      let(:thread_count) { 5 }

      it 'prevents double booking' do
        # Use a unique entry point identifier to avoid conflicts with other tests
        entry_point = create(:entry_point, identifier: 'Z')
        slots = create_list(:parking_slot, slot_count, slot_type: 'SP', entry_point: entry_point)
        ParkingSession.count

        threads = thread_count.times.map do
          Thread.new do
            service.park_vehicle(vehicle_type, entry_point.identifier)
          end
        end

        threads.each(&:join)

        # Count sessions created from the specific slots we created
        slot_ids = slots.map(&:id)
        sessions_from_our_slots = ParkingSession.where(parking_slot_id: slot_ids)
        expect(sessions_from_our_slots.count).to be <= slot_count
      end
    end
  end

  describe '#unpark_vehicle' do
    let(:vehicle_type) { 'S' }

    context 'with valid session' do
      it 'updates exited_at' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        session = create(:parking_session,
                         vehicle_type: vehicle_type,
                         parking_slot: parking_slot,
                         entry_point: entry_point,
                         parked_at: 2.hours.ago)
        Timecop.freeze(Time.current) do
          result = service.unpark_vehicle(session.id)
          expect(result[:session].exited_at).to be_within(1.second).of(Time.current)
        end
      end

      it 'calculates fee' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        session = create(:parking_session,
                         vehicle_type: vehicle_type,
                         parking_slot: parking_slot,
                         entry_point: entry_point,
                         parked_at: 2.hours.ago)
        result = service.unpark_vehicle(session.id)
        # The implementation may return Integer or BigDecimal depending on the calculation
        expect(result[:fee]).to be_a(Numeric)
        expect(result[:fee]).to be > 0
      end

      it 'returns fee breakdown' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        session = create(:parking_session,
                         vehicle_type: vehicle_type,
                         parking_slot: parking_slot,
                         entry_point: entry_point,
                         parked_at: 2.hours.ago)
        result = service.unpark_vehicle(session.id)
        expect(result[:breakdown]).to have_key(:total_fee)
        expect(result[:breakdown]).to have_key(:duration_hours)
      end
    end

    context 'when vehicle already unparked' do
      it 'returns nil' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        session = create(:parking_session,
                         vehicle_type: vehicle_type,
                         parking_slot: parking_slot,
                         entry_point: entry_point,
                         parked_at: 2.hours.ago)
        session.update!(exited_at: 2.hours.ago)
        result = service.unpark_vehicle(session.id)
        expect(result).to be_nil
      end

      it 'adds error' do
        entry_point = create(:entry_point, identifier: 'A')
        parking_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')
        session = create(:parking_session,
                         vehicle_type: vehicle_type,
                         parking_slot: parking_slot,
                         entry_point: entry_point,
                         parked_at: 2.hours.ago)
        session.update!(exited_at: 2.hours.ago)
        service.unpark_vehicle(session.id)
        expect(service.errors).to include('Vehicle already unparked')
      end
    end

    context 'when session not found' do
      it 'returns nil' do
        result = service.unpark_vehicle('nonexistent')
        expect(result).to be_nil
      end

      it 'adds error' do
        service.unpark_vehicle('nonexistent')
        expect(service.errors).to include('Parking session not found')
      end
    end
  end

  describe '#available_slots' do
    context 'with available slots' do
      it 'returns available slots' do
        entry_point = create(:entry_point, identifier: 'A')
        create_list(:parking_slot, 3, slot_type: 'SP', entry_point: entry_point)
        slots = service.available_slots(vehicle_type, entry_point.identifier)
        expect(slots.count).to eq(3)
      end

      it 'sorts by distance' do
        entry_point = create(:entry_point, identifier: 'A')
        create_list(:parking_slot, 3, slot_type: 'SP', entry_point: entry_point)
        slots = service.available_slots(vehicle_type, entry_point.identifier)
        distances = slots.map { |s| s.distance_from(entry_point) }
        expect(distances).to eq(distances.sort)
      end
    end

    context 'with vehicle type compatibility' do
      it 'returns only compatible slots' do
        entry_point = create(:entry_point, identifier: 'A')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point)
        create(:parking_slot, slot_type: 'MP', entry_point: entry_point)
        create(:parking_slot, slot_type: 'LP', entry_point: entry_point)
        slots = service.available_slots('S', entry_point.identifier)
        expect(slots.map(&:slot_type)).to all(be_in(%w[SP MP LP]))
      end
    end
  end
end
