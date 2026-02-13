module Api
  module V1
    class HealthController < BaseController
      # GET /health
      def index
        db_status = check_database

        if db_status == 'healthy'
          render json: {
            status: 'ok',
            service: 'parking-lot-api',
            version: '1.0.0',
            timestamp: Time.current.iso8601,
            checks: {
              database: {
                status: db_status
              }
            }
          }, status: :ok
        else
          render json: {
            status: 'error',
            service: 'parking-lot-api',
            version: '1.0.0',
            timestamp: Time.current.iso8601,
            checks: {
              database: {
                status: db_status
              }
            }
          }, status: :service_unavailable
        end
      rescue StandardError => e
        Rails.logger.error "Health check error: #{e.message}"
        render json: {
          status: 'error',
          service: 'parking-lot-api',
          version: '1.0.0',
          timestamp: Time.current.iso8601,
          checks: {
            database: {
              status: 'unhealthy'
            }
          }
        }, status: :service_unavailable
      end

      private

      def check_database
        # Try to execute a simple query to verify database connectivity
        ActiveRecord::Base.connection.execute('SELECT 1')
        'healthy'
      rescue StandardError => e
        Rails.logger.error "Database health check failed: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        'unhealthy'
      end
    end
  end
end
