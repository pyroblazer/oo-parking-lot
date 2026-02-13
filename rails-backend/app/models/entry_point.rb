class EntryPoint < ApplicationRecord
  has_many :parking_slots, dependent: :nullify
  has_many :parking_sessions, dependent: :nullify

  validates :identifier, presence: true, uniqueness: { case_sensitive: true }
  validates :name, presence: true

  # Get the index of this entry point for distance calculations
  # Entry points are ordered by their identifier (A=0, B=1, C=2, etc.)
  def index
    identifier.ord - 'A'.ord
  end
end
