# This file is copied to spec/ when you run 'rails generate rspec:install'
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
# Prevent database truncation if the environment is production
abort('The Rails environment is running in production mode!') if Rails.env.production?
require 'rspec/rails'
# Add additional requires below this line. Rails is not loaded until this point!

# Configure Sidekiq for testing
# Ensure Redis URL is set for test environment
ENV['REDIS_URL'] ||= 'redis://localhost:6379/0'

# Configure Sidekiq for test environment
require 'sidekiq'
require 'sidekiq/testing'
Sidekiq::Testing.fake!

# Requires supporting ruby files with custom matchers and macros, etc, in
# spec/support/ and its subdirectories.
Rails.root.glob('spec/support/**/*.rb').sort.each { |f| require f }

# Checks for pending migrations and applies them before tests are run.
# If you are not using ActiveRecord, you can remove these lines.
begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  # Remove this line if you're not using ActiveRecord or ActiveRecord fixtures
  config.fixture_paths = [Rails.root.join('spec/fixtures').to_s]

  # If you're not using ActiveRecord, or you'd prefer not to run each of your
  # examples within a transaction, remove the following line or assign false
  # instead of true.
  config.use_transactional_fixtures = false

  # You can uncomment this line to turn off ActiveRecord support entirely.
  # config.use_active_record = false

  # DatabaseCleaner configuration
  # Use truncation strategy for better test isolation
  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)
    DatabaseCleaner.strategy = :truncation
  end

  config.before do
    DatabaseCleaner.start
  end

  config.append_after do
    DatabaseCleaner.clean
  end

  # Ensure Timecop is always reset after each test to prevent time leakage
  config.after do
    Timecop.return if defined?(Timecop)
  end

  # RSpec Rails can automatically mix in different behaviours to your tests
  # based on their file location, for example enabling you to call `get` and
  # `post` in specs under `spec/controllers`.
  #
  # You can disable this behaviour by removing the line below, or instead
  # explicitly enable it with the `--infer-spec-type` option on the command
  # line or in the `.rspec` configuration file.
  config.infer_spec_type_from_file_location!

  # Filter lines from Rails gems in backtraces.
  config.filter_rails_from_backtrace!
  # arbitrary gems may also be filtered via:
  # config.filter_gems_from_backtrace("gem name")

  # Shoulda Matchers configuration
  Shoulda::Matchers.configure do |shoulda_config|
    shoulda_config.integrate do |with|
      with.test_framework :rspec
      with.library :rails
    end
  end

  # FactoryBot configuration
  config.include FactoryBot::Syntax::Methods

  # Reset FactoryBot sequences before test suite to ensure clean state
  config.before(:suite) do
    FactoryBot.reload
  end

  # Configure Redis cleanup for test isolation
  config.before(:suite) do
    # Clear all Sidekiq queues before running tests
    begin
      Sidekiq::QueueSet.new.each(&:clear)
    rescue NameError
      # Sidekiq::QueueSet not available, skip queue clearing
    end
    begin
      Sidekiq::RetrySet.new.clear
    rescue NameError
      # Sidekiq::RetrySet not available, skip
    end
    begin
      Sidekiq::ScheduledSet.new.clear
    rescue NameError
      # Sidekiq::ScheduledSet not available, skip
    end
    begin
      Sidekiq::DeadSet.new.clear
    rescue NameError
      # Sidekiq::DeadSet not available, skip
    end
  end

  config.after do
    # Clear Sidekiq queues after each test to ensure isolation
    begin
      Sidekiq::QueueSet.new.each(&:clear)
    rescue NameError
      # Sidekiq::QueueSet not available, skip queue clearing
    end
    begin
      Sidekiq::RetrySet.new.clear
    rescue NameError
      # Sidekiq::RetrySet not available, skip
    end
    begin
      Sidekiq::ScheduledSet.new.clear
    rescue NameError
      # Sidekiq::ScheduledSet not available, skip
    end
    begin
      Sidekiq::DeadSet.new.clear
    rescue NameError
      # Sidekiq::DeadSet not available, skip
    end
  end
end
