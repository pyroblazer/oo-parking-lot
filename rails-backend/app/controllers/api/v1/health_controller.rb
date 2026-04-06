module Api
  module V1
    class HealthController < BaseController
      # GET /health
      def index
        db_status = check_database

        http_status = db_status == 'healthy' ? :ok : :service_unavailable

        render json: {
          status: db_status == 'healthy' ? 'ok' : 'error',
          success: db_status == 'healthy',
          service: 'parking-lot-api',
          version: '1.0.0',
          timestamp: Time.current.iso8601,
          checks: {
            database: {
              status: db_status
            }
          },
          data: {
            status: db_status,
            timestamp: Time.current.iso8601
          }
        }, status: http_status
      rescue StandardError => e
        Rails.logger.error "Health check error: #{e.message}"
        render json: {
          status: 'error',
          success: false,
          service: 'parking-lot-api',
          version: '1.0.0',
          timestamp: Time.current.iso8601,
          checks: {
            database: {
              status: 'unhealthy'
            }
          },
          data: {
            status: 'unhealthy',
            timestamp: Time.current.iso8601
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
