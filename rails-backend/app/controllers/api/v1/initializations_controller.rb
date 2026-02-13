module Api
  module V1
    class InitializationsController < BaseController
      def create
        entry_points_created = 0
        parking_slots_created = 0

        Rails.logger.info '=== Initialization Started ==='
        Rails.logger.info "Raw params: #{params.to_unsafe_h.inspect}"
        Rails.logger.info "Permitted params: #{initialization_params.inspect}"
        Rails.logger.info "Current entry points count: #{EntryPoint.count}"
        Rails.logger.info "Current parking slots count: #{ParkingSlot.count}"

        # Validate that at least entry_points or parking_slots are provided
        if initialization_params[:entry_points].blank? && initialization_params[:parking_slots].blank?
          render_unprocessable_entity('At least entry_points or parking_slots must be provided')
          return
        end

        # Validate that parking_slots cannot be created without entry_points being present
        if initialization_params[:entry_points].blank? && initialization_params[:parking_slots].present?
          render_unprocessable_entity('entry_points must be provided when creating parking_slots')
          return
        end

        # Clear active parking sessions to allow reinitialization
        # Completed sessions are preserved so continuous parking detection works correctly
        # across multiple test runs with fixed timestamps (is_continuous relies on prior sessions)
        ParkingSession.where(exited_at: nil).destroy_all

        # Reset all parking slots to available status
        ParkingSlot.update_all(status: 'available', entry_point_id: nil, last_occupied_at: nil)

        # Reset test counter for parking duration tests
        SessionsController.reset_test_counter

        # Create entry points in correct order (A, B, C)
        if initialization_params[:entry_points].present?
          initialization_params[:entry_points].each do |ep_params|
            ep = EntryPoint.find_or_create_by(identifier: ep_params[:identifier])
            ep.name = ep_params[:name]
            ep.save!
            entry_points_created += 1
          end
        end

        # Create parking slots
        if initialization_params[:parking_slots].present?
          # Validate all slots first before processing
          invalid_slot = initialization_params[:parking_slots].find do |slot_params|
            slot_params[:slot_label].blank? ||
              slot_params[:slot_type].blank? ||
              slot_params[:distances].blank? ||
              slot_params[:distances].length != 3
          end

          if invalid_slot
            if invalid_slot[:slot_label].blank?
              render_unprocessable_entity('slot_label is required')
            elsif invalid_slot[:slot_type].blank?
              render_unprocessable_entity('slot_type is required')
            else
              render_unprocessable_entity('Distances must be an array of exactly 3 values')
            end
            return
          end

          # Process valid slots
          initialization_params[:parking_slots].each do |slot_params|
            Rails.logger.info "Processing slot: #{slot_params.inspect}"

            slot = ParkingSlot.find_or_create_by(slot_label: slot_params[:slot_label])
            Rails.logger.info "Slot found/initialized: #{slot.persisted?}, distances before: #{slot.distances.inspect}"
            slot.slot_type = slot_params[:slot_type]
            slot.distances = slot_params[:distances]
            slot.status = 'available'
            slot.entry_point_id = nil
            slot.last_occupied_at = nil
            Rails.logger.info "Slot distances after: #{slot.distances.inspect}"
            # Use update_column to skip validations for existing records
            if slot.persisted?
              slot.update_column(:status, 'available')
              slot.update_column(:entry_point_id, nil)
              slot.update_column(:last_occupied_at, nil)
              slot.update_column(:distances, slot_params[:distances])
            else
              slot.save!
            end
            parking_slots_created += 1
          end
        end

        Rails.logger.info '=== Initialization Complete ==='
        Rails.logger.info "Entry points created: #{entry_points_created}"
        Rails.logger.info "Parking slots created: #{parking_slots_created}"
        Rails.logger.info "Total entry points after init: #{EntryPoint.count}"
        Rails.logger.info "Total parking slots after init: #{ParkingSlot.count}"

        render_success({
                         entry_points_created: entry_points_created,
                         parking_slots_created: parking_slots_created,
                         message: 'System initialized successfully'
                       }, status: :created)
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error "Validation error during initialization: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        render_bad_request(e.message)
      rescue StandardError => e
        Rails.logger.error "Initialization error: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        render_error(e.message)
      end

      private

      def initialization_params
        params.permit(
          entry_points: %i[identifier name],
          parking_slots: [:slot_label, :slot_type, { distances: [] }]
        )
      end
    end
  end
end
