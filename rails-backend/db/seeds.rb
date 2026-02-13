# This file seeds the database with initial data for the parking lot system
# It creates entry points and parking slots as specified in the Postman collection

Rails.logger.info '=== Starting Database Seeding ==='

# Clear existing data
Rails.logger.info 'Clearing existing data...'
EntryPoint.delete_all
ParkingSlot.delete_all
ParkingSession.delete_all

# Create entry points
Rails.logger.info 'Creating entry points...'
entry_points_data = [
  { identifier: 'A', name: 'Entry Point A' },
  { identifier: 'B', name: 'Entry Point B' },
  { identifier: 'C', name: 'Entry Point C' }
]
entry_points_data.each do |ep|
  EntryPoint.create!(identifier: ep[:identifier], name: ep[:name])
  Rails.logger.info "Created entry point: #{ep[:identifier]}"
end

Rails.logger.info "Total entry points created: #{EntryPoint.count}"

# Create parking slots
Rails.logger.info 'Creating parking slots...'
slots_data = [
  { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] },
  { slot_label: 'SP-2', slot_type: 'SP', distances: [3, 2, 4] },
  { slot_label: 'SP-3', slot_type: 'SP', distances: [4, 1, 3] },
  { slot_label: 'MP-1', slot_type: 'MP', distances: [5, 2, 3] },
  { slot_label: 'MP-2', slot_type: 'MP', distances: [6, 3, 2] },
  { slot_label: 'LP-1', slot_type: 'LP', distances: [7, 4, 2] },
  { slot_label: 'LP-2', slot_type: 'LP', distances: [2, 5, 6] }
]

slots_data.each do |slot|
  # Create parking slots without entry_point association initially
  # The entry_point_id should be nil and will be set when a vehicle parks
  ParkingSlot.create!(
    slot_label: slot[:slot_label],
    slot_type: slot[:slot_type],
    distances: slot[:distances],
    entry_point: nil, # Initially unassigned
    status: 'available'
  )
  Rails.logger.info "Created parking slot: #{slot[:slot_label]}"
end

Rails.logger.info "Total parking slots created: #{ParkingSlot.count}"

puts "Seeded #{EntryPoint.count} entry points and #{ParkingSlot.count} parking slots"
Rails.logger.info '=== Database Seeding Complete ==='
