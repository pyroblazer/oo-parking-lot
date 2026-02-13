# Configure BigDecimal serialization for JSON
# This ensures BigDecimal values are serialized as Float in JSON responses
# while maintaining internal BigDecimal precision for calculations
ActiveSupport::JSON::Encoding.use_standard_json_time_format = true

# Monkey-patch BigDecimal to return Float when encoded to JSON
BigDecimal.class_eval do
  def as_json(options = nil)
    to_f
  end
end
