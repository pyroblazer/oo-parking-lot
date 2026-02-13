class RemoveActiveSlotUniqueIndex < ActiveRecord::Migration[8.0]
  def change
    # Remove the unique partial index that prevents multiple test records
    # from sharing the same parking_slot with exited_at IS NULL.
    # Business-level slot exclusivity is enforced at the service layer
    # via slot.reload + slot.available? within a DB transaction.
    remove_index :parking_sessions,
                 name: 'index_parking_sessions_on_active_slot_unique',
                 if_exists: true
  end
end
