# This file seeds the database with initial data for the parking lot system
# It creates entry points and parking slots as specified in the Postman collection

Rails.logger.info '=== Starting Database Seeding ==='

# Clear existing data
Rails.logger.info 'Clearing existing data...'
# Delete in reverse order of dependencies to avoid foreign key violations
ParkingSession.delete_all
ParkingSlot.delete_all
EntryPoint.delete_all

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
  { slot_label: 'SP-1', slot_type: 'SP', distances: [5, 15, 25] },
  { slot_label: 'SP-2', slot_type: 'SP', distances: [10, 5, 15] },
  { slot_label: 'SP-3', slot_type: 'SP', distances: [15, 5, 5] },
  { slot_label: 'MP-1', slot_type: 'MP', distances: [10, 10, 20] },
  { slot_label: 'MP-2', slot_type: 'MP', distances: [20, 10, 10] },
  { slot_label: 'LP-1', slot_type: 'LP', distances: [15, 15, 15] },
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

Rails.logger.debug { "Seeded #{EntryPoint.count} entry points and #{ParkingSlot.count} parking slots" }
Rails.logger.info '=== Database Seeding Complete ==='
