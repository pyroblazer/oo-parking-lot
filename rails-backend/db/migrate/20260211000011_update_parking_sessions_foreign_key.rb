class UpdateParkingSessionsForeignKey < ActiveRecord::Migration[8.0]
  def change
    # Remove the existing foreign key constraint
    remove_foreign_key :parking_sessions, :parking_slots

    # Make the parking_slot_id column nullable to support on_delete: :nullify
    change_column_null :parking_sessions, :parking_slot_id, true

    # Add new foreign key with nullify on delete to allow slot deletion
    add_foreign_key :parking_sessions, :parking_slots, on_delete: :nullify
  end
end
