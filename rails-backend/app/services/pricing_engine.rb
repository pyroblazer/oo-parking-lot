# Pricing Engine
# Strategy-based pricing calculation engine for extensibility
# rubocop:disable Layout/EmptyLinesAfterModuleInclusion
class PricingEngine
  # Include SemanticLogger::Loggable if available
  begin
    include SemanticLogger::Loggable
  rescue NameError, LoadError
    # Fallback: define logger method if SemanticLogger is not available
    def logger
      @logger ||= Rails.logger
    end
  end

  # Include Tracing if available
  begin
    include Tracing
  rescue NameError, LoadError
    # Fallback: define no-op methods if Tracing is not available
    def with_span(name, &)
      yield
    end

    def set_error(span, error)
      # No-op if Tracing is not available
    end
  end

  attr_reader :session, :strategy

  # Available pricing strategies
  STRATEGIES = {
    'standard' => Pricing::StandardPricingStrategy
  }.freeze

  # Class instance variable to store custom strategies
  @custom_strategies = {}

  class << self
    attr_accessor :custom_strategies
  end

  def initialize(session, strategy_name = 'standard')
    @session = session
    @strategy = load_strategy(strategy_name)
  end

  # Calculate total fee using selected strategy
  # Optimized: Reduced logging overhead for performance
  def calculate
    with_span('PricingEngine.calculate') do |span|
      span.set_attribute('pricing.strategy', strategy.class.name)
      span.set_attribute('session.id', session.id)

      result = if defined?($parking_metrics) && $parking_metrics.respond_to?(:track_billing_calculation_duration)
                 $parking_metrics.track_billing_calculation_duration do
                   strategy.calculate(is_continuous: session.continuous?)
                 end
               else
                 strategy.calculate(is_continuous: session.continuous?)
               end

      span.set_attribute('pricing.total_fee', result)
      # Removed verbose logging to improve performance in high-frequency calculations
      # logger.info('Pricing calculation completed',
      #             session_id: session.id,
      #             strategy: strategy.class.name,
      #             total_fee: result)

      result
    rescue StandardError => e
      set_error(span, e)
      logger.error('Pricing calculation failed',
                   session_id: session.id,
                   strategy: strategy.class.name,
                   error: e.message)
      raise
    end
  end

  # Get detailed breakdown using selected strategy
  def breakdown
    with_span('PricingEngine.breakdown') do |span|
      span.set_attribute('pricing.strategy', strategy.class.name)
      span.set_attribute('session.id', session.id)

      result = strategy.breakdown(is_continuous: session.continuous?)

      span.set_attribute('pricing.breakdown', result.to_json)
      logger.info('Pricing breakdown generated',
                  session_id: session.id,
                  strategy: strategy.class.name,
                  breakdown: result)

      result
    rescue StandardError => e
      set_error(span, e)
      logger.error('Pricing breakdown failed',
                   session_id: session.id,
                   strategy: strategy.class.name,
                   error: e.message)
      raise
    end
  end

  # Register a custom pricing strategy
  def self.register_strategy(name, strategy_class)
    # Store new strategies in a class instance variable to allow runtime registration
    self.custom_strategies ||= {}
    self.custom_strategies[name.to_s] = strategy_class
    logger.info('Pricing strategy registered', name: name, strategy: strategy_class.name)
  end

  # Get available strategies
  def self.available_strategies
    (STRATEGIES.keys + (custom_strategies&.keys || [])).uniq
  end

  private

  def load_strategy(strategy_name)
    # Check custom strategies first, then fall back to default strategies
    strategy_class = self.class.custom_strategies&.dig(strategy_name) || STRATEGIES[strategy_name]

    unless strategy_class
      available = PricingEngine.available_strategies.join(', ')
      raise ArgumentError, "Unknown pricing strategy: #{strategy_name}. Available: #{available}"
    end

    strategy_class.new(session)
  end
end
# rubocop:enable Layout/EmptyLinesAfterModuleInclusion
