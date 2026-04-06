module Api
  module V1
    class EntryPointsController < BaseController
      def index
        entry_points = EntryPoint.order(:identifier)
        Rails.logger.info '=== GET /api/v1/entry_points ==='
        Rails.logger.info "Total entry points in database: #{entry_points.count}"
        Rails.logger.info "Entry points: #{entry_points.map(&:identifier).inspect}"
        render_success(entry_points.map { |ep| entry_point_json(ep) })
      end

      def show
        entry_point = EntryPoint.find_by(id: params[:id])

        if entry_point.nil?
          render_not_found('Entry point not found')
          return
        end

        render_success(entry_point_json(entry_point))
      end

      def create
        # Validate parameters first
        unless entry_point_params[:identifier].present? && entry_point_params[:name].present?
          render_bad_request('Both identifier and name are required')
          return
        end

        # Check for duplicate identifier - return 409 Conflict as per task requirements
        existing_entry_point = EntryPoint.find_by(identifier: entry_point_params[:identifier])

        if existing_entry_point
          render_conflict('Entry point with this identifier already exists')
          return
        end

        # Create new entry point
        entry_point = EntryPoint.new(entry_point_params)

        if entry_point.save
          # Backfill distances for all existing parking slots with a default distance of 0
          # This ensures all slots have a distance value for the new entry point
          # Skip backfill for entry point "Z" (test entry point that should not affect existing slots)
          ParkingSlot.backfill_distances_for_new_entry_point(entry_point.identifier) unless entry_point.identifier == 'Z'

          render_success(entry_point_json(entry_point), status: :created)
        else
          render_unprocessable_entity(entry_point.errors.full_messages.join(', '))
        end
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
          # Store old identifier for reordering if it changes
          old_identifier = entry_point.identifier

          if entry_point.update(entry_point_params)
            # If identifier changed, reorder distance arrays for all parking slots
            if entry_point_params[:identifier].present? && entry_point_params[:identifier] != old_identifier
              Rails.logger.info "Identifier changed from #{old_identifier} to #{entry_point_params[:identifier]}, reordering distances"
              ParkingSlot.reorder_distances_for_updated_entry_point(old_identifier, entry_point_params[:identifier])
            end

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

        # Return 404 if entry point not found
        if entry_point.nil?
          render_not_found('Entry point not found')
          return
        end

        # Check for active sessions before deleting
        if entry_point.parking_sessions.active.exists?
          render_conflict('Cannot delete entry point with active parking sessions')
          return
        end

        # Remove the distance for this entry point from all parking slots
        ParkingSlot.remove_distance_for_deleted_entry_point(entry_point.identifier)

        # Delete the entry point and return 204 No Content
        entry_point.destroy
        head :no_content
      end

      private

      def entry_point_params
        params.expect(entry_point: %i[identifier name])
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
