require_relative 'config/environment'

puts 'Checking if routes are loaded...'
puts "Total routes: #{Rails.application.routes.routes.count}"

# Check if entry_points route exists
entry_point_routes = Rails.application.routes.routes.select { |r| r.path.include?('entry_points') }
puts "Entry point routes: #{entry_point_routes.count}"

entry_point_routes.each do |route|
  puts "  Path: #{route.path}"
  puts "  Controller: #{route.defaults[:controller]}"
  puts "  Action: #{route.defaults[:action]}"
end
