module Api
  module V1
    class BillingAuditLogsController < BaseController
      PER_PAGE = 20
      MAX_PER_PAGE = 100

      def index
        page = [params[:page].to_i, 1].max
        per_page = [[params[:per_page].to_i, PER_PAGE].max, MAX_PER_PAGE].min

        logs = BillingAuditLog
               .includes(:parking_session)
               .order(calculated_at: :desc)
               .page(page)
               .per(per_page)

        render_success(
          logs.map { |log| billing_audit_log_json(log) },
          pagination: {
            page: page,
            per_page: per_page,
            total_pages: logs.total_pages,
            total: logs.total_count
          }
        )
      end

      def show
        log = BillingAuditLog.includes(:parking_session).find(params[:id])
        render_success(billing_audit_log_json(log))
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: 'Billing audit log not found'
        }, status: :not_found
      end

      def by_session
        session_id = params[:session_id]
        if session_id.blank?
          render_bad_request('Session ID is required')
          return
        end

        # Check if session exists
        unless ParkingSession.exists?(id: session_id)
          render json: {
            success: false,
            error: 'Parking session not found'
          }, status: :not_found
          return
        end

        page = [params[:page].to_i, 1].max
        per_page = [[params[:per_page].to_i, PER_PAGE].max, MAX_PER_PAGE].min

        logs = BillingAuditLog
               .includes(:parking_session)
               .where(parking_session_id: session_id)
               .order(calculated_at: :desc)
               .page(page)
               .per(per_page)

        render_success(
          logs.map { |log| billing_audit_log_json(log) },
          pagination: {
            page: page,
            per_page: per_page,
            total_pages: logs.total_pages,
            total: logs.total_count
          }
        )
      end

      private

      def billing_audit_log_json(log)
        {
          id: log.id,
          parking_session_id: log.parking_session_id,
          vehicle_type: log.vehicle_type,
          slot_label: log.slot_label,
          slot_type: log.slot_type,
          entry_point: log.entry_point,
          parked_at: log.parked_at,
          exited_at: log.exited_at,
          total_fee: log.total_fee,
          base_fee: log.base_fee,
          exceeding_fee: log.exceeding_fee,
          exceeding_hours: log.exceeding_hours,
          long_term_days: log.long_term_days,
          long_term_fee: log.long_term_fee,
          duration_hours: log.duration_hours,
          is_continuous: log.is_continuous,
          base_start_time: log.base_start_time,
          fee_breakdown: log.breakdown,
          correlation_id: log.correlation_id,
          idempotency_key: log.idempotency_key,
          billing_version: log.billing_version,
          calculated_at: log.calculated_at,
          created_at: log.created_at,
          updated_at: log.updated_at
        }
      end
    end
  end
end
