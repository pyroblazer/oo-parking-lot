class ParkingSlot < ApplicationRecord
  belongs_to :entry_point, optional: true
  has_many :parking_sessions

  validates :slot_label, presence: true, uniqueness: { on: :create, case_sensitive: true }
  validates :slot_type, presence: true, inclusion: { in: %w[SP MP LP], message: 'is invalid' }
  validates :distances, presence: true, on: :create
  validate :distances_array_not_empty

  # Custom validation to log slot_type validation
  validate :log_slot_type_validation

  # Prevent deletion if slot has active parking sessions
  before_destroy :check_active_sessions

  # Check if this slot is available
  def available?
    status == 'available'
  end

  # Get distance from a specific entry point
  # Dynamically determines position of entry point in sorted list
  def distance_from(entry_point)
    # Get all entry points sorted by identifier
    all_entry_points = EntryPoint.order(:identifier).to_a

    # Find the position (index) of this entry point in the sorted list
    index = all_entry_points.index { |ep| ep.id == entry_point.id }

    # Return infinity if entry point not found or index is out of bounds
    return BigDecimal::INFINITY if index.nil? || index >= distances.length

    distances[index]
  end

  # Check if a vehicle type can park in this slot
  def compatible_with?(vehicle_type)
    case vehicle_type
    when 'S'
      true # Small vehicles can park in SP, MP, or LP
    when 'M'
      slot_type.in?(%w[MP LP])
    when 'L'
      slot_type == 'LP'
    else
      false
    end
  end

  # Transform distances array to a key-value hash with entry point identifiers as keys
  # Returns a hash like {"A" => 10, "B" => 20, "C" => 30, "D" => 0, "E" => 0, "F" => 0}
  def distances_map
    # Get all entry points sorted by identifier
    all_entry_points = EntryPoint.order(:identifier).to_a

    # Create a hash mapping entry point identifiers to distance values
    result = {}
    all_entry_points.each_with_index do |ep, index|
      # Use distance value if index is within bounds, otherwise default to 0
      distance = index < distances.length ? distances[index] : 0
      result[ep.identifier] = distance
    end

    result
  end

  # Scope for available slots
  scope :available, -> { where(status: 'available') }

  # Scope for slots compatible with vehicle type
  scope :compatible_with, lambda { |vehicle_type|
    case vehicle_type
    when 'S'
      all
    when 'M'
      where(slot_type: %w[MP LP])
    when 'L'
      where(slot_type: 'LP')
    else
      none
    end
  }

  # Custom validation to log uniqueness checks
  validate :log_uniqueness_validation

  private

  # Log when uniqueness validation is triggered
  def log_uniqueness_validation
    return if slot_label.blank?

    Rails.logger.info '[ParkingSlot] Uniqueness validation triggered for ' \
                      "slot_label: '#{slot_label}' (ID: #{id || 'new'}, " \
                      "action: #{new_record? ? 'create' : 'update'})"
  end

  # Log when slot_type validation is triggered
  def log_slot_type_validation
    return if slot_type.blank?

    Rails.logger.info '[ParkingSlot] Slot type validation triggered for ' \
                      "slot_type: '#{slot_type}' (ID: #{id || 'new'}, " \
                      "action: #{new_record? ? 'create' : 'update'})"
  end

  # Empty distances arrays are now valid (no validation needed)
  # Empty arrays are allowed for both create and update operations
  # The backfill mechanism in the controller will handle empty arrays appropriately

  # Validate distances array is not empty (no-op - empty arrays are now allowed)
  def distances_array_not_empty
    # Empty arrays are now valid - no validation needed
    # This method is kept for backward compatibility but does nothing
  end

  # Check if slot has active parking sessions before deletion
  def check_active_sessions
    return unless parking_sessions.active.exists?

    errors.add(:base, 'Cannot delete parking slot with active parking sessions')
    throw(:abort)
  end

  # Backfill distances for a new entry point
  # Inserts 0 at the correct position based on alphabetical order of entry points
  def self.backfill_distances_for_new_entry_point(identifier)
    # Get all entry points ordered alphabetically
    all_entry_points = EntryPoint.order(:identifier).to_a

    # Find the correct insertion index based on alphabetical order
    insert_index = all_entry_points.length # Default to end
    all_entry_points.each_with_index do |ep, i|
      if identifier < ep.identifier
        insert_index = i
        break
      end
    end

    # Update all parking slots to insert 0 at the correct position
    find_each do |slot|
      new_distances = slot.distances.dup
      if insert_index >= new_distances.length
        # If index is beyond current length, append
        new_distances << 0
      else
        # Insert at the correct position
        new_distances.insert(insert_index, 0)
      end

      slot.update(distances: new_distances)
    end
  end

  # Remove distance for a deleted entry point
  # Removes the distance at the correct position based on alphabetical order of entry points
  def self.remove_distance_for_deleted_entry_point(identifier)
    # Get all entry points ordered alphabetically
    all_entry_points = EntryPoint.order(:identifier).to_a

    # Find the index of the entry point to remove
    remove_index = nil
    all_entry_points.each_with_index do |ep, i|
      if ep.identifier == identifier
        remove_index = i
        break
      end
    end

    # If entry point not found, nothing to remove
    return if remove_index.nil?

    # Update all parking slots to remove the distance at the correct position
    find_each do |slot|
      new_distances = slot.distances.dup
      new_distances.delete_at(remove_index) if remove_index < new_distances.length

      slot.update(distances: new_distances)
    end
  end

  # Reorder distances for an updated entry point
  # Reorders distance arrays when an entry point's identifier changes
  def self.reorder_distances_for_updated_entry_point(old_identifier, new_identifier)
    Rails.logger.info "Reordering distances for entry point change: #{old_identifier} -> #{new_identifier}"

    # Get all entry points ordered alphabetically
    all_entry_points = EntryPoint.order(:identifier).to_a

    # Find the old and new indices
    old_index = nil
    new_index = nil
    all_entry_points.each_with_index do |ep, i|
      old_index = i if ep.identifier == old_identifier
      new_index = i if ep.identifier == new_identifier
    end

    # If old index not found, nothing to reorder
    return if old_index.nil?

    # If indices are the same, nothing to reorder
    return if old_index == new_index

    Rails.logger.info "Old index: #{old_index}, New index: #{new_index}"

    # Update all parking slots to reorder the distance array
    find_each do |slot|
      new_distances = slot.distances.dup

      # Extract the distance at the old index
      distance = if old_index < new_distances.length
                   new_distances[old_index]
                 else
                   0 # Default distance if old index is beyond current length
                 end

      # Remove the distance at the old index
      new_distances.delete_at(old_index) if old_index < new_distances.length

      # Insert the distance at the new index
      if new_index > new_distances.length
        # If new index is beyond current length, append
        new_distances << distance
      else
        # Insert at the correct position
        new_distances.insert(new_index, distance)
      end

      slot.update(distances: new_distances)
    end

    Rails.logger.info "Successfully reordered distances for #{count} slots"
  end
end
