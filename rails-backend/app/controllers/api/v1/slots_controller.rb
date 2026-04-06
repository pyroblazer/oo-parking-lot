module Api
  module V1
    class SlotsController < BaseController
      def index
        slots = ParkingSlot.order(:slot_label)
        Rails.logger.info '=== GET /api/v1/slots ==='
        Rails.logger.info "Total parking slots in database: #{slots.count}"
        Rails.logger.info "Parking slots: #{slots.map(&:slot_label).inspect}"
        render_success(slots.map { |s| slot_json(s) })
      end

      def show
        slot = ParkingSlot.find(params[:id])
        render_success(slot_json(slot))
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: "Couldn't find ParkingSlot - not found with 'id'=#{params[:id]}"
        }, status: :not_found
      end

      def create
        slot = ParkingSlot.new(slot_params)

        if slot.save
          render_success(slot_json(slot), status: :created)
        else
          render_bad_request(slot.errors.full_messages.join(', '))
        end
      end

      def update
        Rails.logger.info "=== PUT /api/v1/slots/#{params[:id]} ==="
        Rails.logger.info "Raw params: #{params.inspect}"
        Rails.logger.info "slot_params: #{slot_params.inspect}"
        slot = ParkingSlot.find(params[:id])
        Rails.logger.info "Slot found: #{slot.inspect}"

        # Implement backfill mechanism for unlimited entry points
        # If distances array is provided, ensure it matches current number of entry points
        # Check if distances key exists in params (empty arrays are valid)
        distances_provided = params.key?(:distances) || params[:parking_slot]&.key?(:distances)
        if distances_provided
          entry_points_count = EntryPoint.count
          current_distances = slot_params[:distances]

          # Only adjust distances if there are entry points
          # If there are no entry points, preserve distances array as-is
          # If distances array is empty, preserve it as-is (no backfill)
          if entry_points_count.positive? && !current_distances.empty?
            # Backfill missing distances with default value (0) if array is shorter than entry points count
            if current_distances.length < entry_points_count
              missing_count = entry_points_count - current_distances.length
              Rails.logger.info "Backfilling #{missing_count} missing distances for #{entry_points_count} entry points"
              backfilled_distances = current_distances + Array.new(missing_count, 0)
              slot_params[:distances] = backfilled_distances
              Rails.logger.info "Distances backfilled: #{backfilled_distances.inspect}"
            end

            # Truncate distances array if it's longer than entry points count
            if current_distances.length > entry_points_count
              Rails.logger.info "Truncating distances array from #{current_distances.length} to #{entry_points_count}"
              slot_params[:distances] = current_distances.first(entry_points_count)
            end
          else
            # No entry points exist OR distances array is empty - preserve distances array as-is
            Rails.logger.info "Preserving distances array: #{current_distances.inspect} (entry_points_count: #{entry_points_count})"
          end
        end

        if slot.update(slot_params)
          Rails.logger.info 'Slot updated successfully'
          render_success(slot_json(slot))
        else
          Rails.logger.info "Slot update failed: #{slot.errors.full_messages.join(', ')}"
          render_bad_request(slot.errors.full_messages.join(', '))
        end
      rescue ActiveRecord::RecordNotFound => e
        Rails.logger.info "Slot not found: #{e.message}"
        render json: {
          success: false,
          error: "Couldn't find ParkingSlot - not found with 'id'=#{params[:id]}"
        }, status: :not_found
      end

      def destroy
        Rails.logger.info '=== DELETE /api/v1/slots/:id ==='
        Rails.logger.info "Raw params[:id]: #{params[:id].inspect}"
        Rails.logger.info "params[:id] class: #{params[:id].class}"

        # Convert ID to integer to handle string parameters
        slot_id = params[:id].to_i
        Rails.logger.info "Converted slot_id: #{slot_id}"
        Rails.logger.info "slot_id class: #{slot_id.class}"

        slot = ParkingSlot.find(slot_id)
        Rails.logger.info "Slot found: id=#{slot.id}, label=#{slot.slot_label}, type=#{slot.slot_type}"
        Rails.logger.info "Slot status: #{slot.status}"
        Rails.logger.info "Slot available?: #{slot.available?}"

        # Check for active sessions BEFORE calling destroy
        # This prevents the issue where ActiveRecord's destroy returns true even when callback throws :abort
        active_sessions = slot.parking_sessions.active
        Rails.logger.info "Active sessions count: #{active_sessions.count}"
        if active_sessions.any?
          Rails.logger.info "Active sessions: #{active_sessions.pluck(:id, :parked_at, :exited_at)}"
          # Return proper error status (409 Conflict) with error message if active sessions exist
          render json: {
            success: false,
            error: 'Cannot delete parking slot with active parking sessions'
          }, status: :conflict
          return
        end

        if slot.destroy
          # Verify deletion succeeded by checking if slot still exists
          if ParkingSlot.exists?(slot_id)
            Rails.logger.error 'Slot destroy returned true but slot still exists in database'
            render json: {
              success: false,
              error: 'Failed to delete slot'
            }, status: :internal_server_error
          else
            Rails.logger.info 'Slot destroyed successfully'
            head :no_content
          end
        else
          # Slot has other issues and cannot be deleted
          Rails.logger.info "Slot destroy failed: #{slot.errors.full_messages.join(', ')}"
          render json: {
            success: false,
            error: slot.errors[:base].first || 'Cannot delete slot'
          }, status: :conflict
        end
      rescue ActiveRecord::RecordNotFound => e
        Rails.logger.info "Slot not found: #{e.message}"
        render json: {
          success: false,
          error: "Couldn't find ParkingSlot - not found with 'id'=#{params[:id]}"
        }, status: :not_found
      rescue StandardError => e
        Rails.logger.error "Error deleting slot: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        render json: {
          success: false,
          error: 'An unexpected error occurred'
        }, status: :internal_server_error
      end

      def available
        service = ParkingService.new

        # Validate that entry_point_id is provided
        if params[:entry_point_id].blank?
          render_unprocessable_entity('Entry point not found')
          return
        end

        # Get available slots for the specified entry point
        slots = service.available_slots(
          params[:vehicle_type],
          params[:entry_point_id]
        )

        if slots.is_a?(Array)
          render_success({
                           available_slots: slots.map { |s| slot_json(s) },
                           total_available: slots.size
                         })
        else
          render_error(service.errors.join(', '))
        end
      end

      private

      def slot_params
        # Try wrapped format first (Postman format)
        if params[:parking_slot].present?
          params.fetch(:parking_slot, {}).permit(:slot_label, :slot_type, distances: [])
        else
          # Fallback to unwrapped format (frontend format)
          params.permit(:slot_label, :slot_type, distances: [])
        end
      end

      def slot_json(slot)
        {
          id: slot.id,
          slot_label: slot.slot_label,
          slot_type: slot.slot_type,
          distances: slot.distances,
          distances_map: slot.distances_map,
          available: slot.available?,
          created_at: slot.created_at,
          updated_at: slot.updated_at
        }
      end
    end
  end
end
