module Api
  module V1
    class SlotsController < BaseController
      def index
        slots = ParkingSlot.all.order(:slot_label)
        Rails.logger.info '=== GET /api/v1/slots ==='
        Rails.logger.info "Total parking slots in database: #{slots.count}"
        Rails.logger.info "Parking slots: #{slots.map(&:slot_label).inspect}"
        render_success(slots.map { |s| slot_json(s) })
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
        slot = ParkingSlot.find(params[:id])

        if slot.update(slot_params)
          render_success(slot_json(slot))
        else
          render_bad_request(slot.errors.full_messages.join(', '))
        end
      rescue ActiveRecord::RecordNotFound => e
        render json: {
          success: false,
          error: e.message
        }, status: :not_found
      end

      def destroy
        slot = ParkingSlot.find(params[:id])
        slot.destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound => e
        render json: {
          success: false,
          error: e.message
        }, status: :not_found
      end

      def available
        service = ParkingService.new
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
        params.require(:parking_slot).permit(:slot_label, :slot_type, distances: [])
      end

      def slot_json(slot)
        {
          id: slot.id,
          slot_label: slot.slot_label,
          slot_type: slot.slot_type,
          distances: slot.distances,
          available: slot.available?
        }
      end
    end
  end
end
