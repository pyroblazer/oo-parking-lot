class CreateBillingAuditLogs < ActiveRecord::Migration[7.1]
  def change
    # Immutable billing logs for regulatory-grade traceability
    create_table :billing_audit_logs, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.bigint :parking_session_id, null: false
      t.string :vehicle_type, null: false
      t.string :slot_label, null: false
      t.string :slot_type, null: false
      t.string :entry_point, null: false
      t.datetime :parked_at, null: false
      t.datetime :exited_at, null: false
      t.decimal :total_fee, precision: 10, scale: 2, null: false
      t.decimal :base_fee, precision: 10, scale: 2, null: false
      t.decimal :exceeding_fee, precision: 10, scale: 2, null: false
      t.integer :exceeding_hours, null: false
      t.integer :long_term_days, null: false, default: 0
      t.decimal :long_term_fee, precision: 10, scale: 2, null: false, default: 0
      t.decimal :duration_hours, precision: 10, scale: 2, null: false
      t.boolean :is_continuous, null: false, default: false
      t.datetime :base_start_time
      t.jsonb :fee_breakdown, null: false, default: {}
      t.string :correlation_id
      t.string :idempotency_key
      t.string :billing_version, null: false, default: '1.0'
      t.datetime :calculated_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }

      t.timestamps null: false
    end

    # Indexes for audit queries
    add_index :billing_audit_logs, :parking_session_id
    add_index :billing_audit_logs, :parked_at
    add_index :billing_audit_logs, :exited_at
    add_index :billing_audit_logs, :total_fee
    add_index :billing_audit_logs, :vehicle_type
    add_index :billing_audit_logs, :correlation_id
    add_index :billing_audit_logs, :idempotency_key

    # Composite index for billing reports
    add_index :billing_audit_logs,
              %i[parked_at exited_at total_fee],
              name: 'index_billing_audit_logs_reports'

    # Add foreign key to parking sessions
    add_foreign_key :billing_audit_logs, :parking_sessions

    # Add comment for documentation
    execute <<-SQL
      COMMENT ON TABLE billing_audit_logs IS 'Immutable audit logs for billing calculations. Records must never be updated or deleted.'
    SQL
  end
end
