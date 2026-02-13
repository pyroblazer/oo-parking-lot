# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 20_250_101_000_010) do
  # These are extensions that must be enabled in order to support this database
  enable_extension 'pg_catalog.plpgsql'

  create_table 'billing_audit_logs', id: :uuid, default: -> { 'gen_random_uuid()' }, comment: 'Immutable audit logs for billing calculations. Records must never be updated or deleted.', force: :cascade do |t|
    t.bigint 'parking_session_id', null: false
    t.string 'vehicle_type', null: false
    t.string 'slot_label', null: false
    t.string 'slot_type', null: false
    t.string 'entry_point', null: false
    t.datetime 'parked_at', null: false
    t.datetime 'exited_at', null: false
    t.decimal 'total_fee', precision: 10, scale: 2, null: false
    t.decimal 'base_fee', precision: 10, scale: 2, null: false
    t.decimal 'exceeding_fee', precision: 10, scale: 2, null: false
    t.integer 'exceeding_hours', null: false
    t.integer 'long_term_days', default: 0, null: false
    t.decimal 'long_term_fee', precision: 10, scale: 2, default: '0.0', null: false
    t.decimal 'duration_hours', precision: 10, scale: 2, null: false
    t.boolean 'is_continuous', default: false, null: false
    t.datetime 'base_start_time'
    t.jsonb 'fee_breakdown', default: {}, null: false
    t.string 'correlation_id'
    t.string 'idempotency_key'
    t.string 'billing_version', default: '1.0', null: false
    t.datetime 'calculated_at', default: -> { 'CURRENT_TIMESTAMP' }, null: false
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.index ['correlation_id'], name: 'index_billing_audit_logs_on_correlation_id'
    t.index ['exited_at'], name: 'index_billing_audit_logs_on_exited_at'
    t.index ['idempotency_key'], name: 'index_billing_audit_logs_on_idempotency_key'
    t.index %w[parked_at exited_at total_fee], name: 'index_billing_audit_logs_reports'
    t.index ['parked_at'], name: 'index_billing_audit_logs_on_parked_at'
    t.index ['parking_session_id'], name: 'index_billing_audit_logs_on_parking_session_id'
    t.index ['total_fee'], name: 'index_billing_audit_logs_on_total_fee'
    t.index ['vehicle_type'], name: 'index_billing_audit_logs_on_vehicle_type'
  end

  create_table 'entry_points', force: :cascade do |t|
    t.string 'identifier', null: false
    t.string 'name', null: false
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.index ['identifier'], name: 'index_entry_points_on_identifier', unique: true
  end

  create_table 'kafka_events', id: :uuid, default: -> { 'gen_random_uuid()' }, comment: 'Tracks all events emitted to Kafka. Ensures idempotency and provides audit trail for event-driven architecture.', force: :cascade do |t|
    t.string 'event_type', null: false
    t.string 'topic', null: false
    t.integer 'partition', default: 0, null: false
    t.bigint 'offset'
    t.string 'event_key'
    t.jsonb 'event_payload', default: {}, null: false
    t.string 'correlation_id'
    t.string 'causation_id'
    t.string 'idempotency_key'
    t.string 'event_id', null: false
    t.datetime 'occurred_at', null: false
    t.datetime 'published_at'
    t.string 'status', default: 'pending', null: false
    t.integer 'retry_count', default: 0, null: false
    t.text 'error_message'
    t.jsonb 'metadata', default: {}, null: false
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.index ['correlation_id'], name: 'index_kafka_events_on_correlation_id'
    t.index ['event_id'], name: 'index_kafka_events_on_event_id', unique: true
    t.index %w[event_type occurred_at], name: 'index_kafka_events_replay'
    t.index ['event_type'], name: 'index_kafka_events_on_event_type'
    t.index ['idempotency_key'], name: 'index_kafka_events_on_idempotency_key'
    t.index ['occurred_at'], name: 'index_kafka_events_on_occurred_at'
    t.index %w[status occurred_at retry_count], name: 'index_kafka_events_retry'
    t.index ['status'], name: 'index_kafka_events_on_status'
    t.index ['topic'], name: 'index_kafka_events_on_topic'
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying::text, 'published'::character varying::text, 'failed'::character varying::text, 'retrying'::character varying::text])", name: 'check_kafka_events_status'
  end

  create_table 'parking_sessions', force: :cascade do |t|
    t.string 'vehicle_type', null: false
    t.bigint 'parking_slot_id', null: false
    t.bigint 'entry_point_id', null: false
    t.datetime 'parked_at', null: false
    t.datetime 'exited_at'
    t.decimal 'total_fee', precision: 10, scale: 2, default: '0.0'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.string 'idempotency_key'
    t.string 'correlation_id'
    t.string 'state', default: 'active', null: false
    t.uuid 'vehicle_id'
    t.integer 'duration_seconds'
    t.string 'billing_state', default: 'pending', null: false
    t.jsonb 'fee_breakdown', default: {}, null: false
    t.jsonb 'metadata', default: {}, null: false
    t.index ['billing_state'], name: 'index_parking_sessions_on_billing_state'
    t.index ['correlation_id'], name: 'index_parking_sessions_on_correlation_id'
    t.index ['duration_seconds'], name: 'index_parking_sessions_on_duration_seconds'
    t.index ['entry_point_id'], name: 'index_parking_sessions_on_entry_point_id'
    t.index ['exited_at'], name: 'index_parking_sessions_on_exited_at'
    t.index ['fee_breakdown'], name: 'index_parking_sessions_on_fee_breakdown', using: :gin
    t.index ['idempotency_key'], name: 'index_parking_sessions_on_idempotency_key', unique: true
    t.index %w[parked_at exited_at total_fee], name: 'index_parking_sessions_billing'
    t.index %w[parked_at exited_at], name: 'index_parking_sessions_active', where: '(exited_at IS NULL)'
    t.index ['parked_at'], name: 'index_parking_sessions_on_parked_at'
    t.index %w[parking_slot_id exited_at vehicle_type], name: 'index_parking_sessions_allocation'
    t.index %w[parking_slot_id exited_at], name: 'index_parking_sessions_on_parking_slot_id_and_exited_at'
    t.index ['parking_slot_id'], name: 'index_parking_sessions_on_parking_slot_id'
    t.index ['state'], name: 'index_parking_sessions_on_state'
    t.index %w[vehicle_id parked_at exited_at], name: 'index_parking_sessions_vehicle_timeline'
    t.index ['vehicle_id'], name: 'index_parking_sessions_on_vehicle_id'
    t.index %w[vehicle_type exited_at], name: 'index_parking_sessions_continuous'
    t.index ['vehicle_type'], name: 'index_parking_sessions_on_vehicle_type'
    t.check_constraint "billing_state::text = ANY (ARRAY['pending'::character varying::text, 'calculated'::character varying::text, 'finalized'::character varying::text, 'disputed'::character varying::text])", name: 'check_parking_sessions_billing_state'
    t.check_constraint "state::text = ANY (ARRAY['active'::character varying::text, 'exited'::character varying::text, 'billing_pending'::character varying::text, 'billing_completed'::character varying::text])", name: 'check_parking_sessions_state'
  end

  create_table 'parking_slots', comment: 'Parking slots with type-based vehicle compatibility. SP=Small/Medium/Large, MP=Medium/Large, LP=Large only.', force: :cascade do |t|
    t.string 'slot_label', null: false
    t.string 'slot_type', null: false
    t.jsonb 'distances', default: [], null: false
    t.bigint 'entry_point_id'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.string 'status', default: 'available', null: false
    t.datetime 'last_occupied_at'
    t.index ['distances'], name: 'index_parking_slots_on_distances', using: :gin
    t.index ['entry_point_id'], name: 'index_parking_slots_on_entry_point_id'
    t.index ['last_occupied_at'], name: 'index_parking_slots_on_last_occupied_at'
    t.index ['slot_label'], name: 'index_parking_slots_on_slot_label', unique: true
    t.index %w[slot_type status slot_label], name: 'index_parking_slots_allocation'
    t.index ['slot_type'], name: 'index_parking_slots_on_slot_type'
    t.index ['status'], name: 'index_parking_slots_on_status'
    t.check_constraint "slot_type::text = ANY (ARRAY['SP'::character varying::text, 'MP'::character varying::text, 'LP'::character varying::text])", name: 'check_parking_slots_slot_type'
    t.check_constraint "status::text = ANY (ARRAY['available'::character varying::text, 'occupied'::character varying::text, 'maintenance'::character varying::text])", name: 'check_parking_slots_status'
  end

  create_table 'vehicles', id: :uuid, default: -> { 'gen_random_uuid()' }, comment: 'Vehicle tracking for session management and analytics. License plate is the natural key.', force: :cascade do |t|
    t.string 'license_plate', null: false
    t.string 'vehicle_type', null: false
    t.string 'color'
    t.string 'brand'
    t.string 'model'
    t.integer 'year'
    t.jsonb 'metadata', default: {}, null: false
    t.datetime 'first_seen_at', default: -> { 'CURRENT_TIMESTAMP' }, null: false
    t.datetime 'last_seen_at'
    t.integer 'total_sessions', default: 0, null: false
    t.decimal 'total_spent', precision: 12, scale: 2, default: '0.0', null: false
    t.integer 'total_hours_parked', default: 0, null: false
    t.boolean 'is_frequent', default: false, null: false
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.index ['first_seen_at'], name: 'index_vehicles_on_first_seen_at'
    t.index ['is_frequent'], name: 'index_vehicles_on_is_frequent'
    t.index ['last_seen_at'], name: 'index_vehicles_on_last_seen_at'
    t.index ['license_plate'], name: 'index_vehicles_on_license_plate', unique: true
    t.index ['total_spent'], name: 'index_vehicles_on_total_spent'
    t.index %w[vehicle_type total_sessions total_spent], name: 'index_vehicles_analytics'
    t.index ['vehicle_type'], name: 'index_vehicles_on_vehicle_type'
    t.check_constraint "vehicle_type::text = ANY (ARRAY['S'::character varying::text, 'M'::character varying::text, 'L'::character varying::text])", name: 'check_vehicles_vehicle_type'
  end

  add_foreign_key 'billing_audit_logs', 'parking_sessions'
  add_foreign_key 'parking_sessions', 'entry_points'
  add_foreign_key 'parking_sessions', 'parking_slots'
  add_foreign_key 'parking_sessions', 'vehicles'
  add_foreign_key 'parking_slots', 'entry_points'
end
