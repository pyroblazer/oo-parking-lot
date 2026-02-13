class Vehicle < ApplicationRecord
  has_many :parking_sessions, dependent: :nullify

  validates :license_plate, presence: true
  validates :vehicle_type, presence: true, inclusion: { in: %w[S M L] }
end
