ParkingService.new
entry_point = EntryPoint.find_by(identifier: 'A')
slot = ParkingSlot.available.where(slot_type: 'SP').first

if entry_point && slot
  session = ParkingSession.create!(
    vehicle_type: 'S',
    parking_slot: slot,
    entry_point: entry_point,
    parked_at: Time.current
  )

  puts "Created session with ID: #{session.id}"
  puts "Session JSON: #{session.to_json}"
else
  puts 'Failed to create session - missing entry point or slot'
end
