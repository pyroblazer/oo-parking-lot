class CreateParkingSlots < ActiveRecord::Migration[7.1]
  def change
    create_table :parking_slots do |t|
      t.string :slot_label, null: false, index: { unique: true }
      t.string :slot_type, null: false
      t.jsonb :distances, null: false, default: []
      t.references :entry_point, foreign_key: true, null: true

      t.timestamps null: false
    end

    add_index :parking_slots, :slot_type
  end
end
