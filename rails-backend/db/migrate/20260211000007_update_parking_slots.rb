class UpdateParkingSlots < ActiveRecord::Migration[7.1]
  def change
    # Add check constraint for slot_type values
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          ALTER TABLE parking_slots
          ADD CONSTRAINT check_parking_slots_slot_type
          CHECK (slot_type IN ('SP', 'MP', 'LP'))
        SQL
      end
      dir.down do
        execute <<~SQL.squish
          ALTER TABLE parking_slots
          DROP CONSTRAINT check_parking_slots_slot_type
        SQL
      end
    end

    # Add status column for explicit state
    add_column :parking_slots, :status, :string, default: 'available', null: false
    add_index :parking_slots, :status

    # Add check constraint for status values
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          ALTER TABLE parking_slots
          ADD CONSTRAINT check_parking_slots_status
          CHECK (status IN ('available', 'occupied', 'maintenance'))
        SQL
      end
      dir.down do
        execute <<~SQL.squish
          ALTER TABLE parking_slots
          DROP CONSTRAINT check_parking_slots_status
        SQL
      end
    end

    # Add covering index for allocation queries
    add_index :parking_slots,
              %i[slot_type status slot_label],
              name: 'index_parking_slots_allocation'

    # Add index for distance-based queries
    add_index :parking_slots, :distances, using: :gin

    # Add last_occupied_at for analytics
    add_column :parking_slots, :last_occupied_at, :datetime
    add_index :parking_slots, :last_occupied_at

    # Add comment for documentation
    execute <<~SQL.squish
      COMMENT ON TABLE parking_slots IS 'Parking slots with type-based vehicle compatibility. SP=Small/Medium/Large, MP=Medium/Large, LP=Large only.'
    SQL
  end
end
