module Api
  module V1
    class BaseController < ActionController::API
      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from StandardError, with: :internal_error

      private

      def not_found(exception)
        render json: {
          success: false,
          error: exception.message
        }, status: :not_found
      end

      def internal_error(exception)
        Rails.logger.error "Error: #{exception.message}"
        Rails.logger.error exception.backtrace.join("\n")

        render json: {
          success: false,
          error: 'An unexpected error occurred'
        }, status: :internal_server_error
      end

      def render_success(data, status: :ok, pagination: nil)
        response = {
          success: true,
          data: data
        }
        response[:pagination] = pagination if pagination
        render json: response, status: status
      end

      def render_bad_request(message)
        render json: {
          success: false,
          error: message
        }, status: :bad_request
      end

      def render_not_found(message)
        render json: {
          success: false,
          error: message
        }, status: :not_found
      end

      def render_conflict(message)
        render json: {
          success: false,
          error: message
        }, status: :conflict
      end

      def render_error(message, status: :unprocessable_entity)
        render json: {
          success: false,
          error: message
        }, status: status
      end

      def render_unprocessable_entity(message)
        render json: {
          success: false,
          error: message
        }, status: :unprocessable_content
      end
    end
  end
end
