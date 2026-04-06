class CreateKafkaEvents < ActiveRecord::Migration[7.1]
  def change
    # Event tracking table for Kafka event system
    # This table tracks all events emitted to Kafka for idempotency and audit
    create_table :kafka_events, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.string :event_type, null: false
      t.string :topic, null: false
      t.integer :partition, null: false, default: 0
      t.bigint :offset
      t.string :event_key
      t.jsonb :event_payload, null: false, default: {}
      t.string :correlation_id
      t.string :causation_id
      t.string :idempotency_key
      t.string :event_id, null: false
      t.datetime :occurred_at, null: false
      t.datetime :published_at
      t.string :status, null: false, default: 'pending'
      t.integer :retry_count, null: false, default: 0
      t.text :error_message
      t.jsonb :metadata, null: false, default: {}

      t.timestamps null: false
    end

    # Indexes for event tracking
    add_index :kafka_events, :event_type
    add_index :kafka_events, :topic
    add_index :kafka_events, :event_id, unique: true
    add_index :kafka_events, :idempotency_key
    add_index :kafka_events, :correlation_id
    add_index :kafka_events, :status
    add_index :kafka_events, :occurred_at

    # Composite index for retry processing
    add_index :kafka_events,
              %i[status occurred_at retry_count],
              name: 'index_kafka_events_retry'

    # Composite index for event replay
    add_index :kafka_events,
              %i[event_type occurred_at],
              name: 'index_kafka_events_replay'

    # Add check constraint for status values
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          ALTER TABLE kafka_events
          ADD CONSTRAINT check_kafka_events_status
          CHECK (status IN ('pending', 'published', 'failed', 'retrying'))
        SQL
      end
      dir.down do
        execute <<~SQL.squish
          ALTER TABLE kafka_events
          DROP CONSTRAINT check_kafka_events_status
        SQL
      end
    end

    # Add comment for documentation
    execute <<~SQL.squish
      COMMENT ON TABLE kafka_events IS 'Tracks all events emitted to Kafka. Ensures idempotency and provides audit trail for event-driven architecture.'
    SQL
  end
end
