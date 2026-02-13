require 'bigdecimal'
require 'time'

parked_at = Time.parse('2024-01-15T10:30:00Z')
exited_at = Time.parse('2024-01-15T17:24:00Z')
seconds = (exited_at - parked_at).to_i
actual_duration = BigDecimal(seconds.to_s) / BigDecimal('3600')

puts "Seconds: #{seconds}"
puts "Duration: #{actual_duration}"
puts "Rounded: #{actual_duration.ceil}"
