class AddLicensePlateToParkingSessions < ActiveRecord::Migration[7.0]
  def change
    add_column :parking_sessions, :license_plate, :string, null: true
    add_index :parking_sessions, %i[vehicle_type license_plate exited_at], name: 'idx_parking_sessions_vehicle_license_exit'
  end
end
