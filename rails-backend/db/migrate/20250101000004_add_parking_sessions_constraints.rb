class AddParkingSessionsConstraints < ActiveRecord::Migration[7.1]
  def change
    # Add unique constraint for active sessions per parking slot
    # This ensures linearizable slot allocation
    add_index :parking_sessions,
              %i[parking_slot_id exited_at],
              unique: true,
              where: 'exited_at IS NULL',
              name: 'index_parking_sessions_on_active_slot_unique'

    # Add partial index for active sessions (performance optimization)
    add_index :parking_sessions,
              %i[parked_at exited_at],
              where: 'exited_at IS NULL',
              name: 'index_parking_sessions_active'

    # Add covering index for allocation queries
    # This optimizes queries for finding available slots
    add_index :parking_sessions,
              %i[parking_slot_id exited_at vehicle_type],
              name: 'index_parking_sessions_allocation'

    # Add index for continuous parking queries
    add_index :parking_sessions,
              %i[vehicle_type exited_at],
              name: 'index_parking_sessions_continuous'

    # Add index for billing queries
    add_index :parking_sessions,
              %i[parked_at exited_at total_fee],
              name: 'index_parking_sessions_billing'

    # Add idempotency key tracking
    add_column :parking_sessions, :idempotency_key, :string
    add_index :parking_sessions, :idempotency_key, unique: true

    # Add correlation ID for distributed tracing
    add_column :parking_sessions, :correlation_id, :string
    add_index :parking_sessions, :correlation_id

    # Add session state for explicit state machine
    add_column :parking_sessions, :state, :string, default: 'active', null: false
    add_index :parking_sessions, :state

    # Add check constraint for state values
    reversible do |dir|
      dir.up do
        execute <<-SQL
          ALTER TABLE parking_sessions
          ADD CONSTRAINT check_parking_sessions_state
          CHECK (state IN ('active', 'exited', 'billing_pending', 'billing_completed'))
        SQL
      end
      dir.down do
        execute <<-SQL
          ALTER TABLE parking_sessions
          DROP CONSTRAINT check_parking_sessions_state
        SQL
      end
    end
  end
end
