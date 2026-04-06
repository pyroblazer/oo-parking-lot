class CreateParkingSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :parking_sessions do |t|
      t.string :vehicle_type, null: false
      t.references :parking_slot, foreign_key: true, null: false
      t.references :entry_point, foreign_key: true, null: false
      t.datetime :parked_at, null: false
      t.datetime :exited_at
      t.decimal :total_fee, precision: 10, scale: 2, default: 0

      t.timestamps null: false
    end

    add_index :parking_sessions, :vehicle_type
    add_index :parking_sessions, :parked_at
    add_index :parking_sessions, :exited_at
    add_index :parking_sessions, %i[parking_slot_id exited_at]
  end
end
