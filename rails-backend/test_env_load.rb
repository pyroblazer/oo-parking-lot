#!/usr/bin/env ruby
# Test script to verify Rails environment loads without FrozenError

ENV['RAILS_ENV'] ||= 'test'

puts "[TEST] Loading Rails environment in #{ENV['RAILS_ENV']} mode..."
require_relative 'config/environment'

puts '[TEST] Environment loaded successfully!'
puts "[TEST] Rails.env: #{Rails.env}"
puts "[TEST] Rails.version: #{Rails.version}"
