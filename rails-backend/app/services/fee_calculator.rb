# Service class for calculating parking fees (deprecated - use PricingEngine)
# This class is maintained for backward compatibility
class FeeCalculator
  attr_reader :session

  def initialize(session)
    raise ArgumentError, 'Session cannot be nil' if session.nil?

    @session = session
  end

  # Calculate total parking fee (delegates to PricingEngine)
  def calculate
    PricingEngine.new(session).calculate
  end

  # Get detailed fee breakdown (delegates to PricingEngine)
  def breakdown
    PricingEngine.new(session).breakdown
  end
end
