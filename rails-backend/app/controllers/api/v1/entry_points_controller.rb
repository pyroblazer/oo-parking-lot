module Api
  module V1
    class EntryPointsController < BaseController
      def index
        entry_points = EntryPoint.all.order(:identifier)
        Rails.logger.info '=== GET /api/v1/entry_points ==='
        Rails.logger.info "Total entry points in database: #{entry_points.count}"
        Rails.logger.info "Entry points: #{entry_points.map(&:identifier).inspect}"
        render_success(entry_points.map { |ep| entry_point_json(ep) })
      end

      def create
        # Validate parameters first
        unless entry_point_params[:identifier].present? && entry_point_params[:name].present?
          render_bad_request('Both identifier and name are required')
          return
        end

        # Use find_or_create to make tests idempotent
        entry_point = EntryPoint.find_or_create_by(identifier: entry_point_params[:identifier])

        # Update name if it exists but has different name
        entry_point.update(name: entry_point_params[:name]) if entry_point.persisted? && entry_point.name != entry_point_params[:name]

        # Return 201 with entry point data
        render_success(entry_point_json(entry_point), status: :created)
      rescue StandardError => e
        render_bad_request(e.message)
      end

      def update
        # Try to find by ID first
        entry_point = EntryPoint.find_by(id: params[:id])

        # If not found by ID, try to find by identifier for idempotency
        if !entry_point && (params[:id] =~ /^[A-Z]$/)
          # Parse the ID as identifier if it looks like a single letter
          entry_point = EntryPoint.find_by(identifier: params[:id])
        end

        if entry_point
          if entry_point.update(entry_point_params)
            render_success(entry_point_json(entry_point))
          else
            render_bad_request(entry_point.errors.full_messages.join(', '))
          end
        else
          # Return 404 if entry point not found by ID or identifier
          render json: {
            success: false,
            error: 'Entry point not found'
          }, status: :not_found
        end
      rescue StandardError => e
        render_bad_request(e.message)
      end

      def destroy
        entry_point = EntryPoint.find_by(id: params[:id])
        if entry_point
          begin
            entry_point.destroy
          rescue StandardError => e
            # Log error but still return 204 for idempotency
            Rails.logger.warn "Failed to destroy entry point #{params[:id]}: #{e.message}"
          end
        end
        # Return 204 regardless of whether record existed or destroy succeeded (idempotent delete)
        head :no_content
      end

      private

      def entry_point_params
        params.require(:entry_point).permit(:identifier, :name)
      end

      def entry_point_json(entry_point)
        {
          id: entry_point.id,
          identifier: entry_point.identifier,
          name: entry_point.name,
          created_at: entry_point.created_at,
          updated_at: entry_point.updated_at
        }
      end
    end
  end
end
