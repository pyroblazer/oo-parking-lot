FactoryBot.define do
  factory :entry_point do
    sequence(:identifier) { |n| "EP-#{n}" }
    sequence(:name) { |n| "Entry Point #{n}" }
  end

  factory :parking_slot do
    slot_label { "SP-#{SecureRandom.hex(4)}" }
    slot_type { 'SP' }
    distances { [1, 4, 5] }
    status { 'available' }
    association :entry_point
  end

  factory :parking_session do
    vehicle_type { 'S' }
    parked_at { Time.current }
    exited_at { nil }
    total_fee { 0 }
    state { 'active' }
    billing_state { 'pending' }
    association :parking_slot
    association :entry_point

    trait :completed do
      exited_at { 2.hours.from_now }
      state { 'exited' }
    end

    trait :long_term do
      parked_at { 25.hours.ago }
      exited_at { 1.hour.ago }
      state { 'exited' }
    end
  end

  factory :billing_audit_log do
    association :parking_session
    vehicle_type { 'S' }
    slot_label { "SP-#{SecureRandom.hex(4)}" }
    slot_type { 'SP' }
    entry_point { 'A' }
    parked_at { 2.hours.ago }
    exited_at { Time.current }
    duration_hours { 2 }
    total_fee { 40.0 }
    base_fee { 40.0 }
    exceeding_fee { 0 }
    exceeding_hours { 0 }
    long_term_days { 0 }
    long_term_fee { 0 }
    is_continuous { false }
    base_start_time { 2.hours.ago }
    fee_breakdown { { 'base_fee' => 40.0, 'exceeding_fee' => 0.0 } }
    correlation_id { SecureRandom.uuid }
    idempotency_key { "audit-session-#{SecureRandom.hex(4)}" }
    calculated_at { Time.current }

    trait :completed do
      parked_at { 2.hours.ago }
      exited_at { Time.current }
      duration_hours { 2 }
      is_continuous { false }
    end

    trait :long_term do
      parked_at { 25.hours.ago }
      exited_at { 1.hour.ago }
      duration_hours { 24 }
      long_term_days { 1 }
      long_term_fee { 500.0 }
      exceeding_fee { 460.0 }
      exceeding_hours { 2 }
    end
  end

  factory :kafka_event do
    event_type { 'vehicle.parked' }
    topic { 'vehicle.parked' }
    event_id { SecureRandom.uuid }
    occurred_at { Time.current }
    status { 'pending' }
    retry_count { 0 }
    correlation_id { SecureRandom.uuid }
    causation_id { nil }
    idempotency_key { SecureRandom.uuid }
    event_payload { {} }
    offset { nil }
    published_at { nil }
    error_message { nil }
  end

  factory :vehicle do
    sequence(:license_plate) { |n| "ABC-#{n.to_s.rjust(4, '0')}" }
    vehicle_type { 'S' }
  end
end
