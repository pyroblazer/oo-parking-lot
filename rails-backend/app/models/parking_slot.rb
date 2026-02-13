class ParkingSlot < ApplicationRecord
  belongs_to :entry_point, optional: true
  has_many :parking_sessions, dependent: :nullify

  validates :slot_label, presence: true, uniqueness: { case_sensitive: true }
  validates :slot_type, presence: true, inclusion: { in: %w[SP MP LP] }
  validates :distances, presence: true, length: { is: 3, message: 'must have exactly 3 values for 3 entry points' }

  # Check if this slot is available
  def available?
    status == 'available'
  end

  # Get distance from a specific entry point
  def distance_from(entry_point)
    index = entry_point.index
    # Handle entry points outside the expected range (A, B, C)
    return BigDecimal::INFINITY unless index && index < distances.length

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
end
