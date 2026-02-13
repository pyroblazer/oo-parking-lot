class AddVehicleToParkingSessions < ActiveRecord::Migration[7.1]
  def change
    # Add vehicle reference to parking sessions
    add_reference :parking_sessions, :vehicle, type: :uuid, foreign_key: true, null: true

    # Add composite index for vehicle session queries
    add_index :parking_sessions,
              %i[vehicle_id parked_at exited_at],
              name: 'index_parking_sessions_vehicle_timeline'

    # Add session duration for analytics
    add_column :parking_sessions, :duration_seconds, :integer
    add_index :parking_sessions, :duration_seconds

    # Add billing state for explicit state machine
    add_column :parking_sessions, :billing_state, :string, default: 'pending', null: false
    add_index :parking_sessions, :billing_state

    # Add check constraint for billing_state values
    reversible do |dir|
      dir.up do
        execute <<-SQL
          ALTER TABLE parking_sessions
          ADD CONSTRAINT check_parking_sessions_billing_state
          CHECK (billing_state IN ('pending', 'calculated', 'finalized', 'disputed'))
        SQL
      end
      dir.down do
        execute <<-SQL
          ALTER TABLE parking_sessions
          DROP CONSTRAINT check_parking_sessions_billing_state
        SQL
      end
    end

    # Add fee breakdown as JSONB for detailed billing
    add_column :parking_sessions, :fee_breakdown, :jsonb, null: false, default: {}
    add_index :parking_sessions, :fee_breakdown, using: :gin

    # Add session metadata
    add_column :parking_sessions, :metadata, :jsonb, null: false, default: {}
  end
end
