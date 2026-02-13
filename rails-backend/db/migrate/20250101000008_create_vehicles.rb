class CreateVehicles < ActiveRecord::Migration[7.1]
  def change
    # Vehicle tracking table for better session management and analytics
    create_table :vehicles, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.string :license_plate, null: false
      t.string :vehicle_type, null: false
      t.string :color
      t.string :brand
      t.string :model
      t.integer :year
      t.jsonb :metadata, null: false, default: {}
      t.datetime :first_seen_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }
      t.datetime :last_seen_at
      t.integer :total_sessions, null: false, default: 0
      t.decimal :total_spent, precision: 12, scale: 2, null: false, default: 0
      t.integer :total_hours_parked, null: false, default: 0
      t.boolean :is_frequent, null: false, default: false

      t.timestamps null: false
    end

    # Indexes for vehicle queries
    add_index :vehicles, :license_plate, unique: true
    add_index :vehicles, :vehicle_type
    add_index :vehicles, :first_seen_at
    add_index :vehicles, :last_seen_at
    add_index :vehicles, :total_spent
    add_index :vehicles, :is_frequent

    # Composite index for analytics
    add_index :vehicles,
              %i[vehicle_type total_sessions total_spent],
              name: 'index_vehicles_analytics'

    # Add check constraint for vehicle_type values
    reversible do |dir|
      dir.up do
        execute <<-SQL
          ALTER TABLE vehicles
          ADD CONSTRAINT check_vehicles_vehicle_type
          CHECK (vehicle_type IN ('S', 'M', 'L'))
        SQL
      end
      dir.down do
        execute <<-SQL
          ALTER TABLE vehicles
          DROP CONSTRAINT check_vehicles_vehicle_type
        SQL
      end
    end

    # Add comment for documentation
    execute <<-SQL
      COMMENT ON TABLE vehicles IS 'Vehicle tracking for session management and analytics. License plate is the natural key.'
    SQL
  end
end
