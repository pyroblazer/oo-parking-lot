require_relative 'config/environment'

puts 'Routes loaded:'
Rails.application.routes.routes.each do |r|
  puts "  #{r.path} => #{r.defaults[:controller]}##{r.defaults[:action]}"
end
