class EntryPoint < ApplicationRecord
  has_many :parking_slots, dependent: :nullify
  has_many :parking_sessions, dependent: :nullify

  validates :identifier, presence: true, uniqueness: { case_sensitive: true }
  validates :name, presence: true

  # Get index of this entry point based on identifier
  # A=0, B=1, C=2, ..., Z=25 (alphabetical order)
  def index
    return nil if identifier.blank?

    # Calculate index based on alphabetical position (A=0, B=1, C=2, ..., Z=25)
    identifier.upcase.ord - 'A'.ord
  end
end
